"""Local-first PAI transfer intent framework. No real funds or private keys."""
import hashlib
import json
import sqlite3
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Protocol


def now():
    return datetime.now(timezone.utc)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


@dataclass(frozen=True)
class Intent:
    id: str
    sender_pai: str
    recipient_pai: str
    network: str
    asset: str
    amount: str
    memo: str
    expires_at: str
    digest: str


class Rail(Protocol):
    def settle(self, intent: Intent, idempotency_key: str) -> str: ...


class SimulationRail:
    """Deterministic receipt; NEVER broadcasts a transaction."""
    def settle(self, intent: Intent, idempotency_key: str) -> str:
        return 'simulation:' + hashlib.sha256(idempotency_key.encode()).hexdigest()[:24]


class TransferService:
    def __init__(self, path=':memory:', rail=None):
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.rail = rail or SimulationRail()
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS intents (
                id TEXT PRIMARY KEY, payload TEXT NOT NULL, digest TEXT NOT NULL,
                state TEXT NOT NULL, approval_id TEXT UNIQUE, receipt TEXT);
            CREATE TABLE IF NOT EXISTS audit (
                seq INTEGER PRIMARY KEY AUTOINCREMENT, intent_id TEXT NOT NULL,
                event TEXT NOT NULL, at TEXT NOT NULL);
        ''')

    def _event(self, intent_id, event):
        self.db.execute('INSERT INTO audit(intent_id,event,at) VALUES(?,?,?)',
                        (intent_id, event, now().isoformat()))

    def propose(self, sender_pai, recipient_pai, network, asset, amount, memo='', ttl_seconds=600):
        if not all(isinstance(x, str) and x.strip() for x in (sender_pai, recipient_pai, network, asset)):
            raise ValueError('Both PAI identities, network, and asset are required')
        if sender_pai == recipient_pai:
            raise ValueError('Sender and recipient must differ')
        try:
            value = Decimal(str(amount))
        except InvalidOperation as exc:
            raise ValueError('Invalid amount') from exc
        if not value.is_finite() or value <= 0 or -value.as_tuple().exponent > 18:
            raise ValueError('Amount must be positive with at most 18 decimal places')
        if not isinstance(ttl_seconds, int) or not 1 <= ttl_seconds <= 3600:
            raise ValueError('TTL must be 1–3600 seconds')
        payload = dict(id=str(uuid.uuid4()), sender_pai=sender_pai, recipient_pai=recipient_pai,
                       network=network, asset=asset, amount=format(value, 'f'), memo=str(memo)[:280],
                       expires_at=(now() + timedelta(seconds=ttl_seconds)).isoformat())
        digest = hashlib.sha256(canonical(payload).encode()).hexdigest()
        intent = Intent(**payload, digest=digest)
        with self.db:
            self.db.execute('INSERT INTO intents(id,payload,digest,state) VALUES(?,?,?,?)',
                            (intent.id, canonical(payload), digest, 'proposed'))
            self._event(intent.id, 'proposed')
        return intent

    def get(self, intent_id):
        row = self.db.execute('SELECT * FROM intents WHERE id=?', (intent_id,)).fetchone()
        if row is None:
            raise KeyError('Unknown intent')
        intent = Intent(**json.loads(row['payload']), digest=row['digest'])
        if hashlib.sha256(canonical(json.loads(row['payload'])).encode()).hexdigest() != row['digest']:
            raise ValueError('Intent integrity check failed')
        return intent, row['state'], row['receipt']

    def approve(self, intent_id, owner_pai, digest, approval_id):
        """Call ONLY from an authenticated owner's confirmation UI, never from LLM output."""
        intent, state, _ = self.get(intent_id)
        if owner_pai != intent.sender_pai or digest != intent.digest:
            raise PermissionError('Owner or reviewed intent digest mismatch')
        if not approval_id or not isinstance(approval_id, str):
            raise ValueError('Unique approval ID required')
        if datetime.fromisoformat(intent.expires_at) <= now() or state != 'proposed':
            raise ValueError('Intent expired or no longer approvable')
        with self.db:
            self.db.execute('UPDATE intents SET state=?, approval_id=? WHERE id=? AND state=?',
                            ('approved', approval_id, intent_id, 'proposed'))
            self._event(intent_id, 'owner_approved')

    def settle(self, intent_id):
        intent, state, receipt = self.get(intent_id)
        if state == 'settled':
            return receipt
        if state != 'approved' or datetime.fromisoformat(intent.expires_at) <= now():
            raise ValueError('Current, approved intent required')
        # Production rail must verify identity, balance, chain, fees, recipient,
        # final wallet signature, and durable idempotency before any broadcast.
        receipt = self.rail.settle(intent, intent.id)
        with self.db:
            self.db.execute('UPDATE intents SET state=?, receipt=? WHERE id=? AND state=?',
                            ('settled', receipt, intent_id, 'approved'))
            self._event(intent_id, 'settled')
        return receipt

    def reject(self, intent_id, owner_pai):
        intent, state, _ = self.get(intent_id)
        if owner_pai != intent.sender_pai or state != 'proposed':
            raise PermissionError('Only the sender can reject a proposed intent')
        with self.db:
            self.db.execute('UPDATE intents SET state=? WHERE id=?', ('rejected', intent_id))
            self._event(intent_id, 'rejected')

    def history(self, intent_id):
        return [dict(r) for r in self.db.execute('SELECT event,at FROM audit WHERE intent_id=? ORDER BY seq',
                                                 (intent_id,))]
