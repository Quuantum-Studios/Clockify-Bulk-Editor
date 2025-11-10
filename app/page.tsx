"use client"
import { Button } from "../components/ui/button"
import { CheckCircle, Upload, Star, ArrowRight, Shield, BarChart3, Sun, Moon, Bot, Sparkles, Wand2, MicVocal } from "lucide-react"
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

    // Intersection Observer for scroll animations (skip hero section)
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

    // Observe all sections except hero (index 0)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo className="text-primary dark:text-white p-4 w-1/2 h-auto transition-transform duration-300 hover:scale-105" title={APP_NAME} />
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-800">Features</a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-800">Testimonials</a>
                <a href="#faq" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-800">FAQ</a>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
              >
                {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/editor">
                <Button className="bg-primary hover:opacity-90 text-primary-foreground cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg">
                  <span className="hidden sm:inline">Open the Editor</span>
                  <span className="sm:hidden">Editor</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden" ref={(el) => { sectionsRef.current[0] = el }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 dark:from-primary/10 dark:via-transparent dark:to-blue-500/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="text-center">
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in-up animation-delay-0">
                  100% free for a limited time
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium animate-fade-in-up animation-delay-100">
                  <Sparkles className="h-4 w-4 animate-pulse" /> AI-powered
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in-up animation-delay-200">
                Manage Clockify in bulk.
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"> Faster.</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl md:max-w-none mx-auto md:mx-0 animate-fade-in-up animation-delay-300">
                Bulk edit, upload, and clean up time entries, tags, tasks, and projects—now with AI assistance for faster categorization and cleanup.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 animate-fade-in-up animation-delay-400">
                <Link href="/editor">
                  <Button size="lg" className="bg-primary hover:opacity-90 text-primary-foreground px-8 py-4 text-lg cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl group">
                    Open the Editor
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up animation-delay-500">
                <div className="flex items-center transition-all duration-200 hover:scale-105">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  No signup/signin needed
                </div>
                <div className="flex items-center transition-all duration-200 hover:scale-105">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Setup in 30 seconds
                </div>
                <div className="flex items-center transition-all duration-200 hover:scale-105">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Secure, key-based access
                </div>
              </div>
            </div>
            <div className="relative w-full animate-fade-in-up animation-delay-600">
              <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-primary/20 via-blue-500/20 to-transparent blur-3xl rounded-3xl animate-pulse" />
              <div className="mx-auto w-full rounded-2xl overflow-hidden bg-transparent transition-all duration-500">
                <div className="relative aspect-video w-full">
                  <Image
                    src="/bulkifyai-hero-featured.png"
                    alt={APP_NAME + " screenshot"}
                    width={1600}
                    height={900}
                    className="w-full object-contain drop-shadow-[0_4px_7px_rgba(0,0,0,0.3)] pt-10 pb-10 pl-2 pr-2"
                    priority
                  />
                  {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent" /> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-12 bg-white dark:bg-slate-800 scroll-animate" ref={(el) => { sectionsRef.current[1] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-8 animate-fade-in-up">
            Trusted by teams at
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
            {["TechCorp", "StartupXYZ", "AgencyPro", "DevStudio"].map((name, i) => (
              <div key={name} className="text-2xl font-bold text-gray-400 transition-all duration-300 hover:scale-110 hover:opacity-100" style={{ animationDelay: `${i * 100}ms` }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 scroll-animate" ref={(el) => { sectionsRef.current[2] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              The fastest way to manage your Clockify data at scale
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built for ops, admins, and teams who need bulk actions without the busywork
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 group animate-fade-in-up animation-delay-0">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                <Upload className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
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

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-green-500/50 group animate-fade-in-up animation-delay-100">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-green-200 dark:group-hover:bg-green-800 group-hover:scale-110">
                <MicVocal className="h-6 w-6 text-green-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Speech to Entry
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically add time entries by speaking into your microphone.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-indigo-500/50 group animate-fade-in-up animation-delay-200">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 group-hover:scale-110">
                <BarChart3 className="h-6 w-6 text-indigo-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Tags, Tasks & Cleanup
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create or bulk-delete tasks and tags, and quickly clean messy data.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-blue-500/50 group animate-fade-in-up animation-delay-300">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 group-hover:scale-110">
                <Bot className="h-6 w-6 text-blue-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AI Tag Suggestions
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Let AI suggest tags and tasks from entry descriptions to speed up organization.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-amber-500/50 group animate-fade-in-up animation-delay-400">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-amber-200 dark:group-hover:bg-amber-800 group-hover:scale-110">
                <Wand2 className="h-6 w-6 text-amber-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                AI Cleanup & Autofix
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Detect duplicates, normalize text, and auto-correct common inconsistencies with one click.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-orange-500/50 group animate-fade-in-up animation-delay-500">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-800 group-hover:scale-110">
                <Shield className="h-6 w-6 text-orange-600 transition-transform duration-300 group-hover:scale-110" />
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
      <section id="testimonials" className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 scroll-animate" ref={(el) => { sectionsRef.current[3] = el }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Loved by busy teams
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Real results from real workflows</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                stars: 5,
                text: "This tool saved us 10+ hours per week on time entry management. The bulk upload feature is a game-changer for our agency.",
                initials: "SM",
                name: "Sarah Mitchell",
                role: "Project Manager, Creative Agency",
                color: "blue"
              },
              {
                stars: 5,
                text: "Finally, a tool that makes Clockify management actually enjoyable. The interface is intuitive and the bulk operations are incredibly powerful.",
                initials: "DJ",
                name: "David Johnson",
                role: "Freelance Developer",
                color: "green"
              },
              {
                stars: 5,
                text: "We migrated 5,000+ time entries in minutes instead of days. The ROI was immediate and the support team is fantastic.",
                initials: "AL",
                name: "Alex Liu",
                role: "CTO, Tech Startup",
                color: "indigo"
              }
            ].map((testimonial, i) => {
              const colorClasses = {
                blue: "bg-blue-500",
                green: "bg-green-500",
                indigo: "bg-indigo-500"
              }
              return (
                <div key={i} className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-105 group animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.stars)].map((_, j) => (
                      <Star key={j} className="h-5 w-5 text-yellow-400 fill-current transition-transform duration-300 group-hover:scale-110" style={{ transitionDelay: `${j * 50}ms` }} />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="flex items-center">
                    <div className={`w-10 h-10 ${colorClasses[testimonial.color as keyof typeof colorClasses]} rounded-full flex items-center justify-center text-white font-semibold transition-transform duration-300 group-hover:scale-110`}>
                      {testimonial.initials}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 scroll-animate" ref={(el) => { sectionsRef.current[4] = el }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know about {APP_NAME}
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                question: "How does the bulk upload feature work?",
                answer: "Simply upload a CSV file with your time entries, and our system will automatically map the data to your Clockify workspace. You can preview all changes before applying them, ensuring data accuracy."
              },
              {
                question: "Is my data secure?",
                answer: "Absolutely. We use enterprise-grade encryption for all data transmission and storage. Your API keys are stored on-device in your browser. We follow industry best practices."
              },
              {
                question: "Is it really free?",
                answer: `Yes—${APP_NAME} is 100% free for a limited time. No signup or credit card required.`
              },
              {
                question: "What's the difference between this and Clockify's built-in features?",
                answer: "While Clockify is great for individual time tracking, our tool specializes in bulk operations and team management. We provide advanced filtering, bulk editing, CSV import/export, and team analytics that aren't available in the standard Clockify interface."
              },
              {
                question: "Do you offer team plans?",
                answer: "Yes! We have flexible team plans starting from 5 users. Team plans include advanced collaboration features, role-based permissions, and dedicated support. Contact us for custom enterprise pricing."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors duration-300">
                  {faq.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-blue-600 to-indigo-600 relative overflow-hidden scroll-animate" ref={(el) => { sectionsRef.current[5] = el }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in-up">
            Ready to fix Clockify in minutes, not hours?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-100">
            Open the editor now—no signup. 100% free for a limited time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-200">
            <Link href="/editor">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl hover:shadow-2xl group">
                Open the Editor
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          <p className="text-white/90 text-sm mt-4 animate-fade-in-up animation-delay-300">
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
                <Logo className="p-4 w-3/4 h-auto text-white md:text-white logo-dark" title={APP_NAME} />
              </div>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                {APP_NAME} helps teams manage Clockify data up to 10x faster.
              </p>
            </div>

            {/* Links */}
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