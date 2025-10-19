// Simple in-memory rate limiter based on API key
type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60, 
  windowMs: 60 * 1000, // per minute
}

export function checkRateLimit(
  apiKey: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(apiKey)

  if (!entry || now >= entry.resetAt) {
    // Start new window
    const resetAt = now + config.windowMs
    rateLimitMap.set(apiKey, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

// Cleanup old entries periodically (optional)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now >= entry.resetAt + 60000) { // 1 minute after reset
        rateLimitMap.delete(key)
      }
    }
  }, 5 * 60 * 1000) // Every 5 minutes
}

