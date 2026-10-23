import { ref, computed } from 'vue'

const STORAGE_KEY = 'memorial-likes'
const likesMap = ref(new Map())

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      if (parsed && typeof parsed === 'object') {
        likesMap.value = new Map(
          Object.entries(parsed)
            .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
            .map(([k, v]) => [k, v])
        )
      }
    }
  } catch {
    likesMap.value = new Map()
  }
}

function saveToStorage() {
  try {
    const obj = Object.fromEntries(likesMap.value)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    /* localStorage может быть недоступен (приватный режим) */
  }
}

loadFromStorage()

// Версия хранилища: растёт при каждом изменении, чтобы все
// подписанные компоненты пересчитывали счётчики синхронно.
const version = ref(0)

export function useVoting() {
  function getLikes(id) {
    // обращение к version включая её в трекинг зависимостей
    void version.value
    return likesMap.value.get(String(id)) || 0
  }

  // Полный счётчик: базовые лайки каталога + личные
  function getCount(id, base = 0) {
    void version.value
    return (base || 0) + (likesMap.value.get(String(id)) || 0)
  }

  function addLike(id) {
    const key = String(id)
    likesMap.value.set(key, (likesMap.value.get(key) || 0) + 1)
    saveToStorage()
    version.value++
  }

  function toggleLike(id) {
    const key = String(id)
    if (likesMap.value.has(key)) {
      likesMap.value.delete(key)
    } else {
      likesMap.value.set(key, 1)
    }
    saveToStorage()
    version.value++
  }

  function isLiked(id) {
    void version.value
    return likesMap.value.has(String(id))
  }

  function getAllLikes() {
    void version.value
    return new Map(likesMap.value)
  }

  return { getLikes, getCount, addLike, toggleLike, isLiked, getAllLikes }
}
