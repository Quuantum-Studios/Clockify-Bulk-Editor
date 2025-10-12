import * as React from 'react'

export function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="cursor-help" tabIndex={0}>
        {children}
      </span>
      <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block group-focus:block whitespace-nowrap rounded bg-gray-800 text-white text-xs px-2 py-1 z-50">
        {content}
      </span>
    </span>
  )
}
