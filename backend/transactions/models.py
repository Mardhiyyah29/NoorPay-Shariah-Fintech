"""NoorPay - Transaction Models (Zero Riba - no interest fields ever)"""
import uuid
import random, string
from decimal import Decimal
from django.db import models
from django.conf import settings


def gen_ref():
    return 'AMP' + ''.join(random.choices(string.digits, k=10))


class Transaction(models.Model):
    # NOTE: No interest_rate, apr, apy, or riba fields - Shari'ah compliant
    TYPES = [
        ('credit',   'Credit'),
        ('debit',    'Debit'),
        ('transfer', 'Transfer'),
        ('airtime',  'Airtime'),
        ('data',     'Data Bundle'),
        ('zakat',    'Zakat'),
        ('sadaqah',  'Sadaqah'),
        ('qard',     'Qard Hasan'),
        ('bill',     'Bill Payment'),
    ]
    CATEGORIES = [
        ('income',       'Income'),
        ('transfer',     'Transfer'),
        ('bills',        'Bills & Utilities'),
        ('food',         'Food & Dining'),
        ('transport',    'Transport'),
        ('education',    'Education'),
        ('housing',      'Housing'),
        ('health',       'Health'),
        ('shopping',     'Shopping'),
        ('zakat',        'Zakat'),
        ('sadaqah',      'Sadaqah'),
        ('qard',         'Qard Hasan'),
        ('student',      'Student Expense'),
    ]
    STATUS = [
        ('pending',   'Pending'),
        ('completed', 'Completed'),
        ('failed',    'Failed'),
        ('reversed',  'Reversed'),
    ]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user              = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    type              = models.CharField(max_length=20, choices=TYPES)
    category          = models.CharField(max_length=20, choices=CATEGORIES, default='income')
    amount            = models.DecimalField(max_digits=15, decimal_places=2)
    fee               = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    description       = models.CharField(max_length=300)
    reference         = models.CharField(max_length=20, unique=True, default=gen_ref)
    status            = models.CharField(max_length=10, choices=STATUS, default='completed')
    recipient_name    = models.CharField(max_length=150, blank=True)
    recipient_account = models.CharField(max_length=20, blank=True)
    bank_name         = models.CharField(max_length=100, blank=True)
    note              = models.CharField(max_length=300, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference} - {self.type} ₦{self.amount}"
