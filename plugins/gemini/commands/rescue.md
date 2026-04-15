---
description: Delegate a task to Gemini
argument-hint: '[prompt]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Hand a task to Gemini for investigation or implementation proposals.

Raw slash-command arguments:
`$ARGUMENTS`

Execution:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" rescue "$ARGUMENTS"
```
- Return the command stdout verbatim.
