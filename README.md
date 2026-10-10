# devjs-devtools

[한국어](README.md) | [English](README.en.md)

일상적인 개발 워크플로우를 자동화하는 [Claude Code](https://claude.com/claude-code) 플러그인 마켓플레이스입니다. 하나의 마켓플레이스에 여러 플러그인을 담을 수 있는 구조로, 각 플러그인은 `plugins/` 아래에 독립된 디렉터리로 관리됩니다.

## How it works

`devtools` 플러그인은 코드를 작성하고, 디버깅하고, 변경을 기록하고, 동료와 공유하는 과정에서 반복되는 작업들을 skill 한 번으로 처리할 수 있게 해줍니다. 현재는 Conventional Commits 기반의 git/GitHub 워크플로우(커밋·PR·이슈·squash)와 디버깅용 로그 삽입을 다루며, 앞으로 코드 분석·테스트·문서화 등 개발 전반에서 자주 쓰이는 작업들을 점진적으로 추가해나갈 예정입니다.

## Structure

```
.claude-plugin/
  marketplace.json      # 마켓플레이스 정의 (플러그인 목록)
plugins/
  devtools/             # 플러그인 하나당 디렉터리 하나
    .claude-plugin/plugin.json
    .codex-plugin/plugin.json
    skills/
  plannotator-tools/    # Claude Code Mod (macOS 전용)
    .claude-plugin/plugin.json
    hooks/
```

새 플러그인을 추가하려면 `plugins/<name>/` 디렉터리를 만들고 `.claude-plugin/marketplace.json`의 `plugins` 배열에 `"source": "./plugins/<name>"` 항목을 추가합니다.

## Installation

### Claude Code

마켓플레이스를 추가하고 플러그인을 설치합니다.

```
/plugin marketplace add iai6203/devjs-devtools
/plugin install devtools@devjs-devtools
/plugin install plannotator-tools@devjs-devtools
```

> `plannotator-tools`는 Claude Code Mod라 Claude Code에서만 동작하며, macOS 전용입니다. Plannotator CLI(`plannotator`)가 설치되어 있어야 합니다.

로컬에서 테스트하려면 디렉터리 경로로 추가할 수 있습니다.

```
/plugin marketplace add /path/to/devjs-devtools
/plugin install devtools@devjs-devtools
```

### GitHub Copilot CLI

마켓플레이스를 추가하고 플러그인을 설치합니다.

```
copilot plugin marketplace add iai6203/devjs-devtools
copilot plugin install devtools@devjs-devtools
```

### Codex

마켓플레이스를 추가하고 플러그인을 설치합니다.

```
codex plugin marketplace add iai6203/devjs-devtools
codex plugin add devtools@devjs-devtools
```

## The Basic Workflow

1. **코드를 작성**하면서 추적이 필요하면 `/devtools:debug-log`로 `[DEBUG]` 접두 로그문을 삽입합니다.
2. **`/devtools:commit`** 으로 Conventional Commits 형식 메시지를 자동 생성하고 커밋합니다.
3. 브랜치 히스토리가 어수선하면 **`/devtools:squash`** 로 의미 있는 커밋 단위로 묶습니다.
4. **`/devtools:pr`** 로 커밋들을 분석해 Conventional Commits 제목의 PR을 만듭니다.
5. 후속 작업이 필요하면 **`/devtools:issue`** 로 라벨·담당자가 자동 제안된 GitHub 이슈를 생성합니다.

## What's Inside

> 현재 포함된 skill 목록입니다. 앞으로 개발 과정에서 자주 사용하게 되는 도구들을 계속 추가해나갈 예정입니다.

### Git

- `/devtools:commit` — 스테이징된 변경을 분석해 Conventional Commits 메시지를 생성하고 커밋합니다.
- `/devtools:squash` — 현재 브랜치의 커밋을 자동 생성된 Conventional Commits 메시지로 squash합니다.

### GitHub

- `/devtools:pr` — 커밋을 분석해 Conventional Commits 제목으로 PR을 생성합니다.
- `/devtools:issue` — 라벨·담당자·템플릿이 자동 제안되는 GitHub 이슈를 생성합니다.

### Debugging

- `/devtools:debug-log` — 디버깅을 위한 `[DEBUG]` 접두 로그문을 삽입합니다.

### Plannotator (`plannotator-tools`, macOS 전용)

Claude Code 입력창 위에 버튼 2개를 추가합니다. 실행 결과는 클립보드에 복사됩니다.

- `[Plannotator] Last` — `plannotator last | pbcopy`를 실행합니다.
- `[Plannotator] Review` — `plannotator review | pbcopy`를 실행합니다.

실행 중인 버튼을 다시 누르면 이전 plannotator 프로세스를 종료하고 새로 시작합니다(이전 브라우저 탭은 직접 닫아야 합니다).

## Philosophy

- **반복은 자동화한다.** 매번 손으로 하던 작업을 skill 한 번으로 끝낼 수 있게 합니다.
- **표준을 따른다.** 가능한 곳에서는 Conventional Commits 같은 공용 규약을 따라 다른 도구·자동화와 호환되도록 합니다.
- **작게, 독립적으로.** 각 skill은 하나의 작업만 책임지고 다른 skill에 의존하지 않습니다.
- **자동화는 검증 가능해야 한다.** 결과는 사람이 읽을 수 있는 형태로 남깁니다.

## Updating

Claude Code:

```
/plugin marketplace update devjs-devtools
```

GitHub Copilot CLI:

```
copilot plugin marketplace update devjs-devtools
```

Codex:

```
codex plugin marketplace upgrade devjs-devtools
```
