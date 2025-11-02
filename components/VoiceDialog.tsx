"use client"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import AudioMotionAnalyzer from 'audiomotion-analyzer'
import { Mic, MicOff, Sparkles } from "lucide-react"
import { useClockifyStore } from "../lib/store"
import Papa from "papaparse"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"
import { ProjectSelector } from "./ProjectSelector"

type Props = { open: boolean; onOpenChange: (v: boolean) => void }

export default function VoiceDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [busy, startTransition] = useTransition()
  const [csvPreview, setCsvPreview] = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioMotionRef = useRef<AudioMotionAnalyzer | null>(null)
  const vizContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const openBulk = useClockifyStore(s => s.openBulkUploadWithCsv)
  const availableProjects = useClockifyStore(s => s.projects)


  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  async function startTranscription() {
    if (isTranscribing || isConnecting) return;

    setIsConnecting(true);

    const tokenRes = await fetch("/api/transcribe/token");
    const { token } = (await tokenRes.json()) as { token: string };

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_ASSEMBLYAI_WORKER}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("Connected to WebSocket");
      await startMicStream(ws);
      setIsConnecting(false);
      setIsTranscribing(true);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnecting(false);
    };

    ws.onclose = () => {
      setIsConnecting(false);
    };

    let partial = "";
    let finalText = text;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle only messages with transcripts
      if (!data || !data.transcript) return;

      // When it's a partial update
      if (data.type === "PartialTranscript" || !data.end_of_turn) {
        partial = data.transcript;
      }

      // When it's a final segment
      if (data.type === "FinalTranscript" || data.end_of_turn) {
        finalText += (finalText ? " " : "") + data.transcript.trim();
        partial = "";
      }

      // Display both together — final + current partial
      setText(`${finalText} ${partial}`.trim());
    };
  }

  const stopTranscription = useCallback(() => {
    if (!isTranscribing) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioMotionRef.current) {
      audioMotionRef.current.disconnectInput();
      audioMotionRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsTranscribing(false);
    setIsConnecting(false);
  }, [isTranscribing])

  useEffect(() => {
    if (!open) {
      setError(null)
      return
    }
    return () => {
      stopTranscription()
    }
  }, [open, stopTranscription])

  useEffect(() => {
    if (selectedProjectIds.length > 0) {
      setError(null)
    }
  }, [selectedProjectIds])

  const startVisualizer = useCallback(() => {
    const container = vizContainerRef.current
    if (!container) return
    if (!audioMotionRef.current) {
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      const gradient = isDark ? 'rainbow' : 'prism'
      audioMotionRef.current = new AudioMotionAnalyzer(container, {
        mode: 10,
        showBgColor: false,
        showFreqScale: false,
        showScaleX: false,
        radial: false,
        lineWidth: 2,
        fillAlpha: 0.18,
        alphaBars: false,
        gradient,
        ansiBands: false,
        overlay: true,
        connectSpeakers: false,
        smoothing: 0.7,
        maxFPS: 60,
      })
    }
    const am = audioMotionRef.current as AudioMotionAnalyzer
    try {
      const src = am.audioCtx.createMediaStreamSource(streamRef.current as MediaStream)
      am.connectInput(src)
      am.setOptions({ audioCtx: am.audioCtx })
      am.volume = 0
      am.resume()
    } catch { }
  }, [])

  async function startMicStream(ws: WebSocket) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const int16 = floatTo16BitPCM(input);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(int16);
      }
    };
  }

  function floatTo16BitPCM(float32Array: Float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  useEffect(() => {
    if (!isTranscribing) return
    // ensure DOM has rendered the container
    const id = requestAnimationFrame(() => {
      if (audioContextRef.current) startVisualizer()
    })
    return () => cancelAnimationFrame(id)
  }, [isTranscribing, startVisualizer])

  const onAnalyze = useCallback(async () => {
    if (selectedProjectIds.length === 0) {
      return // Prevent analysis if no projects selected
    }

    const state = useClockifyStore.getState()
    const prompt = state.userPrompt || ""
    const content = prompt ? `${prompt}\n\n${text}` : text
    const wsProjects = state.projects || []
    const filteredProjects = wsProjects.filter(p => selectedProjectIds.includes(p.id))

    if (filteredProjects.length === 0) {
      return // Prevent analysis if no valid projects found
    }

    const projWithTasks = (filteredProjects as { id: string; name: string }[]).map(p => ({
      name: p.name,
      tasks: (state.tasks?.[p.id] || []).map(t => ({ name: t.name, descriptions: [] as string[] }))
    }))

    const tagsList: string[] = []
    const timezone = state.defaultTimezone || "UTC"
    const body = {
      messages: [{ role: "user", content }],
      userPrompt: prompt,
      timezone,
      tags: tagsList,
      projects: projWithTasks,
      selectedProjectIds: selectedProjectIds
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({})) as { error?: string }
          setError(errorData.error || "Failed to analyze. Please try again.")
          return
        }
        const data = (await res.json()) as { message?: string; content?: string }
        const raw = (data?.message || data?.content) || ""
        if (raw && typeof raw === 'string') {
          const cleaned = raw.replace(/^```[a-zA-Z]*\n?/m, '').replace(/\n?```$/m, '')
          setCsvPreview(cleaned)
          setError(null)
        }
      } catch (e) {
        setError("An error occurred. Please try again.")
      }
    })
  }, [text, selectedProjectIds])

  const onProceedToBulk = useCallback(() => {
    if (!csvPreview) return
    try {
      const csv = Papa.unparse({ fields: csvHeaders, data: csvRows })
      openBulk(csv)
    } catch {
      openBulk(csvPreview)
    }
    close()
  }, [csvPreview, csvHeaders, csvRows, openBulk, close])

  useEffect(() => {
    if (csvPreview === null) {
      setCsvHeaders([])
      setCsvRows([])
      return
    }
    try {
      const cleaned = csvPreview.replace(/^```[a-zA-Z]*\n?/m, '').replace(/\n?```$/m, '')
      const result = Papa.parse(cleaned, { header: false, skipEmptyLines: true }) as unknown as { data: unknown[] }
      const arr = (result?.data || []).filter((r: unknown) => Array.isArray(r) && (r as unknown[]).length > 0) as string[][]
      if (!arr.length) { setCsvHeaders([]); setCsvRows([]); return }
      const headers = (arr[0] || []).map(v => String(v ?? ''))
      const rows = arr.slice(1).map(r => headers.map((_, i) => String(r[i] ?? '')))
      setCsvHeaders(headers)
      setCsvRows(rows)
    } catch {
      // ignore parse errors; user can go back
    }
  }, [csvPreview])

  const setCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setCsvRows(prev => prev.map((row, i) => i === rowIndex ? row.map((cell, j) => j === colIndex ? value : cell) : row))
  }, [])

  const setHeaderCell = useCallback((colIndex: number, value: string) => {
    setCsvHeaders(prev => prev.map((h, i) => i === colIndex ? value : h))
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className={"relative z-10 w-full rounded-xl border border-border bg-card shadow-xl p-4 md:p-6 " + (csvPreview !== null ? "max-w-6xl max-h-[90vh] overflow-y-auto" : "max-w-2xl")}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Magic Assistant</div>
          <button onClick={close} className="text-sm opacity-70 hover:opacity-100 cursor-pointer">Close</button>
        </div>
        {csvPreview === null && (
          <div> 
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type here or use the mic"
                ref={textareaRef}
                className="w-full h-56 md:h-64 resize-none rounded-md border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-primary cursor-text"
              />
              {isTranscribing && (
                <div ref={vizContainerRef} className="pointer-events-none absolute inset-0 rounded-md z-10" />
              )}
            </div>
            <div className="mb-3">
              <div className="mb-1 text-xs text-muted-foreground">Select projects (required)</div>
              <ProjectSelector
                selectedProjectIds={selectedProjectIds}
                availableProjects={availableProjects}
                onChange={setSelectedProjectIds}
                placeholder="Select at least one project..."
                className="w-full"
              />
              {error && (
                <div className="mt-2 text-xs text-red-500">{error}</div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => (isTranscribing ? stopTranscription() : startTranscription())}
                disabled={isConnecting}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 border transition cursor-pointer ${isTranscribing ? "bg-red-500 text-white border-red-500" : "bg-white dark:bg-gray-800 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"} disabled:opacity-50`}
                aria-pressed={isTranscribing}
              >
                {isConnecting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 dark:border-gray-300 border-t-transparent" />
                    <span>Connecting...</span>
                  </>
                ) : isTranscribing ? (
                  <>
                    <MicOff size={16} />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    <span>Mic</span>
                  </>
                )}
              </button>
              <button
                onClick={onAnalyze}
                disabled={busy || selectedProjectIds.length === 0}
                className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 hover:opacity-90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {csvPreview !== null && (
          <div className="mt-4 border rounded-md">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="font-medium text-sm">CSV Preview (editable)</div>
              <div className="text-xs text-muted-foreground">Review and edit before proceeding</div>
            </div>
            <div className="overflow-x-auto max-h-64">
              <Table style={{ minWidth: Math.max(csvHeaders.length, 1) * 160 }}>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((h, ci) => (
                      <TableHead key={ci}>
                        <input
                          value={h}
                          onChange={(e) => setHeaderCell(ci, e.target.value)}
                          className="w-full min-w-[160px] bg-background border rounded px-2 py-1 text-sm"
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvRows.map((row, ri) => (
                    <TableRow key={ri}>
                      {csvHeaders.map((_, ci) => (
                        <TableCell key={ci}>
                          <textarea
                            value={row[ci] ?? ''}
                            onChange={(e) => setCell(ri, ci, e.target.value)}
                            className="w-full min-w-[160px] bg-background border rounded px-2 py-1 text-sm whitespace-pre-wrap wrap-break-word leading-snug resize-none overflow-hidden"
                            style={{
                              height: 'auto',
                              maxHeight: 'none',
                              overflowY: 'hidden'
                            }}
                            rows={1}
                            ref={el => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = el.scrollHeight + "px";
                              }
                            }}
                            onInput={e => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = "auto";
                              target.style.height = target.scrollHeight + "px";
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t">
              <button
                onClick={() => setCsvPreview(null)}
                className="rounded-md px-3 py-2 border bg-background cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={onProceedToBulk}
                disabled={!csvHeaders.length}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                Proceed to Bulk Upload
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


