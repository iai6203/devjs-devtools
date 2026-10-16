export type Target = 'last' | 'review'
export type Running = Record<Target, boolean>
export type Platform = 'macos' | 'wsl' | 'unsupported'

declare module 'claude-code' {
  interface PluginState {
    'plannotator-tools': {
      running: Running
      responding: boolean
      reserved: boolean
      // OS 판별 결과; 아직 판별하지 못했으면 null
      platform: Platform | null
    }
  }
}
