const { autoUpdater } = require('electron-updater')
const { ipcMain } = require('electron')

function setupAutoUpdater(win, isDev) {
  // electron-updater requires a packaged app to function — skip in dev
  if (isDev) {
    ipcMain.handle('updater:check', () => ({ devMode: true }))
    ipcMain.handle('updater:download', () => {})
    ipcMain.handle('updater:install', () => {})
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  const send = (channel, payload) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }

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

  autoUpdater.on('error', (err) => send('updater:error', err.message))

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

  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return result ?? {}
    } catch (err) {
      return { error: err.message }
    }
  })

  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())

  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true))

  // Silently check on startup after 5 s
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000)
}

module.exports = { setupAutoUpdater }
