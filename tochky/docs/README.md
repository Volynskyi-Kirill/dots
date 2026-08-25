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

---

## 1. Routing & Multi-Page Structure
We use Next.js App Router `app/[locale]/` for dynamic locale generation. 
The application follows a clean, SEO-friendly multi-page architecture:

- **`/` (Home / Lobby)**: The main landing page. Handled by `app/[locale]/page.tsx`. Clean UI with game creation/join forms.
- **`/rules`**: A dedicated page for game rules and objectives (`app/[locale]/rules/page.tsx`).
- **`/guide`**: A dedicated page for UI instructions, mobile controls, and features (`app/[locale]/guide/page.tsx`).
- **`/faq`**: A dedicated page for Frequently Asked Questions (`app/[locale]/faq/page.tsx`).
- **`/room/[id]` (Game Room)**: Dynamic route for active game sessions (`app/[locale]/room/[id]/page.tsx`).
- **Middleware**: `middleware.ts` negotiates the user's preferred language and redirects to the appropriate `/[locale]` path.

---

## 2. SEO & Performance (How it works)
The application is heavily optimized for Google Search and social sharing:

### Metadata & Open Graph
Every page exports a `generateMetadata` function that fetches localized strings via `getTranslations` (since it runs on the server). 
- It generates standard tags (Title, Description).
- It injects `hreflang` alternates automatically (so Google knows the mapping between `/en`, `/ru`, `/uk`, `/pl`).
- It injects **Open Graph (OG)** and **Twitter Cards** metadata, pointing to `/og-image.jpg` in the `public` folder.
- *Note:* The game room pages (`/room/[id]`) explicitly include `robots: { index: false, follow: false }` to prevent Google from indexing thousands of empty dynamic room URLs.

### Structured Data (JSON-LD)
We use `JSON-LD` to give search engines rich context:
- The Home page (`/`) injects a `VideoGame` schema.
- The FAQ page (`/faq`) injects an `FAQPage` schema.
This is implemented by safely rendering a `<script type="application/ld+json">` inside the Server Components.

### Search Engine Crawlers (`robots.txt` & `sitemap.xml`)
- `app/robots.ts` dynamically generates a `robots.txt` that allows all crawlers but strictly disallows all variations of `/room/`.
- `app/sitemap.ts` dynamically maps out all core pages for all supported locales.

### PWA & Icons
- Web App Manifest is generated via `app/manifest.ts`.
- Icons (`icon.jpg`, `apple-icon.jpg`) are stored in `public/icons/` and registered globally in `app/layout.tsx` metadata.

---

## 3. How to Add New Content / Pages (SEO Checklist)
When you add a new page (e.g., `/about` or `/blog`), follow this workflow to maintain SEO and i18n integrity:

1. **Create the Route**: Create `app/[locale]/<new-page>/page.tsx`.
2. **Add English Strings**: Open `messages/en.json` and add a new namespace (e.g., `"About": { "title": "About Us" }`) and update the `"Metadata"` namespace with the page's title and description.
3. **Run Translations**: Trigger the `i18n-sync-translations` agent to automatically translate your new English strings into `ru`, `uk`, and `pl`.
4. **Export Metadata**: In your new `page.tsx`, add the `generateMetadata` export:
   ```tsx
   export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
     const { locale } = await params;
     const t = await getTranslations({ locale, namespace: 'Metadata' });
     const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

     return {
       title: t('newPageTitle'),
       description: t('newPageDescription'),
       alternates: { canonical: `${baseUrl}/${locale}/<new-page>` },
     };
   }
   ```
5. **(Optional) Add JSON-LD**: If the new page represents an Article, Breadcrumb, or specific entity, embed a `<script type="application/ld+json">` in the component's JSX.
6. **Update Sitemap**: Open `app/sitemap.ts` and add your new page to the `sitemapEntries` array so Google can find it.

---

## 4. Game Engine (`components/game/`)
Since the game heavily relies on WebSockets and HTML5 `<canvas>`, the core gameplay logic runs in **Client Components** (`"use client"`).
- `GameRoom.tsx`: The orchestrator. Manages the WebSocket connection via `lib/websocket.ts`, tracks the `GameState`, handles UI interactions (Undo/Rematch/Surrender), and passes props to the canvas.
- `GameBoard.tsx`: The rendering engine. Uses a `requestAnimationFrame` loop to draw the 39x39 grid, dots, and polygons on a `<canvas>` element. Also handles touch/mouse math for panning and zooming.

## 5. Mobile & Touch UX (Control Schemes)
To solve the classic "fat finger" problem on large grids (39x39), the game offers UX control schemes (stored in `localStorage: dots_control_scheme`):
1. **Direct Touch**: Default mode. Single tap instantly places a dot. 1-finger pans the board.
2. **Drag & Release**: Touch and drag creates a glowing ghost dot offset 40px *above* the finger. The dot magnetically snaps to grid intersections, allowing pixel-perfect precision without zooming in. Releasing the finger places the dot. 2-fingers are used for panning. On desktop, this mode attaches a hover-reticle to the mouse cursor.

*Note: Aiming visuals and inputs are strictly disabled during the opponent's turn to prevent UI clutter and invalid actions.*
