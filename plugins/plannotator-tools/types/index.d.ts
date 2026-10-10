export type Target = 'last' | 'review'
export type Running = Record<Target, boolean>

declare module 'claude-code' {
  interface PluginState {
    'plannotator-tools': { running: Running; responding: boolean; reserved: boolean }
  }
}
