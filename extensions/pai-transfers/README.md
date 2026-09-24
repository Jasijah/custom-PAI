# PAI transfer framework

A local-first prototype for PAI-to-PAI transfer requests. The sender PAI proposes a precise intent; its owner reviews the recipient, network, asset, amount, and memo and approves that exact digest. A rail adapter then returns a receipt. The included rail only simulates settlement: it holds no funds, signs nothing, and broadcasts nothing.

## Try it

```bash
python3 demo.py
```

Requires Python 3.10+ and no external packages. `TransferService('transfers.sqlite')` persists intents and audit events locally; the demo uses in-memory storage. Integrate the service behind Miya's trusted capability app, with `propose` available to the PAI and `approve` callable exclusively from the authenticated owner UI. Never treat a chat message or model tool call as owner approval. The digest binds the displayed intent fields. Recipient identity is a placeholder string until a verified PAI identity registry is connected.

## Production integration contract

1. Authenticate the owner outside the model and show the complete intent, network fees, fiat estimate, recipient verification, and expiry in a confirmation screen. Generate a unique approval ID there.
2. Implement a verified PAI identity and wallet-address resolution layer. Bind the recipient address and chain ID into the immutable intent before approval; recheck them before signing.
3. Implement a wallet adapter with user-controlled keys, chain-specific amount precision, balance/fee checks, simulation, final hardware or wallet confirmation, persistent idempotency, transaction tracking, and reconciliation. Do not hand keys to the PAI or LLM.
4. Add signed PAI-to-PAI request envelopes, replay protection, rate limits, encrypted storage, robust concurrent execution, and recovery from ambiguous broadcast outcomes.
5. Decide what PIP represents before enabling transfers: an internal nonredeemable test credit, an existing asset, or a newly issued token. This prototype treats PIP only as a label. A token, custody, exchange, or escrow service requires separate legal and security review.

## State flow

`proposed → approved → settled`, or `proposed → rejected`. Expired intents cannot be approved or settled. Settlement is idempotent for already settled records. This module is an integration scaffold, not a production payment system.
