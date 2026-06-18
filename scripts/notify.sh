#!/bin/bash

INPUT=$(cat)

# 무한 루프 방지: stop_hook_active가 true이면 종료
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

# 디렉토리명과 브랜치명 추출
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
REPO_NAME=$(git -C "${CWD:-$(pwd)}" remote get-url origin 2>/dev/null | sed 's/.*\///' | sed 's/\.git$//')
BRANCH=$(git -C "${CWD:-$(pwd)}" branch --show-current 2>/dev/null || echo "unknown")

if [ "$NOTIFY_TYPE" = "notification" ]; then
  MESSAGE="[$REPO_NAME:$BRANCH] 응답을 기다리고 있습니다"
else
  MESSAGE="[$REPO_NAME:$BRANCH] 작업이 완료되었습니다"
fi
TITLE="Claude Code"

case "$(uname -s)" in
  Darwin)
    osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\""
    ;;
  MINGW*|MSYS*|CYGWIN*)
    powershell.exe -Command "
      [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
      [System.Windows.Forms.MessageBox]::Show('$MESSAGE', '$TITLE')
    " > /dev/null 2>&1
    ;;
  Linux)
    notify-send "$TITLE" "$MESSAGE"
    ;;
esac

exit 0
