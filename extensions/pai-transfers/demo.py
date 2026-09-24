from transfers import TransferService

service = TransferService()
intent = service.propose('pai:jasijah', 'pai:recipient', 'pip-sandbox', 'PIP', '2.50', 'Thanks')
print('Review:', intent)
service.approve(intent.id, 'pai:jasijah', intent.digest, 'owner-confirmation-001')
print('Receipt:', service.settle(intent.id))
print('History:', service.history(intent.id))
