"use client"
import { Button } from "../components/ui/button"
import {
  CheckCircle,
  Upload,
  Star,
  ArrowRight,
  Shield,
  Sun,
  Moon,
  Sparkles,
  Wand2,
  MicVocal,
  AlertTriangle,
  CheckCheck,
  Zap,
  Tag,
  Lock
} from "lucide-react"
import Image from "next/image"
import Logo from "../components/Logo"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { capture, AnalyticsEvents } from "../lib/analytics"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BulkifyAI"

export default function Home() {
  const [theme, setTheme] = useState("light")
  const [mounted, setMounted] = useState(false)
  const sectionsRef = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    setMounted(true)
    capture(AnalyticsEvents.APP_OPEN, { page: "home" })
    const savedTheme = window.localStorage.getItem("theme") || "light"
    setTheme(savedTheme)

    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = "smooth"

    // Trigger hero animations immediately
    setTimeout(() => {
      const heroSection = sectionsRef.current[0]
      if (heroSection) {
        heroSection.classList.add("animate-in")
      }
    }, 100)

    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in")
        }
      })
    }, observerOptions)

    const sectionsToObserve = sectionsRef.current
    sectionsToObserve.forEach((section, index) => {
      if (section && index > 0) observer.observe(section)
    })

    return () => {
      sectionsToObserve.forEach((section, index) => {
        if (section && index > 0) observer.unobserve(section)
      })
    }
  }, [])

  useEffect(() => { 
    if (mounted) {
      document.documentElement.classList.toggle("dark", theme === "dark")
      window.localStorage.setItem("theme", theme)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary/20">
      {/* 1. Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Logo className="text-gray-900 dark:text-white h-8 w-auto" title={APP_NAME} />
            </div>

            <div className="hidden md:block">
              <div className="flex items-baseline space-x-6">
                <a href="#features" className="text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors">How it Works</a>
                <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-white transition-colors">FAQ</a>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 transition-colors"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/editor">
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-95 h-9 text-sm sm:h-10 sm:text-base px-3 sm:px-4">
                  <span className="hidden sm:inline">Open Editor</span>
                  <span className="sm:hidden">Editor</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden" ref={(el) => { sectionsRef.current[0] = el }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50 dark:from-blue-900/20 dark:via-slate-950 dark:to-slate-950 -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">

          {/* Badge */}
          <div className="animate-fade-in-up animation-delay-0 mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              100% Free during beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up animation-delay-100 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6 leading-tight">
            Manage Clockify at Scale.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">10x Faster.</span>
          </h1>

          {/* Subhead */}
          <p className="animate-fade-in-up animation-delay-200 text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
            The bulk management layer your team is missing. Clean up messy time entries, bulk edit tags, and fix reporting errors in seconds—not hours.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up animation-delay-300 flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/editor">
              <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                Open Editor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Trust Bullets */}
          <div className="animate-fade-in-up animation-delay-400 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Setup in 30 seconds
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> No signup required
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" /> Secure API Key storage
            </div>
          </div>

          {/* Visual */}
          <div className="animate-fade-in-up animation-delay-500 mt-16 relative mx-auto w-full max-w-5xl">
            <div className="relative rounded-xl bg-slate-900/5 dark:bg-white/5 p-2 lg:p-4 ring-1 ring-inset ring-slate-900/10 dark:ring-white/10">
              <Image
                src="/bulkifyai-hero-featured.png"
                alt="BulkifyAI Interface"
                width={1200}
                height={675}
                className="rounded-lg shadow-2xl dark:shadow-blue-900/20 w-full"
                priority
              />
              <div className="absolute -inset-4 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-slate-950 h-32 bottom-0 w-full pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof */}
      <section className="py-10 border-y border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 scroll-animate" ref={(el) => { sectionsRef.current[1] = el }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-8">Trusted by Ops Teams At</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {["TechCorp", "AgencyFlow", "ScaleUp", "DataSystems"].map((logo) => (
              <span key={logo} className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. The Problem */}
      <section className="py-24 bg-white dark:bg-slate-950 scroll-animate" ref={(el) => { sectionsRef.current[2] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute -inset-4 bg-red-100/50 dark:bg-red-900/20 blur-3xl rounded-full" />
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/50 opacity-80">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <div className="h-2 w-32 bg-red-200 dark:bg-red-900 rounded" />
                      <div className="h-2 w-16 bg-red-100 dark:bg-red-800 rounded ml-auto" />
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center text-sm text-red-600 font-medium">
                  Error: Duplicate entries detected.
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Clockify is great. <br />
                <span className="text-red-500">But manual cleanup is a nightmare.</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                Validating thousands of time entries one by one kills your productivity. Whether it’s inconsistencies in project tagging, messy descriptions, or duplicate entries, fixing data manually effectively breaks your reporting workflow.
              </p>
              <ul className="space-y-4">
                {[
                  "Slow, single-entry editing",
                  "Hard to spot inconsistencies",
                  "Zero bulk-create options"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The Solution */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50 scroll-animate" ref={(el) => { sectionsRef.current[3] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Your new bulk command center.
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                BulkifyAI sits on top of your existing Clockify workspace. We handle the heavy lifting—validating, normalizing, and cleaning your data in batches—so you can trust your reports again.
              </p>
              <ul className="space-y-4">
                {[
                  "Edit 1,000+ entries in one click",
                  "AI-powered cleanup consistency",
                  "Safe, local-first processing"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-100/50 dark:bg-blue-900/20 blur-3xl rounded-full" />
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm -rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                      <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
                      <div className="h-2 w-32 bg-blue-200 dark:bg-blue-900 rounded" />
                      <div className="h-2 w-16 bg-blue-100 dark:bg-blue-800 rounded ml-auto" />
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center text-sm text-blue-600 font-medium">
                  Success: 1,420 entries updated.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Feature Grid */}
      <section id="features" className="py-24 bg-white dark:bg-slate-950 scroll-animate" ref={(el) => { sectionsRef.current[4] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Why Ops Teams Switch</h2>
            <p className="text-slate-600 dark:text-slate-400">Everything you need to regain control of your time data.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Smart Bulk Upload</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Import thousands of time entries via CSV. Validate data before it hits your workspace to prevent errors.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wand2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">AI Cleanup & Dedupe</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatically detect duplicates and normalize messy descriptions using our smart AI engine.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-green-500/50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MicVocal className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Speech-to-Entry</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Dictate your timesheets. We parse natural language into structured Time, Project, and Task data instantly.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Tag className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Bulk Tag Management</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Create, rename, or delete tags and tasks across hundreds of entries at once. No more manual clicking.
              </p>
            </div>

            {/* Card 5 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-500/50 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Bank-Grade Security</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Your API Key is encrypted and stored locally on your device. We never see or store your raw credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. How it Works */}
      <section id="how-it-works" className="py-24 bg-slate-50 dark:bg-slate-900/50 scroll-animate" ref={(el) => { sectionsRef.current[5] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">How it Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                step: 1,
                title: "Connect",
                desc: "Paste your Clockify API Key. It stays in your browser and gives you instant access to your workspace." 
              },
              { 
                step: 2,
                title: "Review",
                desc: "Select entries, upload a CSV, or let AI scan for inconsistencies. Preview every change before it happens." 
              },
              { 
                step: 3,
                title: "Execute",
                desc: "Apply bulk changes in seconds. Watch your data clean itself up across your entire workspace."
              },
            ].map((s) => (
              <div key={s.step} className="relative p-6">
                <div className="text-6xl font-bold text-slate-200 dark:text-slate-800 absolute -top-4 -left-2 z-0">{s.step}</div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{s.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Testimonials */}
      <section id="testimonials" className="py-24 bg-white dark:bg-slate-950 scroll-animate" ref={(el) => { sectionsRef.current[6] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "We manage time for 50 contractors. Validating their entries used to take me all Friday. Now I do it in 15 minutes before lunch.",
                author: "Sarah J.",
                role: "Ops Manager"
              },
              {
                quote: "We switched project codes mid-year. Clockify support said 'do it manually'. BulkifyAI did it in 3 clicks. Lifesaver.",
                author: "Mark D.",
                role: "Agency Owner"
              },
              {
                quote: "The speech-to-entry feature is surprisingly accurate. I just talk through my day and the timesheet is done.",
                author: "Alex P.",
                role: "Lead Developer"
              }
            ].map((t, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900 p-8 rounded-2xl">
                <div className="flex text-amber-400 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{t.author}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section id="faq" className="py-24 bg-slate-50 dark:bg-slate-900/50 scroll-animate" ref={(el) => { sectionsRef.current[7] = el }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">FAQ</h2>
          <div className="space-y-6">
            {[
              {
                q: "How does the bulk upload work?",
                a: "Simply drag and drop your CSV. We map the columns to Clockify fields, validate for errors (like missing projects), and let you preview exactly what will be created before syncing."
              },
              {
                q: "Is my API Key safe?",
                a: "Yes. Your API key is stored ONLY in your browser’s local storage. Calls are proxied securely to avoid CORS issues, but we never store your key in our database."
              },
              {
                q: "Is it really free?",
                a: "Yes! During our beta period, all features are 100% free. We want your feedback to make the best tool possible."
              },
              {
                q: "How is this different from Clockify?",
                a: "Clockify is an amazing time tracker. We are a utility layer built specifically for bulk operations—moving fast, cleaning up messes, and managing data at a scale that the native UI doesn't support."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h3>
                <p className="text-slate-600 dark:text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. CTA & Footer */}
      <footer className="bg-slate-900 dark:bg-black text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-6">Clean Your Data. Save Your Time.</h2>
            <p className="text-xl text-slate-400 mb-10">Stop clicking one by one. Join hundreds of ops managers fixing their Clockify timesheets in minutes.</p>
            <Link href="/editor">
              <Button size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-primary/20">
                Open Editor Now
              </Button>
            </Link>
            <p className="mt-6 text-sm text-slate-500">No signup required. Free forever (for now).</p>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</div>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
              <a href="mailto:support@bulkify.ai" className="hover:text-white transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}