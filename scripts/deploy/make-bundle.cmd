@echo off
rem Сборка деплой-архива проекта (без node_modules и мусора).
rem Windows 10+ содержит tar.exe, отдельные инструменты не нужны.
cd /d C:\Users\J\source\memory
if exist memorial-site.tar.gz del memorial-site.tar.gz
tar -czf memorial-site.tar.gz ^
  --exclude=memorial-site/node_modules ^
  --exclude=memorial-site/dist ^
  --exclude=memorial-site/.zcode ^
  memorial-site
echo.
echo Архив готов: C:\Users\J\source\memory\memorial-site.tar.gz
for %%A in (memorial-site.tar.gz) do echo Размер: %%~zA байт
