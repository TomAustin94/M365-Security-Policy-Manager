import React, { useState, useEffect } from 'react'
import useStore from '../store'
import { POLICIES, POLICIES_BY_CATEGORY } from '../../shared/constants'
import ProgressStep from '../components/ProgressStep'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import LogPanel from '../components/LogPanel'
import SearchInput from '../components/SearchInput'
import Modal from '../components/Modal'

const STEPS = ['Select Org', 'Credentials', 'Configure Prefix', 'Select Policies', 'Review', 'Deploy']
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

function severityBadge(sev) {
  const v = { critical: 'error', high: 'high', medium: 'warning', low: 'info', info: 'neutral' }[sev] || 'neutral'
  return <Badge variant={v}>{sev}</Badge>
}

function resultBadge(status) {
  if (status === 'success') return <Badge variant="success">Success</Badge>
  if (status === 'failure') return <Badge variant="error">Failed</Badge>
  return <Badge variant="neutral">Pending</Badge>
}

// Step 1
function StepSelectOrg({ value, onChange }) {
  const { orgs, orgsLoading, loadOrgs, settings } = useStore()
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!settings.itGlueApiKey) return
    loadOrgs().catch(() => setError('Failed to load organisations'))
  }, [])

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.shortName || '').toLowerCase().includes(search.toLowerCase())
  )

  if (!settings.itGlueApiKey) {
    return (
      <div className="py-8 text-center">
        <div className="text-amber-600 mb-2">
          <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">IT Glue not configured</p>
        <p className="text-xs text-gray-500 mb-4">Configure your IT Glue API key in Settings to load organisations, or enter tenant details manually below.</p>
        <div className="max-w-sm mx-auto space-y-2">
          <input
            type="text"
            placeholder="Organisation name (manual entry)"
            value={value?.name || ''}
            onChange={(e) => onChange({ id: 'manual', name: e.target.value, shortName: '' })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Search organisations..." />
      {orgsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No organisations found</p>
          ) : (
            filtered.map((org) => (
              <button
                key={org.id}
                onClick={() => onChange(org)}
                className={[
                  'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all text-sm',
                  value?.id === org.id
                    ? 'border-navy bg-navy-50 text-navy font-medium'
                    : 'border-gray-200 hover:border-navy-200 hover:bg-gray-50',
                ].join(' ')}
              >
                <span>{org.name}</span>
                {org.shortName && <span className="text-xs text-gray-400">{org.shortName}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Step 2
function StepCredentials({ orgId, value, onChange }) {
  const [passwords, setPasswords] = useState([])
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState({ username: '', password: '', tenantId: '' })
  const [useManual, setUseManual] = useState(false)

  useEffect(() => {
    if (!orgId || orgId === 'manual' || !window.api) return
    setLoading(true)
    window.api.itglue.getPasswords(orgId)
      .then((res) => setPasswords(res || []))
      .catch(() => setUseManual(true))
      .finally(() => setLoading(false))
  }, [orgId])

  const handleManualChange = (field, val) => {
    const updated = { ...manual, [field]: val }
    setManual(updated)
    onChange(updated)
  }

  const handleSelectPassword = (pw) => {
    const creds = { username: pw.username, password: pw.password, tenantId: '' }
    onChange(creds)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Select credentials for Microsoft 365 authentication</p>
        <button
          onClick={() => setUseManual((s) => !s)}
          className="text-xs text-navy hover:underline"
        >
          {useManual ? 'Select from IT Glue' : 'Enter manually'}
        </button>
      </div>

      {useManual || orgId === 'manual' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tenant ID (optional)</label>
            <input
              type="text"
              value={manual.tenantId}
              onChange={(e) => handleManualChange('tenantId', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Username / UPN</label>
            <input
              type="text"
              value={manual.username}
              onChange={(e) => handleManualChange('username', e.target.value)}
              placeholder="admin@tenant.onmicrosoft.com"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={manual.password}
              onChange={(e) => handleManualChange('password', e.target.value)}
              placeholder="Enter password..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : passwords.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          No passwords found for this organisation. <button onClick={() => setUseManual(true)} className="text-navy hover:underline">Enter manually</button>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {passwords.map((pw) => (
            <button
              key={pw.id}
              onClick={() => handleSelectPassword(pw)}
              className={[
                'w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all text-sm',
                value?.username === pw.username
                  ? 'border-navy bg-navy-50 text-navy'
                  : 'border-gray-200 hover:border-navy-200 hover:bg-gray-50',
              ].join(' ')}
            >
              <div>
                <p className="font-medium text-gray-800">{pw.name}</p>
                <p className="text-xs text-gray-500">{pw.username}</p>
              </div>
              <Badge variant="neutral">{pw.resourceType || 'Credential'}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Step 3
function StepConfigurePrefix({ usePrefix, setUsePrefix, prefix, setPrefix, defaultPrefix }) {
  const preview = usePrefix && prefix ? `${prefix} — CA001: Require MFA for All Users` : 'CA001: Require MFA for All Users'
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
        <input
          id="use-prefix"
          type="checkbox"
          checked={usePrefix}
          onChange={(e) => setUsePrefix(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
        />
        <div>
          <label htmlFor="use-prefix" className="text-sm font-medium text-gray-700">Add a prefix to all policy names</label>
          <p className="text-xs text-gray-500 mt-0.5">Helps identify which client/tenant the policies belong to.</p>
        </div>
      </div>

      {usePrefix && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Prefix Text</label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder={defaultPrefix || 'e.g. ACME Corp'}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
          {defaultPrefix && !prefix && (
            <button
              onClick={() => setPrefix(defaultPrefix)}
              className="text-xs text-navy hover:underline"
            >
              Use default: "{defaultPrefix}"
            </button>
          )}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Policy Name Preview</p>
        <p className="text-sm font-mono text-gray-800">{preview}</p>
      </div>
    </div>
  )
}

// Step 4
function StepSelectPolicies({ selected, setSelected }) {
  const [search, setSearch] = useState('')
  const categories = Object.keys(POLICIES_BY_CATEGORY)

  const filteredCategories = categories.reduce((acc, cat) => {
    const policies = POLICIES_BY_CATEGORY[cat].filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
    )
    if (policies.length > 0) acc[cat] = policies
    return acc
  }, {})

  const togglePolicy = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  }

  const toggleCategory = (cat) => {
    const catIds = (filteredCategories[cat] || []).map((p) => p.id)
    const allSelected = catIds.every((id) => selected.includes(id))
    if (allSelected) {
      setSelected((s) => s.filter((id) => !catIds.includes(id)))
    } else {
      setSelected((s) => [...new Set([...s, ...catIds])])
    }
  }

  const selectAll = () => setSelected(POLICIES.map((p) => p.id))
  const deselectAll = () => setSelected([])
  const selectDefaults = () => setSelected(POLICIES.filter((p) => p.defaultEnabled).map((p) => p.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search policies..." className="w-64" />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={selectDefaults}>Defaults</Button>
          <Button size="sm" variant="ghost" onClick={selectAll}>All</Button>
          <Button size="sm" variant="ghost" onClick={deselectAll}>None</Button>
          <Badge variant="navy">{selected.length} selected</Badge>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
        {Object.entries(filteredCategories).map(([cat, policies]) => {
          const catIds = policies.map((p) => p.id)
          const allSel = catIds.every((id) => selected.includes(id))
          const someSel = catIds.some((id) => selected.includes(id))
          return (
            <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-gray-50 cursor-pointer"
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allSel}
                    ref={(el) => { if (el) el.indeterminate = someSel && !allSel }}
                    onChange={() => toggleCategory(cat)}
                    className="h-4 w-4 rounded border-gray-300 text-navy"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm font-semibold text-gray-700">{cat}</span>
                  <Badge variant="neutral">{policies.length}</Badge>
                </div>
                <span className="text-xs text-gray-400">{catIds.filter((id) => selected.includes(id)).length} selected</span>
              </div>
              <div className="divide-y divide-gray-50">
                {policies.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => togglePolicy(p.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{p.id}</span>
                        <span className="text-sm text-gray-800">{p.name}</span>
                        {severityBadge(p.severity)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Step 5 Review
function StepReview({ org, credentials, prefix, usePrefix, selectedIds }) {
  const selectedPolicies = POLICIES.filter((p) => selectedIds.includes(p.id))
  const byCategory = selectedPolicies.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Organisation</p>
          <p className="text-sm font-semibold text-gray-900">{org?.name || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Account</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{credentials?.username || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Prefix</p>
          <p className="text-sm font-semibold text-gray-900">{usePrefix && prefix ? prefix : 'None'}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>{selectedIds.length} policies</strong> will be created across {Object.keys(byCategory).length} categories. Review the list below and click Deploy when ready.
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {Object.entries(byCategory).map(([cat, policies]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{cat}</p>
            <div className="space-y-1">
              {policies.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md hover:bg-gray-50">
                  <span className="text-xs font-mono text-gray-400 w-12 flex-shrink-0">{p.id}</span>
                  <span className="text-sm text-gray-800 flex-1">{p.name}</span>
                  {severityBadge(p.severity)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Step 6 Deploy
function StepDeploy({ logs, results, selectedIds, running }) {
  const selectedPolicies = POLICIES.filter((p) => selectedIds.includes(p.id))
  return (
    <div className="space-y-4">
      <LogPanel logs={logs} height="h-48" title="Deployment Output" />
      {Object.keys(results).length > 0 && (
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Policy Results</p>
          {selectedPolicies.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-gray-50">
              <span className="text-xs font-mono text-gray-400 w-12">{p.id}</span>
              <span className="text-sm text-gray-800 flex-1">{p.name}</span>
              {resultBadge(results[p.id])}
            </div>
          ))}
        </div>
      )}
      {running && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Deploying policies...
        </div>
      )}
    </div>
  )
}

export default function CreatePolicies() {
  const { settings, addNotification } = useStore()
  const [step, setStep] = useState(1)
  const [org, setOrg] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [usePrefix, setUsePrefix] = useState(!!settings.defaultPolicyPrefix)
  const [prefix, setPrefix] = useState(settings.defaultPolicyPrefix || '')
  const [selectedIds, setSelectedIds] = useState(POLICIES.filter((p) => p.defaultEnabled).map((p) => p.id))
  const [deployLogs, setDeployLogs] = useState([])
  const [deployResults, setDeployResults] = useState({})
  const [running, setRunning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canNext = () => {
    if (step === 1) return !!org
    if (step === 2) return !!(credentials?.username && credentials?.password)
    if (step === 3) return true
    if (step === 4) return selectedIds.length > 0
    if (step === 5) return true
    return false
  }

  useEffect(() => {
    if (!window.api) return
    const unOut = window.api.onPsOutput((line) => setDeployLogs((l) => [...l, { line, type: 'output' }]))
    const unErr = window.api.onPsError((line) => setDeployLogs((l) => [...l, { line, type: 'error' }]))
    return () => { unOut?.(); unErr?.() }
  }, [])

  const handleDeploy = async () => {
    if (!window.api) return
    setConfirmOpen(false)
    setRunning(true)
    setDeployLogs([])
    setDeployResults({})
    const selectedPolicies = POLICIES.filter((p) => selectedIds.includes(p.id))
    try {
      const result = await window.api.policies.create({
        policies: selectedPolicies,
        credentials,
        prefix: usePrefix ? prefix : '',
      })
      setDeployResults(result.results || {})
      const successCount = Object.values(result.results || {}).filter((v) => v === 'success').length
      addNotification(`Deployment complete: ${successCount}/${selectedIds.length} policies created`, 'success')
    } catch (err) {
      addNotification('Deployment failed: ' + err.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Security Policies</h1>
        <p className="mt-1 text-sm text-gray-500">Deploy M365 security policies to a tenant in 6 steps</p>
      </div>

      <div className="mb-8">
        <ProgressStep steps={STEPS} currentStep={step} />
      </div>

      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-gray-900">
            Step {step}: {STEPS[step - 1]}
          </h2>
        </Card.Header>
        <Card.Body>
          {step === 1 && <StepSelectOrg value={org} onChange={setOrg} />}
          {step === 2 && <StepCredentials orgId={org?.id} value={credentials} onChange={setCredentials} />}
          {step === 3 && (
            <StepConfigurePrefix
              usePrefix={usePrefix}
              setUsePrefix={setUsePrefix}
              prefix={prefix}
              setPrefix={setPrefix}
              defaultPrefix={settings.defaultPolicyPrefix}
            />
          )}
          {step === 4 && <StepSelectPolicies selected={selectedIds} setSelected={setSelectedIds} />}
          {step === 5 && (
            <StepReview
              org={org}
              credentials={credentials}
              prefix={prefix}
              usePrefix={usePrefix}
              selectedIds={selectedIds}
            />
          )}
          {step === 6 && (
            <StepDeploy
              logs={deployLogs}
              results={deployResults}
              selectedIds={selectedIds}
              running={running}
            />
          )}
        </Card.Body>
        <Card.Footer>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || running}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {step < 6 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (step === 5) { setConfirmOpen(true) }
                    else { setStep((s) => s + 1) }
                  }}
                  disabled={!canNext() || running}
                >
                  {step === 5 ? 'Deploy Policies' : 'Next'}
                </Button>
              )}
              {step === 6 && !running && Object.keys(deployResults).length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => { setStep(1); setOrg(null); setCredentials(null); setDeployLogs([]); setDeployResults({}) }}
                >
                  Start New
                </Button>
              )}
            </div>
          </div>
        </Card.Footer>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        variant="warning"
        title="Confirm Policy Deployment"
        confirmLabel="Deploy Now"
        cancelLabel="Cancel"
        onConfirm={() => { setStep(6); handleDeploy() }}
      >
        <div className="py-2 space-y-2">
          <p>You are about to create <strong>{selectedIds.length} policies</strong> in the <strong>{org?.name}</strong> tenant.</p>
          <p className="text-amber-700">This action will modify your Microsoft 365 Conditional Access and security configuration. Ensure you have reviewed all selected policies.</p>
        </div>
      </Modal>
    </div>
  )
}
