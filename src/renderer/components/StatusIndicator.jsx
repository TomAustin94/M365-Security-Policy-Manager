import React from 'react'

const configs = {
  ok: { dot: 'bg-green-500', ring: 'bg-green-500 animate-ping', label: 'text-green-700' },
  warning: { dot: 'bg-amber-400', ring: '', label: 'text-amber-700' },
  error: { dot: 'bg-red-500', ring: 'bg-red-500 animate-ping', label: 'text-red-700' },
  unknown: { dot: 'bg-gray-300', ring: '', label: 'text-gray-500' },
  loading: { dot: 'bg-blue-400 animate-pulse', ring: '', label: 'text-blue-600' },
}

export default function StatusIndicator({ status = 'unknown', label, showLabel = true, size = 'md' }) {
  const cfg = configs[status] || configs.unknown
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex-shrink-0">
        <span className={['rounded-full', dotSize, cfg.dot].join(' ')} />
        {cfg.ring && (
          <span className={['absolute inset-0 rounded-full opacity-75', cfg.ring].join(' ')} />
        )}
      </span>
      {showLabel && label && (
        <span className={['text-xs font-medium', cfg.label].join(' ')}>{label}</span>
      )}
    </span>
  )
}
