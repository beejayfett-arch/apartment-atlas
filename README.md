# Apartment Atlas

An interactive, photo-guided 3D apartment explorer and furniture layout editor built with React, Three.js, and Vinext.

## Features

- Dollhouse and walkthrough views with day and evening lighting.
- Select, move, rotate, remove, and replace furniture, with undo and redo.
- Furniture library and layout import/export.
- Signed-in layout saving backed by R2.
- Reference photos and a visual progress journal.

## Run locally

Requires Node.js 22.13 or later and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

## Verify and build

```sh
pnpm exec tsc --noEmit
node scripts/check-furniture.cjs
pnpm build
```

## Hosting

The existing deployment uses OpenAI Sites with a Cloudflare Workers runtime. Configuration is in `.openai/hosting.json` and `vite.config.ts`. Saved layouts require the `LAYOUTS` R2 binding and trusted platform authentication; do not trust client-supplied authentication headers in a different hosting environment.

This repository stores the source code. GitHub Pages alone cannot run its server routes or authenticated layout storage.

## Assets and current state

`public/photos` contains the supplied apartment references; `public/textures` contains rendering textures; `public/reviews` contains earlier visual checks. Keep the repository private unless these assets are cleared for public redistribution.

The current source includes the latest table, TV, plant, bed, and kitchen refinements. These changes pass the type and furniture-behavior checks, but their visual review is still in progress; older review images do not represent every current change.
