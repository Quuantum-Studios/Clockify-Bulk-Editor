# ClockifyManager

A Next.js application for bulk editing Clockify time entries, built with OpenNext.js for Cloudflare Workers deployment.

## Features

- Bulk upload and edit time entries
- Project and task management
- Tag management with bulk operations
- Date range filtering
- CSV import/export functionality

## Getting Started

First, install dependencies:

```bash
npm install
```

> **Note:** The `postinstall` script automatically sets up git hooks for automatic worker deployment.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Cloudflare Deployment

This project is configured for deployment on Cloudflare Workers using OpenNext.js.

### Prerequisites

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Authenticate with Cloudflare:
```bash
wrangler login
```

### Environment Variables

The following environment variables are configured in `wrangler.toml`:

- `NEXT_PUBLIC_APP_NAME`: Application name (default: "ClockifyManager")
- `NEXT_PUBLIC_API_URL`: API URL for the deployed worker

### Automatic Worker Deployment

The project includes a **git pre-push hook** that automatically deploys the realtime-worker if changes are detected:

- When you push commits, the hook checks for changes in `workers/realtime-worker/`
- If changes are found in the unpushed commits, it deploys the worker first
- Deployment environment is determined by branch:
  - `master`/`main` → Production
  - `staging`/`develop` → Staging
- After worker deployment, Cloudflare auto-deploys the main application

The hook is automatically installed when you run `npm install`. To manually reinstall:
```bash
./scripts/setup-git-hooks.sh
```

### Deployment Commands

1. **Preview locally** (test the Cloudflare Worker locally):
```bash
npm run preview
```

2. **Deploy to Cloudflare**:
```bash
npm run deploy
```

3. **Deploy worker only**:
```bash
npm run deploy:worker          # Production
npm run deploy:worker:staging  # Staging
```

4. **Generate Cloudflare types** (if you modify wrangler.toml):
```bash
npm run cf-typegen
```

### Configuration

- Worker name: `clockify-manager`
- Compatibility date: `2025-03-25`
- Node.js compatibility enabled
- Assets served from `.open-next/assets`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenNext.js Cloudflare](https://github.com/serverless-stack/open-next)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
