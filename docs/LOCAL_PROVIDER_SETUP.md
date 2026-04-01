## Local Provider Setup

This repo now builds and launches locally on Windows from source. To get from
"control UI opens" to "assistant can answer", wire up one model provider.

### Fastest path

Run:

```powershell
pnpm clawdis onboard
```

Recommended choices for a first working setup:

1. Gateway mode: `local`
2. Auth choice: `apiKey` if you already have an Anthropic API key
3. Workspace: your normal project/workspace directory
4. Provider surfaces: skip extras until the core gateway is working

### If you already have an Anthropic API key

Run:

```powershell
pnpm clawdis configure
```

Choose the Anthropic API key path when prompted. The repo stores that in
Clawdis-managed auth storage rather than requiring you to keep it in `.env`.

### Start the gateway

```powershell
pnpm clawdis gateway --port 18789 --bind loopback --allow-unconfigured
```

Then open:

1. `http://127.0.0.1:18789/`
2. Browser control: `http://127.0.0.1:18791/`

### Quick smoke test

Once provider auth is configured:

```powershell
pnpm clawdis agent --message "Say hello and confirm the gateway is working."
```

### Optional next surfaces

After the core agent works, add providers one at a time:

1. WhatsApp: `pnpm clawdis login`
2. Telegram/Discord/Signal/iMessage: use `pnpm clawdis onboard` again

### Verification command

To inspect provider readiness from the gateway:

```powershell
pnpm clawdis gateway call providers.status --params "{\"probe\":true}"
```
