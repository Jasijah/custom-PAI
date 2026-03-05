# Miya Start Here

This guide enables the additive Miya Personal AI blueprint in this repository.

## 1) Prerequisites
- Node 22+
- pnpm
- Existing Clawdis/custom-PAI setup working (`pnpm build`)

## 2) Install and run
```bash
pnpm install
pnpm build
pnpm -C ui build

# gateway / app as usual
pnpm clawdis gateway --port 18789
```

## 3) Enable Miya
Miya features are **disabled by default** and are gated by `MIYA_ENABLED`.

```bash
export MIYA_ENABLED=1
# optional: encryption-at-rest for sensitive memory text
export MIYA_ENCRYPTION_KEY="replace-with-strong-secret"
```

## 4) First-run onboarding
When Miya is enabled and the first Miya pipeline runs, it will initialize:
- `miya/profile.json`
- `miya/permissions.jsonl`
- `miya/audit.jsonl`

under the configured workspace directory.

## 5) Miya data files
Miya writes additive local-first JSONL files:
- `miya/memory.jsonl`
- `miya/actions.jsonl`
- `miya/outcomes.jsonl`
- `miya/ledger.jsonl`
- `miya/permissions.jsonl`
- `miya/audit.jsonl`
- `miya/profile.json`

## 6) What Miya adds
- Memory layers L0-L5 + metadata + privacy-aware retrieval.
- Action cards + reflection/outcomes + heuristic confidence adjustment.
- Zero-trust permissions and append-only audit trail.
- Modular agent stack under `src/miya/agents`.
- Personal economy demo ledger.
- UI panels (Memory/Agents/Trust/Dashboard) remain additive.

## 7) Web/iPhone packaging notes
- PWA manifest + service worker are in `ui/public/`.
- Capacitor scaffold exists at `ui/capacitor.config.ts`.

## 8) Add new Miya agent safely
1. Add module under `src/miya/agents/`.
2. Keep permission checks before sensitive reads/writes.
3. Emit suggestions with confidence + linked memory IDs + whyRetrieved.
4. Record ledger and audit entries.

