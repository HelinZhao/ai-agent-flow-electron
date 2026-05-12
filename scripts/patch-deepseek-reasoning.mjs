/**
 * Postinstall script: patch @langchain/openai to preserve DeepSeek reasoning_content
 *
 * DeepSeek reasoning models (e.g. deepseek-v4-flash) return `reasoning_content`
 * in assistant messages. When tool calls are involved, these messages must be
 * sent back with `reasoning_content` preserved — otherwise DeepSeek returns 400.
 *
 * LangChain's convertMessagesToCompletionsMessageParams serializes messages
 * to the OpenAI API format but omits reasoning_content from additional_kwargs.
 * This patch adds the missing line.
 *
 * Applies to: @langchain/openai >= 1.4.0
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const targets = [
  join(ROOT, 'node_modules', '@langchain', 'openai', 'dist', 'converters', 'completions.js'),
  join(ROOT, 'node_modules', '@langchain', 'openai', 'dist', 'converters', 'completions.cjs'),
];

const PATCH_LINE =
  `\t\tif (AIMessage.isInstance(message) && message.additional_kwargs?.reasoning_content != null) completionParam.reasoning_content = message.additional_kwargs.reasoning_content;`;

for (const targetFile of targets) {
  if (!existsSync(targetFile)) {
    console.warn(`[patch-deepseek] SKIP (not found): ${targetFile}`);
    continue;
  }

  const original = readFileSync(targetFile, 'utf-8');

  if (original.includes(PATCH_LINE)) {
    console.log(`[patch-deepseek] ALREADY PATCHED: ${targetFile}`);
    continue;
  }

  // Insert after the tool_calls handling block (before the audio handling)
  const search =
    `\t\tif (message.additional_kwargs.audio && typeof message.additional_kwargs.audio === "object" && "id" in message.additional_kwargs.audio) return [completionParam, {`;

  if (!original.includes(search)) {
    console.warn(`[patch-deepseek] FAIL (insertion point not found): ${targetFile}`);
    continue;
  }

  const patched = original.replace(search, PATCH_LINE + '\n' + search);
  writeFileSync(targetFile, patched, 'utf-8');
  console.log(`[patch-deepseek] PATCHED: ${targetFile}`);
}
