import React from 'react'

export default function ProgressStep({ steps, currentStep }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const stepNum = index + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isPending = stepNum > currentStep
          const isLast = index === steps.length - 1

          return (
            <li key={step} className={['flex items-center', !isLast ? 'flex-1' : ''].join(' ')}>
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0 transition-all',
                    isCompleted ? 'bg-navy text-white' : '',
                    isCurrent ? 'bg-gold text-white ring-4 ring-gold/30' : '',
                    isPending ? 'bg-gray-100 text-gray-400 border-2 border-gray-200' : '',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-medium hidden sm:block whitespace-nowrap',
                    isCurrent ? 'text-navy' : isCompleted ? 'text-gray-700' : 'text-gray-400',
                  ].join(' ')}
                >
                  {step}
                </span>
              </div>
              {!isLast && (
                <div
                  className={[
                    'flex-1 h-0.5 mx-3',
                    isCompleted ? 'bg-navy' : 'bg-gray-200',
                  ].join(' ')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
