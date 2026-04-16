---
description: Check Gemini CLI installation and status
argument-hint: ''
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Check whether the Gemini CLI is installed and ready.

Execution:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" setup
```
- Return the command stdout verbatim.
