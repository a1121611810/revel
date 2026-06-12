#!/bin/bash
osascript <<'APPLESCRIPT'
set killedList to {}

-- Use shell to find running Revel.app processes by executable path
try
  set shellOutput to do shell script "ps -eo pid,comm,args | grep -i 'revel.app/Contents/MacOS' | grep -v grep || true"
  if shellOutput is not "" then
    set procLines to paragraphs of shellOutput
    repeat with lineText in procLines
      if length of lineText > 0 then
        set procPid to first word of lineText
        try
          do shell script "kill -9 " & procPid
          set end of killedList to "revel (PID: " & procPid & ")"
        end try
      end if
    end repeat
  end if
end try

if length of killedList > 0 then
  set msg to "已强制退出以下 Revel 实例：" & return & return
  repeat with itemText in killedList
    set msg to msg & "• " & itemText & return
  end repeat
  display dialog msg buttons {"确定"} default button "确定" with icon note
else
  display notification "没有检测到正在运行的 Revel 实例" with title "检查完成"
end if
APPLESCRIPT
