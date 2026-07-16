from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import StudentExpense, Allowance


class StudentExpenseTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="student@noorpay.ng", password="StrongPass123", full_name="Student User",
        )
        self.client.force_authenticate(user=self.user)
        self.now = timezone.now()

    def test_create_expense(self):
        response = self.client.post(reverse("student-expenses"), {
            "category": "textbooks", "amount": "15000.00", "month": self.now.month,
            "year": self.now.year, "date": self.now.date().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(StudentExpense.objects.filter(user=self.user, category="textbooks").exists())

    def test_list_filters_by_current_month_by_default(self):
        StudentExpense.objects.create(
            user=self.user, category="tuition", amount=Decimal("50000.00"),
            month=self.now.month, year=self.now.year, date=self.now.date(),
        )
        last_month = self.now.month - 1 or 12
        StudentExpense.objects.create(
            user=self.user, category="tuition", amount=Decimal("50000.00"),
            month=last_month, year=self.now.year, date=self.now.date(),
        )
        response = self.client.get(reverse("student-expenses"))
        self.assertEqual(len(response.data), 1)

    def test_list_only_returns_own_expenses(self):
        other = User.objects.create_user(email="studentother@noorpay.ng", password="StrongPass123", full_name="Other")
        StudentExpense.objects.create(
            user=other, category="food", amount=Decimal("5000.00"),
            month=self.now.month, year=self.now.year, date=self.now.date(),
        )
        response = self.client.get(reverse("student-expenses"))
        self.assertEqual(len(response.data), 0)


class AllowanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="allowanceuser@noorpay.ng", password="StrongPass123", full_name="Allowance User",
        )
        self.client.force_authenticate(user=self.user)
        self.now = timezone.now()

    def test_create_allowance(self):
        response = self.client.post(reverse("allowance"), {
            "amount": "30000.00", "source": "Family", "month": self.now.month, "year": self.now.year,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class StudentSummaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="summarystudent@noorpay.ng", password="StrongPass123", full_name="Summary Student",
        )
        self.client.force_authenticate(user=self.user)
        self.now = timezone.now()
        Allowance.objects.create(user=self.user, amount=Decimal("40000.00"), month=self.now.month, year=self.now.year)
        StudentExpense.objects.create(
            user=self.user, category="food", amount=Decimal("10000.00"),
            month=self.now.month, year=self.now.year, date=self.now.date(),
        )
        StudentExpense.objects.create(
            user=self.user, category="internet", amount=Decimal("5000.00"),
            month=self.now.month, year=self.now.year, date=self.now.date(),
        )

    def test_summary_computes_totals_and_breakdown(self):
        response = self.client.get(reverse("student-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["allowance"]), Decimal("40000.00"))
        self.assertEqual(Decimal(response.data["total_spent"]), Decimal("15000.00"))
        self.assertEqual(float(response.data["remaining"]), 25000.0)
        self.assertEqual(response.data["by_category"]["food"], 10000.0)
        self.assertEqual(response.data["by_category"]["internet"], 5000.0)
