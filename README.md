# Wallet

Web wallet application built 100% with AI using Bloque skills.

The app integrates `@bloque/sdk` for:

- authentication
- card creation and management
- KYC flow
- balance top-ups
- wallet creation and management

## Stack

- React 19 + TypeScript
- Rsbuild (Rspack)
- TanStack Router (file-based routes)
- TanStack Query (server/cache state)
- Tailwind CSS 4
- `@bloque/sdk` for auth and API access

## Requirements

- Bun `>=1.x`

## Installation

```bash
bun install
```

## Scripts

- `bun run dev`: start local development server.
- `bun run build`: build for production into `dist/`.
- `bun run preview`: preview the production build locally.
- `bun run typecheck`: run TypeScript type checking.
- `bun run check`: run Biome and apply fixes.
- `bun run deploy`: build and deploy with Wrangler Pages.

## Production Build

```bash
bun run build
```

Output is generated in `dist/`.

## References

- Rsbuild: https://rsbuild.rs
- Rspack: https://rspack.rs
