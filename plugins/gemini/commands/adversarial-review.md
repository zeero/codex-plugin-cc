---
description: Run a critical Gemini code review or plan check
argument-hint: '[--base <ref>] [--scope auto|working-tree|branch] [focus text]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Gemini adversarial review that critically questions implementation, design, and assumptions.
It can also be used to check plans.

Raw slash-command arguments:
`$ARGUMENTS`

Execution:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" adversarial-review "$ARGUMENTS"
```
- Return the command stdout verbatim.
