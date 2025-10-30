"use client";

import { useRef, useState } from "react";

export default function LiveTranscribe() {
    const [text, setText] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    async function startTranscription() {
        if (isTranscribing) return;
        
        const tokenRes = await fetch("/api/transcribe/token");
        const { token } = (await tokenRes.json()) as { token: string };

        // const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_ASSEMBLYAI_WORKER}?token=${encodeURIComponent(token)}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to WebSocket");
            startMicStream(ws);
        };

        let partial = "";
        let finalText = "";

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

        setIsTranscribing(true);
    }

    function stopTranscription() {
        if (!isTranscribing) return;
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        
        setIsTranscribing(false);
        // setText("");
    }

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

    return (
        <div style={{ padding: "2rem" }}>
            <h2>🎙️ Live Transcription</h2>
            <button 
                onClick={isTranscribing ? stopTranscription : startTranscription}
                style={{
                    padding: "0.5rem 1rem",
                    marginBottom: "1rem",
                    backgroundColor: isTranscribing ? "#dc2626" : "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "0.25rem",
                    cursor: "pointer"
                }}
            >
                {isTranscribing ? "⏹️ Stop" : "▶️ Start"}
            </button>
            <p>{text}</p>
        </div>
    );
}
