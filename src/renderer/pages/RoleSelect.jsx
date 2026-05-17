import React, { useState } from 'react'
import useStore from '../store'

export default function RoleSelect() {
  const { settings, setRole, loadTemplates } = useStore()
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  function enterEngineer() {
    loadTemplates()
    setRole('engineer')
  }

  function handleAdminClick() {
    if (!settings.adminPin) {
      // No PIN set — enter as admin directly
      loadTemplates()
      setRole('admin')
    } else {
      setShowPin(true)
      setPin('')
      setPinError('')
    }
  }

  function handlePinSubmit(e) {
    e.preventDefault()
    if (pin === settings.adminPin) {
      loadTemplates()
      setRole('admin')
    } else {
      setPinError('Incorrect PIN')
      setPin('')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-navy">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">M365 Security Policy Manager</h1>
          <p className="text-white/60 text-sm mt-1">Select your role to continue</p>
        </div>

        {!showPin ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Engineer */}
            <button
              onClick={enterEngineer}
              className="flex flex-col items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-6 py-8 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-white font-semibold text-sm">Engineer</div>
                <div className="text-white/50 text-xs mt-0.5">Deploy templates</div>
              </div>
            </button>

            {/* Admin */}
            <button
              onClick={handleAdminClick}
              className="flex flex-col items-center gap-3 bg-gold/20 hover:bg-gold/30 border border-gold/40 rounded-xl px-6 py-8 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gold/20 group-hover:bg-gold/30 flex items-center justify-center transition-all">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-gold font-semibold text-sm">Admin</div>
                <div className="text-white/50 text-xs mt-0.5">Full access</div>
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-white/10 border border-white/20 rounded-xl p-6">
            <h2 className="text-white font-semibold text-center mb-1">Admin PIN</h2>
            <p className="text-white/50 text-xs text-center mb-4">Enter your admin PIN to continue</p>
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError('') }}
                placeholder="••••••"
                autoFocus
                className="block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/30 text-center text-lg tracking-widest focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
              {pinError && <p className="text-red-400 text-xs text-center">{pinError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPin(false)}
                  className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white/70 hover:text-white hover:border-white/40 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-gold hover:bg-gold/90 py-2 text-sm font-semibold text-white transition-all"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="text-white/30 text-xs text-center mt-8">
          Role is session-only and resets on restart
        </p>
      </div>
    </div>
  )
}
