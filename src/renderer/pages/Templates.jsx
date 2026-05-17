import React, { useState } from 'react'
import useStore from '../store'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { POLICIES } from '../../shared/constants'

function policyName(id) {
  return POLICIES.find((p) => p.id === id)?.name || id
}

function TemplateSummary({ template }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-sm text-gray-500">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-navy text-xs hover:underline"
      >
        {template.selectedIds.length} {template.selectedIds.length === 1 ? 'policy' : 'policies'}
        {open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <ul className="mt-2 space-y-0.5 max-h-36 overflow-y-auto">
          {template.selectedIds.map((id) => (
            <li key={id} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-mono text-gray-400 w-12 flex-shrink-0">{id}</span>
              {policyName(id)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EditModal({ template, onClose, onSave }) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || '')

  return (
    <Modal open onClose={onClose} title="Edit Template" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onSave({ name: name.trim() || template.name, description })}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteConfirm({ template, onClose, onConfirm }) {
  return (
    <Modal open onClose={onClose} title="Delete Template" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{template.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Templates() {
  const { templates, updateTemplate, deleteTemplate, addNotification } = useStore()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleSave(patch) {
    await updateTemplate(editing.id, patch)
    addNotification('Template updated', 'success')
    setEditing(null)
  }

  async function handleDelete() {
    await deleteTemplate(deleting.id)
    addNotification('Template deleted', 'success')
    setDeleting(null)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage policy templates that engineers can deploy. Create templates via the Create Policies wizard.
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="flex flex-col items-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No templates yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Use the Create Policies wizard and click "Save as Template" at the Review step.
              </p>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <Card.Body>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h3>
                      {t.prefix && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono flex-shrink-0">
                          {t.prefix}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-500 mb-2">{t.description}</p>
                    )}
                    <TemplateSummary template={t} />
                    <p className="text-xs text-gray-400 mt-2">
                      Created {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="secondary" onClick={() => setEditing(t)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => setDeleting(t)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          template={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
      {deleting && (
        <DeleteConfirm
          template={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
