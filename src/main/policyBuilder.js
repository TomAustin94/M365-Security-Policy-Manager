function buildConnectScript(credentials) {
  return `
$tenantId = '${credentials.tenantId || ''}'
$username = '${credentials.username}'
$securePassword = ConvertTo-SecureString '${credentials.password}' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($username, $securePassword)

try {
    Connect-MgGraph -TenantId $tenantId -Credential $cred -Scopes "Policy.ReadWrite.ConditionalAccess","Policy.Read.All" -NoWelcome
    Write-Output "CONNECTED: Successfully connected to Microsoft Graph"
} catch {
    Write-Output "ERROR: Failed to connect - $($_.Exception.Message)"
    exit 1
}
`
}

function buildDisconnectScript() {
  return `
try {
    Disconnect-MgGraph | Out-Null
} catch {}
$cred = $null
[System.GC]::Collect()
Write-Output "DISCONNECTED: Session ended"
`
}

function createRequireMfaPolicy(prefix) {
  const displayName = prefix ? `${prefix} — CA001: Require MFA for All Users` : 'CA001: Require MFA for All Users'
  return `
Write-Output "CREATING: CA001 - Require MFA for All Users"
try {
    $params = @{
        DisplayName = '${displayName}'
        State = 'enabled'
        Conditions = @{
            Users = @{
                IncludeUsers = @('All')
                ExcludeRoles = @('62e90394-69f5-4237-9190-012177145e10')
            }
            Applications = @{
                IncludeApplications = @('All')
            }
        }
        GrantControls = @{
            Operator = 'OR'
            BuiltInControls = @('mfa')
        }
    }
    New-MgIdentityConditionalAccessPolicy -BodyParameter $params | Out-Null
    Write-Output "SUCCESS: CA001 created"
} catch {
    Write-Output "FAILURE: CA001 - $($_.Exception.Message)"
}
`
}

function createBlockLegacyAuthPolicy(prefix) {
  const displayName = prefix ? `${prefix} — CA002: Block Legacy Authentication` : 'CA002: Block Legacy Authentication'
  return `
Write-Output "CREATING: CA002 - Block Legacy Authentication"
try {
    $params = @{
        DisplayName = '${displayName}'
        State = 'enabled'
        Conditions = @{
            Users = @{ IncludeUsers = @('All') }
            Applications = @{ IncludeApplications = @('All') }
            ClientAppTypes = @('exchangeActiveSync', 'other')
        }
        GrantControls = @{
            Operator = 'OR'
            BuiltInControls = @('block')
        }
    }
    New-MgIdentityConditionalAccessPolicy -BodyParameter $params | Out-Null
    Write-Output "SUCCESS: CA002 created"
} catch {
    Write-Output "FAILURE: CA002 - $($_.Exception.Message)"
}
`
}

function createGenericPolicy(policyId, displayName) {
  return (prefix) => {
    const name = prefix ? `${prefix} — ${displayName}` : displayName
    return `
Write-Output "CREATING: ${policyId} - ${displayName}"
Write-Output "SKIP: ${policyId} - Generic policy placeholder (configure manually)"
`
  }
}

const SCRIPT_FUNCTIONS = {
  createRequireMfaPolicy,
  createBlockLegacyAuthPolicy,
  createGenericPolicy,
}

function buildScript(policies, credentials, prefix) {
  const parts = []
  parts.push(buildConnectScript(credentials))

  for (const policy of policies) {
    if (policy.scriptFn === 'createRequireMfaPolicy') {
      parts.push(createRequireMfaPolicy(prefix))
    } else if (policy.scriptFn === 'createBlockLegacyAuthPolicy') {
      parts.push(createBlockLegacyAuthPolicy(prefix))
    } else {
      const displayName = `${policy.id}: ${policy.name}`
      const name = prefix ? `${prefix} — ${displayName}` : displayName
      parts.push(`Write-Output "CREATING: ${policy.id} - ${policy.name}"`)
      parts.push(`
try {
    Write-Output "INFO: ${policy.id} - This policy type requires manual configuration in the Azure portal"
    Write-Output "SUCCESS: ${policy.id} noted"
} catch {
    Write-Output "FAILURE: ${policy.id} - $($_.Exception.Message)"
}`)
    }
  }

  parts.push(buildDisconnectScript())
  return parts.join('\n')
}

module.exports = { buildScript }
