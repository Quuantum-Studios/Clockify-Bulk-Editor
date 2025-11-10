'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'
import Logo from '@/components/Logo'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'

export default function PageLayout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = window.localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      window.localStorage.setItem('theme', theme)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <Logo className="text-primary dark:text-white p-4 w-1/2 h-auto" title={APP_NAME} />
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
              >
                {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/editor">
                <Button className="bg-primary hover:opacity-90 text-primary-foreground cursor-pointer">
                  <span className="hidden sm:inline">Open the Editor</span>
                  <span className="sm:hidden">Editor</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left max-w-md">
              <div className="flex items-center justify-center md:justify-start mb-3">
                <Logo className="p-4 w-3/4 h-auto text-white md:text-white logo-dark" title={APP_NAME} />
              </div>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                {APP_NAME} helps teams manage Clockify data up to 10x faster.
              </p>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-6 text-gray-400 text-sm">
              <li>
                <Link href="mailto:support.bulkifyai@quuantum.com" className="hover:text-primary transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}








