"use client"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import AudioMotionAnalyzer from 'audiomotion-analyzer'
import { Mic, MicOff, Sparkles } from "lucide-react"
import { useClockifyStore } from "../lib/store"
import Papa from "papaparse"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table"

type Props = { open: boolean; onOpenChange: (v: boolean) => void }

export default function VoiceDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("")
  const [recording, setRecording] = useState(false)
  const [busy, startTransition] = useTransition()
  const [transcribing, setTranscribing] = useState(false)
  const [csvPreview, setCsvPreview] = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const vadRef = useRef<{ processor: ScriptProcessorNode | null; silentMs: number; lastSpeechAt: number }>({ processor: null, silentMs: 1200, lastSpeechAt: Date.now() })
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioMotionRef = useRef<AudioMotionAnalyzer | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vizContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const openBulk = useClockifyStore(s => s.openBulkUploadWithCsv)
  

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const stopRecording = useCallback(() => {
    if (!recording) return
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
    if (vadRef.current.processor) {
      try { vadRef.current.processor.disconnect() } catch {}
      vadRef.current.processor = null
    }
  }, [recording])

  useEffect(() => {
    if (!open) return
    return () => {
      stopRecording()
    }
  }, [open, stopRecording])

  const setupVAD = useCallback(async (stream: MediaStream, audioContext: AudioContext) => {
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    analyserRef.current = analyser
    const data = new Float32Array(analyser.fftSize)
    const threshold = 0.01
    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      let rms = 0
      for (let i = 0; i < data.length; i++) rms += data[i] * data[i]
      rms = Math.sqrt(rms / data.length)
      const now = Date.now()
      if (rms > threshold) vadRef.current.lastSpeechAt = now
      if (recording && now - vadRef.current.lastSpeechAt > vadRef.current.silentMs) stopRecording()
      if (recording) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    vadRef.current.processor = analyser as unknown as ScriptProcessorNode
  }, [recording, stopRecording])

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
    } catch {}
  }, [])

  const startRecording = useCallback(async () => {
    if (recording) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr
    audioChunksRef.current = []
    const audioContext = new AudioContext({ sampleRate: 16000 })
    audioCtxRef.current = audioContext
    vadRef.current.lastSpeechAt = Date.now()
    await setupVAD(stream, audioContext)
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data) }
    mr.onstop = async () => {
      try {
    try { audioMotionRef.current?.disconnectInput() } catch {}
    try { audioMotionRef.current?.pause() } catch {}
        if (audioChunksRef.current.length === 0) return
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        audioChunksRef.current = []
        const form = new FormData()
        form.append("file", blob, "audio.webm")
        setTranscribing(true)
        const res = await fetch("/api/transcribe", { method: "POST", body: form })
        if (!res.ok) throw new Error("transcription failed")
        const data = (await res.json()) as { text?: string }
        const transcript = data?.text || ""
        if (transcript) setText(t => (t ? t + "\n" : "") + transcript)
      } catch (err) {
        console.error(err)
      } finally {
        setTranscribing(false)
      }
    }
    mr.onstart = () => {
      setRecording(true)
    }
    mr.start()
    setRecording(true)
  }, [recording, setupVAD])

  useEffect(() => {
    if (!recording) return
    // ensure DOM has rendered the container
    const id = requestAnimationFrame(() => {
      if (audioCtxRef.current) startVisualizer()
    })
    return () => cancelAnimationFrame(id)
  }, [recording, startVisualizer])

  const onAnalyze = useCallback(async () => {
    const state = useClockifyStore.getState()
    const prompt = state.userPrompt || ""
    const content = prompt ? `${prompt}\n\n${text}` : text
    // Build Existing Data block
    const wsProjects = state.projects || []
    const projWithTasks = (wsProjects as { id: string; name: string }[]).map(p => ({
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
      projects: projWithTasks
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) return
        const data = (await res.json()) as { message?: string; content?: string }
        const raw = (data?.message || data?.content) || ""
        if (raw && typeof raw === 'string') {
          const cleaned = raw.replace(/^```[a-zA-Z]*\n?/m, '').replace(/\n?```$/m, '')
          setCsvPreview(cleaned)
        }
      } catch {}
    })
  }, [text])

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
      <div className={"relative z-10 w-full rounded-xl border border-border bg-card shadow-xl p-4 md:p-6 " + (csvPreview !== null ? "max-w-6xl max-h-[90vh] overflow-y-auto" : "max-w-2xl") }>
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
          {recording && (
            <div ref={vizContainerRef} className="pointer-events-none absolute inset-0 rounded-md z-10" />
          )}
          {transcribing && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={() => (recording ? stopRecording() : startRecording())}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 border transition cursor-pointer ${recording ? "bg-red-500 text-white border-red-500" : "bg-white dark:bg-gray-800 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            aria-pressed={recording}
          >
            {recording ? <MicOff size={16} /> : <Mic size={16} />}
            {recording ? "Stop" : "Mic"}
          </button>
          <button
            onClick={onAnalyze}
            disabled={busy}
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
                            className="w-full min-w-[160px] bg-background border rounded px-2 py-1 text-sm whitespace-pre-wrap break-words leading-snug resize-none overflow-hidden"
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


