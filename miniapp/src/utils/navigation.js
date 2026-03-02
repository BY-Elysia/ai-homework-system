let navigating = false
let lastNavigationAt = 0

const NAVIGATION_GAP_MS = 300

function currentRoute() {
  const pages = getCurrentPages()
  return pages[pages.length - 1]?.route || ''
}

function normalizePath(url = '') {
  return String(url).split('?')[0].replace(/^\//, '')
}

function shouldSkip(url) {
  const now = Date.now()
  if (navigating) return true
  if (now - lastNavigationAt < NAVIGATION_GAP_MS) return true
  if (currentRoute() === normalizePath(url)) return true
  return false
}

function runNavigate(method, url, failoverMethod = '') {
  if (shouldSkip(url)) return
  navigating = true

  uni[method]({
    url,
    success: () => {
      lastNavigationAt = Date.now()
    },
    fail: () => {
      if (!failoverMethod) return
      uni[failoverMethod]({
        url,
        success: () => {
          lastNavigationAt = Date.now()
        },
      })
    },
    complete: () => {
      navigating = false
    },
  })
}

export function replacePage(url) {
  runNavigate('redirectTo', url, 'reLaunch')
}

export function restartPageStack(url) {
  runNavigate('reLaunch', url, 'redirectTo')
}
