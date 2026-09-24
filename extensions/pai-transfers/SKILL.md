---
name: pai-transfer-intents
description: Propose and inspect PAI-to-PAI transfer intents with a local simulator. Use when a person asks their PAI or agent to prepare a crypto transfer, inspect its status, or explain how to confirm it. This skill never grants an agent authority to approve, sign, or send money.
---

# PAI transfer intents

Use the installed `pai-transfer` CLI for **simulation only**. It holds no keys or money and never broadcasts transactions. Treat `PIP` as a placeholder asset label.

1. Collect sender PAI ID, verified recipient PAI ID, network, asset, amount, and optional memo. If identity is unverified, say so; do not claim the recipient is verified.
2. Propose with `pai-transfer propose --sender 'pai:alice' --recipient 'pai:bob' --network 'pip-sandbox' --asset PIP --amount 2.50 --memo 'Thanks'`. Quote the resulting ID and exact fields for human review. Do not invent a rate, balance, address, or fee.
3. Inspect with `pai-transfer show <id>`. Report the status and simulation receipt accurately.
4. Tell the owner that they can review and approve locally with `pai-transfer approve <id> --owner 'pai:alice'` in their own interactive terminal. **Never call `approve` or `settle` from an agent, automation, chat tool, or prompt.** An agent must not ask for wallet seed phrases, private keys, or confirmation codes.
5. For a real payment integration, require a separately authenticated owner confirmation screen and wallet signer with verified chain, address, fees, balance, replay protection, and transaction reconciliation. Do not change this skill to imply live transfers until those capabilities exist and have been independently reviewed.

The CLI stores local intent metadata at `~/.pai-transfers/intents.sqlite` by default; `PAI_TRANSFER_DB` selects another file. A device agent can use the Python API in `transfers.py` or expose only `propose` and `show` as trusted tools. The full integration contract is in `README.md`.
