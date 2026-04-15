---
description: Run a Gemini code review against local git state
argument-hint: '[--base <ref>] [--scope auto|working-tree|branch]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Gemini code review focusing on style consistency, elegance, and SOLID principles.

Raw slash-command arguments:
`$ARGUMENTS`

Execution:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" review "$ARGUMENTS"
```
- Return the command stdout verbatim.
- Do not fix any issues mentioned in the review output.
