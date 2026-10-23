import { watch, onUnmounted } from 'vue'

let lockCount = 0

function lock() {
  lockCount++
  if (lockCount === 1) {
    document.documentElement.style.overflow = 'hidden'
  }
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.documentElement.style.overflow = ''
  }
}

/**
 * Блокирует прокрутку страницы, пока открыта хотя бы одна модалка
 * (карта, форма фото, лайтбокс).
 */
export function useModalScrollLock(isOpen) {
  let locked = false

  const stop = watch(
    isOpen,
    (open) => {
      if (open && !locked) {
        locked = true
        lock()
      } else if (!open && locked) {
        locked = false
        unlock()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    stop()
    if (locked) {
      locked = false
      unlock()
    }
  })
}
