import os
import django
import uuid
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shariah_fintech_backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from wallet.models import Wallet
from islamic_finance.models import QardHasanLoan
from islamic_finance.views import approve_qard, repay_qard

User = get_user_model()

user = User.objects.create_user(email=f'qarddebug-{uuid.uuid4().hex[:8]}@noorpay.ng', password='StrongPass123', full_name='Qard Debug')
user.set_pin('1234')
user.save()
Wallet.objects.create(user=user, balance=Decimal('0.00'))

admin = User.objects.create_superuser(email=f'adminqard-{uuid.uuid4().hex[:8]}@noorpay.ng', password='StrongPass123', full_name='Admin Qard')
Wallet.objects.create(user=admin, balance=Decimal('0.00'))

loan = QardHasanLoan.objects.create(
    borrower=user,
    purpose='education',
    purpose_detail='Tuition',
    amount_requested=Decimal('20000.00'),
)

factory = APIRequestFactory()
req = factory.post(f'/qard/{loan.id}/approve/', {'amount_approved': '20000.00'}, format='json')
force_authenticate(req, user=admin)
resp = approve_qard(req, pk=loan.id)
print('approve status', resp.status_code)
print('approve data', getattr(resp, 'data', None))

loan.refresh_from_db()
print('loan after approve', loan.amount_approved, loan.status)
print('borrower wallet after approve', loan.borrower.wallet.balance)
from wallet.models import Wallet as WalletModel
print('wallet from DB after approve', WalletModel.objects.get(user=user).balance)

req2 = factory.post(f'/qard/{loan.id}/repay/', {'pin': '1234', 'amount': '20000.00'}, format='json')
force_authenticate(req2, user=user)
print('borrower wallet before repay', user.wallet.balance)
resp2 = repay_qard(req2, pk=loan.id)
print('repay status', resp2.status_code)
print('repay data', getattr(resp2, 'data', None))

loan.refresh_from_db()
print('loan after repay', loan.amount_repaid, loan.status, loan.remaining_balance)
