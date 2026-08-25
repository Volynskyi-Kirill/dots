<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Frontend Specific Guidelines (tochky)

1. **UI Framework**: We use Next.js App Router + next-intl + shadcn/ui + TailwindCSS + lucide-react.
2. **Translations**: For translating or syncing i18n files, NEVER do it directly in the main context. Always use the `i18n-sync-translations` skill which delegates the task to a cheaper `flash` subagent.
