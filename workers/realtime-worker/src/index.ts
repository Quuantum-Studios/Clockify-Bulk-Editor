interface CloudflareWebSocket {
    accept(): void;
    send(data: ArrayBuffer | string): void;
    close(): void;
    addEventListener(type: "message", handler: (event: MessageEvent) => void): void;
}

const worker = {
    async fetch(req: Request): Promise<Response> {
        const upgrade = req.headers.get("Upgrade");
        if (upgrade !== "websocket") {
            return new Response("Expected WebSocket", { status: 400 });
        }

        console.log("Got request for WebSocket");

        const url = new URL(req.url);
        const encrypted = url.searchParams.get("token");
        if (!encrypted || encrypted === "undefined") {
            console.log("Missing token");
            return new Response("Missing token", { status: 400 });
        }

        const secret = process.env.WS_TOKEN_SECRET;
        if (!secret) {
            console.log("Missing server secret");
            return new Response("Missing server secret", { status: 500 });
        }

        // console.log("Got secret for decryption:", secret);

        let token: string;
        try {
            token = await decryptToken(encrypted, secret);
        } catch {
            console.log("Invalid token");
            return new Response("Invalid token", { status: 400 });
        }

        // console.log('Connecting to assemblyai for token:', token);

        const aaiUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${token}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [client, server] = Object.values(new (globalThis as any).WebSocketPair()) as CloudflareWebSocket[];
        server.accept();

        let aaiSocket: WebSocket;

        try {
            aaiSocket = new WebSocket(aaiUrl);

            // Wait for connection to open before forwarding messages
            aaiSocket.onopen = () => {
                console.log("Connected to AssemblyAI");
            };

            // Forward AssemblyAI messages to client
            aaiSocket.onmessage = (msg) => {
                try {
                    server.send(msg.data);
                } catch (err) {
                    console.error("Error sending to client:", err);
                }
            };

            // Forward browser audio to AssemblyAI
            server.addEventListener("message", (event) => {
                try {
                    // Only send if connection is open
                    if (aaiSocket.readyState === WebSocket.OPEN) {
                        aaiSocket.send(event.data);
                    }
                } catch (err) {
                    console.error("Error forwarding to AssemblyAI:", err);
                }
            });

            aaiSocket.onclose = () => {
                console.log("AssemblyAI connection closed");
                server.close();
            };

            aaiSocket.onerror = (err) => {
                console.error("AAI WebSocket error:", err);
                server.close();
            };

            // Handle client disconnect
            // Cloudflare WebSocket only supports "message" event, handle close another way
            (server as unknown as WebSocket).onclose = () => {
                if (aaiSocket.readyState === WebSocket.OPEN) {
                    aaiSocket.close();
                }
            };


        } catch (err) {
            console.error("Failed to create WebSocket connection:", err);
            server.close();
        }

        return new Response(null, {
            status: 101,
            webSocket: client as unknown as WebSocket
        } as ResponseInit);
    }
};

export default worker;

async function decryptToken(payloadB64url: string, secret: string): Promise<string> {
    const payload = base64urlDecode(payloadB64url);
    if (payload.length < 1 + 16 + 12 + 1) {
        throw new Error("payload too short");
    }
    const version = payload[0];
    if (version !== 1) throw new Error("unsupported version");
    const salt = payload.slice(1, 17);
    const iv = payload.slice(17, 29);
    const ciphertext = payload.slice(29);

    const dec = new TextDecoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return dec.decode(new Uint8Array(plaintext));
}

function base64urlDecode(s: string): Uint8Array {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = Buffer.from(b64, "base64");
    return new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
}