export async function fetchProxy<T>(path: string, apiKey: string, options?: RequestInit): Promise<T> {
  if (!apiKey) throw new Error("API key required")
  
  const headers = new Headers(options?.headers)
  headers.set("X-Api-Key", apiKey)
  headers.set("Content-Type", "application/json")

  const res = await fetch(path, {
    ...options,
    headers
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(errorData.error || `Request failed: ${res.statusText}`)
  }

  return res.json() as T
}
