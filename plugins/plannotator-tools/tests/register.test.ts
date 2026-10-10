import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'plannotator-tools',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

// 실행마다의 출력; 'hang'은 브라우저에서 리뷰 중이라 종료될 때까지 출력이 없는 상태
type Host = { os?: string; outputs?: string[]; code?: number }

function ran(stdout: string) {
  return { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
}

// 엔진 아래에서 uname, pbcopy, plannotator, 토스트를 흉내 낸다
function fakeHost(on: On, host: Host = {}) {
  const copied: string[] = []
  const toasts: string[] = []
  const spawned: string[] = []
  const killed: string[] = []
  const kills = new Map<string, () => void>()
  let onSpawn = () => {}
  const nextSpawn = () => new Promise<void>(resolve => (onSpawn = resolve))

  on('process.run', async ($, e) => {
    if (e.argv[0] === 'uname') {
      return { value: ran(`${host.os ?? 'Darwin'}\n`) }
    }
    if (e.argv[0] === 'kill') {
      killed.push(e.argv[1] ?? '')
      kills.get(e.argv[1] ?? '')?.()
      return { value: ran('') }
    }
    copied.push(e.init?.stdin ?? '')
    return { value: ran('') }
  })

  on('process.spawn', async function* ($, e) {
    // argv: /bin/sh -c <script> sh <target>
    const output = host.outputs?.[spawned.length] ?? ''
    const pid = String(1000 + spawned.length)
    spawned.push(e.argv[4] ?? '')
    yield { stream: 'stderr' as const, text: `${pid}\n` }
    onSpawn()
    if (output === 'hang') {
      await new Promise<void>(resolve => kills.set(pid, resolve))
      return { value: { code: null, signal: 'SIGTERM' } }
    }
    if (output !== '') {
      yield { stream: 'stdout' as const, text: output }
    }
    return { value: { code: host.code ?? 0, signal: null } }
  })

  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  // 플러그인이 그리지 않을 때 엔진 대신 빈 밴드를 그린다
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return Box({ key: 'engine' })
  })

  return { copied, toasts, spawned, killed, nextSpawn }
}

test('macOS 터미널에서 버튼 2개를 그린다', async ($, on) => {
  fakeHost(on)
  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ key: 'last' }))?.text).toBe('[Plannotator] Last')
  expect((await ui.find({ key: 'review' }))?.text).toBe('[Plannotator] Review')
  await ui.unmount()
})

test('macOS가 아니면 아무것도 그리지 않는다', async ($, on) => {
  fakeHost(on, { os: 'Linux' })
  const ui = await $.ui.mount(BAND)

  expect(await ui.find({ key: 'last' })).toBeUndefined()
  await ui.unmount()
})

test('Last를 누르면 plannotator last 출력을 pbcopy로 복사한다', async ($, on) => {
  const host = fakeHost(on, { outputs: ['# feedback'] })
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'last' })

  expect(host.spawned).toEqual(['last'])
  expect(host.copied).toEqual(['# feedback'])
  expect(host.toasts).toEqual(['plannotator last 결과를 클립보드에 복사했습니다.'])
  expect((await ui.find({ key: 'last' }))?.text).toBe('[Plannotator] Last')
  await ui.unmount()
})

test('Review를 누르면 plannotator review를 실행한다', async ($, on) => {
  const host = fakeHost(on, { outputs: ['LGTM'] })
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'review' })

  expect(host.spawned).toEqual(['review'])
  expect(host.copied).toEqual(['LGTM'])
  await ui.unmount()
})

test('plannotator가 없으면 설치 안내를 띄운다', async ($, on) => {
  const host = fakeHost(on, { outputs: [''], code: 127 })
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'review' })

  expect(host.copied).toEqual([])
  expect(host.toasts).toEqual(['plannotator를 실행할 수 없습니다. 설치되어 있는지 확인하세요.'])
  await ui.unmount()
})

test('실패하면 클립보드를 덮어쓰지 않는다', async ($, on) => {
  const host = fakeHost(on, { outputs: [''], code: 1 })
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'last' })

  expect(host.copied).toEqual([])
  expect(host.toasts).toEqual(['plannotator last 실패 (exit 1)'])
  await ui.unmount()
})

test('실행 중에 다시 누르면 이전 실행을 종료하고 새로 시작한다', async ($, on) => {
  const host = fakeHost(on, { outputs: ['hang', '# new feedback'] })
  const ui = await $.ui.mount(BAND)

  const started = host.nextSpawn()
  const first = ui.press({ key: 'last' })
  await started
  expect((await ui.find({ key: 'last' }))?.text).toBe(
    '[Plannotator] Last (실행 중 · 클릭 시 재시작)',
  )

  await ui.press({ key: 'last' })
  await first

  expect(host.spawned).toEqual(['last', 'last'])
  expect(host.killed).toEqual(['1000'])
  expect(host.copied).toEqual(['# new feedback'])
  expect(host.toasts).toEqual(['plannotator last 결과를 클립보드에 복사했습니다.'])
  expect((await ui.find({ key: 'last' }))?.text).toBe('[Plannotator] Last')
  await ui.unmount()
})
