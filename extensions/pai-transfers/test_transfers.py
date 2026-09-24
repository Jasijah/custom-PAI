import unittest
from transfers import TransferService


class TransferTests(unittest.TestCase):
    def setUp(self):
        self.service = TransferService()
        self.intent = self.service.propose('pai:alice', 'pai:bob', 'pip-sandbox', 'PIP', '2.50')

    def test_no_settlement_without_owner_approval(self):
        with self.assertRaises(ValueError):
            self.service.settle(self.intent.id)
        with self.assertRaises(PermissionError):
            self.service.approve(self.intent.id, 'pai:bob', self.intent.digest, 'approval-1')
        with self.assertRaises(PermissionError):
            self.service.approve(self.intent.id, 'pai:alice', 'wrong-digest', 'approval-1')

    def test_approval_settles_once(self):
        self.service.approve(self.intent.id, 'pai:alice', self.intent.digest, 'approval-1')
        first = self.service.settle(self.intent.id)
        self.assertEqual(first, self.service.settle(self.intent.id))
        with self.assertRaises(ValueError):
            self.service.approve(self.intent.id, 'pai:alice', self.intent.digest, 'approval-2')

    def test_rejected_intent_cannot_settle(self):
        self.service.reject(self.intent.id, 'pai:alice')
        with self.assertRaises(ValueError):
            self.service.settle(self.intent.id)

    def test_amount_validation(self):
        for invalid in ('0', '-1', 'NaN', 'Infinity', '0.0000000000000000001'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                self.service.propose('pai:alice', 'pai:bob', 'pip-sandbox', 'PIP', invalid)


if __name__ == '__main__':
    unittest.main()
