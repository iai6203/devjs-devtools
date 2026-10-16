import type { EngineInterface } from 'claude-code'

// plannotator CLI가 messages.json에서 읽는 한도(server/host-messages.ts)
const RECENT_MESSAGES_LIMIT = 25
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024
// 파일 한도(8 MiB)보다 여유를 둔다
const FILE_BUDGET_BYTES = 8 * 1024 * 1024 - 256 * 1024

export const HOST_MESSAGES_FILE_ENV = 'PLANNOTATOR_HOST_MESSAGES_FILE'

// mod에서 실행한 plannotator는 부모 프로세스로 세션을 찾지 못해,
// 같은 디렉토리의 다른 세션을 열 수 있다. 그래서 현재 세션의 메시지를 직접 넘긴다.
export type LastInput = {
  // 최신 응답; CLI는 --stdin으로 읽는다
  text: string
  // 메시지 선택기용 messages.json; 쓸 수 없거나 응답이 하나뿐이면 없다
  file?: { path: string; json: string }
}

// 한 응답에 걸친 연속된 assistant 메시지를 합쳐 최신순으로 반환한다
export function recentAssistantTexts(
  messages: readonly { role: string; text: string }[],
  limit = RECENT_MESSAGES_LIMIT,
): string[] {
  const texts: string[] = []
  let run: string[] = []
  const flush = () => {
    const text = run.join('\n')
    run = []
    if (text.trim()) texts.push(text)
  }
  for (let index = messages.length - 1; index >= 0 && texts.length < limit; index--) {
    const message = messages[index]
    if (!message) continue
    if (message.role === 'assistant') {
      if (message.text.trim()) run.unshift(message.text)
    } else {
      flush()
    }
  }
  if (texts.length < limit) flush()
  return texts
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// 한도를 넘는 오래된 메시지는 뺀다; id는 내용에서 만들어 실행마다 같은 메시지는 같은 id를 갖는다
export async function messagesJson(texts: readonly string[]) {
  const size = (text: string) => new TextEncoder().encode(text).length
  const picked: { messageId: string; text: string }[] = []
  const used = new Map<string, number>()
  let total = size(JSON.stringify({ v: 1, messages: [] }))
  for (const text of texts) {
    if (size(text) > MAX_MESSAGE_BYTES) {
      if (picked.length === 0) return null
      continue
    }
    const base = `cc-${(await sha256(text)).slice(0, 16)}`
    const seen = used.get(base) ?? 0
    const message = { messageId: seen === 0 ? base : `${base}-${seen + 1}`, text }
    const cost = size(JSON.stringify(message)) + (picked.length > 0 ? 1 : 0)
    if (total + cost > FILE_BUDGET_BYTES) {
      if (picked.length === 0) return null
      continue
    }
    total += cost
    used.set(base, seen + 1)
    picked.push(message)
  }
  return picked.length > 1 ? JSON.stringify({ v: 1, messages: picked }) : null
}

// plannotator CLI와 같은 규칙으로 데이터 디렉토리를 정한다; 상대 경로는 CLI와 맞출 수 없어 쓰지 않는다
async function dataDir($: EngineInterface) {
  const home = (await $.env.get('HOME'))?.replace(/\/+$/, '')
  const custom = (await $.env.get('PLANNOTATOR_DATA_DIR'))?.trim()
  if (custom) {
    if (custom === '~') return home || null
    if (custom.startsWith('~/')) return home ? `${home}/${custom.slice(2)}` : null
    if (custom.startsWith('/')) return custom.replace(/\/+$/, '') || '/'
    return null
  }
  if (!home) return null
  const legacy = `${home}/.plannotator`
  if (await $.fs.exists(legacy)) return legacy
  const xdg = (await $.env.get('XDG_DATA_HOME'))?.trim()
  return xdg?.startsWith('/') ? `${xdg.replace(/\/+$/, '')}/plannotator` : legacy
}

// CLI는 데이터 디렉토리의 claude-code-mod/ 아래에 있는 messages.json만 읽는다
async function messagesPath($: EngineInterface) {
  const dir = await dataDir($)
  if (!dir) return null
  const sessionId = (await $.session.id()).replace(/[^A-Za-z0-9._-]/g, '_')
  return `${dir}/claude-code-mod/plannotator-tools/${sessionId}/messages.json`
}

export async function lastInput($: EngineInterface): Promise<LastInput | null> {
  const texts = recentAssistantTexts(await $.session.messages())
  const text = texts[0]
  if (!text) return null

  const json = await messagesJson(texts)
  const path = json ? await messagesPath($) : null
  return json && path ? { text, file: { path, json } } : { text }
}

// 응답 내용이 담기므로 소유자만 읽을 수 있게 만든다; 실패하면 선택기 없이 최신 응답만 넘긴다
export async function writeMessagesFile($: EngineInterface, file: { path: string; json: string }) {
  const result = await $.process.run(
    ['/bin/sh', '-c', 'umask 077 && mkdir -p "$(dirname "$1")" && cat > "$1"', 'sh', file.path],
    { stdin: file.json },
  ).catch(() => null)
  return result?.exitCode === 0
}

export function removeMessagesFile($: EngineInterface, path: string) {
  return $.process.run(['rm', '-f', path]).catch(() => undefined)
}
