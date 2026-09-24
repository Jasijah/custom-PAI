"""Local simulated transfer CLI. The owner confirmation runs only at a terminal."""
import argparse
import json
import os
import sys
from dataclasses import asdict
from pathlib import Path

from transfers import TransferService


def main(argv=None):
    parser = argparse.ArgumentParser(prog='pai-transfer', description='PAI transfer intents (simulation only)')
    parser.add_argument('--db', default=os.environ.get('PAI_TRANSFER_DB', str(Path.home() / '.pai-transfers' / 'intents.sqlite')))
    sub = parser.add_subparsers(dest='command', required=True)
    propose = sub.add_parser('propose', help='Create a proposal; safe for agent use')
    for field in ('sender', 'recipient', 'network', 'asset', 'amount'):
        propose.add_argument('--' + field, required=True)
    propose.add_argument('--memo', default='')
    propose.add_argument('--ttl', type=int, default=600)
    show = sub.add_parser('show', help='Review an intent')
    show.add_argument('id')
    approve = sub.add_parser('approve', help='Owner-only interactive terminal approval')
    approve.add_argument('id')
    approve.add_argument('--owner', required=True)
    reject = sub.add_parser('reject', help='Owner-only rejection')
    reject.add_argument('id')
    reject.add_argument('--owner', required=True)
    settle = sub.add_parser('settle', help='Simulate settlement for an approved intent')
    settle.add_argument('id')
    args = parser.parse_args(argv)
    path = Path(args.db).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        service = TransferService(str(path))
        if args.command == 'propose':
            intent = service.propose(args.sender, args.recipient, args.network, args.asset,
                                     args.amount, args.memo, args.ttl)
            result = {'intent': asdict(intent), 'status': 'proposed', 'simulation_only': True}
        elif args.command == 'show':
            intent, state, receipt = service.get(args.id)
            result = {'intent': asdict(intent), 'status': state, 'receipt': receipt,
                      'history': service.history(args.id), 'simulation_only': True}
        elif args.command == 'approve':
            if not sys.stdin.isatty():
                raise PermissionError('Approval requires an interactive owner terminal')
            intent, state, _ = service.get(args.id)
            print(json.dumps(asdict(intent), indent=2))
            print('This approves only simulated settlement. No crypto will move.')
            if input(f'Type APPROVE {intent.id} to confirm: ') != f'APPROVE {intent.id}':
                raise PermissionError('Confirmation did not match')
            service.approve(args.id, args.owner, intent.digest, os.urandom(16).hex())
            result = {'id': args.id, 'status': 'approved', 'simulation_only': True}
        elif args.command == 'reject':
            if not sys.stdin.isatty():
                raise PermissionError('Rejection requires an interactive owner terminal')
            service.reject(args.id, args.owner)
            result = {'id': args.id, 'status': 'rejected'}
        else:
            # Settlement adapter has no real money capability.
            receipt = service.settle(args.id)
            result = {'id': args.id, 'status': 'settled', 'receipt': receipt, 'simulation_only': True}
        print(json.dumps(result, indent=2))
        return 0
    except (ValueError, KeyError, PermissionError) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
