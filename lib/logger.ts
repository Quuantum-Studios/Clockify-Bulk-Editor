// KVNamespace is defined in cloudflare-env.d.ts

export interface ApiLogEntry {
  id: string
  timestamp: string
  method: string
  endpoint: string
  status?: number
  error?: string
  duration?: number
  userId?: string
  email?: string
  details?: {
    summary?: string
    request?: unknown
    response?: unknown
  }
}

const MAX_LOGS_PER_USER = 1000

export async function logApiCall(
  kv: KVNamespace | undefined,
  email: string | undefined,
  entry: Omit<ApiLogEntry, "id" | "timestamp">
): Promise<void> {
  if (!kv || !email) return

  try {
    const logEntry: ApiLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      email,
    }

    const key = `logs:${email}`
    const existingLogsJson = await kv.get(key, "json")
    const existingLogs = (existingLogsJson || []) as ApiLogEntry[]

    // Add new log at the beginning
    const updatedLogs = [logEntry, ...existingLogs].slice(0, MAX_LOGS_PER_USER)

    await kv.put(key, JSON.stringify(updatedLogs))
  } catch (error) {
    console.error("[Logger] Failed to save log:", error)
  }
}

export async function getUserLogs(
  kv: KVNamespace | undefined,
  email: string
): Promise<ApiLogEntry[]> {
  if (!kv) return []

  try {
    const key = `logs:${email}`
    const logsJson = await kv.get(key, "json")
    return (logsJson || []) as ApiLogEntry[]
  } catch (error) {
    console.error("[Logger] Failed to get logs:", error)
    return []
  }
}

