import React, { useState, useEffect, useRef } from 'react'

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounce = 300,
  className = '',
}) {
  const [local, setLocal] = useState(value || '')
  const timerRef = useRef(null)

  useEffect(() => {
    setLocal(value || '')
  }, [value])

  const handleChange = (e) => {
    const v = e.target.value
    setLocal(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange?.(v), debounce)
  }

  const handleClear = () => {
    setLocal('')
    clearTimeout(timerRef.current)
    onChange?.('')
  }

  return (
    <div className={['relative', className].join(' ')}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
