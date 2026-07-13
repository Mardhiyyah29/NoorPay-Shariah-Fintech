import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class StudentExpense(models.Model):
    CATEGORIES = [
        ('tuition','Tuition Fees'),('hostel','Hostel/Accommodation'),('food','Food & Feeding'),
        ('textbooks','Textbooks & Materials'),('internet','Internet & Data'),('research','Research & FYP'),
        ('certification','Certification Exams'),('transport','Transport'),('laptop','Laptop/Tech'),
        ('other','Other'),
    ]
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_expenses')
    category    = models.CharField(max_length=20, choices=CATEGORIES)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    budget      = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    description = models.CharField(max_length=200, blank=True)
    month       = models.PositiveSmallIntegerField()
    year        = models.PositiveSmallIntegerField()
    date        = models.DateField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_expenses'
        ordering = ['-date']


class Allowance(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='allowances')
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    source      = models.CharField(max_length=100, default='Monthly Allowance')
    month       = models.PositiveSmallIntegerField()
    year        = models.PositiveSmallIntegerField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'allowances'
