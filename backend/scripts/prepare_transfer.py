import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','shariah_fintech_backend.settings')
django.setup()
from accounts.models import User

u = User.objects.get(email='ci.tester+2@example.com')
# credit the user's wallet
u.wallet.credit(5000)
print('CREDITED', u.wallet.balance)

rec, created = User.objects.get_or_create(
    email='recipient.test@example.com',
    defaults={'full_name':'Recipient Test','is_active':True,'is_verified':True}
)
if created:
    rec.set_password('pass1234')
    rec.set_pin('0000')
    rec.save()
print('REC_ACC', rec.account_number)
