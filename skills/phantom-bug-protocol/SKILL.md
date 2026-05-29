# Skill: phantom-bug-protocol

## What is the phantom bug
In long Discord sessions, phantom empty sessions_spawn() calls fire automatically,
stripping the task parameter. Every spawn attempt fails with:
  task: must have required property task
Root cause: accumulated conversation history contains corrupted tool-call patterns.
Gateway restart does NOT fix it. Broken history reloads from Discord on every message.

## THE FIX — Use exec instead of sessions_spawn
The phantom bug ONLY affects sessions_spawn. The exec tool is completely immune.
For any file writing task, use exec cat heredoc directly.
This was proven on 29 May 2026 — BEC v2 JS engine written via exec after being blocked all day.

## Signs you have the phantom bug
- sessions_spawn keeps firing with empty {} arguments
- Error: task: must have required property task repeating
- Real spawn tasks never execute despite retrying
- Happens in sessions with hundreds of turns of history

## What does NOT work
- openclaw gateway restart (clears process but not Discord history)
- Opening new Discord DM (reloads same history, same bug)
- Retrying sessions_spawn with same parameters

## What works (ranked)
1. Use exec cat heredoc for file writing — ALWAYS TRY THIS FIRST
2. OpenClaw web UI — fresh session, zero history, no phantom
3. Auto-compaction — wait for conversation length limit, compaction clears phantoms

## Rule
If sessions_spawn fails twice in a row with empty task error — STOP.
Switch to exec immediately. Do not retry spawn.
