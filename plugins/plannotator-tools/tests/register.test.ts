import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, TurnCompleteReason } from 'claude-code'

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
type Host = {
  os?: string
  release?: string
  unameCode?: number
  // 렌더 dispatch가 중단되어 uname -r 호출이 거부되는 횟수
  unameAborts?: number
  outputs?: string[]
  code?: number
  missing?: string
  copyCode?: number
  copyThrows?: boolean
}

function ran(stdout: string) {
  return { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
}

// OS 판별, 의존성 확인, 클립보드와 plannotator 실행을 외부 경계에서 흉내 낸다
function fakeHost(on: On, host: Host = {}) {
  const copied: string[] = []
  const copyCommands: string[][] = []
  const toasts: string[] = []
  const spawned: string[] = []
  const killed: string[] = []
  const kills = new Map<string, () => void>()
  let onSpawn = () => {}
  const nextSpawn = () => new Promise<void>(resolve => (onSpawn = resolve))

  on('process.run', async ($, e) => {
    if (e.argv[0] === 'uname') {
      if (e.argv[1] === '-r' && (host.unameAborts ?? 0) > 0) {
        host.unameAborts!--
        throw new Error('dispatch abandoned')
      }
      const value = e.argv[1] === '-r' ? host.release ?? '6.8.0-generic' : host.os ?? 'Darwin'
      return { value: { ...ran(`${value}\n`), exitCode: host.unameCode ?? 0 } }
    }
    if (e.argv[0] === '/bin/sh' && e.argv[2] === 'command -v "$1" >/dev/null 2>&1') {
      return { value: { ...ran(''), exitCode: e.argv[4] === host.missing ? 1 : 0 } }
    }
    if (e.argv[0] === 'kill') {
      killed.push(e.argv[1] ?? '')
      kills.get(e.argv[1] ?? '')?.()
      return { value: ran('') }
    }
    if (e.argv[0] === 'pbcopy' || e.argv[0] === '/bin/bash') {
      copyCommands.push([...e.argv])
      copied.push(e.init?.stdin ?? '')
      if (host.copyThrows) throw new Error('clipboard process unavailable')
      return { value: { ...ran(''), exitCode: host.copyCode ?? 0 } }
    }
    throw new Error(`Unexpected process.run: ${JSON.stringify(e.argv)}`)
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

  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer }))

  // 플러그인이 그리지 않을 때 엔진 대신 빈 밴드를 그린다
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return Box({ key: 'engine' })
  })

  return { copied, copyCommands, toasts, spawned, killed, nextSpawn }
}

test('macOS 터미널에서 버튼 2개를 그린다', async ($, on) => {
  fakeHost(on)
  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ key: 'last' }))?.text).toBe('[Plannotator] Last')
  expect((await ui.find({ key: 'review' }))?.text).toBe('[Plannotator] Review')
  await ui.unmount()
})

test('WSL2에서 첫 렌더의 OS 판별이 중단되어도 다음 렌더에서 버튼을 그린다', async ($, on) => {
  fakeHost(on, { os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', unameAborts: 1 })
  const first = await $.ui.mount(BAND)
  expect(await first.find({ key: 'last' })).toBeUndefined()
  await first.unmount()

  const second = await $.ui.mount(BAND)
  expect((await second.find({ key: 'last' }))?.text).toBe('[Plannotator] Last')
  await second.unmount()
})

test('일반 Linux에서는 버튼을 그리지 않는다', async ($, on) => {
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
  expect(host.copyCommands).toEqual([['pbcopy']])
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

for (const release of ['6.18.40.1-microsoft-standard-WSL2', '5.15.90.1-Microsoft-standard-WSL2']) {
  test(`WSL2 커널(${release})에서는 버튼 2개를 그린다`, async ($, on) => {
    // Given: Linux이지만 WSL2 커널(release)을 사용한다.
    fakeHost(on, { os: 'Linux', release })

    // When: 입력창 위 UI(ui)를 표시한다.
    const ui = await $.ui.mount(BAND)

    // Then: Last와 Review 버튼을 모두 제공한다.
    expect((await ui.find({ key: 'last' }))?.text).toBe('[Plannotator] Last')
    expect((await ui.find({ key: 'review' }))?.text).toBe('[Plannotator] Review')
    await ui.unmount()
  })
}

for (const platform of [{ os: 'Windows_NT' }, { os: 'Darwin', unameCode: 1 }]) {
  test(`미지원 OS 또는 판별 실패(${JSON.stringify(platform)})에서는 버튼을 숨긴다`, async ($, on) => {
    // Given: 지원하지 않거나 판별하지 못한 환경(platform)이다.
    fakeHost(on, platform)

    // When: 입력창 위 UI(ui)를 표시한다.
    const ui = await $.ui.mount(BAND)

    // Then: 실행할 수 없는 버튼을 제공하지 않는다.
    expect(await ui.find({ key: 'last' })).toBeUndefined()
    expect(await ui.find({ key: 'review' })).toBeUndefined()
    await ui.unmount()
  })
}

for (const target of ['last', 'review']) {
  test(`WSL의 ${target} 결과는 UTF-16LE 파이프라인에 원문을 stdin으로 전달한다`, async ($, on) => {
    // Given: 한글, 이모지, 줄바꿈과 셸 문법을 포함한 피드백(feedback)이다.
    const feedback = '# 한글 😀\n"quotes" \'single\' $(touch SHOULD_NOT_EXIST) `id` $HOME\n'
    const host = fakeHost(on, {
      os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', outputs: [feedback],
    })
    const ui = await $.ui.mount(BAND)

    // When: 대상 버튼(target)을 누른다.
    await ui.press({ key: target })

    // Then: 원문(feedback)은 명령이 아닌 stdin으로 전달되고 변환 실패도 감지한다.
    expect(host.spawned).toEqual([target])
    expect(host.copyCommands).toEqual([[
      '/bin/bash', '-o', 'pipefail', '-c', 'iconv -f UTF-8 -t UTF-16LE | clip.exe',
    ]])
    expect(host.copied).toEqual([feedback])
    expect(host.toasts).toEqual([`plannotator ${target} 결과를 클립보드에 복사했습니다.`])
    await ui.unmount()
  })
}

for (const missing of ['iconv', 'clip.exe', '/bin/bash']) {
  test(`WSL에서 ${missing}가 없으면 리뷰 시작 전에 필요한 설정을 안내한다`, async ($, on) => {
    // Given: WSL 환경에 필요한 실행 파일(missing)이 없다.
    const host = fakeHost(on, {
      os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', missing, outputs: ['feedback'],
    })
    const ui = await $.ui.mount(BAND)

    // When: Review 버튼을 누른다.
    await ui.press({ key: 'review' })

    // Then: 리뷰와 복사는 시작하지 않고 누락된 실행 파일(missing)을 알려준다.
    expect(host.spawned).toEqual([])
    expect(host.copied).toEqual([])
    expect(host.toasts).toHaveLength(1)
    expect(host.toasts[0]).toContain(missing)
    if (missing === 'clip.exe') expect(host.toasts[0]).toContain('PATH')
    expect((await ui.find({ key: 'review' }))?.text).toBe('[Plannotator] Review')
    await ui.unmount()
  })
}

for (const failure of [{ copyCode: 1 }, { copyThrows: true }]) {
  test(`WSL 클립보드 실행 실패(${JSON.stringify(failure)}) 시 성공으로 안내하지 않는다`, async ($, on) => {
    // Given: 도구는 존재하지만 클립보드 실행이 실패하는 환경(failure)이다.
    const host = fakeHost(on, {
      os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', outputs: ['feedback'], ...failure,
    })
    const ui = await $.ui.mount(BAND)

    // When: 리뷰를 완료하여 복사를 시도한다.
    await ui.press({ key: 'review' })

    // Then: 실패 및 WSL interop 점검을 안내하고 실행 중 표시를 해제한다.
    expect(host.copied).toEqual(['feedback'])
    expect(host.toasts).toEqual(['클립보드 복사에 실패했습니다. iconv와 clip.exe 실행 및 WSL interop 설정을 확인하세요.'])
    expect((await ui.find({ key: 'review' }))?.text).toBe('[Plannotator] Review')
    await ui.unmount()
  })
}

for (const output of [{ code: 1, outputs: ['partial'] }, { outputs: [' \n'] }]) {
  test(`WSL에서 리뷰 실패 또는 빈 출력(${JSON.stringify(output)})이면 복사하지 않는다`, async ($, on) => {
    // Given: 실패하거나 복사할 내용이 없는 리뷰 결과(output)이다.
    const host = fakeHost(on, {
      os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', ...output,
    })
    const ui = await $.ui.mount(BAND)

    // When: Review 버튼을 누른다.
    await ui.press({ key: 'review' })

    // Then: 클립보드 명령을 실행하지 않는다.
    expect(host.spawned).toEqual(['review'])
    expect(host.copyCommands).toEqual([])
    await ui.unmount()
  })
}

const LAST = '[Plannotator] Last'
const RESERVED = '[Plannotator] Last (예약됨 · 클릭 시 해제)'

function startTurn($: Engine) {
  return $.turn.start({ text: '질문', turnId: 'turn-1' })
}

function completeTurn(
  $: Engine,
  reason: Exclude<TurnCompleteReason, 'refusal'> = 'answer',
  agentId?: string,
) {
  return $.turn.complete({
    answer: '답변',
    durationMs: 1,
    isAborted: reason === 'aborted',
    turnId: agentId ? 'agent-turn' : 'turn-1',
    agentId,
    reason,
  })
}

test('응답 중에 Last를 누르면 예약되고, 응답이 끝난 뒤 잠시 후 실행한다', async ($, on) => {
  const clock = mock.clock(on)
  const host = fakeHost(on, { outputs: ['# final'] })
  const ui = await $.ui.mount(BAND)

  await startTurn($)
  await ui.press({ key: 'last' })
  expect(host.spawned).toEqual([])
  expect((await ui.find({ key: 'last' }))?.text).toBe(RESERVED)

  await completeTurn($)
  await clock.advance(999)
  expect(host.spawned).toEqual([])

  await clock.advance(1)
  expect(host.spawned).toEqual(['last'])
  expect(host.copied).toEqual(['# final'])
  expect((await ui.find({ key: 'last' }))?.text).toBe(LAST)
  await ui.unmount()
})

test('예약된 Last를 다시 누르면 예약을 해제한다', async ($, on) => {
  const clock = mock.clock(on)
  const host = fakeHost(on, { outputs: ['# final'] })
  const ui = await $.ui.mount(BAND)

  await startTurn($)
  await ui.press({ key: 'last' })
  await ui.press({ key: 'last' })
  expect((await ui.find({ key: 'last' }))?.text).toBe(LAST)

  await completeTurn($)
  await clock.advance(2000)
  expect(host.spawned).toEqual([])
  await ui.unmount()
})

test('대기 중에 다시 누르면 예약 실행을 취소한다', async ($, on) => {
  const clock = mock.clock(on)
  const host = fakeHost(on, { outputs: ['# final'] })
  const ui = await $.ui.mount(BAND)

  await startTurn($)
  await ui.press({ key: 'last' })
  await completeTurn($)
  await ui.press({ key: 'last' })
  await clock.advance(2000)

  expect(host.spawned).toEqual([])
  expect((await ui.find({ key: 'last' }))?.text).toBe(LAST)
  await ui.unmount()
})

test('턴이 중단되면 예약을 해제하고 알린다', async ($, on) => {
  const clock = mock.clock(on)
  const host = fakeHost(on, { outputs: ['# partial'] })
  const ui = await $.ui.mount(BAND)

  await startTurn($)
  await ui.press({ key: 'last' })
  await completeTurn($, 'aborted')
  await clock.advance(2000)

  expect(host.spawned).toEqual([])
  expect(host.toasts).toEqual(['응답이 정상적으로 끝나지 않아 Last 예약을 해제했습니다.'])
  expect((await ui.find({ key: 'last' }))?.text).toBe(LAST)
  await ui.unmount()
})

test('서브에이전트 턴이 끝나도 예약을 유지한다', async ($, on) => {
  const clock = mock.clock(on)
  const host = fakeHost(on, { outputs: ['# final'] })
  const ui = await $.ui.mount(BAND)

  await startTurn($)
  await ui.press({ key: 'last' })
  await completeTurn($, 'answer', 'agent-1')
  await clock.advance(2000)

  expect(host.spawned).toEqual([])
  expect((await ui.find({ key: 'last' }))?.text).toBe(RESERVED)
  await ui.unmount()
})

test('WSL에서도 재시작하면 이전 결과를 버리고 새 결과만 복사한다', async ($, on) => {
  // Given: WSL에서 첫 리뷰는 진행 중이고 다음 리뷰에만 결과가 있다.
  const host = fakeHost(on, {
    os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', outputs: ['hang', '# 새 결과 😀'],
  })
  const ui = await $.ui.mount(BAND)
  const started = host.nextSpawn()
  const first = ui.press({ key: 'review' })
  await started

  // When: 같은 버튼을 눌러 진행 중인 리뷰(first)를 대체한다.
  await ui.press({ key: 'review' })
  await first

  // Then: 이전 PID는 종료되고 새 결과만 한 번 복사된다.
  expect(host.killed).toEqual(['1000'])
  expect(host.spawned).toEqual(['review', 'review'])
  expect(host.copied).toEqual(['# 새 결과 😀'])
  expect(host.copyCommands).toHaveLength(1)
  expect(host.copyCommands[0]?.[0]).toBe('/bin/bash')
  expect(host.toasts).toEqual(['plannotator review 결과를 클립보드에 복사했습니다.'])
  expect((await ui.find({ key: 'review' }))?.text).toBe('[Plannotator] Review')
  await ui.unmount()
})

for (const cancel of [false, true]) {
  test(`WSL에서도 응답 중 Last 예약을 ${cancel ? '취소하면 실행하지 않는다' : '정상 종료 후 실행한다'}`, async ($, on) => {
    // Given: WSL에서 메인 응답 중 Last를 예약한다.
    const clock = mock.clock(on)
    const host = fakeHost(on, {
      os: 'Linux', release: '6.18.40.1-microsoft-standard-WSL2', outputs: ['# 최종 응답'],
    })
    const ui = await $.ui.mount(BAND)
    await startTurn($)
    await ui.press({ key: 'last' })
    expect((await ui.find({ key: 'last' }))?.text).toBe(RESERVED)
    expect(host.spawned).toEqual([])

    // When: 턴을 끝내고 취소 여부(cancel)에 따라 대기 중 예약을 해제한다.
    await completeTurn($)
    if (cancel) await ui.press({ key: 'last' })
    await clock.advance(999)
    expect(host.spawned).toEqual([])
    await clock.advance(1)

    // Then: 취소되지 않은 예약만 실행하고 결과를 복사한다.
    expect(host.spawned).toEqual(cancel ? [] : ['last'])
    expect(host.copied).toEqual(cancel ? [] : ['# 최종 응답'])
    expect((await ui.find({ key: 'last' }))?.text).toBe(LAST)
    await ui.unmount()
  })
}

for (const failure of [{ missing: 'pbcopy' }, { copyCode: 1 }]) {
  test(`macOS에서도 클립보드 오류(${JSON.stringify(failure)})를 안내한다`, async ($, on) => {
    // Given: macOS에서 복사 도구가 없거나 실행이 실패한다(failure).
    const host = fakeHost(on, { outputs: ['feedback'], ...failure })
    const ui = await $.ui.mount(BAND)

    // When: Review 버튼을 누른다.
    await ui.press({ key: 'review' })

    // Then: 성공 안내 대신 실패 원인을 표시한다.
    expect(host.toasts).toEqual([
      'missing' in failure
        ? 'pbcopy를 찾을 수 없습니다. macOS PATH 설정을 확인하세요.'
        : '클립보드 복사에 실패했습니다.',
    ])
    expect(host.spawned).toEqual('missing' in failure ? [] : ['review'])
    await ui.unmount()
  })
}

test('응답 중이 아니면 Last를 바로 실행한다', async ($, on) => {
  mock.clock(on)
  const host = fakeHost(on, { outputs: ['# feedback'] })
  const ui = await $.ui.mount(BAND)

  await startTurn($)
  await completeTurn($)
  await ui.press({ key: 'last' })

  expect(host.spawned).toEqual(['last'])
  await ui.unmount()
})
