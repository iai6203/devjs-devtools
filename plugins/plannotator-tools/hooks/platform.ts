import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { Platform } from '../types'

type SupportedPlatform = Exclude<Platform, 'unsupported'>

const detected = atom({ plugin: 'plannotator-tools', key: 'platform' } as const, null as Platform | null)

let detecting: Promise<Platform> | undefined

// $.process.run은 호출한 dispatch에 묶여, ui.render dispatch가 중단되면 함께 거부된다.
// 판별에 성공한 결과만 $.state에 저장하고, 거부되면 저장하지 않아 다음 호출에서 다시 판별한다.
// 렌더 중에 읽으므로 나중에 판별이 끝나면 밴드가 다시 그려진다.
export async function getPlatform($: EngineInterface): Promise<Platform> {
  const known = await read($, detected)
  if (known) return known

  const current = detecting ??= detectPlatform($)
  let platform: Platform
  try {
    platform = await current
  } catch {
    return 'unsupported'
  } finally {
    if (detecting === current) detecting = undefined
  }
  // 렌더 중에는 $.state를 쓸 수 없으므로 저장 실패는 무시하고 판별 결과를 그대로 쓴다
  await savePlatform($, platform).catch(() => undefined)
  return platform
}

// session.start는 중단되지 않으므로 렌더가 시작한 판별과 공유하지 않고 따로 판별한다
export async function warmPlatform($: EngineInterface) {
  if (await read($, detected)) return
  const platform = await detectPlatform($).catch(() => undefined)
  if (platform) await savePlatform($, platform)
}

async function savePlatform($: EngineInterface, platform: Platform) {
  await update($, detected, () => platform)
  return platform
}

async function detectPlatform($: EngineInterface): Promise<Platform> {
  const os = await $.process.run(['uname', '-s'])
  if (os.exitCode !== 0) return 'unsupported'
  if (os.stdout.trim() === 'Darwin') return 'macos'
  if (os.stdout.trim() !== 'Linux') return 'unsupported'

  const kernel = await $.process.run(['uname', '-r'])
  return kernel.exitCode === 0 && /microsoft|wsl/i.test(kernel.stdout)
    ? 'wsl'
    : 'unsupported'
}

// 존재 여부만 검사한다. clip.exe를 시험 실행하면 기존 클립보드가 변경될 수 있다.
const REQUIREMENTS = {
  macos: [['pbcopy', 'pbcopy를 찾을 수 없습니다. macOS PATH 설정을 확인하세요.']],
  wsl: [
    ['/bin/bash', '/bin/bash를 찾을 수 없습니다. Bash 설치를 확인하세요.'],
    ['iconv', 'iconv를 찾을 수 없습니다. Ubuntu의 libc-bin 설치와 PATH 설정을 확인하세요.'],
    ['clip.exe', 'clip.exe를 찾을 수 없습니다. Windows PATH 연동과 WSL interop 설정을 확인하세요.'],
  ],
} as const

export async function checkClipboard($: EngineInterface, host: SupportedPlatform) {
  for (const [command, message] of REQUIREMENTS[host]) {
    const result = await $.process.run(
      ['/bin/sh', '-c', 'command -v "$1" >/dev/null 2>&1', 'sh', command],
    ).catch(() => null)
    if (result?.exitCode !== 0) return message
  }
}

export async function copyToClipboard(
  $: EngineInterface,
  host: SupportedPlatform,
  text: string,
) {
  // UTF-16LE 바이트는 JS 문자열로 왕복하지 않고 OS 파이프로 전달한다.
  // 피드백은 셸 코드에 삽입하지 않으며 pipefail로 변환 실패도 감지한다.
  const argv = host === 'macos'
    ? ['pbcopy']
    : ['/bin/bash', '-o', 'pipefail', '-c', 'iconv -f UTF-8 -t UTF-16LE | clip.exe']
  const result = await $.process.run(argv, { stdin: text }).catch(() => null)
  if (result?.exitCode !== 0) {
    return host === 'wsl'
      ? '클립보드 복사에 실패했습니다. iconv와 clip.exe 실행 및 WSL interop 설정을 확인하세요.'
      : '클립보드 복사에 실패했습니다.'
  }
}
