"use client"
import { useRouter, usePathname } from "next/navigation"
import { Sun, Moon } from "lucide-react"
import { useState, useEffect } from "react"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Clockify Manager"

export default function AppNavLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeMenu = pathname?.startsWith('/settings') ? 'settings' : 'dashboard';
  const [theme, setTheme] = useState(() => (typeof window !== "undefined" && window.localStorage.getItem("theme")) || "light")
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); window.localStorage.setItem("theme", theme) }, [theme])

  return (
    <div className={"min-h-screen flex flex-col bg-background text-foreground " + (theme === 'dark' ? 'dark' : '')}>
      {/* Top navbar */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="font-bold text-lg">{APP_NAME}</div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full border border-gray-300 bg-white dark:bg-gray-800 dark:text-white"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      {/* Sidebar with navigation */}
      <div className="flex flex-1">
        <aside className="w-48 border-r border-border bg-sidebar p-4 hidden md:block">
          <div className="font-semibold mb-2">Menu</div>
          <ul className="space-y-2 text-sm">
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded ${activeMenu === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => router.push('/dashboard')}
              >Dashboard</button>
            </li>
            <li>
              <button
                className={`w-full text-left px-2 py-1 rounded ${activeMenu === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => router.push('/settings')}
              >Settings</button>
            </li>
          </ul>
        </aside>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
