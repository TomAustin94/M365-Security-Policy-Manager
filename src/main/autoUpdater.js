const { autoUpdater } = require('electron-updater')
const { ipcMain } = require('electron')

const NETWORK_PATTERNS = [
  'ERR_NETWORK_CHANGED', 'ERR_INTERNET_DISCONNECTED', 'ERR_NAME_NOT_RESOLVED',
  'ERR_CONNECTION_REFUSED', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
]

function isNetworkErr(err) {
  const msg = err?.message || String(err)
  return NETWORK_PATTERNS.some(p => msg.includes(p))
}

function classifyError(err) {
  const msg = err?.message || String(err)
  if (isNetworkErr(err)) {
    return 'Could not reach the update server — check your internet connection and try again.'
  }
  if (msg.includes('Cannot parse releases feed') || msg.includes('Unable to find latest version')) {
    return 'Could not retrieve release information from GitHub. This is usually a temporary network issue — please try again shortly.'
  }
  if (msg.includes('ENOENT') || msg.includes('no such file')) {
    return 'Update file could not be found. Please download the latest version manually.'
  }
  return 'An error occurred while checking for updates. Please try again later.'
}

// Silent background check: errors are swallowed, network errors are retried once.
function backgroundCheck() {
  autoUpdater.checkForUpdates().catch((err) => {
    if (isNetworkErr(err)) {
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 60_000)
    }
    // All background errors are intentionally swallowed — no UI shown.
  })
}

function setupAutoUpdater(win, isDev) {
  const send = (channel, payload) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }

  // electron-updater requires a packaged app to function — skip in dev
  if (isDev) {
    ipcMain.handle('updater:check', async () => {
      send('updater:checking')
      await new Promise(r => setTimeout(r, 800))
      send('updater:not-available')
      return { devMode: true }
    })
    ipcMain.handle('updater:download', () => {})
    ipcMain.handle('updater:install', () => {})
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => send('updater:checking'))

  autoUpdater.on('update-available', (info) => {
    send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes.slice(0, 1000)
        : '',
    })
  })

  autoUpdater.on('update-not-available', () => send('updater:not-available'))

  // Errors from user-triggered checks are surfaced; background check errors
  // are swallowed by the backgroundCheck() catch, so this only fires for
  // user-initiated calls (download failures, etc.).
  autoUpdater.on('error', (err) => send('updater:error', classifyError(err)))

  autoUpdater.on('download-progress', (p) => {
    send('updater:progress', {
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send('updater:downloaded', { version: info.version })
  })

  // User-triggered check from Settings page — errors are surfaced to the UI.
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return result ?? {}
    } catch (err) {
      send('updater:error', classifyError(err))
      return { error: classifyError(err) }
    }
  })

  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())

  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true))

  // Silent background check on startup after 5 s
  setTimeout(backgroundCheck, 5000)
}

module.exports = { setupAutoUpdater }
