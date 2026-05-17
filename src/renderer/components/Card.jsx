import React from 'react'

export default function Card({ children, className = '', onClick, hoverable = false }) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        hoverable ? 'cursor-pointer hover:shadow-md hover:border-navy-200 transition-all' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={['px-6 py-4 border-b border-gray-100', className].join(' ')}>
      {children}
    </div>
  )
}

Card.Body = function CardBody({ children, className = '' }) {
  return (
    <div className={['px-6 py-4', className].join(' ')}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={['px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg', className].join(' ')}>
      {children}
    </div>
  )
}
