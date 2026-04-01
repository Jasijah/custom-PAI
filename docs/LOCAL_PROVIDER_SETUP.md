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
2. Workspace: your normal project/workspace directory
3. Provider surfaces: skip extras until the core gateway is working

### Gemini / Google AI

This repo can run against Google's Gemini API. Prefer the native Google path
over the OpenAI-compat endpoint for local setup.

1. Create a Gemini API key in Google AI Studio:
   [Gemini API key docs](https://ai.google.dev/gemini-api/docs/api-key)
2. Confirm the key works before wiring it into Clawdis:

```powershell
curl.exe "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_GEMINI_API_KEY"
```

3. Configure Clawdis to use a Google-backed model. The local config lives at:
   `C:\Users\<you>\.clawdis\clawdis.json`

Example provider block:

```json
{
  "agent": {
    "model": "gemini/gemini-2.5-flash",
    "allowedModels": ["gemini/gemini-2.5-flash"],
    "modelAliases": {
      "Gemini": "gemini/gemini-2.5-flash"
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "gemini": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "apiKey": "YOUR_GEMINI_API_KEY",
        "api": "google-generative-ai",
        "models": [
          {
            "id": "gemini-2.5-flash",
            "name": "Gemini 2.5 Flash",
            "api": "google-generative-ai",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 1048576,
            "maxTokens": 65536
          }
        ]
      }
    }
  }
}
```

If you get `API key not valid`, fix that first in Google AI Studio before
debugging the app.

### Anthropic

If you already have an Anthropic API key:

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
