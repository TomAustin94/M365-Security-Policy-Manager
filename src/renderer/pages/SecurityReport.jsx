import React, { useState, useEffect, useCallback } from 'react'
import useStore from '../store'
import { BASELINES } from '../data/baselines'
import { POLICIES } from '../../shared/constants'
import Button from '../components/Button'
import Badge from '../components/Badge'
import SearchInput from '../components/SearchInput'

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchPolicy(tenantPolicies, baselinePolicyName) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const bn = normalize(baselinePolicyName)
  const stopWords = new Set([
    'for', 'all', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at',
    'with', 'from', 'require', 'block', 'enable',
  ])
  const keywords = bn.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w))

  for (const tp of tenantPolicies) {
    const tn = normalize(tp.DisplayName)
    if (tn.includes(bn) || bn.includes(tn)) return tp
    if (keywords.length > 0) {
      const matched = keywords.filter((k) => tn.includes(k))
      if (matched.length >= Math.ceil(keywords.length * 0.6)) return tp
    }
  }
  return null
}

function severityOrder(sev) {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[sev] ?? 5
}

function SeverityBadge({ severity }) {
  const variants = {
    critical: 'error',
    high: 'high',
    medium: 'warning',
    low: 'info',
    info: 'neutral',
  }
  return <Badge variant={variants[severity] || 'neutral'}>{severity}</Badge>
}

// ── Left panel sub-components ─────────────────────────────────────────────────

function AuthModeSelector({ mode, onChange }) {
  const modes = [
    { id: 'itglue', label: 'IT Glue' },
    { id: 'interactive', label: 'Interactive' },
  ]
  return (
    <div className="flex gap-2 mb-4">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={[
            'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
            mode === m.id
              ? 'border-navy bg-navy-50 text-navy'
              : 'border-gray-200 hover:border-gray-300 text-gray-600',
          ].join(' ')}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

function ItGluePanel({ org, setOrg, credentials, setCredentials }) {
  const { orgs, orgsLoading, loadOrgs, settings } = useStore()
  const [passwords, setPasswords] = useState([])
  const [allPasswords, setAllPasswords] = useState([])
  const [pwLoading, setPwLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (settings.itGlueApiKey) loadOrgs()
  }, [])

  useEffect(() => {
    if (!org || org.id === 'manual' || !window.api) return
    setPwLoading(true)
    window.api.itglue
      .getPasswords(org.id)
      .then((res) => {
        const all = res || []
        setAllPasswords(all)
        // Filter: name contains "365" or "global admin" (case-insensitive)
        // AND does NOT contain "recovery", "break glass", "emergency", "backup"
        const exclusionWords = ['recovery', 'break glass', 'breakglass', 'emergency', 'backup']
        const filtered = all.filter((pw) => {
          const n = pw.name.toLowerCase()
          const includes365OrAdmin =
            n.includes('365') || n.includes('global admin') || n.includes('globaladmin')
          const isExcluded = exclusionWords.some((ex) => n.includes(ex))
          return includes365OrAdmin && !isExcluded
        })
        setPasswords(filtered)
      })
      .catch(() => {
        setPasswords([])
        setAllPasswords([])
      })
      .finally(() => setPwLoading(false))
  }, [org?.id])

  if (!settings.itGlueApiKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-xs font-medium text-amber-800 mb-1">IT Glue API key not configured</p>
        <p className="text-xs text-amber-700">Go to Settings to add your IT Glue API key.</p>
      </div>
    )
  }

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.shortName || '').toLowerCase().includes(search.toLowerCase())
  )

  const hiddenCount = allPasswords.length - passwords.length

  return (
    <div className="space-y-4">
      {/* Org picker */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Organisation
        </p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search orgs..." />
        <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 pr-1">
          {orgsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">No organisations found</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setOrg(o)
                  setCredentials(null)
                }}
                className={[
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-all',
                  org?.id === o.id
                    ? 'border-navy bg-navy-50 text-navy font-medium'
                    : 'border-gray-200 hover:border-navy-200 hover:bg-gray-50',
                ].join(' ')}
              >
                <span>{o.name}</span>
                {o.shortName && <span className="text-gray-400">{o.shortName}</span>}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Password picker */}
      {org && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Credential
          </p>
          {pwLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse mb-1" />
            ))
          ) : passwords.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">
              No 365 / Global Admin credentials found
            </p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {passwords.map((pw) => (
                <button
                  key={pw.id}
                  onClick={() =>
                    setCredentials({ username: pw.username, password: pw.password, tenantId: '' })
                  }
                  className={[
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-all',
                    credentials?.username === pw.username
                      ? 'border-navy bg-navy-50 text-navy'
                      : 'border-gray-200 hover:border-navy-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div>
                    <p className="font-medium text-gray-800">{pw.name}</p>
                    <p className="text-gray-500">{pw.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {hiddenCount > 0 && (
            <p className="mt-1.5 text-xs text-gray-400 italic">
              {hiddenCount} password{hiddenCount !== 1 ? 's' : ''} hidden (recovery / break-glass)
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function InteractivePanel({ org, setOrg, setCredentials }) {
  useEffect(() => {
    setCredentials({ interactive: true, username: '', password: '', tenantId: '' })
  }, [])

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        Organisation name
      </label>
      <input
        type="text"
        value={org?.name || ''}
        onChange={(e) => setOrg({ id: 'manual', name: e.target.value, shortName: '' })}
        placeholder="e.g. Acme Corp"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
      />
      <p className="mt-2 text-xs text-gray-500">
        A browser sign-in window will open when you generate the report.
      </p>
    </div>
  )
}

// ── Score card ────────────────────────────────────────────────────────────────

function ScoreCard({ score, deployed, total, missing, critical }) {
  const pct = Math.round(score * 100)
  const colorClass =
    pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-500' : 'text-red-600'

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
        <p className={`text-5xl font-bold ${colorClass} leading-none`}>{pct}%</p>
        <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">Score</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
        <p className="text-3xl font-bold text-gray-800 leading-none">
          {deployed}&nbsp;<span className="text-xl text-gray-400">/ {total}</span>
        </p>
        <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">Deployed</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
        <p className="text-3xl font-bold text-gray-800 leading-none">{missing}</p>
        <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">Missing</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
        <p className="text-3xl font-bold text-red-600 leading-none">{critical}</p>
        <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">
          Critical gaps
        </p>
      </div>
    </div>
  )
}

// ── Report panel ──────────────────────────────────────────────────────────────

function ReportView({ orgName, baseline, tenantPolicies, date }) {
  // Get only CA policies from the baseline
  const baselineCAPolicies = POLICIES.filter(
    (p) => p.category === 'Conditional Access' && baseline.policyIds.includes(p.id)
  )

  // Match each baseline CA policy to a tenant policy
  const coverageRows = baselineCAPolicies
    .map((bp) => {
      const match = matchPolicy(tenantPolicies, bp.name)
      return { baseline: bp, match }
    })
    .sort((a, b) => {
      // Sort: missing first, then by severity
      if (!a.match && b.match) return -1
      if (a.match && !b.match) return 1
      return severityOrder(a.baseline.severity) - severityOrder(b.baseline.severity)
    })

  const deployed = coverageRows.filter((r) => r.match).length
  const total = coverageRows.length
  const missing = total - deployed
  const score = total > 0 ? deployed / total : 0
  const criticalGaps = coverageRows.filter(
    (r) => !r.match && (r.baseline.severity === 'critical' || r.baseline.severity === 'high')
  ).length

  // Additional policies — in tenant but not matched to any baseline CA policy
  const matchedTenantIds = new Set(
    coverageRows.filter((r) => r.match).map((r) => r.match.Id)
  )
  const additionalPolicies = tenantPolicies.filter((tp) => !matchedTenantIds.has(tp.Id))

  // Top 3 missing critical/high recommendations
  const topRecommendations = coverageRows
    .filter((r) => !r.match && (r.baseline.severity === 'critical' || r.baseline.severity === 'high'))
    .slice(0, 3)

  function handleExportPDF() {
    const style = document.createElement('style')
    style.textContent = `@media print { body * { visibility: hidden !important; } #report-printable, #report-printable * { visibility: visible !important; } #report-printable { position: fixed; top: 0; left: 0; width: 100%; } }`
    document.head.appendChild(style)
    window.print()
    setTimeout(() => document.head.removeChild(style), 1000)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Export button */}
      <div className="flex justify-end px-6 pt-4 pb-2">
        <Button variant="secondary" onClick={handleExportPDF}>
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Export PDF
        </Button>
      </div>

      <div id="report-printable" className="px-6 pb-8">
        {/* Header */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: '#1e2d4a' }}>
          <div className="px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">
                  M365 Security Policy Manager
                </p>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  Security Posture Report
                </h1>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                  <span>
                    <span className="text-white/40 mr-1">Org:</span>
                    <span className="text-white font-medium">{orgName || 'Unknown'}</span>
                  </span>
                  <span>
                    <span className="text-white/40 mr-1">Date:</span>
                    <span className="text-white font-medium">{date}</span>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-white/70">
                    <span className="text-white/40 mr-1">Baseline:</span>
                    <span className="text-white font-medium">{baseline.name}</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {baseline.source}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10">
                <svg
                  className="w-9 h-9 text-white/80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Score cards */}
        <ScoreCard
          score={score}
          deployed={deployed}
          total={total}
          missing={missing}
          critical={criticalGaps}
        />

        {/* Baseline coverage table */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-navy"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Baseline Coverage — Conditional Access Policies
          </h2>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Policy Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                    Severity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Matched Policy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coverageRows.map(({ baseline: bp, match }) => (
                  <tr
                    key={bp.id}
                    className={match ? 'bg-white' : 'bg-red-50/30'}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{bp.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{bp.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={bp.severity} />
                    </td>
                    <td className="px-4 py-3">
                      {match ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Deployed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {match ? (
                        <span className="text-xs text-gray-500 italic">{match.DisplayName}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Additional deployed policies */}
        {additionalPolicies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-navy"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Additional Deployed Policies
              <span className="text-xs font-normal text-gray-400 ml-1">
                (not in selected baseline)
              </span>
            </h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {additionalPolicies.map((tp) => (
                  <li key={tp.Id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{tp.DisplayName}</span>
                      <span className="ml-2 text-xs text-gray-400 font-mono">{tp.Id}</span>
                    </div>
                    <span
                      className={[
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        tp.State === 'enabled'
                          ? 'bg-green-100 text-green-700'
                          : tp.State === 'enabledForReportingButNotEnforced'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500',
                      ].join(' ')}
                    >
                      {tp.State === 'enabled'
                        ? 'Enabled'
                        : tp.State === 'enabledForReportingButNotEnforced'
                        ? 'Report-only'
                        : tp.State || 'Unknown'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Recommendations */}
        {topRecommendations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Recommendations
            </h2>
            <div className="space-y-3">
              {topRecommendations.map(({ baseline: bp }) => (
                <div
                  key={bp.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-4"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <SeverityBadge severity={bp.severity} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{bp.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{bp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Note */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Note:</span> This audit covers
            Conditional Access policies only. Identity Protection, Intune and Exchange policies
            require manual review.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Empty / Loading states ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: '#f0f3f8' }}
      >
        <svg
          className="w-10 h-10 text-navy/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.4}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-600 mb-2">No report generated</h3>
      <p className="text-sm text-gray-400 max-w-xs">
        Connect to a tenant and generate a security posture report to see results here.
      </p>
    </div>
  )
}

function LoadingState({ lastLine }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-12 h-12 rounded-full border-4 border-navy/20 border-t-navy animate-spin mb-6" />
      <p className="text-sm font-medium text-gray-700">Auditing tenant policies…</p>
      {lastLine && (
        <p className="mt-2 text-xs text-gray-400 max-w-sm truncate">{lastLine}</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SecurityReport() {
  const [authMode, setAuthMode] = useState('itglue')
  const [org, setOrg] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [selectedBaseline, setSelectedBaseline] = useState(BASELINES[0])
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [logs, setLogs] = useState([])
  const [report, setReport] = useState(null) // { policies, orgName, baseline, date }
  const [errorMsg, setErrorMsg] = useState('')

  const lastLine = logs[logs.length - 1] || ''

  const canGenerate = useCallback(() => {
    if (!org?.name) return false
    if (authMode === 'itglue' && !credentials) return false
    return true
  }, [org, authMode, credentials])

  function handleAuthModeChange(mode) {
    setAuthMode(mode)
    setCredentials(null)
    if (mode === 'interactive') {
      setOrg((prev) => prev?.id === 'manual' ? prev : null)
    }
  }

  async function handleGenerate() {
    if (!canGenerate()) return
    setStatus('running')
    setLogs([])
    setReport(null)
    setErrorMsg('')

    // Subscribe to ps:output for log lines
    const unsub = window.api?.onPsOutput?.((line) => {
      setLogs((prev) => [...prev, line])
    })

    try {
      const result = await window.api.report.audit({
        credentials: authMode === 'interactive' ? null : credentials,
        authMode,
      })

      if (result.error) {
        setErrorMsg(result.error)
        setStatus('error')
      } else {
        setReport({
          policies: result.policies,
          orgName: org?.name || '',
          baseline: selectedBaseline,
          date: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        })
        setStatus('done')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unknown error')
      setStatus('error')
    } finally {
      unsub?.()
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left setup panel ── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
        <div className="px-5 py-5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Security Report</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit your tenant's Conditional Access policies
          </p>
        </div>

        <div className="flex-1 px-5 py-5 space-y-6">
          {/* Auth mode */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Authentication
            </p>
            <AuthModeSelector mode={authMode} onChange={handleAuthModeChange} />

            {authMode === 'itglue' ? (
              <ItGluePanel
                org={org}
                setOrg={setOrg}
                credentials={credentials}
                setCredentials={setCredentials}
              />
            ) : (
              <InteractivePanel
                org={org}
                setOrg={setOrg}
                setCredentials={setCredentials}
              />
            )}
          </div>

          {/* Baseline selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Baseline
            </p>
            <div className="space-y-1.5">
              {BASELINES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBaseline(b)}
                  className={[
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                    selectedBaseline.id === b.id
                      ? 'border-navy bg-navy-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ring-2',
                      selectedBaseline.id === b.id
                        ? 'bg-navy ring-navy/30'
                        : 'bg-white ring-gray-300',
                    ].join(' ')}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold leading-tight ${
                        selectedBaseline.id === b.id ? 'text-navy' : 'text-gray-700'
                      }`}
                    >
                      {b.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight truncate">
                      {b.source}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate button + status */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          {status === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-semibold text-red-700 mb-0.5">Error</p>
              <p className="text-xs text-red-600 break-words">{errorMsg}</p>
            </div>
          )}

          {status === 'running' && logs.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 max-h-28 overflow-y-auto">
              {logs.map((l, i) => (
                <p key={i} className="text-xs font-mono text-gray-500 leading-relaxed truncate">
                  {l}
                </p>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            disabled={!canGenerate() || status === 'running'}
            onClick={handleGenerate}
          >
            {status === 'running' ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Auditing…
              </span>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </aside>

      {/* ── Right report panel ── */}
      <main className="flex-1 overflow-hidden bg-gray-50">
        {status === 'idle' || (status === 'error' && !report) ? (
          <EmptyState />
        ) : status === 'running' ? (
          <LoadingState lastLine={lastLine} />
        ) : report ? (
          <ReportView
            orgName={report.orgName}
            baseline={report.baseline}
            tenantPolicies={report.policies}
            date={report.date}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  )
}
