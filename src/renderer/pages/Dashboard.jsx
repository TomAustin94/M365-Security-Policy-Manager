import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import StatusIndicator from '../components/StatusIndicator'

function StatCard({ label, value, sub, status, onClick }) {
  return (
    <Card hoverable={!!onClick} onClick={onClick} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
        </div>
        {status && <StatusIndicator status={status} showLabel={false} />}
      </div>
    </Card>
  )
}

function QuickActionCard({ title, description, icon, onClick, variant = 'default' }) {
  return (
    <Card
      hoverable
      onClick={onClick}
      className={[
        'p-5 cursor-pointer border-2 transition-all',
        variant === 'primary' ? 'border-navy hover:border-navy-600' : 'border-transparent hover:border-navy-200',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        <div className={[
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          variant === 'primary' ? 'bg-navy text-white' : 'bg-navy-50 text-navy',
        ].join(' ')}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { modules, psStatus, modulesLoading, logs, loadModules, settings } = useStore()

  useEffect(() => {
    loadModules()
  }, [])

  const upToDate = modules.filter((m) => m.Status === 'up_to_date').length
  const updateAvail = modules.filter((m) => m.Status === 'update_available').length
  const notInstalled = modules.filter((m) => m.Status === 'not_installed').length
  const recentLogs = logs.slice(-10).reverse()

  const moduleHealth = !psStatus?.found ? 'error' : notInstalled > 0 ? 'warning' : updateAvail > 0 ? 'warning' : upToDate > 0 ? 'ok' : 'unknown'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">M365 Security Policy Manager overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="PowerShell"
          value={psStatus?.found ? 'Ready' : modulesLoading ? '...' : 'Not Found'}
          sub={psStatus?.version || (psStatus?.found === false ? 'Install required' : '')}
          status={psStatus?.found ? 'ok' : psStatus === null ? 'loading' : 'error'}
        />
        <StatCard
          label="Modules Up-to-Date"
          value={modulesLoading ? '...' : upToDate}
          sub={`of ${modules.length} required`}
          status={moduleHealth}
          onClick={() => navigate('/modules')}
        />
        <StatCard
          label="Updates Available"
          value={modulesLoading ? '...' : updateAvail}
          sub="modules need updating"
          status={updateAvail > 0 ? 'warning' : 'ok'}
          onClick={() => navigate('/modules')}
        />
        <StatCard
          label="Not Installed"
          value={modulesLoading ? '...' : notInstalled}
          sub="modules missing"
          status={notInstalled > 0 ? 'error' : 'ok'}
          onClick={() => navigate('/modules')}
        />
      </div>

      {/* IT Glue connection status */}
      <Card className="mb-8">
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">IT Glue Connection</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>Configure</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {settings.itGlueApiKey ? (
            <div className="flex items-center gap-3">
              <StatusIndicator status="ok" label="API key configured" />
              <span className="text-xs text-gray-500">Base URL: {settings.itGlueBaseUrl}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <StatusIndicator status="warning" label="No API key configured" />
              <span className="text-xs text-gray-500">
                Configure your IT Glue API key in Settings to enable organisation and credential lookup.
              </span>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickActionCard
              variant="primary"
              title="Create Policies"
              description="Walk through the 6-step wizard to create security policies for an M365 tenant."
              onClick={() => navigate('/create')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            />
            <QuickActionCard
              title="Check Module Health"
              description="Verify all required PowerShell modules are installed and up-to-date."
              onClick={() => navigate('/modules')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <QuickActionCard
              title="Manage Existing Policies"
              description="View, edit, enable/disable, or delete existing conditional access policies."
              onClick={() => navigate('/manage')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            />
            <QuickActionCard
              title="Configure Settings"
              description="Set up IT Glue integration, PowerShell path, and application preferences."
              onClick={() => navigate('/settings')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Recent Activity</h2>
          <Card>
            <Card.Body className="p-0">
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentLogs.map((entry, i) => {
                    const line = typeof entry === 'string' ? entry : entry.line
                    const type = typeof entry === 'object' ? entry.type : 'output'
                    const isError = type === 'error' || line.toUpperCase().startsWith('ERROR:') || line.toUpperCase().startsWith('FAILURE:')
                    const isSuccess = line.toUpperCase().startsWith('SUCCESS:') || line.toUpperCase().startsWith('CONNECTED:')
                    const badgeVariant = isError ? 'error' : isSuccess ? 'success' : 'neutral'
                    return (
                      <li key={i} className="flex items-start gap-3 px-5 py-3">
                        <Badge variant={badgeVariant} className="mt-0.5 flex-shrink-0">
                          {isError ? 'ERR' : isSuccess ? 'OK' : 'LOG'}
                        </Badge>
                        <span className="text-xs text-gray-600 font-mono break-all">{line}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  )
}
