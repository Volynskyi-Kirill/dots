# Dots Game — Infrastructure & Deployment

This document details the environment setups, network routing, and deployment strategies for the Dots Game.

## 1. Core Concept: Why the Split?

The game has two distinct environments: **Development** (`docker-compose.yml`) and **Production** (`docker-compose.prod.yml`). 
This split exists because the requirements for writing code are fundamentally opposite to the requirements for hosting it.

*   **Development**: Prioritizes developer experience (Hot Reloading, unminified code, detailed error logs). It uses tools that are heavy on RAM/CPU but save developer time.
*   **Production**: Prioritizes speed, security, and low resource usage. The code is compiled into static files and binaries, and development tools are completely removed.

---

## 2. Local Development Environment

*File: `docker-compose.yml`*

Used when you are actively writing code. All services are wrapped in Docker for OS-level isolation.

### Frontend Container (Node.js + Next.js)
*   Runs the `next dev` server for the `tochky/` application.
*   Code changes trigger React Fast Refresh instantly reloading the browser.
*   **Proxying**: Next.js uses `rewrites()` in `next.config.ts`. Any API or WebSocket request starting with `/ws` is caught and forwarded to the backend container. This simulates a single-origin environment and prevents CORS issues.

### Backend Container (Go + Air)
*   Uses `air` to watch `.go` files for changes and automatically rebuild the binary on save.
*   Listens on port `8080`.

---


---

## 3. Production Environment

*Files: `docker-compose.prod.yml`, `tochky/Dockerfile.prod`, `backend/Dockerfile.prod`*

Used for deploying the final game to a real server (e.g., VPS on DigitalOcean/AWS).

### The Build Process
1.  **Go Backend**: Multi-stage build compiles the Go code into a single, highly optimized, standalone binary based on `alpine`.
2.  **React Frontend**: Multi-stage build runs `next build`. Next.js output is set to `standalone`, creating a minimal Node.js server that only contains the strictly necessary files and dependencies to run the app.

### Next.js Standalone Server
In production, the Next.js `standalone` server replaces external web servers like Nginx for frontend serving.
It performs three critical jobs:
1.  **Static File Serving**: Instantly serves the bundled React `.js`, `.css`, and public assets.
2.  **SSR & Routing**: Handles server-side rendering for SEO and dynamic routing (e.g., `/en/room/123`).
3.  **WebSocket Proxy**: It catches requests to `/ws`, adds the HTTP `Upgrade` headers, and proxies the persistent WebSocket connection to the Go backend container using the `BACKEND_URL` environment variable.

### Ports and Security
In production, only the Next.js container (port 3000) might be exposed to the internet, or placed behind an ingress. The Go backend (port 8080) is hidden securely inside the Docker bridge network.
