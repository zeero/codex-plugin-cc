#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseArgs, splitRawArgumentString } from "./lib/args.mjs";
import { binaryAvailable, runCommand, runCommandChecked } from "./lib/process.mjs";
import { collectReviewContext, ensureGitRepository, resolveReviewTarget } from "./lib/git.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const MODEL_NAME = "gemini-3-flash-preview";

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/gemini-companion.mjs setup [--json]",
      "  node scripts/gemini-companion.mjs review [--base <ref>] [--scope <auto|working-tree|branch>]",
      "  node scripts/gemini-companion.mjs adversarial-review [--base <ref>] [--scope <auto|working-tree|branch>] [focus text]",
      "  node scripts/gemini-companion.mjs rescue [prompt]"
    ].join("\n")
  );
}

function outputResult(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    process.stdout.write(value);
  }
}

function normalizeArgv(argv) {
  if (argv.length === 1) {
    const [raw] = argv;
    if (!raw || !raw.trim()) {
      return [];
    }
    return splitRawArgumentString(raw);
  }
  return argv;
}

function parseCommandInput(argv, config = {}) {
  return parseArgs(normalizeArgv(argv), {
    ...config,
    aliasMap: {
      C: "cwd",
      ...(config.aliasMap ?? {})
    }
  });
}

function resolveCommandCwd(options = {}) {
  return options.cwd ? path.resolve(process.cwd(), options.cwd) : process.cwd();
}

async function handleSetup(argv) {
  const { options } = parseCommandInput(argv, {
    booleanOptions: ["json"]
  });

  const cwd = resolveCommandCwd(options);
  const geminiStatus = binaryAvailable("gemini", ["--version"], { cwd });

  const report = {
    ready: geminiStatus.available,
    gemini: geminiStatus,
    nextSteps: []
  };

  if (!geminiStatus.available) {
    report.nextSteps.push("Install Gemini CLI with `npm install -g @google/gemini-cli`.");
  }

  if (options.json) {
    outputResult(report, true);
  } else {
    let output = `Gemini CLI: ${geminiStatus.available ? "Available" : "Not found"}\n`;
    if (!geminiStatus.available) {
      output += `Detail: ${geminiStatus.detail}\n\nNext steps:\n`;
      report.nextSteps.forEach(step => output += `- ${step}\n`);
    } else {
      output += `Version: ${geminiStatus.detail}\n`;
      output += `Gemini is ready to use.\n`;
    }
    outputResult(output, false);
  }
}

function executeGeminiPrompt(prompt) {
  const result = runCommand("gemini", ["-m", MODEL_NAME, "-p", prompt]);
  if (result.status !== 0) {
    throw new Error(`Gemini CLI failed: ${result.stderr || result.stdout || result.error?.message}`);
  }
  return result.stdout;
}

async function handleReview(argv, isAdversarial = false) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["base", "scope", "cwd"],
    booleanOptions: ["json"]
  });

  const cwd = resolveCommandCwd(options);
  ensureGitRepository(cwd);

  const target = resolveReviewTarget(cwd, {
    base: options.base,
    scope: options.scope
  });

  const context = collectReviewContext(cwd, target);
  const focusText = positionals.join(" ").trim();

  let prompt = "";
  if (isAdversarial) {
    prompt = `You are a very strict security auditor and senior software architect.
Review the following code diff from a critical perspective.

## Focus Items
- Validity of design trade-offs (Was there a simpler or more robust alternative?)
- Hidden assumptions and bugs in edge cases
- Risks of race conditions, security vulnerabilities, and data loss
- Lack of extensibility and potential for future technical debt

${focusText ? `## User Focus Request\n${focusText}\n` : ""}

## Code Diff
${context.content}

Please provide critical and constructive feedback.`;
  } else {
    prompt = `You are an expert engineer. Please review the following code diff.

## Review Guidelines
1. **Consistency with Surrounding Code**: Check if styles and naming conventions match the existing codebase.
2. **Elegant Implementation**: Look for more concise, efficient, or readable implementation methods.
3. **High Cohesion, Loose Coupling, and Separation of Concerns**: Ensure classes and functions are properly divided with clear responsibilities.
4. **SOLID Principles (especially Single Responsibility)**: Verify that classes or modules have only one reason to change.
5. **Bugs and Vulnerabilities**: Look for obvious bugs or security concerns.

${focusText ? `## User Focus Request\n${focusText}\n` : ""}

## Code Diff
${context.content}

Please provide specific and actionable improvement suggestions, including code examples where appropriate.`;
  }

  const result = executeGeminiPrompt(prompt);
  outputResult(result, options.json);
}

async function handleRescue(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"]
  });

  const task = positionals.join(" ").trim();
  if (!task) {
    throw new Error("Task description is required for rescue.");
  }

  const prompt = `You are a highly capable development assistant. Please provide specific proposals for the following task.
Note that you cannot directly modify files. If implementation is needed, please provide code snippets.

## Task
${task}

Please report the solution or investigation results in detail.`;

  const result = executeGeminiPrompt(prompt);
  outputResult(result, options.json);
}

async function main() {
  const [subcommand, ...argv] = process.argv.slice(2);
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    printUsage();
    return;
  }

  switch (subcommand) {
    case "setup":
      await handleSetup(argv);
      break;
    case "review":
      await handleReview(argv, false);
      break;
    case "adversarial-review":
      await handleReview(argv, true);
      break;
    case "rescue":
      await handleRescue(argv);
      break;
    default:
      throw new Error(`Unknown subcommand: ${subcommand}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
