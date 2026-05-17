const { runScript } = require('./powershell')

const REQUIRED_MODULES = [
  { name: 'Microsoft.Graph', description: 'Core Graph API access for policy creation' },
  { name: 'Microsoft.Graph.Identity.SignIns', description: 'Conditional Access policy management' },
  { name: 'Microsoft.Graph.DeviceManagement', description: 'Intune / device compliance policies' },
  { name: 'ExchangeOnlineManagement', description: 'Exchange Online policies' },
  { name: 'AzureAD', description: 'Azure AD tenant management' },
]

async function getModuleStatus(win) {
  const moduleNames = REQUIRED_MODULES.map(m => m.name)
  const script = `
$moduleNames = @(${moduleNames.map(n => `'${n}'`).join(',')})
$results = @()
foreach ($name in $moduleNames) {
    $installed = Get-Module -ListAvailable -Name $name | Sort-Object Version -Descending | Select-Object -First 1
    $latest = $null
    try {
        $latest = Find-Module -Name $name -Repository PSGallery -ErrorAction SilentlyContinue | Select-Object -First 1
    } catch {}

    $status = 'not_installed'
    if ($installed) {
        if ($latest -and $latest.Version -gt $installed.Version) {
            $status = 'update_available'
        } else {
            $status = 'up_to_date'
        }
    }

    $results += [PSCustomObject]@{
        Name = $name
        Installed = ($installed -ne $null)
        InstalledVersion = if ($installed) { $installed.Version.ToString() } else { $null }
        LatestVersion = if ($latest) { $latest.Version.ToString() } else { $null }
        Status = $status
    }
}
$results | ConvertTo-Json -Depth 3
`
  const { output } = await runScript(script, null, null)
  try {
    const jsonMatch = output.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return arr.map(m => ({
        ...m,
        description: REQUIRED_MODULES.find(r => r.name === m.Name)?.description || '',
      }))
    }
  } catch {}
  return REQUIRED_MODULES.map(m => ({
    Name: m.name,
    description: m.description,
    Installed: false,
    InstalledVersion: null,
    LatestVersion: null,
    Status: 'unknown',
  }))
}

const PS_SILENT_PREFS = `
$ProgressPreference   = 'SilentlyContinue'
$VerbosePreference    = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'
`

async function installModules(moduleNames, onData, onError) {
  const script = `
${PS_SILENT_PREFS}
$modules = @(${moduleNames.map(n => `'${n}'`).join(',')})
foreach ($mod in $modules) {
    Write-Output "INSTALLING: $mod"
    try {
        Install-Module -Name $mod -Scope CurrentUser -Force -AllowClobber -Repository PSGallery -ErrorAction Stop
        Write-Output "SUCCESS: $mod installed"
    } catch {
        Write-Output "ERROR: $mod - $($_.Exception.Message)"
    }
}
Write-Output "DONE"
`
  return runScript(script, onData, onError)
}

async function updateModules(moduleNames, onData, onError) {
  const script = `
${PS_SILENT_PREFS}
$modules = @(${moduleNames.map(n => `'${n}'`).join(',')})
foreach ($mod in $modules) {
    Write-Output "UPDATING: $mod"
    try {
        Update-Module -Name $mod -Force -ErrorAction Stop
        Write-Output "SUCCESS: $mod updated"
    } catch {
        Write-Output "ERROR: $mod - $($_.Exception.Message)"
    }
}
Write-Output "DONE"
`
  return runScript(script, onData, onError)
}

module.exports = { getModuleStatus, installModules, updateModules, REQUIRED_MODULES }
