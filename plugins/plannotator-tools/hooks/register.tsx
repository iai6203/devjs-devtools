import { atom, read, update } from 'claude-code'
import type {
  EngineInterface,
  HookStream,
  ProcessSpawnChunk,
  ProcessSpawnResult,
  Register,
  Timer,
} from 'claude-code'

import type { Target } from '../types'
import { HOST_MESSAGES_FILE_ENV, lastInput, removeMessagesFile, writeMessagesFile } from './messages'
import { checkClipboard, copyToClipboard, getPlatform, warmPlatform } from './platform'

const running = atom({ plugin: 'plannotator-tools', key: 'running' } as const, {
  last: false,
  review: false,
})

// 메인 턴이 응답 중인지, Last가 그 턴의 종료에 예약되어 있는지
const responding = atom({ plugin: 'plannotator-tools', key: 'responding' } as const, false)
const reserved = atom({ plugin: 'plannotator-tools', key: 'reserved' } as const, false)

// 턴이 끝난 직후엔 마지막 메시지가 아직 기록되지 않았을 수 있어 잠시 기다린 뒤 실행한다
const RESERVE_DELAY_MS = 1000

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
const SCRIPT = 'echo $$ >&2; exec plannotator "$@"'

const NOT_FOUND = 'plannotator를 실행할 수 없습니다. 설치되어 있는지 확인하세요.'

let nextId = 0
const runs: Partial<Record<Target, Run>> = {}
let pending: Timer | undefined

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
  const platform = await getPlatform($)
  if (platform === 'unsupported') return

  // 브라우저 리뷰를 마친 뒤 복사 불가를 알게 되지 않도록 먼저 확인한다.
  const unavailable = await checkClipboard($, platform)
  if (unavailable) {
    $.ui.toast(unavailable)
    return
  }

  // Last는 현재 세션의 응답을 직접 넘겨, 같은 디렉토리의 다른 세션이 열리지 않게 한다
  const input = target === 'last' ? await lastInput($) : undefined
  if (input === null) {
    $.ui.toast('plannotator last: 주석을 달 응답이 아직 없습니다.')
    return
  }

  const previous = runs[target]
  if (previous) {
    await stop($, previous)
  }

  const file = input?.file && (await writeMessagesFile($, input.file)) ? input.file : undefined
  const id = ++nextId
  const stream = $.process.spawn({
    argv: ['/bin/sh', '-c', SCRIPT, 'sh', ...(input ? ['annotate-last', '--stdin'] : [target])],
    ...(input ? { input: input.text } : {}),
    ...(file ? { env: { [HOST_MESSAGES_FILE_ENV]: file.path } } : {}),
  })
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
      if (file) await removeMessagesFile($, file.path)
      delete runs[target]
      await setRunning($, target, false)
      $.ui.toast(NOT_FOUND)
    }
    return
  }

  // 재시작으로 대체된 실행은 결과를 버린다; 같은 경로의 messages.json은 새 실행이 쓴다
  if (!isCurrent()) {
    return
  }
  if (file) await removeMessagesFile($, file.path)
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

  const copyError = await copyToClipboard($, platform, stdout)
  $.ui.toast(copyError ?? `plannotator ${target} 결과를 클립보드에 복사했습니다.`)
}

function setReserved($: EngineInterface, value: boolean) {
  return update($, reserved, () => value)
}

// 응답 중에 Last를 누르면 예약하고, 예약된 상태에서 다시 누르면 해제한다
async function pressLast($: EngineInterface) {
  if (await read($, reserved)) {
    pending?.cancel()
    pending = undefined
    await setReserved($, false)
    return
  }
  if (await read($, responding)) {
    await setReserved($, true)
    return
  }
  await start($, 'last')
}

export const register: Register = on => {
  // 첫 렌더의 판별이 중단되어도 여기서 판별을 마치면 밴드가 다시 그려진다
  on('session.start', async ($, e, next) => {
    await warmPlatform($)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, responding, () => true)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // 서브에이전트의 턴은 메인 응답의 끝이 아니다
    if (e.agentId !== undefined) {
      return result
    }

    await update($, responding, () => false)
    if (!(await read($, reserved)) || pending) {
      return result
    }
    if (e.reason !== 'answer') {
      await setReserved($, false)
      $.ui.toast('응답이 정상적으로 끝나지 않아 Last 예약을 해제했습니다.')
      return result
    }

    pending = $.clock.after(RESERVE_DELAY_MS, () => {
      pending = undefined
      void setReserved($, false).then(() => start($, 'last'))
    })
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey || (await getPlatform($)) === 'unsupported') {
      return next(e)
    }

    const { Box, Button } = $.ui.resolve(e)
    const state = await read($, running)
    const isReserved = await read($, reserved)

    return (
      <Box gap={1}>
        {BUTTONS.map(({ target, label }) => (
          <Button
            key={target}
            label={
              target === 'last' && isReserved
                ? `${label} (예약됨 · 클릭 시 해제)`
                : state[target]
                  ? `${label} (실행 중 · 클릭 시 재시작)`
                  : label
            }
            onPress={() => void (target === 'last' ? pressLast($) : start($, target))}
          />
        ))}
      </Box>
    )
  })
}
