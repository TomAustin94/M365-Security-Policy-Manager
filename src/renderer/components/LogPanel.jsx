import React, { useEffect, useRef } from 'react'

function colorLine(line) {
  if (!line) return { text: '', cls: 'text-gray-400' }
  const l = line.toUpperCase()
  if (l.startsWith('SUCCESS:') || l.startsWith('CONNECTED:') || l.startsWith('DONE')) return { text: line, cls: 'text-green-400' }
  if (l.startsWith('ERROR:') || l.startsWith('FAILURE:')) return { text: line, cls: 'text-red-400' }
  if (l.startsWith('WARNING:') || l.startsWith('WARN:')) return { text: line, cls: 'text-amber-400' }
  if (l.startsWith('INFO:') || l.startsWith('CREATING:') || l.startsWith('INSTALLING:') || l.startsWith('UPDATING:')) return { text: line, cls: 'text-blue-400' }
  if (l.startsWith('SKIP:') || l.startsWith('DISCONNECTED:')) return { text: line, cls: 'text-gray-400' }
  return { text: line, cls: 'text-gray-200' }
}

export default function LogPanel({ logs = [], height = 'h-64', title = 'Output' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>
      <div className={['bg-gray-900 overflow-y-auto font-mono text-xs leading-relaxed p-4', height].join(' ')}>
        {logs.length === 0 ? (
          <span className="text-gray-600">Waiting for output...</span>
        ) : (
          logs.map((entry, i) => {
            const { text, cls } = colorLine(typeof entry === 'string' ? entry : entry.line)
            return (
              <div key={i} className={['whitespace-pre-wrap break-all', cls].join(' ')}>
                <span className="text-gray-600 select-none mr-2">{String(i + 1).padStart(3, '0')}</span>
                {text}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
