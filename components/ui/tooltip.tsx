import * as React from 'react'

export function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="cursor-help peer" tabIndex={0}>
        {children}
      </span>
      <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden peer-hover:block hover:block focus:block whitespace-nowrap rounded bg-gray-800/95 backdrop-blur shadow-xl text-white text-[10px] px-2 py-1.2 z-[100] border border-white/10 pointer-events-none">
        {content}
      </span>
    </span>
  )
}
