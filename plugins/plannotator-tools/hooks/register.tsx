import { atom, read, update } from 'claude-code'
import type {
  EngineInterface,
  HookStream,
  ProcessSpawnChunk,
  ProcessSpawnResult,
  Register,
} from 'claude-code'

import type { Target } from '../types'

const running = atom({ plugin: 'plannotator-tools', key: 'running' } as const, {
  last: false,
  review: false,
})

const BUTTONS: ReadonlyArray<{ target: Target; label: string }> = [
  { target: 'last', label: '[Plannotator] Last' },
  { target: 'review', label: '[Plannotator] Review' },
]

type Run = {
  id: number
  stream: HookStream<ProcessSpawnChunk, ProcessSpawnResult>
  pid?: string
}

// 셸이 자기 PID를 stderr 첫 줄에 남긴 뒤 plannotator로 exec해, 재시작 시 그 PID로 종료한다
const SCRIPT = 'echo $$ >&2; exec plannotator "$1"'

const NOT_FOUND = 'plannotator를 실행할 수 없습니다. 설치되어 있는지 확인하세요.'

let isMac: Promise<boolean> | undefined
let nextId = 0
const runs: Partial<Record<Target, Run>> = {}

function checkMac($: EngineInterface) {
  isMac ??= $.process
    .run(['uname', '-s'])
    .then(({ stdout }) => stdout.trim() === 'Darwin')
    .catch(() => false)

  return isMac
}

function stop($: EngineInterface, run: Run) {
  // PID를 받기 전이면 스트림을 닫는다; 대기 중인 읽기가 있어 끝을 기다리지 않는다
  if (run.pid === undefined) {
    void run.stream.return({ code: null, signal: 'SIGTERM' })
    return
  }
  return $.process.run(['kill', run.pid]).catch(() => undefined)
}

function setRunning($: EngineInterface, target: Target, value: boolean) {
  return update($, running, state => ({ ...state, [target]: value }))
}

// 실행 중인 같은 버튼을 다시 누르면 이전 plannotator를 종료하고 새로 시작한다
async function start($: EngineInterface, target: Target) {
  const previous = runs[target]
  if (previous) {
    await stop($, previous)
  }

  const id = ++nextId
  const stream = $.process.spawn({ argv: ['/bin/sh', '-c', SCRIPT, 'sh', target] })
  const run: Run = { id, stream }
  const isCurrent = () => runs[target]?.id === id
  runs[target] = run
  await setRunning($, target, true)

  let stdout = ''
  let stderr = ''
  let result: ProcessSpawnResult
  try {
    for (;;) {
      const step = await stream.next()
      if (step.done) {
        result = step.value
        break
      }
      if (step.value.stream === 'stdout') {
        stdout += step.value.text
      } else {
        stderr += step.value.text
        run.pid ??= /^(\d+)\n/.exec(stderr)?.[1]
      }
    }
  } catch {
    if (isCurrent()) {
      delete runs[target]
      await setRunning($, target, false)
      $.ui.toast(NOT_FOUND)
    }
    return
  }

  // 재시작으로 대체된 실행은 결과를 버린다
  if (!isCurrent()) {
    return
  }
  delete runs[target]
  await setRunning($, target, false)

  // sh가 plannotator를 찾지 못하면 127로 끝난다
  if (result.code === 127) {
    $.ui.toast(NOT_FOUND)
    return
  }
  if (result.code !== 0) {
    const reason = stderr.trim().split('\n').slice(1).pop()
    $.ui.toast(
      `plannotator ${target} 실패 (exit ${result.code ?? result.signal})${reason ? `: ${reason}` : ''}`,
    )
    return
  }
  if (stdout.trim() === '') {
    $.ui.toast(`plannotator ${target}: 복사할 출력이 없습니다.`)
    return
  }

  const copied = await $.process.run(['pbcopy'], { stdin: stdout }).catch(() => null)
  $.ui.toast(
    copied?.exitCode === 0
      ? `plannotator ${target} 결과를 클립보드에 복사했습니다.`
      : '클립보드 복사에 실패했습니다.',
  )
}

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey || !(await checkMac($))) {
      return next(e)
    }

    const { Box, Button } = $.ui.resolve(e)
    const state = await read($, running)

    return (
      <Box gap={1}>
        {BUTTONS.map(({ target, label }) => (
          <Button
            key={target}
            label={state[target] ? `${label} (실행 중 · 클릭 시 재시작)` : label}
            onPress={() => void start($, target)}
          />
        ))}
      </Box>
    )
  })
}
