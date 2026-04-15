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
    prompt = `あなたは非常に厳しいセキュリティ監査官およびシニアソフトウェアアーキテクトです。
以下のコード差分を、あえて批判的な視点でレビューしてください。

## 重点項目
- 設計のトレードオフの妥当性（もっとシンプル、あるいは堅牢な別の道はなかったか？）
- 隠れた前提条件や、エッジケースでの不具合
- レースコンディション、セキュリティ脆弱性、データ損失のリスク
- 拡張性の欠如や、将来の負債になる可能性

${focusText ? `## ユーザーからの注力依頼\n${focusText}\n` : ""}

## コード差分
${context.content}

批判的かつ建設的なフィードバックを提供してください。`;
  } else {
    prompt = `あなたは熟練のエンジニアです。以下のコード差分をレビューしてください。

## レビューの指針
1. **周辺コードとのトンマナ**: 既存のコードベースとスタイルや命名規則が揃っているか。
2. **エレガントな実装**: より簡潔、効率的、あるいは可読性の高い実装方法はないか。
3. **高凝集・疎結合・関心の分離**: クラスや関数が適切に分割され、責務が明確か。
4. **SOLID原則 (特に単一責任原則)**: クラスやモジュールを変更する理由が1つだけに絞られているか。
5. **バグ・脆弱性**: 明らかなバグやセキュリティ上の懸念はないか。

${focusText ? `## ユーザーからの注力依頼\n${focusText}\n` : ""}

## コード差分
${context.content}

具体的かつ実行可能な改善案があれば、コード例とともに提示してください。`;
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

  const prompt = `あなたは非常に優秀な開発アシスタントです。以下のタスクを遂行するための具体的な提案を行ってください。
なお、あなたは直接ファイルを書き換えることはできません。実装が必要な場合は、コード片を提示してください。

## タスク
${task}

解決策または調査結果を詳しく報告してください。`;

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
