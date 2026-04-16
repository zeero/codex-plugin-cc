# Gemini plugin for Claude Code

Use Gemini from inside Claude Code for code reviews or to delegate tasks via the Gemini CLI.

## Features

- `/gemini:review` - Focuses on style consistency, elegance, and SOLID principles.
- `/gemini:adversarial-review` - Critically questions implementation and design choices.
- `/gemini:rescue` - Delegates tasks to Gemini for investigation or implementation proposals.
- `/gemini:setup` - Checks if the Gemini CLI is installed and ready.
- `gemini:gemini-rescue` subagent - Proactive task delegation.

## Requirements

- **Gemini CLI**
- **Node.js 18.18 or later**

## Install

Install the Gemini CLI if you haven't already:

```bash
npm install -g @google/gemini-cli
```

(Note: Ensure you are authenticated in the Gemini CLI.)

Reload plugins in Claude Code:

```bash
/reload-plugins
```

Then run:

```bash
/gemini:setup
```

## Usage

### `/gemini:review`

Runs a code review on your current work.

```bash
/gemini:review
/gemini:review --base main
```

### `/gemini:adversarial-review`

Runs a critical review that challenges your assumptions and design.

```bash
/gemini:adversarial-review
/gemini:adversarial-review --base main
```

### `/gemini:rescue`

Hands a task to Gemini.

```bash
/gemini:rescue investigate why the tests are flaky
```
