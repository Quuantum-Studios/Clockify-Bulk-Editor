# Cloudflare Workers KV Setup

## Creating KV Namespaces

1. Create production KV namespace:
```bash
wrangler kv:namespace create "KV"
```

2. Create preview KV namespace for development:
```bash
wrangler kv:namespace create "KV" --preview
```

3. Update `wrangler.toml` with the generated IDs:
```toml
[[kv_namespaces]]
binding = "KV"
id = "your_kv_namespace_id_from_step_1"
preview_id = "your_preview_kv_namespace_id_from_step_2"
```

## Features Using KV

### User Settings Storage
- API endpoint: `/api/kv/settings`
- Key format: `settings:{apiKey}`
- Stores: userPrompt, defaultTimezone, updatedAt

### API Response Caching
- Workspaces: 1 hour TTL
- Projects: 30 minutes TTL  
- Tasks: 15 minutes TTL
- Key format: `cache:{resource}:{apiKey}:{workspaceId}:{projectId}`

## Testing Locally

Use `wrangler dev` to test with preview KV namespace:
```bash
npm run dev
# or
wrangler dev
```

