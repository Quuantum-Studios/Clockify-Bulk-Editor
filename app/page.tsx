"use client"
import { Button } from "../components/ui/button"
import { CheckCircle, Clock, Upload, Star, ArrowRight, Shield, BarChart3, Sun, Moon, Bot, Sparkles, Wand2, MicVocal } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "ClockifyManager"

export default function Home() {
  const [theme, setTheme] = useState("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = window.localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">{APP_NAME}</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Features</a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">Testimonials</a>
                <a href="#faq" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">FAQ</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                className="p-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
              >
                {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/editor">
                <Button className="bg-primary hover:opacity-90 text-primary-foreground">
                  Open the Editor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="text-center">
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  100% free for a limited time
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                  <Sparkles className="h-4 w-4" /> AI-powered
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Manage Clockify in bulk.
                <span className="text-primary"> Faster.</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl md:max-w-none mx-auto md:mx-0">
                Bulk edit, upload, and clean up time entries, tags, tasks, and projects—now with AI assistance for faster categorization and cleanup.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <Link href="/editor">
                  <Button size="lg" className="bg-primary hover:opacity-90 text-primary-foreground px-8 py-4 text-lg">
                    Open the Editor
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  No signup/signin needed
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Setup in 30 seconds
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Secure, key-based access
                </div>
              </div>
            </div>
            <div className="relative w-full">
              <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-primary/20 to-transparent blur-2xl rounded-3xl" />
              <div className="mx-auto w-full max-w-5xl rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden bg-black/90">
                {/* <div className="h-10 bg-white/5 border-b border-white/10 flex items-center gap-2 px-4">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <span className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-3 text-xs text-white/60">{APP_NAME}</span>
                </div> */}
                <div className="relative">
                  <Image
                    src="/clockify-manager-hero.png"
                    alt={APP_NAME + " screenshot"}
                    width={1600}
                    height={900}
                    className="w-full object-cover"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-8">
            Trusted by teams at
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
            <div className="text-2xl font-bold text-gray-400">TechCorp</div>
            <div className="text-2xl font-bold text-gray-400">StartupXYZ</div>
            <div className="text-2xl font-bold text-gray-400">AgencyPro</div>
            <div className="text-2xl font-bold text-gray-400">DevStudio</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              The fastest way to manage your Clockify data at scale
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built for ops, admins, and teams who need bulk actions without the busywork
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Bulk CSV Upload
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Import hundreds of time entries via CSV with instant validation and preview.
              </p>
            </div>

            {/* <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Lightning Fast Editing
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Edit multiple entries simultaneously with our intuitive table interface. Save hours of manual work.
              </p>
            </div> */}

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <MicVocal className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Speech to Entry
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically add time entries by speaking into your microphone.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Tags, Tasks & Cleanup
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create or bulk-delete tasks and tags, and quickly clean messy data.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AI Tag Suggestions
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Let AI suggest tags and tasks from entry descriptions to speed up organization.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AI Cleanup & Autofix
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Detect duplicates, normalize text, and auto-correct common inconsistencies with one click.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Safe by Design
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your API key stays on-device storage. Encrypted requests with rate-limit friendly retries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Loved by busy teams
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Real results from real workflows</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &ldquo;This tool saved us 10+ hours per week on time entry management. The bulk upload feature is a game-changer for our agency.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  SM
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900 dark:text-white">Sarah Mitchell</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Project Manager, Creative Agency</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &ldquo;Finally, a tool that makes Clockify management actually enjoyable. The interface is intuitive and the bulk operations are incredibly powerful.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  DJ
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900 dark:text-white">David Johnson</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Freelance Developer</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &ldquo;We migrated 5,000+ time entries in minutes instead of days. The ROI was immediate and the support team is fantastic.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  AL
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900 dark:text-white">Alex Liu</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">CTO, Tech Startup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about {APP_NAME}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                How does the bulk upload feature work?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simply upload a CSV file with your time entries, and our system will automatically map the data to your Clockify workspace. You can preview all changes before applying them, ensuring data accuracy.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Absolutely. We use enterprise-grade encryption for all data transmission and storage. Your API keys are stored on-device in your browser. We follow industry best practices.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is it really free?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes—{APP_NAME} is 100% free for a limited time. No signup or credit card required.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What&apos;s the difference between this and Clockify&apos;s built-in features?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                While Clockify is great for individual time tracking, our tool specializes in bulk operations and team management. We provide advanced filtering, bulk editing, CSV import/export, and team analytics that aren&apos;t available in the standard Clockify interface.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer team plans?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! We have flexible team plans starting from 5 users. Team plans include advanced collaboration features, role-based permissions, and dedicated support. Contact us for custom enterprise pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to fix Clockify in minutes, not hours?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Open the editor now—no signup. 100% free for a limited time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/editor">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg">
                Open the Editor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="text-white/80 text-sm mt-4">
            No signup/signin needed
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">

            {/* Logo & Description */}
            <div className="text-center md:text-left max-w-md">
              <div className="flex items-center justify-center md:justify-start mb-3">
                <Clock className="h-8 w-8 text-primary" />
                <span className="ml-2 text-2xl font-extrabold tracking-tight">
                  {APP_NAME}
                </span>
              </div>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                {APP_NAME} helps teams manage Clockify data up to 10x faster.
              </p>
            </div>

            {/* Links */}
            <ul className="flex flex-wrap items-center justify-center gap-6 text-gray-400 text-sm">
              <li>
                <Link href="mailto:support.clockifymanager@quuantum.com" className="hover:text-primary transition">
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