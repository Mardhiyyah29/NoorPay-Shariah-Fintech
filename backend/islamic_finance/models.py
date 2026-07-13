"""
NoorPay - Islamic Finance Models
Zakat, Sadaqah, Qard Hasan (ZERO INTEREST - enforced at model level)
"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class ZakatRecord(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='zakat_records')
    cash_savings   = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    gold_grams     = models.DecimalField(max_digits=8,  decimal_places=3, default=Decimal('0'))
    liabilities    = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    nisab_used     = models.DecimalField(max_digits=15, decimal_places=2)
    zakat_amount   = models.DecimalField(max_digits=15, decimal_places=2)
    is_paid        = models.BooleanField(default=False)
    paid_at        = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'zakat_records'
        ordering = ['-created_at']


class SadaqahCampaign(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title          = models.CharField(max_length=200)
    organization   = models.CharField(max_length=150)
    description    = models.TextField()
    target_amount  = models.DecimalField(max_digits=15, decimal_places=2)
    raised_amount  = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    is_urgent      = models.BooleanField(default=False)
    is_active      = models.BooleanField(default=True)
    image          = models.ImageField(upload_to='campaigns/', blank=True, null=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    deadline       = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'sadaqah_campaigns'

    @property
    def progress_pct(self):
        if self.target_amount == 0: return 0
        return round((self.raised_amount / self.target_amount) * 100, 1)


class SadaqahDonation(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='donations')
    campaign     = models.ForeignKey(SadaqahCampaign, on_delete=models.CASCADE, related_name='donations')
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    message      = models.CharField(max_length=300, blank=True)
    is_anonymous = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sadaqah_donations'


class QardHasanLoan(models.Model):
    """
    SHARI'AH CRITICAL: interest_rate is ALWAYS 0.0000%
    This is enforced in the save() method and cannot be overridden via API.
    """
    PURPOSES = [
        ('education','Education'),('medical','Medical Emergency'),
        ('business','Small Business'),('housing','Housing'),('other','Other'),
    ]
    STATUS = [
        ('pending','Pending Review'),('approved','Approved'),
        ('rejected','Rejected'),('repaying','Repaying'),('completed','Completed'),
    ]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    purpose           = models.CharField(max_length=20, choices=PURPOSES)
    purpose_detail    = models.TextField()
    amount_requested  = models.DecimalField(max_digits=12, decimal_places=2)
    amount_approved   = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    amount_repaid     = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    # SHARI'AH: interest_rate is ALWAYS 0.0000 - enforced below
    interest_rate     = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal('0.0000'))
    repayment_months  = models.PositiveSmallIntegerField(default=12)
    status            = models.CharField(max_length=10, choices=STATUS, default='pending')
    created_at        = models.DateTimeField(auto_now_add=True)
    approved_at       = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'qard_hasan_loans'

    def save(self, *args, **kwargs):
        # SHARI'AH ENFORCEMENT: interest rate is ALWAYS zero, no exceptions
        self.interest_rate = Decimal('0.0000')
        super().save(*args, **kwargs)

    @property
    def remaining_balance(self):
        if not self.amount_approved: return Decimal('0')
        return max(self.amount_approved - self.amount_repaid, Decimal('0'))

    @property
    def progress_pct(self):
        if not self.amount_approved or self.amount_approved == 0: return 0
        return round((self.amount_repaid / self.amount_approved) * 100, 1)
