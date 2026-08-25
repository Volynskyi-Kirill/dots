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

### Frontend Container (Node.js + Vite)
*   Runs the `Vite` dev server.
*   Code changes trigger HMR (Hot Module Replacement) instantly reloading the browser.
*   **Proxying**: Vite acts as a reverse proxy. Any API or WebSocket request starting with `/ws` is caught by Vite and forwarded to the backend container. This simulates a single-origin environment and prevents CORS issues.

### Backend Container (Go + Air)
*   Uses `air` to watch `.go` files for changes and automatically rebuild the binary on save.
*   Listens on port `8080`.

---

## 3. Remote Play & Sharing (Ngrok Tunnel)

*Command: `make share`*

To play a local game with a friend over the internet, we bypass NAT and router configurations using **Ngrok**.

1.  **The Tunnel**: `ngrok http 5173` creates a secure tunnel from a public `ngrok-free.app` URL directly to the local Vite container.
2.  **Routing**: When your friend opens the Ngrok link, their browser fetches the frontend from Vite. When the frontend attempts to open a WebSocket connection, the request travels through Ngrok to Vite, which proxies it to the Go backend.
3.  **Vite Security**: To allow Ngrok domains, Vite is configured with `allowedHosts: true` to bypass DNS rebinding protections.

---

## 4. Production Environment

*Files: `docker-compose.prod.yml`, `frontend/Dockerfile.prod`, `backend/Dockerfile.prod`*

Used for deploying the final game to a real server (e.g., VPS on DigitalOcean/AWS).

### The Build Process
1.  **Go Backend**: Multi-stage build compiles the Go code into a single, highly optimized, standalone binary based on `alpine`.
2.  **React Frontend**: Multi-stage build runs `npm run build`. TypeScript is stripped, React is bundled, and the output is a folder (`/dist`) of raw, static HTML/JS/CSS.

### Nginx (The Production Web Server)
In production, Vite is completely removed. It is replaced by **Nginx**, an industry-standard, ultra-fast web server.

Nginx performs three critical jobs:
1.  **Static File Serving**: Instantly serves the bundled React `.js` and `.css` files.
2.  **SPA Routing**: Uses `try_files $uri /index.html` to ensure React Router works correctly when a user directly refreshes a room URL (e.g., `/room/123`).
3.  **WebSocket Proxy**: Nginx takes over Vite's job as the proxy. It catches requests to `/ws`, adds the HTTP `Upgrade` headers, and maintains the persistent WebSocket connection with the Go backend container.

### Ports and Security
In production, only Nginx (port 80/443) is exposed to the internet. The Go backend (port 8080) is hidden securely inside the Docker bridge network (`dots-network`).
