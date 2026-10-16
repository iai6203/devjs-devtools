import type { EngineInterface } from 'claude-code'

type Platform = 'macos' | 'wsl' | 'unsupported'
type SupportedPlatform = Exclude<Platform, 'unsupported'>

let platform: Promise<Platform> | undefined

export function getPlatform($: EngineInterface): Promise<Platform> {
  platform ??= detectPlatform($).catch(() => 'unsupported')
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
