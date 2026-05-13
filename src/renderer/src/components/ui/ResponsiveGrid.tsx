import React from 'react'

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 5xl:grid-cols-8 gap-4 ${className}`}>
      {children}
    </div>
  )
}

export default ResponsiveGrid
