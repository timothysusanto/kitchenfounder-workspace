# Skill: exec-patterns

## When to use exec vs sessions_spawn
USE EXEC for: file writes, shell commands, file assembly, verification, cleanup
USE SPAWN for: genuinely parallel work, long isolated tasks that take 5+ minutes
RULE: If in doubt, use exec. It is faster, more reliable, and immune to phantom bug.

## Long-running commands — use background flag
For commands that take more than 30 seconds, use background=true + yieldMs:
  exec(command, background=true, yieldMs=60000)
Then poll with process(action=poll, timeout=60000)
NEVER use rapid poll loops — use timeout parameter on poll.

## Heavy operations to avoid in foreground
- tar on large directories (use git push instead)
- wkhtmltopdf on multiple files in sequence (one at a time)
- find / searches without 2>/dev/null (floods output)
- apt-get install without -y flag (hangs waiting for input)

## Process poll pattern
After backgrounding a command:
  process(action=poll, sessionId=SESSION_ID, timeout=30000)
Wait for exit code 0 before proceeding.
If poll returns missing tool result error — command likely completed, check output directly.

## Heredoc best practices
Use unique delimiters: ENDOFFILE, HTMLEOF, JSEOF — never just EOF
Never nest heredocs inside heredocs in the same exec call — breaks shell parsing
For multi-part writes, use separate exec calls for each part

## Verification after every exec write
Always run: wc -l /path/file && tail -3 /path/file
For HTML files: grep -n "</body>" /path/file to check for premature closing tags

## Shell compatibility
Sandbox uses /bin/sh not bash — brace expansion {1..9} does NOT work
Use explicit values: p1.html p2.html p3.html
Or loop: for i in 1 2 3 4 5; do ...; done
