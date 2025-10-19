// Cache helper for API responses using Cloudflare KV
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<T> {
  try {
    // @ts-expect-error - KV binding available in Cloudflare Workers context
    const KV = process.env.KV || globalThis.KV
    if (!KV) {
      return await fetchFn()
    }

    const cacheKey = `cache:${key}`
    const cached = await KV.get(cacheKey, "json")
    
    if (cached) {
      return cached as T
    }
    
    const data = await fetchFn()
    await KV.put(cacheKey, JSON.stringify(data), { expirationTtl: ttlSeconds })
    
    return data
  } catch (error) {
    console.error("Cache error:", error)
    return await fetchFn()
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    // @ts-expect-error - KV binding available in Cloudflare Workers context
    const KV = process.env.KV || globalThis.KV
    if (!KV) return

    const cacheKey = `cache:${key}`
    await KV.delete(cacheKey)
  } catch (error) {
    console.error("Cache invalidation error:", error)
  }
}

