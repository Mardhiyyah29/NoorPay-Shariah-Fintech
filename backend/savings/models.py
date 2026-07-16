import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class SavingsGoal(models.Model):
    # No interest fields - Shari'ah compliant goal-based savings only
    TYPES = [
        ('hajj','Hajj Savings'),('emergency','Emergency Fund'),('education','Education'),
        ('laptop','Laptop'),('business','Business Startup'),('marriage','Marriage'),
        ('house','House'),('car','Car'),('custom','Custom Goal'),
    ]
    STATUS = [('active','Active'),('completed','Completed'),('paused','Paused')]

    id                   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user                 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='savings_goals')
    title                = models.CharField(max_length=100)
    goal_type            = models.CharField(max_length=20, choices=TYPES, default='custom')
    target_amount        = models.DecimalField(max_digits=15, decimal_places=2)
    saved_amount         = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    monthly_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    auto_save            = models.BooleanField(default=False)
    deadline             = models.DateField(null=True, blank=True)
    status               = models.CharField(max_length=10, choices=STATUS, default='active')
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'savings_goals'
        ordering = ['-created_at']

    @property
    def progress_pct(self):
        if self.target_amount == 0: return 0
        return round((self.saved_amount / self.target_amount) * 100, 1)

    @property
    def remaining(self):
        return max(self.target_amount - self.saved_amount, Decimal('0'))
