export async function GET() {
    try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY!;
        const secret = process.env.WS_TOKEN_SECRET!;

        if (!apiKey) {
            return Response.json({ error: "API key not configured" }, { status: 500 });
        }
        if (!secret) {
            return Response.json({ error: "WS token secret not configured" }, { status: 500 });
        }

        const url = new URL("https://streaming.assemblyai.com/v3/token");
        url.searchParams.set("expires_in_seconds", "300");
        const tokenRes = await fetch(url, {
            headers: { Authorization: apiKey },
        });

        if (!tokenRes.ok) {
            const errorText = await tokenRes.text();
            console.error("AssemblyAI error:", errorText);
            return Response.json({ error: "Failed to get token" }, { status: tokenRes.status });
        }

        const { token } = await tokenRes.json() as { token: string };

        const encrypted = await encryptToken(token, secret);
        return Response.json({ token: encrypted });
    } catch (error) {
        console.error("Error getting token:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function encryptToken(plaintext: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext))
    );

    // payload: [v=1][salt(16)][iv(12)][ciphertext]
    const version = new Uint8Array([1]);
    const payload = concatUint8(version, salt, iv, ciphertext);
    return base64urlEncode(payload);
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((n, a) => n + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
}

function base64urlEncode(bytes: Uint8Array): string {
    const bin = String.fromCharCode(...bytes);
    const b64 = Buffer.from(bin, "binary").toString("base64");
    return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}


