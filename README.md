# devjs-devtools

일상적인 개발 워크플로우를 자동화하는 [Claude Code](https://claude.com/claude-code) 플러그인 마켓플레이스입니다.

## 플러그인

| 플러그인 | 하는 일 | 지원 환경 |
|---|---|---|
| [`devtools`](#devtools) | 커밋·PR·이슈·squash 자동화, 디버그 로그 삽입 | Claude Code, GitHub Copilot CLI, Codex |
| [`tdd`](#tdd) | 사람이 승인할 수 있는 테스트 명세와 TDD 단계별 안전장치 | Claude Code, Pi Coding Agent |
| [`plannotator-tools`](#plannotator-tools) | 입력창 위에 Plannotator 실행 버튼 추가 | Claude Code (macOS / WSL2 Ubuntu) |

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

| 구분 | Claude Code | Pi | 설명 |
|---|---|---|---|
| 목록 | `/tdd:test-list` | `/skill:test-list` | 요구사항을 정상·실패·경계 사례와 미확정 질문으로 정리하고, RED 작성 전에 승인을 받음. 유지보수에서는 기존 테스트를 파악해 유지·변경·신규·폐기·공백으로 분류 |
| 테스트·TDD | `/tdd:readable-tests` | `/skill:readable-tests` | 읽을 수 있는 테스트 명세 작성·검토와 같은 세션의 RED·GREEN·REFACTOR 안전장치 |
| 전달 (선택) | `/tdd:green-handoff` | `/skill:green-handoff` | 승인된 RED 테스트를 바탕으로 다른 에이전트·세션에 넘길 GREEN 구현 지시문 작성 |
| 별도 검수 (선택) | `/tdd:green-review` | `/skill:green-review` | 구현 주체와 관계없이 테스트 보존, 변경 범위, 실행 증거를 확인하고 판정 |

### 기본 작업 흐름

- **같은 세션**: 테스트 목록 → RED 승인 → GREEN → 검증 → 필요 시 REFACTOR·재검증. 위임 지시문이나 다른 에이전트의 작업 보고는 필요하지 않습니다.
- **다른 에이전트·세션으로 전달**: 승인된 RED → `green-handoff` → 구현·검증. 별도 검수 절차가 필요하면 `green-review`를 선택합니다.
- **기존 기능 유지보수**: `test-list` 변경 모드로 기존 테스트를 파악하고 사례별 변경 유형을 승인받습니다. 기존 테스트는 승인된 `변경`·`폐기` 항목만 RED에서 고치고, 보호되지 않는 기존 동작은 필요하면 특성화 테스트로 먼저 고정합니다.
- 요청한 단계만 수행하며, 다음 단계는 사람의 승인을 받은 뒤 진행합니다. 승인된 사례 하나 또는 작은 묶음으로 반복할 수 있습니다.
- 별도 검수 스킬 사용은 선택이지만 구현 결과 검증은 필수입니다. 같은 에이전트의 자체 검증을 독립 검수로 표현하지 않습니다.

### 접근성과 검증 원칙

- 테스트 이름의 언어·형식과 Given / When / Then 등 구분 형식은 고정하지 않습니다. 한국어가 아닌 이름에는 가까운 한국어 주석으로 조건과 기대 동작을 설명합니다.
- 설명하는 변수·함수의 실제 식별자 괄호 병기는 필수입니다. 이름이나 주석 형식을 바꾸더라도 코드와 설명의 연결을 유지합니다.
- `green-review`는 **차단 / 수정 필요 / 검증 불충분 / 승인 가능**으로 판정합니다. 비교 기준이나 필수 실행 결과가 없으면 승인 가능으로 판정하지 않고, 부족한 증거와 확보 방법을 보고합니다.

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

Claude Code 터미널 입력창 위에 버튼 2개를 추가합니다. 정상 종료한 명령의 비어 있지 않은 출력만 클립보드에 복사합니다.

| 버튼 | 실행 명령 |
|---|---|
| `[Plannotator] Last` | `plannotator last` — 응답 중이면 턴 종료 후 실행하도록 예약하며, 다시 누르면 예약을 취소합니다. |
| `[Plannotator] Review` | `plannotator review` |

| 환경 | 클립보드 복사 |
|---|---|
| macOS | `pbcopy` |
| WSL2 Ubuntu | `iconv -f UTF-8 -t UTF-16LE \| clip.exe` — Windows 클립보드에 한글·이모지를 복사합니다. |

- 실행 중인 버튼을 다시 누르면 이전 plannotator 프로세스를 종료하고 새로 시작합니다. 이전 브라우저 탭은 직접 닫아야 합니다.
- Claude Code Mod라서 Claude Code에서만 동작하며, macOS와 WSL2 Ubuntu를 지원합니다. 일반 Linux와 Windows 네이티브에서는 버튼을 표시하지 않습니다.
- Claude Code를 실행하는 환경에 Plannotator CLI(`plannotator`)가 설치되어 있어야 합니다.
- 피드백은 셸 코드가 아닌 stdin으로 전달하며, WSL 복사는 Bash의 `pipefail`로 변환 오류도 감지합니다. 실패한 복사에서 기존 클립보드 보존까지 보장하지는 않습니다.

### WSL2 Ubuntu 준비 및 문제 해결

WSL 안에서 Claude Code와 Plannotator를 실행해야 합니다. 다음 명령으로 필수 도구의 경로를 확인할 수 있습니다. 이 확인은 클립보드를 변경하지 않습니다.

```bash
command -v plannotator /bin/bash iconv clip.exe
```

- `iconv`가 없다면 Ubuntu의 `libc-bin` 설치와 PATH를 확인하세요.
- `clip.exe`가 없다면 Windows PATH 연동을 확인하세요. `/etc/wsl.conf`의 `[interop]`에서 `enabled`와 `appendWindowsPath`가 비활성화되어 있지 않아야 합니다. 관련 설정 변경 후에는 WSL 재시작이 필요할 수 있습니다.
- 도구가 있어도 복사가 실패한다면 Windows 실행 파일 호출이 가능한지 WSL interop 설정을 확인하세요. Mod는 리뷰 시작 전에 도구 존재 여부를 검사하지만, 실제 실행 가능 여부까지 보장하지는 않습니다.
- 브라우저 실행은 Plannotator CLI에 맡깁니다. 자동으로 열리지 않으면 [공식 문서](https://github.com/backnotprop/plannotator/blob/main/apps/hook/README.md)의 `PLANNOTATOR_BROWSER` 설정을 확인하세요. `wslview`가 설치되어 있다면 Claude Code 실행 전에 `export PLANNOTATOR_BROWSER="$(command -v wslview)"`로 지정할 수 있습니다.
- Mod는 `PLANNOTATOR_REMOTE`나 포트를 강제하지 않습니다. remote 모드의 고정 포트는 Last/Review 동시 실행 시 충돌할 수 있으므로 환경에 맞게 설정하세요.

### 검증

자동 테스트는 Mod 테스트 실행 기능이 있는 Claude Code에서 저장소 루트 기준으로 실행합니다.

```bash
claude plugin test plugins/plannotator-tools
```

실환경 수동 확인:

1. Claude Code에서 Last/Review 버튼이 표시되고 브라우저가 열리는지 확인합니다.
2. 한글·이모지·여러 줄 피드백을 제출한 뒤 Windows 앱에 붙여 넣어 확인합니다(macOS에서는 macOS 앱 사용).
3. 실행 중 재시작과 응답 중 Last 예약·취소가 정상 동작하는지 확인합니다.

자동 테스트는 OS와 클립보드 호출을 모의하므로 실제 브라우저·OS 클립보드 동작 확인을 대체하지 않습니다.

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
  plannotator-tools/        # Claude Code Mod (macOS / WSL2 Ubuntu)
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

> Generated-with: AI
