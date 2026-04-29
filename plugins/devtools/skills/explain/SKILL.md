---
name: explain
description: Analyze staged changes and generate detailed per-file explanations
---

# Explain Skill

Analyzes staged changes and generates a structured, per-file explanation of what was changed and why.

## Execution Steps

1. Collect staged changes with `git diff --cached`
2. If there are no staged changes, notify the user and abort
3. Analyze each changed file for:
   - Change type (added/modified/deleted)
   - Summary of changes
   - Inferred intent/reason for the change
4. Trace the overall code flow across all changed files to understand how they connect
5. Output the summary using the format below

## Output Format

```
## 코드 흐름

(변경된 코드들이 전체적으로 어떤 흐름으로 연결되는지 한눈에 파악할 수 있도록 정리)

예시:
  사용자 요청 → `router.ts` 라우트 핸들러
    → `service.ts` 비즈니스 로직 처리
    → `repository.ts` 데이터 조회/저장
    → `response.ts` 응답 변환

## 변경 사항 요약

### `path/to/file.ts`
- **변경 유형**: 수정
- **변경 내용**: (구체적 설명)
- **변경 의도**: (추론된 이유)
- **변경 라인**: L12-L45, L78-L90

### `path/to/another.ts`
- **변경 유형**: 추가
- **변경 내용**: (구체적 설명)
- **변경 의도**: (추론된 이유)
- **변경 라인**: L1-L120
```

## Rules

- Write all explanations in Korean
- Keep technical terms and code identifiers in their original form
- Use relative file paths from the project root
