# Tochky - Frontend Documentation

This directory contains the Next.js frontend application for the Dots Game.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix UI / Base UI headless primitives)
- **Internationalization**: `next-intl`
- **Deployment**: Docker standalone output

## Architecture

### 1. Routing & Internationalization
We use Next.js App Router `app/[locale]/` for dynamic locale generation.
- **`/` (Lobby)**: Handled by `app/[locale]/page.tsx`. This is a Server Component optimized for SEO, containing metadata and keywords. It renders the `LobbyForms` client component.
- **`/room/[id]` (Game Room)**: Handled by `app/[locale]/room/[id]/page.tsx`. Generates dynamic metadata (e.g., "Room 1234") and renders the `GameRoom` client component.
- **Middleware**: `middleware.ts` negotiates the user's preferred language and redirects to the appropriate `/[locale]` path.

### 2. Game Components (`components/game/`)
Since the game heavily relies on WebSockets and HTML5 `<canvas>`, the core gameplay logic runs in **Client Components** (`"use client"`).
- `GameRoom.tsx`: The orchestrator. Manages the WebSocket connection via `lib/websocket.ts`, tracks the `GameState`, handles UI interactions (Undo/Rematch/Surrender), and passes props to the canvas.
- `GameBoard.tsx`: The rendering engine. Uses a `requestAnimationFrame` loop to draw the 39x39 grid, dots, and polygons on a `<canvas>` element. Also handles touch/mouse math for panning and zooming.
- `Timer.tsx`: Independent visual countdown timer driven by `requestAnimationFrame`.

### 3. Lobby Components (`components/lobby/`)
- `LobbyForms.tsx`: Client component utilizing `shadcn/ui` components (`Card`, `Input`, `Label`, `Button`) to create or join game rooms.

### 4. Utilities & Services (`lib/`)
- `websocket.ts`: Singleton service wrapping the native browser `WebSocket` API. Appends `sessionId` to joins and maps backend events to React callbacks.
- `types.ts`: TypeScript interfaces for the `GameState`, `Point`, etc., shared with the Go backend.
- `utils.ts`: Tailwind merge utilities for `shadcn/ui`.

## Configuration & Proxies
To bypass CORS and unify origins during development, `next.config.ts` utilizes the `rewrites` feature.
Any request to `/ws` is proxied to the backend via the `BACKEND_URL` environment variable (which defaults to `http://backend:8080` for Docker Compose).

## Translations
Translations are located in the `messages/` directory (`en.json`, `ru.json`, `uk.json`, `pl.json`).
New components can access translations using `useTranslations()` hook provided by `next-intl`.
