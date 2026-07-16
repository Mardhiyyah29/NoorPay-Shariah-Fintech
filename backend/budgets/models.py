import uuid
from datetime import date
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone


class Budget(models.Model):
    CATEGORIES = [
        ('food','Food & Dining'),('transport','Transport'),('housing','Housing & Rent'),
        ('health','Health'),('education','Education'),('shopping','Shopping'),
        ('entertainment','Entertainment'),('utilities','Utilities'),('student','Student Expenses'),
        ('research','Research & FYP'),('other','Other'),
    ]
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    category       = models.CharField(max_length=20, choices=CATEGORIES)
    monthly_limit  = models.DecimalField(max_digits=12, decimal_places=2)
    month          = models.PositiveSmallIntegerField()
    year           = models.PositiveSmallIntegerField()
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'budgets'
        unique_together = ['user', 'category', 'month', 'year']

    @property
    def spent(self):
        from transactions.models import Transaction
        from django.db.models import Sum
        total = Transaction.objects.filter(
            user=self.user, category=self.category,
            created_at__month=self.month, created_at__year=self.year,
            status='completed', type__in=['debit','transfer','airtime','data','bill'],
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        return total

    @property
    def remaining(self):
        return max(self.monthly_limit - self.spent, Decimal('0'))

    @property
    def percentage_used(self):
        if self.monthly_limit == 0: return 0
        return round((self.spent / self.monthly_limit) * 100, 1)


class IncomeRecord(models.Model):
    SOURCES = [
        ('salary','Salary'),('allowance','Allowance'),('business','Business'),('gift','Gift'),('other','Other'),
    ]
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='income_records')
    source        = models.CharField(max_length=20, choices=SOURCES)
    amount        = models.DecimalField(max_digits=12, decimal_places=2)
    description   = models.CharField(max_length=200, blank=True)
    month         = models.PositiveSmallIntegerField()
    year          = models.PositiveSmallIntegerField()
    date_received = models.DateField(default=date.today)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'income_records'
        ordering = ['-date_received']
