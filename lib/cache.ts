// Cache helper for API responses using Cloudflare KV
export async function getCachedData<T>(
  kv: KVNamespace | undefined,
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<T> {
  try {
    if (!kv) {
      return await fetchFn()
    }

    const cacheKey = `cache:${key}`
    const cached = await kv.get(cacheKey, "json")
    
    if (cached) {
      return cached as T
    }
    
    const data = await fetchFn()
    await kv.put(cacheKey, JSON.stringify(data), { expirationTtl: ttlSeconds })
    
    return data
  } catch (error) {
    console.error("Cache error:", error)
    return await fetchFn()
  }
}

export async function invalidateCache(kv: KVNamespace | undefined, key: string): Promise<void> {
  try {
    if (!kv) return

    const cacheKey = `cache:${key}`
    await kv.delete(cacheKey)
  } catch (error) {
    console.error("Cache invalidation error:", error)
  }
}

