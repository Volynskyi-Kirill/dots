<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Frontend Specific Guidelines (tochky)

1. **UI Framework & Components**: We use Next.js App Router, next-intl, TailwindCSS, and lucide-react.
   - **CRITICAL:** We use `@base-ui/react` for base primitives (NOT Radix UI).
   - Base UI components do NOT use the `asChild` pattern. Instead, they use a `render` prop (e.g., `render={<Button />}`).
   - **NEVER** use `asChild` on our primitive UI components (DialogTrigger, etc.), it will result in hydration errors and nested buttons.
2. **Translations**: For translating or syncing i18n files, NEVER do it directly in the main context. Always use the `i18n-sync-translations` skill which delegates the task to a cheaper `flash` subagent.
3. **State Management**: Use Zustand (with the `persist` middleware) for storing client-side settings/preferences instead of raw `localStorage`.
4. **Clean Code & Component Architecture**:
   - **No Magic Strings/Values**: Always extract game statuses, actions, control schemes, default values (e.g., default board sizes), and configuration arrays into strongly typed constants (`as const` objects in `lib/constants.ts`). Do not inline magic strings, arrays, or fallback values directly inside components or hooks.
   - **Small Components**: Keep React components small and focused. Break down large files by extracting modals, overlays, and logically distinct UI sections (e.g., TopBar, GameBoard) into separate files.
   - **Custom Hooks**: Extract complex state, event listeners, and side effects (like WebSocket subscriptions or camera math) into custom hooks (`hooks/`).
   - **Utility Functions**: Move pure logic, calculations, and canvas drawing functions out of React components and into utility files (`lib/`).

4. **UI/UX Design Principles**:
   - **De-clutter Primary Interfaces**: Avoid overloading primary action cards (like "Create Game") with all configuration options. Move advanced/secondary configurations (e.g., custom timers, board sizes) into collapsible components (like `Accordion`, `Dialog`, or pop-ups) to keep the UI clean.
   - **Visual Consistency & Alignment**: Grouped elements (e.g., settings inside an accordion) must share identical structural styling (borders, padding, backgrounds, layouts) and align properly to their parent containers. Do not mix raw buttons with fully styled complex cards in the same list.
