"""NoorPay - Wallet Models"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class Wallet(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance        = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    currency       = models.CharField(max_length=3, default='NGN')
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wallets'

    def __str__(self):
        return f"{self.user.full_name} - ₦{self.balance}"

    def credit(self, amount):
        self.balance += Decimal(str(amount))
        self.save(update_fields=['balance', 'updated_at'])

    def debit(self, amount):
        amount = Decimal(str(amount))
        if self.balance < amount:
            raise ValueError("Insufficient balance")
        self.balance -= amount
        self.save(update_fields=['balance', 'updated_at'])


class Beneficiary(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='beneficiaries')
    name           = models.CharField(max_length=150)
    account_number = models.CharField(max_length=20)
    bank_name      = models.CharField(max_length=100, default='NoorPay')
    bank_code      = models.CharField(max_length=10, blank=True)
    is_favourite   = models.BooleanField(default=False)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beneficiaries'
        unique_together = ['user', 'account_number', 'bank_name']
