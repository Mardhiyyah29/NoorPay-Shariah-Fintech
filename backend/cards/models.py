"""
cards/models.py
Virtual NoorPay debit card. This draws directly from the user's own wallet
balance — it is NOT a credit card, so there is no interest, no revolving
debt, and no APR anywhere in this model. `spending_limit` is a user-set
self-control feature, not a credit line.
"""

import random
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from dateutil.relativedelta import relativedelta


class VirtualCard(models.Model):
    # ⚠️ KNOWN LIMITATION, documented for the project write-up: real payment
    # networks (PCI-DSS) never permit storing CVV after authorization — it
    # must be entered fresh at each transaction, never persisted. This card
    # is a simulated, closed-loop instrument (draws from the user's own
    # wallet only, no real card network involved), so this is an accepted
    # simulation trade-off, not something to represent as production-ready
    # if this were connecting to a real card processor.
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="virtual_card")
    card_number = models.CharField(max_length=16, unique=True, editable=False)
    cvv = models.CharField(max_length=3, editable=False)
    expiry_date = models.DateField(editable=False)
    cardholder_name = models.CharField(max_length=100)

    is_frozen = models.BooleanField(default=False)
    spending_limit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("200000.00"))
    amount_spent_this_period = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.card_number:
            self.card_number = self._generate_card_number()
        if not self.cvv:
            self.cvv = f"{random.randint(0, 999):03d}"
        if not self.expiry_date:
            self.expiry_date = (timezone.now() + relativedelta(years=3)).date()
        super().save(*args, **kwargs)

    def _generate_card_number(self):
        while True:
            candidate = "5412" + "".join(str(random.randint(0, 9)) for _ in range(12))
            if not VirtualCard.objects.filter(card_number=candidate).exists():
                return candidate

    @property
    def masked_number(self):
        return f"{self.card_number[:4]} •••• •••• {self.card_number[-4:]}"

    @property
    def available_to_spend(self):
        return self.spending_limit - self.amount_spent_this_period

    def __str__(self):
        return f"{self.user.full_name} — {self.masked_number}"


class CardTransaction(models.Model):
    """A single spend against the virtual card, counted toward the spending limit."""

    card = models.ForeignKey(VirtualCard, on_delete=models.CASCADE, related_name="card_transactions")
    merchant = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.card.user.full_name} — {self.merchant} ₦{self.amount}"
