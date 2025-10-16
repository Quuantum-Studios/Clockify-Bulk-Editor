declare module "assemblyai" {
  export class AssemblyAI {
    constructor(config: { apiKey: string })
    files: { upload: (data: ArrayBuffer | Buffer | Uint8Array) => Promise<string> }
    transcripts: { transcribe: (opts: { audio: string }) => Promise<{ status: string; text?: string; error?: string }> }
  }
}


