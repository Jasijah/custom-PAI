# Miya Manual Tests

## A. Baseline compatibility (Miya off)
1. `unset MIYA_ENABLED`
2. Run gateway and existing flows.
3. Verify existing behavior unchanged.

## B. Enable Miya
1. `export MIYA_ENABLED=1`
2. Optionally set `MIYA_ENCRYPTION_KEY`.
3. Trigger an agent run (`clawdis agent ...`).

Expected:
- Miya files appear in `<workspace>/miya/`.
- No breakage in existing agent response flow.

## C. Memory engine
1. Run a chat/agent message with explicit preference text.
2. Verify `memory.jsonl` entries are written.
3. Confirm sensitive/private retrieval is permission-gated.

## D. Cognitive loop
1. Verify `actions.jsonl` contains proposed cards.
2. Write outcomes to `outcomes.jsonl` and run again.
3. Confirm confidence heuristics adjust over similar tags/agents.

## E. Trust center
1. Revoke permissions in JSONL (or via UI when wired).
2. Trigger blocked feature (suggestion generation, sensitive read).
3. Verify denial and append-only `audit.jsonl` entries.

## F. Gateway events
With Miya enabled and an agent run completed, verify websocket events:
- `miya.memory.updated`
- `miya.actions.updated`
- `miya.permissions.updated`
- `miya.audit.appended` (when applicable)
- `miya.profile.updated`

## G. Voice
1. Enable TTS permission and online announce.
2. Connect UI and confirm online announcement.
3. Verify fallback works when NVIDIA credentials are missing.

## H. Economy
1. Run agent suggestions.
2. Verify `ledger.jsonl` spend entries are recorded.

