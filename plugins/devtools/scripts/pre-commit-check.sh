#!/bin/bash

INPUT=$(cat)

# Bash 도구의 command 필드 추출 (jq 없이 파싱)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')

# git commit 명령이 아니면 즉시 통과
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

# --no-verify 플래그 차단
if echo "$COMMAND" | grep -qE '\-\-no-verify'; then
  echo "--no-verify 플래그는 사용할 수 없습니다." >&2
  exit 2
fi

# staged 파일 목록 가져오기
STAGED_FILES=$(git diff --cached --name-only --diff-filter=d 2>/dev/null)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

ERRORS=""

# 1. 민감 정보 패턴 검사
SECRETS_PATTERN='(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{20,}|password\s*=\s*["\x27].+["\x27]|SECRET_KEY\s*=|PRIVATE_KEY\s*=)'
SECRET_FILES=$(git diff --cached -G "$SECRETS_PATTERN" --name-only 2>/dev/null)
if [ -n "$SECRET_FILES" ]; then
  ERRORS+="민감 정보가 포함된 파일: ${SECRET_FILES}\n"
fi

# 2. .env 파일 커밋 차단
ENV_FILES=$(echo "$STAGED_FILES" | grep -E '(^|/)\.env(\.local|\.production|\.staging)?$')
if [ -n "$ENV_FILES" ]; then
  ERRORS+=".env 파일은 커밋할 수 없습니다: ${ENV_FILES}\n"
fi

# 3. 충돌 마커 검사
CONFLICT_FILES=$(git diff --cached -S '<<<<<<< ' --name-only 2>/dev/null)
if [ -n "$CONFLICT_FILES" ]; then
  ERRORS+="병합 충돌 마커가 남아있는 파일: ${CONFLICT_FILES}\n"
fi

# 4. 대용량 파일 검사 (1MB 초과)
while IFS= read -r file; do
  [ -z "$file" ] && continue
  SIZE=$(git cat-file -s ":${file}" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 1048576 ]; then
    SIZE_KB=$(( SIZE / 1024 ))
    ERRORS+="1MB 초과 파일: ${file} (${SIZE_KB}KB)\n"
  fi
done <<< "$STAGED_FILES"

# 결과 판정
if [ -n "$ERRORS" ]; then
  echo -e "Pre-commit 검사 실패:\n${ERRORS}" >&2
  exit 2
fi

exit 0
