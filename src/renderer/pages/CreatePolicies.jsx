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

const STEPS = ['Org & Credentials', 'Configure Prefix', 'Select Policies', 'Review', 'Deploy']

function severityBadge(sev) {
  const v = { critical: 'error', high: 'high', medium: 'warning', low: 'info', info: 'neutral' }[sev] || 'neutral'
  return <Badge variant={v}>{sev}</Badge>
}

function resultBadge(status) {
  if (status === 'success') return <Badge variant="success">Success</Badge>
  if (status === 'failure') return <Badge variant="error">Failed</Badge>
  return <Badge variant="neutral">Pending</Badge>
}

// ── Auth mode selector banner ─────────────────────────────────────────────────
function AuthModeBanner({ mode, onChange, locked }) {
  const modes = [
    { id: 'itglue',      label: 'IT Glue',      icon: '🔗', desc: 'Pull credentials automatically from IT Glue' },
    { id: 'manual',      label: 'Manual',        icon: '✏️',  desc: 'Enter tenant name and password manually' },
    { id: 'interactive', label: 'Interactive',   icon: '🌐', desc: 'Sign in via browser or device code (WAM/MFA-safe)' },
  ]
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Authentication method</p>
      <div className="grid grid-cols-3 gap-3">
        {modes.map((m) => (
          <button
            key={m.id}
            disabled={locked}
            onClick={() => onChange(m.id)}
            className={[
              'relative flex flex-col items-start gap-1 px-4 py-3 rounded-lg border-2 text-left transition-all text-sm',
              locked && mode !== m.id ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              mode === m.id
                ? 'border-navy bg-navy-50'
                : 'border-gray-200 hover:border-gray-300 bg-white',
            ].join(' ')}
          >
            <span className="text-base leading-none">{m.icon}</span>
            <span className={`font-semibold ${mode === m.id ? 'text-navy' : 'text-gray-700'}`}>{m.label}</span>
            <span className="text-xs text-gray-500 leading-snug">{m.desc}</span>
            {mode === m.id && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-navy" />
            )}
          </button>
        ))}
      </div>
      {locked && (
        <p className="mt-1.5 text-xs text-gray-400">Auth method locked — go back to step 1 to change</p>
      )}
    </div>
  )
}

// ── Step 1: Org & Credentials (content varies by auth mode) ──────────────────
function StepOrgAndCredentials({ authMode, org, setOrg, credentials, setCredentials }) {
  if (authMode === 'itglue') return <StepItGlue org={org} setOrg={setOrg} credentials={credentials} setCredentials={setCredentials} />
  if (authMode === 'manual') return <StepManual org={org} setOrg={setOrg} credentials={credentials} setCredentials={setCredentials} />
  if (authMode === 'interactive') return <StepInteractive org={org} setOrg={setOrg} setCredentials={setCredentials} />
  return null
}

function StepItGlue({ org, setOrg, credentials, setCredentials }) {
  const { orgs, orgsLoading, loadOrgs, settings } = useStore()
  const [passwords, setPasswords] = useState([])
  const [pwLoading, setPwLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (settings.itGlueApiKey) loadOrgs()
  }, [])

  useEffect(() => {
    if (!org || org.id === 'manual' || !window.api) return
    setPwLoading(true)
    window.api.itglue.getPasswords(org.id)
      .then((res) => setPasswords(res || []))
      .catch(() => setPasswords([]))
      .finally(() => setPwLoading(false))
  }, [org?.id])

  if (!settings.itGlueApiKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="text-sm font-medium text-amber-800 mb-1">IT Glue API key not configured</p>
        <p className="text-xs text-amber-700">Go to Settings and add your IT Glue API key, or switch to Manual or Interactive mode above.</p>
      </div>
    )
  }

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.shortName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Org picker */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Select organisation</p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search organisations..." />
        <div className="mt-2 max-h-52 overflow-y-auto space-y-1 pr-1">
          {orgsLoading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-lg animate-pulse" />)
          ) : filtered.map((o) => (
            <button
              key={o.id}
              onClick={() => { setOrg(o); setCredentials(null) }}
              className={[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-left text-sm transition-all',
                org?.id === o.id ? 'border-navy bg-navy-50 text-navy font-medium' : 'border-gray-200 hover:border-navy-200 hover:bg-gray-50',
              ].join(' ')}
            >
              <span>{o.name}</span>
              {o.shortName && <span className="text-xs text-gray-400">{o.shortName}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Password picker */}
      {org && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select credential</p>
          {pwLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-lg animate-pulse mb-1" />)
          ) : passwords.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">No passwords found for this organisation</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {passwords.map((pw) => (
                <button
                  key={pw.id}
                  onClick={() => setCredentials({ username: pw.username, password: pw.password, tenantId: '' })}
                  className={[
                    'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-left text-sm transition-all',
                    credentials?.username === pw.username ? 'border-navy bg-navy-50 text-navy' : 'border-gray-200 hover:border-navy-200 hover:bg-gray-50',
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
      )}
    </div>
  )
}

function StepManual({ org, setOrg, credentials, setCredentials }) {
  const handleOrgName = (name) => setOrg({ id: 'manual', name, shortName: '' })
  const handleCred = (field, val) => {
    const updated = { ...(credentials || { username: '', password: '', tenantId: '' }), [field]: val }
    setCredentials(updated)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organisation / Tenant name</label>
        <input
          type="text"
          value={org?.name || ''}
          onChange={(e) => handleOrgName(e.target.value)}
          placeholder="e.g. Acme Corp"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <p className="mt-1 text-xs text-gray-400">Used for the policy prefix — does not need to match anything in Azure AD.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID <span className="font-normal text-gray-400">(optional)</span></label>
        <input
          type="text"
          value={credentials?.tenantId || ''}
          onChange={(e) => handleCred('tenantId', e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username / UPN</label>
        <input
          type="text"
          value={credentials?.username || ''}
          onChange={(e) => handleCred('username', e.target.value)}
          placeholder="admin@contoso.onmicrosoft.com"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={credentials?.password || ''}
          onChange={(e) => handleCred('password', e.target.value)}
          placeholder="Enter password..."
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
        Credentials are held in memory only for the duration of the deployment and are never written to disk or logs.
      </div>
    </div>
  )
}

function StepInteractive({ org, setOrg, setCredentials }) {
  useEffect(() => {
    // Signal interactive auth — no password needed
    setCredentials({ interactive: true, username: '', password: '', tenantId: '' })
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organisation / Tenant name</label>
        <input
          type="text"
          value={org?.name || ''}
          onChange={(e) => setOrg({ id: 'manual', name: e.target.value, shortName: '' })}
          placeholder="e.g. Acme Corp"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
          <p className="text-sm font-semibold text-blue-800">Interactive / WAM authentication</p>
        </div>
        <p className="text-sm text-blue-700">
          When you click Deploy, PowerShell will open a browser sign-in window (or show a device code). Sign in with your Global Admin or Security Admin account — MFA and conditional access policies will be honoured automatically.
        </p>
        <p className="text-xs text-blue-600">
          No credentials are stored or passed through this application.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
        <p className="text-xs font-medium text-gray-600">How it works</p>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>PowerShell runs <code className="font-mono bg-white px-1 rounded border border-gray-200">Connect-MgGraph</code> with no stored credentials</li>
          <li>A browser window (or device code) opens for interactive sign-in</li>
          <li>After authentication, policies are deployed and the session is closed</li>
        </ol>
      </div>
    </div>
  )
}

// ── Step 2: Configure Prefix ──────────────────────────────────────────────────
function StepConfigurePrefix({ usePrefix, setUsePrefix, prefix, setPrefix, defaultPrefix, orgName }) {
  const effectiveDefault = orgName || defaultPrefix || ''
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
            placeholder={effectiveDefault || 'e.g. Acme Corp'}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
          {effectiveDefault && !prefix && (
            <button onClick={() => setPrefix(effectiveDefault)} className="text-xs text-navy hover:underline">
              Use: "{effectiveDefault}"
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

// ── Step 3: Select Policies ───────────────────────────────────────────────────
function StepSelectPolicies({ selected, setSelected }) {
  const [search, setSearch] = useState('')

  const filteredCategories = Object.keys(POLICIES_BY_CATEGORY).reduce((acc, cat) => {
    const policies = POLICIES_BY_CATEGORY[cat].filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
    )
    if (policies.length > 0) acc[cat] = policies
    return acc
  }, {})

  const togglePolicy = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const toggleCategory = (cat) => {
    const catIds = (filteredCategories[cat] || []).map((p) => p.id)
    const allSelected = catIds.every((id) => selected.includes(id))
    setSelected((s) => allSelected ? s.filter((id) => !catIds.includes(id)) : [...new Set([...s, ...catIds])])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search policies..." className="w-64" />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelected(POLICIES.filter((p) => p.defaultEnabled).map((p) => p.id))}>Defaults</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(POLICIES.map((p) => p.id))}>All</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>None</Button>
          <Badge variant="neutral">{selected.length} selected</Badge>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
        {Object.entries(filteredCategories).map(([cat, policies]) => {
          const catIds = policies.map((p) => p.id)
          const allSel = catIds.every((id) => selected.includes(id))
          const someSel = catIds.some((id) => selected.includes(id))
          return (
            <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 cursor-pointer" onClick={() => toggleCategory(cat)}>
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
                  <label key={p.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
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

// ── Step 4: Review ────────────────────────────────────────────────────────────
function StepReview({ authMode, org, credentials, prefix, usePrefix, selectedIds }) {
  const selectedPolicies = POLICIES.filter((p) => selectedIds.includes(p.id))
  const byCategory = selectedPolicies.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const authLabel = { itglue: 'IT Glue', manual: 'Manual', interactive: 'Interactive (WAM)' }[authMode]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Organisation</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{org?.name || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Auth method</p>
          <p className="text-sm font-semibold text-gray-900">{authLabel}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Account</p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {authMode === 'interactive' ? 'Browser / device code' : (credentials?.username || '—')}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Prefix</p>
          <p className="text-sm font-semibold text-gray-900">{usePrefix && prefix ? prefix : 'None'}</p>
        </div>
      </div>

      {authMode === 'interactive' && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          A browser sign-in window will appear when deployment starts. Sign in with your admin account to proceed.
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>{selectedIds.length} policies</strong> will be created across {Object.keys(byCategory).length} categories.
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
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

// ── Step 5: Deploy ────────────────────────────────────────────────────────────
function StepDeploy({ logs, results, selectedIds, running }) {
  const selectedPolicies = POLICIES.filter((p) => selectedIds.includes(p.id))
  return (
    <div className="space-y-4">
      <LogPanel logs={logs} height="h-52" title="Deployment Output" />
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

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function CreatePolicies() {
  const { settings, addNotification } = useStore()
  const [authMode, setAuthMode] = useState('itglue')
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

  // Auto-set prefix from org name when it changes
  useEffect(() => {
    if (org?.name && !settings.defaultPolicyPrefix) setPrefix(org.name)
  }, [org?.name])

  useEffect(() => {
    if (!window.api) return
    const unOut = window.api.onPsOutput((line) => setDeployLogs((l) => [...l, { line, type: 'output' }]))
    const unErr = window.api.onPsError((line) => setDeployLogs((l) => [...l, { line, type: 'error' }]))
    return () => { unOut?.(); unErr?.() }
  }, [])

  const canNext = () => {
    if (step === 1) {
      if (!org?.name) return false
      if (authMode === 'interactive') return true
      if (authMode === 'manual') return !!(credentials?.username && credentials?.password)
      if (authMode === 'itglue') return !!(credentials?.username && credentials?.password)
      return false
    }
    if (step === 2) return true
    if (step === 3) return selectedIds.length > 0
    if (step === 4) return true
    return false
  }

  const handleAuthModeChange = (mode) => {
    setAuthMode(mode)
    setOrg(null)
    setCredentials(null)
  }

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
        authMode,
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

  const reset = () => {
    setStep(1); setOrg(null); setCredentials(null)
    setDeployLogs([]); setDeployResults({})
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Security Policies</h1>
        <p className="mt-1 text-sm text-gray-500">Deploy M365 security policies to a tenant in {STEPS.length} steps</p>
      </div>

      <AuthModeBanner mode={authMode} onChange={handleAuthModeChange} locked={step > 1} />

      <div className="mb-6">
        <ProgressStep steps={STEPS} currentStep={step} />
      </div>

      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-gray-900">Step {step}: {STEPS[step - 1]}</h2>
        </Card.Header>
        <Card.Body>
          {step === 1 && (
            <StepOrgAndCredentials
              authMode={authMode}
              org={org} setOrg={setOrg}
              credentials={credentials} setCredentials={setCredentials}
            />
          )}
          {step === 2 && (
            <StepConfigurePrefix
              usePrefix={usePrefix} setUsePrefix={setUsePrefix}
              prefix={prefix} setPrefix={setPrefix}
              defaultPrefix={settings.defaultPolicyPrefix}
              orgName={org?.name}
            />
          )}
          {step === 3 && <StepSelectPolicies selected={selectedIds} setSelected={setSelectedIds} />}
          {step === 4 && (
            <StepReview
              authMode={authMode} org={org}
              credentials={credentials}
              prefix={prefix} usePrefix={usePrefix}
              selectedIds={selectedIds}
            />
          )}
          {step === 5 && (
            <StepDeploy logs={deployLogs} results={deployResults} selectedIds={selectedIds} running={running} />
          )}
        </Card.Body>
        <Card.Footer>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || running}>
              Back
            </Button>
            <div className="flex gap-2">
              {step < 5 && (
                <Button
                  variant="primary"
                  onClick={() => step === 4 ? setConfirmOpen(true) : setStep((s) => s + 1)}
                  disabled={!canNext() || running}
                >
                  {step === 4 ? 'Deploy Policies' : 'Next'}
                </Button>
              )}
              {step === 5 && !running && Object.keys(deployResults).length > 0 && (
                <Button variant="secondary" onClick={reset}>Start New</Button>
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
        onConfirm={() => { setStep(5); handleDeploy() }}
      >
        <div className="py-2 space-y-2">
          <p>You are about to create <strong>{selectedIds.length} policies</strong> in the <strong>{org?.name}</strong> tenant.</p>
          {authMode === 'interactive' && (
            <p className="text-blue-700">A browser sign-in window will open. Complete the authentication to begin deployment.</p>
          )}
          <p className="text-amber-700">This will modify your Microsoft 365 Conditional Access and security configuration.</p>
        </div>
      </Modal>
    </div>
  )
}
