---
name: i18n-sync-translations
description: 'Sync and update i18n translations across multiple languages using a fast subagent'
---

This is a guide to synchronize or update translation files (JSON) in the Next.js `tochky` project using next-intl.

**CRITICAL INSTRUCTION**: Do NOT perform translations directly in the main agent context. Translation tasks consume unnecessary context window space and reasoning tokens.

When the user asks to update, sync, or translate messages for existing or new languages, you MUST delegate the translation task to a fast subagent (e.g., `flash`).

## Steps for Synchronization

1. Locate the source of truth (e.g., `tochky/messages/en.json`).
2. Identify the target languages to update.
3. Use the `invoke_subagent` tool to spawn a subagent for the translation.
   - **Model**: `flash` (Gemini Flash is perfect for translations).
   - **Role**: `Translator`
   - **Prompt**: Instruct the subagent clearly to compare the target JSON file with the source `en.json`, add missing keys, translate them accurately, and write the updated JSON back to the target file.
4. Wait for the subagent to report completion.
