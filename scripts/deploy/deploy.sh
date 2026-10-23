#!/usr/bin/env bash
# Развёртывание memorial-site на VDS БЕЗ малейшего касания существующих сервисов.
# Принципы изоляции:
#  - всё живёт в /opt/memorial-site (собственная копия Node.js — системный node
#    НЕ устанавливается и не обновляется);
#  - отдельный systemd-юнит memorial.service (новый файл, чужие юниты не трогаем);
#  - приложение слушает 127.0.0.1:8766; наружу отдаётся выбранным способом
#    (отдельный порт или server-block в nginx — по решению владельца);
#  - nginx/существующие сервисы не перезапускаются этим скриптом.
set -euo pipefail

APP_DIR=/opt/memorial-site
APP_PORT=8766
NODE_VER=v22.14.0   # LTS; ставится ВНУТРЬ $APP_DIR, не в систему

log() { echo "[deploy] $*"; }

if [[ $EUID -ne 0 ]]; then echo "Запустите от root (sudo)"; exit 1; fi

log "OS: $(. /etc/os-release && echo "$PRETTY_NAME")"

# 1) каталог и пользователь (новый системный пользователь, без логина)
if ! id -u memorial >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin memorial
  log "создан пользователь memorial"
fi
mkdir -p "$APP_DIR"

# 2) собственный Node.js (только внутрь $APP_DIR/node)
if [[ ! -x "$APP_DIR/node/bin/node" ]]; then
  log "ставлю локальный Node $NODE_VER (системные пакеты не трогаю)"
  ARCH=$(uname -m); case "$ARCH" in x86_64) ARCH=x64;; aarch64) ARCH=arm64;; esac
  curl -fsSL "https://nodejs.org/dist/$NODE_VER/node-$NODE_VER-linux-$ARCH.tar.xz" \
    | tar -xJ -C "$APP_DIR"
  mv "$APP_DIR/node-$NODE_VER-linux-$ARCH" "$APP_DIR/node"
fi
export PATH="$APP_DIR/node/bin:$PATH"
log "node: $($APP_DIR/node/bin/node -v)"

# 3) код проекта ожидается в $APP_DIR/current (загружается отдельно/распаковывается)
if [[ ! -f "$APP_DIR/current/package.json" ]]; then
  log "ОШИБКА: положите проект в $APP_DIR/current (распакуйте архив) и перезапустите скрипт"
  exit 1
fi
cd "$APP_DIR/current"

# 4) зависимости и сборка (нужны только для build; рантайм — чистый node)
if [[ ! -d node_modules ]]; then
  log "npm ci (зависимости сборки)"
  "$APP_DIR/node/bin/npm" ci --no-audit --no-fund
fi
log "сборка dist/"
"$APP_DIR/node/bin/npm" run build

# 5) права (data/ и src/ пишутся при модерации заявок)
mkdir -p server/data
chown -R memorial:memorial "$APP_DIR"

# 6) systemd-юнит (НОВЫЙ файл; чужие сервисы не трогаем)
cat > /etc/systemd/system/memorial.service <<UNIT
[Unit]
Description=Memorial site (pamyatniki)
After=network.target

[Service]
Type=simple
User=memorial
WorkingDirectory=$APP_DIR/current
Environment=PORT=$APP_PORT
Environment=NODE_ENV=production
ExecStart=$APP_DIR/node/bin/node server/server.mjs
Restart=always
RestartSec=3
# аудит-безопасность
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$APP_DIR/current

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now memorial.service
sleep 2
systemctl --no-pager --lines=5 status memorial.service || true

# 7) проверка, что слушает локально
if curl -fsS "http://127.0.0.1:$APP_PORT/api/monuments" >/dev/null; then
  log "OK: приложение отвечает на 127.0.0.1:$APP_PORT"
else
  log "ПРОВЕРЬТЕ ЛОГИ: journalctl -u memorial -n 30"
fi

log "ГОТОВО. Наружная публикация — отдельным шагом:"
log "  вариант А (не трогаем nginx): открыть порт и пускать напрямую"
log "  вариант Б (HTTPS): server-block в nginx на ваш домен -> proxy_pass http://127.0.0.1:$APP_PORT"
log "Пароль админки печатается ОДИН раз в journalctl -u memorial | grep Password при первом старте"
