'use client'

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

type Metric = {
  name: string
  value: number
  id: string
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

function sendToAnalytics(metric: Metric) {
  if (typeof window === 'undefined') return

  const w = window as {
    gtag?: (command: string, targetId: string, config: Record<string, unknown>) => void
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
    }
  }

  const { name, value, id, rating, delta } = metric

  // Send to GA4
  if (w.gtag) {
    w.gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    })
  }

  // Send to PostHog
  if (w.posthog) {
    w.posthog.capture('web_vital', {
      metric_name: name,
      metric_value: value,
      metric_id: id,
      metric_rating: rating,
      metric_delta: delta,
    })
  }

  // Alert on poor metrics
  if (rating === 'poor') {
    console.warn(`Poor ${name} metric: ${value}`, metric)
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics)
  onINP(sendToAnalytics)
  onFCP(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

