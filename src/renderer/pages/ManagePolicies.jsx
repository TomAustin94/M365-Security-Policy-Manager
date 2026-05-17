import React, { useState, useEffect, useRef } from 'react'
import useStore from '../store'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import SlideOver from '../components/SlideOver'
import SearchInput from '../components/SearchInput'

function stateBadge(state) {
  if (!state) return <Badge variant="neutral">Unknown</Badge>
  const s = state.toLowerCase()
  if (s === 'enabled') return <Badge variant="success">Enabled</Badge>
  if (s === 'disabled') return <Badge variant="neutral">Disabled</Badge>
  if (s === 'enabledforReportingButNotEnforced' || s === 'report-only') return <Badge variant="info">Report Only</Badge>
  return <Badge variant="neutral">{state}</Badge>
}

function formatDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString() } catch { return d }
}

// Simple JSON editor without Monaco (Monaco is large; use textarea as fallback)
function JsonEditor({ value, onChange }) {
  const [text, setText] = useState(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  const [error, setError] = useState('')
  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          try {
            JSON.parse(e.target.value)
            setError('')
            onChange?.(e.target.value)
          } catch {
            setError('Invalid JSON')
          }
        }}
        rows={18}
        className="block w-full font-mono text-xs border border-gray-300 rounded-md p-3 focus:border-navy focus:ring-1 focus:ring-navy resize-none bg-gray-950 text-green-400"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function ManagePolicies() {
  const { orgs, orgsLoading, loadOrgs, settings, addNotification } = useStore()
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [credentials, setCredentials] = useState({ username: '', password: '', tenantId: '' })
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [bulkAction, setBulkAction] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editJson, setEditJson] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    if (settings.itGlueApiKey) loadOrgs()
  }, [])

  const handleLoad = async () => {
    if (!window.api || !credentials.username || !credentials.password) return
    setLoading(true)
    try {
      const result = await window.api.policies.list(credentials)
      setPolicies(Array.isArray(result) ? result : [])
      setSelectedRows(new Set())
    } catch (err) {
      addNotification('Failed to load policies: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = policies.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (p.DisplayName || '').toLowerCase().includes(q) ||
      (p.State || '').toLowerCase().includes(q) ||
      (p.Id || '').toLowerCase().includes(q)
    )
  })

  const toggleRow = (id) => setSelectedRows((s) => {
    const ns = new Set(s)
    ns.has(id) ? ns.delete(id) : ns.add(id)
    return ns
  })

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(filtered.map((p) => p.Id)))
  }

  const handleDelete = async () => {
    if (!window.api || !deleteTarget) return
    setDeleteLoading(true)
    try {
      await window.api.policies.delete(deleteTarget.Id)
      setPolicies((ps) => ps.filter((p) => p.Id !== deleteTarget.Id))
      addNotification('Policy deleted', 'success')
    } catch (err) {
      addNotification('Delete failed: ' + err.message, 'error')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleToggle = async (policy) => {
    if (!window.api) return
    const newState = policy.State === 'enabled' ? 'disabled' : 'enabled'
    try {
      await window.api.policies.toggleState(policy.Id, newState)
      setPolicies((ps) => ps.map((p) => p.Id === policy.Id ? { ...p, State: newState } : p))
      addNotification(`Policy ${newState}`, 'success')
    } catch (err) {
      addNotification('Toggle failed: ' + err.message, 'error')
    }
  }

  const handleBulk = async () => {
    if (!window.api || !bulkAction || selectedRows.size === 0) return
    setBulkLoading(true)
    const ids = [...selectedRows]
    try {
      if (bulkAction === 'delete') {
        await Promise.all(ids.map((id) => window.api.policies.delete(id)))
        setPolicies((ps) => ps.filter((p) => !selectedRows.has(p.Id)))
        addNotification(`${ids.length} policies deleted`, 'success')
      } else {
        await Promise.all(ids.map((id) => window.api.policies.toggleState(id, bulkAction)))
        setPolicies((ps) => ps.map((p) => selectedRows.has(p.Id) ? { ...p, State: bulkAction } : p))
        addNotification(`${ids.length} policies ${bulkAction}`, 'success')
      }
      setSelectedRows(new Set())
    } catch (err) {
      addNotification('Bulk action failed: ' + err.message, 'error')
    } finally {
      setBulkLoading(false)
      setBulkAction('')
    }
  }

  const handleEdit = (policy) => {
    setEditTarget(policy)
    setEditJson(JSON.stringify(policy, null, 2))
  }

  const handleSaveEdit = async () => {
    if (!window.api || !editTarget) return
    setSaveLoading(true)
    try {
      const patch = JSON.parse(editJson)
      await window.api.policies.update(editTarget.Id, patch)
      setPolicies((ps) => ps.map((p) => p.Id === editTarget.Id ? { ...p, ...patch } : p))
      addNotification('Policy updated', 'success')
      setEditTarget(null)
    } catch (err) {
      addNotification('Save failed: ' + err.message, 'error')
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manage Policies</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage existing Conditional Access policies</p>
      </div>

      {/* Connection */}
      <Card className="mb-6">
        <Card.Header>
          <h2 className="text-sm font-semibold text-gray-900">Tenant Connection</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Username / UPN</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((c) => ({ ...c, username: e.target.value }))}
                placeholder="admin@tenant.com"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
                placeholder="Password"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tenant ID (optional)</label>
              <input
                type="text"
                value={credentials.tenantId}
                onChange={(e) => setCredentials((c) => ({ ...c, tenantId: e.target.value }))}
                placeholder="Optional"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={handleLoad}
                loading={loading}
                disabled={!credentials.username || !credentials.password}
                className="w-full"
              >
                Load Policies
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Toolbar */}
      {policies.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search policies..." className="w-72" />
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <>
                <span className="text-xs text-gray-500">{selectedRows.size} selected</span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="rounded-md border border-gray-300 text-sm px-2 py-1.5 focus:border-navy focus:ring-1 focus:ring-navy"
                >
                  <option value="">Bulk action...</option>
                  <option value="enabled">Enable</option>
                  <option value="disabled">Disable</option>
                  <option value="delete">Delete</option>
                </select>
                <Button size="sm" variant="secondary" onClick={handleBulk} loading={bulkLoading} disabled={!bulkAction}>Apply</Button>
              </>
            )}
            <Button size="sm" variant="secondary" onClick={handleLoad} loading={loading}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Policy table */}
      <Card>
        {policies.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No policies loaded. Enter credentials and click Load Policies.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filtered.length && filtered.length > 0}
                      ref={(el) => { if (el) el.indeterminate = selectedRows.size > 0 && selectedRows.size < filtered.length }}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-navy"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modified</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6].map((j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.map((policy) => (
                  <tr key={policy.Id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(policy.Id)}
                        onChange={() => toggleRow(policy.Id)}
                        className="h-4 w-4 rounded border-gray-300 text-navy"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{policy.DisplayName}</div>
                      <div className="text-xs text-gray-400 font-mono">{policy.Id}</div>
                    </td>
                    <td className="px-4 py-3">{stateBadge(policy.State)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(policy.CreatedDateTime)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(policy.ModifiedDateTime)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(policy)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggle(policy)}
                        >
                          {policy.State === 'enabled' ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(policy)}>
                          <span className="text-red-600">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
        title="Delete Policy"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        loading={deleteLoading}
      >
        <p className="py-2">
          Are you sure you want to delete <strong>{deleteTarget?.DisplayName}</strong>? This action cannot be undone.
        </p>
      </Modal>

      {/* Edit slide-over */}
      <SlideOver
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit: ${editTarget.DisplayName}` : 'Edit Policy'}
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            Edit the policy JSON below and save to apply changes. Only modify fields you intend to change.
          </p>
          <JsonEditor value={editJson} onChange={setEditJson} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveEdit} loading={saveLoading}>Save Changes</Button>
          </div>
        </div>
      </SlideOver>
    </div>
  )
}
