export const runtime = "nodejs"

function toAssemblyWsUrl(sampleRate: number, formatTurns = true): string {
  const params = new URLSearchParams()
  params.set("sample_rate", String(sampleRate))
  if (formatTurns) params.set("format_turns", "true")
  return `wss://streaming.assemblyai.com/v3/ws?${params.toString()}`
}

export async function GET(request: Request) {
  const upgrade = request.headers.get("upgrade") || ""
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 })
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) return new Response("Missing ASSEMBLYAI_API_KEY", { status: 500 })

  const url = new URL(request.url)
  const sr = Number(url.searchParams.get("sample_rate") || "16000")
  const formatTurns = url.searchParams.get("format_turns") !== "false"
  const upstreamUrl = toAssemblyWsUrl(sr, formatTurns)

  const { 0: client, 1: server } = new WebSocketPair()
  const clientSocket = client as unknown as WebSocket
  const serverSocket = server as unknown as WebSocket

  let upstream: WebSocket | null = null

  ;(async () => {
    try {
      // @ts-expect-error - Cloudflare Workers WebSocket supports headers option
      upstream = new WebSocket(upstreamUrl, { headers: { Authorization: apiKey } })

      upstream.accept?.()

      upstream.addEventListener("open", () => {
        serverSocket.send(JSON.stringify({ type: "proxy_open" }))
      })

      upstream.addEventListener("message", (event: MessageEvent) => {
        try {
          if (typeof event.data === "string") {
            serverSocket.send(event.data)
          } else if (event.data instanceof ArrayBuffer) {
            serverSocket.send(event.data)
          }
        } catch {}
      })

      upstream.addEventListener("close", (ev: CloseEvent) => {
        try { serverSocket.close(ev.code, ev.reason) } catch {}
      })

      upstream.addEventListener("error", () => {
        try { serverSocket.close(1011, "upstream error") } catch {}
      })

      serverSocket.accept()

      serverSocket.addEventListener("message", (event: MessageEvent) => {
        try {
          if (upstream && upstream.readyState === upstream.OPEN) {
            if (typeof event.data === "string") {
              upstream.send(event.data)
            } else if (event.data instanceof ArrayBuffer) {
              upstream.send(event.data)
            }
          }
        } catch {}
      })

      serverSocket.addEventListener("close", (ev: CloseEvent) => {
        try { upstream?.close(ev.code, ev.reason) } catch {}
      })

      serverSocket.addEventListener("error", () => {
        try { upstream?.close(1011, "client error") } catch {}
      })
    } catch {
      try { serverSocket.close(1011, "init error") } catch {}
    }
  })()

  return new Response(null, { status: 101, webSocket: clientSocket })
}


