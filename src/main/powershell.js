const { spawn } = require('child_process')
const fs = require('fs')
const store = require('./store')

function getPwshPath() {
  const configured = store.get('powershellPath')
  if (configured && fs.existsSync(configured)) return configured

  if (process.platform === 'win32') {
    const candidates = [
      'pwsh.exe',
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    ]
    for (const c of candidates) {
      try {
        if (c === 'pwsh.exe' || fs.existsSync(c)) return c
      } catch {}
    }
    return 'pwsh.exe'
  }

  return 'pwsh'
}

function checkPowerShell() {
  return new Promise((resolve) => {
    const pwsh = getPwshPath()
    const proc = spawn(pwsh, ['--version'], { stdio: 'pipe' })
    let output = ''
    proc.stdout.on('data', (d) => { output += d.toString() })
    proc.on('close', (code) => {
      resolve({ found: code === 0, path: pwsh, version: output.trim() })
    })
    proc.on('error', () => {
      resolve({ found: false, path: pwsh, version: '' })
    })
  })
}

function runScript(script, onData, onError) {
  return new Promise((resolve, reject) => {
    const pwsh = getPwshPath()
    const execPolicy = store.get('executionPolicy') || 'RemoteSigned'

    const proc = spawn(pwsh, [
      '-NonInteractive',
      '-NoProfile',
      '-ExecutionPolicy', execPolicy,
      '-Command', '-',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    const allOutput = []

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n')
      lines.forEach((line) => {
        if (line.trim()) {
          allOutput.push(line)
          if (onData) onData(line)
        }
      })
    })

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n')
      lines.forEach((line) => {
        if (line.trim()) {
          if (onError) onError(line)
        }
      })
    })

    proc.on('close', (code) => {
      resolve({ exitCode: code, output: allOutput.join('\n') })
    })

    proc.on('error', (err) => {
      reject(err)
    })

    proc.stdin.write(script)
    proc.stdin.end()
  })
}

module.exports = { runScript, checkPowerShell, getPwshPath }
