# Clockify Manager

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

- `NEXT_PUBLIC_APP_NAME`: Application name (default: "Clockify Manager")
- `NEXT_PUBLIC_API_URL`: API URL for the deployed worker

### Deployment Commands

1. **Preview locally** (test the Cloudflare Worker locally):
```bash
npm run preview
```

2. **Deploy to Cloudflare**:
```bash
npm run deploy
```

3. **Generate Cloudflare types** (if you modify wrangler.toml):
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
