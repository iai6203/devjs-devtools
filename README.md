# devjs-devtools

일상적인 개발 워크플로우를 자동화하는 [Claude Code](https://claude.com/claude-code) 플러그인 마켓플레이스입니다.

## 플러그인

| 플러그인 | 하는 일 | 지원 환경 |
|---|---|---|
| [`devtools`](#devtools) | 커밋·PR·이슈·squash 자동화, 디버그 로그 삽입 | Claude Code, GitHub Copilot CLI, Codex |
| [`tdd`](#tdd) | 사람이 승인할 수 있는 테스트 명세와 TDD 단계별 안전장치 | Claude Code, Pi Coding Agent |
| [`plannotator-tools`](#plannotator-tools) | 입력창 위에 Plannotator 실행 버튼 추가 | Claude Code (macOS 전용) |

## 빠른 시작 (Claude Code)

마켓플레이스를 추가한 뒤 필요한 플러그인을 설치합니다.

```
/plugin marketplace add iai6203/devjs-devtools
/plugin install devtools@devjs-devtools
/plugin install tdd@devjs-devtools
/plugin install plannotator-tools@devjs-devtools
```

터미널에서는 같은 작업을 `claude plugin marketplace add ...`, `claude plugin install ...`로 할 수 있습니다.

업데이트:

```
/plugin marketplace update devjs-devtools
```

다른 에이전트에서 쓰려면 [다른 에이전트에서 사용](#다른-에이전트에서-사용)을 참고하세요.

## devtools

코드를 작성하고, 디버깅하고, 변경을 기록하고, 공유하는 과정에서 반복되는 작업을 skill 한 번으로 처리합니다.

| 분류 | 스킬 | 설명 |
|---|---|---|
| Git | `/devtools:commit` | 스테이징된 변경을 분석해 Conventional Commits 메시지를 만들고 커밋 |
| Git | `/devtools:squash` | 현재 브랜치의 커밋을 자동 생성된 Conventional Commits 메시지로 squash |
| GitHub | `/devtools:pr` | 커밋을 분석해 Conventional Commits 제목으로 PR 생성 |
| GitHub | `/devtools:issue` | 라벨·담당자·템플릿이 자동 제안되는 GitHub 이슈 생성 |
| 디버깅 | `/devtools:debug-log` | `[DEBUG]` 접두 로그문 삽입 |

### 기본 워크플로우

1. 코드를 작성하다 추적이 필요하면 `/devtools:debug-log`로 로그를 넣습니다.
2. `/devtools:commit`으로 커밋합니다.
3. 브랜치 히스토리가 어수선하면 `/devtools:squash`로 의미 있는 단위로 묶습니다.
4. `/devtools:pr`로 PR을 만듭니다.
5. 후속 작업이 필요하면 `/devtools:issue`로 이슈를 남깁니다.

## tdd

사람이 읽고 승인할 수 있는 실행 테스트 명세를 만들고, TDD 단계마다 안전장치를 둡니다. 같은 스킬을 Claude Code와 [Pi Coding Agent](https://pi.dev)에서 함께 씁니다. 스킬 본문은 한국어입니다.

| 단계 | Claude Code | Pi | 설명 |
|---|---|---|---|
| 1 | `/tdd:test-list` | `/skill:test-list` | 요구사항을 정상·실패·경계 사례와 미확정 질문으로 정리하고, RED 작성 전에 승인을 받음 |
| 2 | `/tdd:readable-tests` | `/skill:readable-tests` | 테스트를 읽을 수 있는 실행 명세로 작성·검토 (RED 승인, GREEN 단계 안전장치 포함) |
| 3 | `/tdd:green-handoff` | `/skill:green-handoff` | 승인된 RED 테스트를 바탕으로 다른 에이전트에게 맡길 GREEN 구현 지시문 작성 |
| 4 | `/tdd:green-review` | `/skill:green-review` | 다른 에이전트가 끝낸 GREEN 구현 검수 (테스트 보존, 변경 범위, 검증 재실행, 보고 대조) |

### Pi에 설치

저장소를 clone한 뒤 `tdd` 패키지 디렉터리를 로컬 설치합니다.

```sh
git clone https://github.com/iai6203/devjs-devtools.git
cd devjs-devtools
pi install ./plugins/tdd
```

> **참고**
> - 로컬 설치는 파일을 복사하지 않고 경로를 참조합니다. clone한 디렉터리를 지우지 마세요.
> - 같은 이름의 스킬이 이미 있으면 충돌 경고가 뜨고 먼저 발견된 스킬이 쓰입니다. 중복 경로를 정리하세요.
> - Pi manifest는 `plugins/tdd/package.json`에만 있습니다. 저장소 루트를 원격 Git으로 직접 설치하는 방식과 npm 배포는 지원하지 않습니다.

## plannotator-tools

Claude Code 입력창 위에 버튼 2개를 추가합니다. 실행 결과는 클립보드에 복사됩니다.

| 버튼 | 실행 명령 |
|---|---|
| `[Plannotator] Last` | `plannotator last \| pbcopy` |
| `[Plannotator] Review` | `plannotator review \| pbcopy` |

- 실행 중인 버튼을 다시 누르면 이전 plannotator 프로세스를 종료하고 새로 시작합니다. 이전 브라우저 탭은 직접 닫아야 합니다.
- Claude Code Mod라서 Claude Code에서만, macOS에서만 동작합니다.
- Plannotator CLI(`plannotator`)가 설치되어 있어야 합니다.

## 다른 에이전트에서 사용

`devtools`는 GitHub Copilot CLI와 Codex에서도 쓸 수 있습니다.

| 에이전트 | 설치 | 업데이트 |
|---|---|---|
| GitHub Copilot CLI | `copilot plugin marketplace add iai6203/devjs-devtools`<br>`copilot plugin install devtools@devjs-devtools` | `copilot plugin marketplace update devjs-devtools` |
| Codex | `codex plugin marketplace add iai6203/devjs-devtools`<br>`codex plugin add devtools@devjs-devtools` | `codex plugin marketplace upgrade devjs-devtools` |

## 철학

- **반복은 자동화한다.** 매번 손으로 하던 작업을 skill 한 번으로 끝낼 수 있게 합니다.
- **표준을 따른다.** 가능한 곳에서는 Conventional Commits 같은 공용 규약을 따라 다른 도구·자동화와 호환되도록 합니다.
- **작게, 독립적으로.** 각 skill은 하나의 작업만 책임지고 다른 skill에 의존하지 않습니다.
- **자동화는 검증 가능해야 한다.** 결과는 사람이 읽을 수 있는 형태로 남깁니다.

## 기여하기

### 디렉터리 구조

```
.claude-plugin/
  marketplace.json          # 마켓플레이스 정의 (플러그인 목록)
plugins/
  devtools/
    .claude-plugin/plugin.json
    .codex-plugin/plugin.json
    skills/
  plannotator-tools/        # Claude Code Mod (macOS 전용)
    .claude-plugin/plugin.json
    hooks/
  tdd/                      # Claude Code + Pi 공용 패키지
    .claude-plugin/plugin.json
    package.json            # Pi manifest (skills만 노출)
    references/tdd-policy.md  # 스킬 공통 정책
    skills/
```

### 새 플러그인 추가

1. `plugins/<name>/` 디렉터리를 만듭니다.
2. `.claude-plugin/marketplace.json`의 `plugins` 배열에 `"source": "./plugins/<name>"` 항목을 추가합니다.

### 로컬 테스트

저장소 경로로 마켓플레이스를 추가합니다.

```
/plugin marketplace add /path/to/devjs-devtools
/plugin install devtools@devjs-devtools
```
