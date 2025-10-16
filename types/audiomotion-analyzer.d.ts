declare module 'audiomotion-analyzer' {
  export default class AudioMotionAnalyzer {
    constructor(container: HTMLElement, options?: any)
    connectInput(node: AudioNode): void
    disconnectInput(node?: AudioNode, stopTracks?: boolean): void
    setOptions(opts: { audioCtx?: AudioContext } & Record<string, unknown>): void
    resume(): void
    pause(): void
    readonly audioCtx: AudioContext
    volume: number
  }
}


