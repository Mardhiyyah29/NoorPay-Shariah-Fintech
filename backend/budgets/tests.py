from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from transactions.models import Transaction
from .models import Budget, IncomeRecord


class BudgetSpendCalculationTests(TestCase):
    """Confirms Budget.spent correctly aggregates real Transaction rows —
    this property is the whole point of the budgeting feature."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="budgetcalc@noorpay.ng", password="StrongPass123", full_name="Budget Calc User",
        )
        now = timezone.now()
        self.budget = Budget.objects.create(
            user=self.user, category="food", monthly_limit=Decimal("20000.00"),
            month=now.month, year=now.year,
        )
        # Debit-type spend in the same category should count...
        Transaction.objects.create(
            user=self.user, type="debit", category="food", amount=Decimal("3000.00"), description="Groceries",
        )
        # ...but a credit (income) should NOT count toward spend
        Transaction.objects.create(
            user=self.user, type="credit", category="food", amount=Decimal("1000.00"), description="Refund",
        )
        # A different category should NOT count toward this budget
        Transaction.objects.create(
            user=self.user, type="debit", category="transport", amount=Decimal("500.00"), description="Uber",
        )

    def test_spent_only_counts_matching_category_and_debit_types(self):
        self.assertEqual(self.budget.spent, Decimal("3000.00"))

    def test_remaining_is_limit_minus_spent(self):
        self.assertEqual(self.budget.remaining, Decimal("17000.00"))

    def test_percentage_used(self):
        self.assertEqual(self.budget.percentage_used, 15.0)

    def test_remaining_never_goes_negative(self):
        Transaction.objects.create(
            user=self.user, type="debit", category="food", amount=Decimal("50000.00"), description="Big spend",
        )
        self.assertEqual(self.budget.remaining, Decimal("0"))


class BudgetEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="budgetendpoint@noorpay.ng", password="StrongPass123", full_name="Budget Endpoint User",
        )
        self.client.force_authenticate(user=self.user)
        self.now = timezone.now()

    def test_create_budget(self):
        response = self.client.post(reverse("budgets"), {
            "category": "education", "monthly_limit": "15000.00",
            "month": self.now.month, "year": self.now.year,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_create_duplicate_budget_for_same_category_and_month(self):
        Budget.objects.create(
            user=self.user, category="education", monthly_limit=Decimal("15000.00"),
            month=self.now.month, year=self.now.year,
        )
        response = self.client.post(reverse("budgets"), {
            "category": "education", "monthly_limit": "20000.00",
            "month": self.now.month, "year": self.now.year,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_only_current_month_by_default(self):
        Budget.objects.create(
            user=self.user, category="food", monthly_limit=Decimal("10000.00"),
            month=self.now.month, year=self.now.year,
        )
        last_month = self.now.month - 1 or 12
        Budget.objects.create(
            user=self.user, category="food", monthly_limit=Decimal("10000.00"),
            month=last_month, year=self.now.year,
        )
        response = self.client.get(reverse("budgets"))
        self.assertEqual(len(response.data), 1)


class BudgetSummaryTests(TestCase):
    """
    Regression test for a real bug found in this codebase: budget_summary
    imported IncomeRecord from a non-existent 'income_records' app, which
    would crash this endpoint with ModuleNotFoundError the instant it was
    called. Fixed to use the correct import from budgets.models.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="summaryuser@noorpay.ng", password="StrongPass123", full_name="Summary User",
        )
        self.client.force_authenticate(user=self.user)
        now = timezone.now()
        IncomeRecord.objects.create(
            user=self.user, source="allowance", amount=Decimal("50000.00"),
            month=now.month, year=now.year,
        )
        Transaction.objects.create(
            user=self.user, type="debit", category="food", amount=Decimal("12000.00"), description="Spending",
        )

    def test_summary_endpoint_does_not_crash_and_computes_correctly(self):
        response = self.client.get(reverse("budget-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_income"]), Decimal("50000.00"))
        self.assertEqual(Decimal(response.data["total_spent"]), Decimal("12000.00"))
        self.assertEqual(Decimal(response.data["net_savings"]), Decimal("38000.00"))


class IncomeRecordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="incomeuser@noorpay.ng", password="StrongPass123", full_name="Income User",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_income_record(self):
        now = timezone.now()
        response = self.client.post(reverse("income"), {
            "source": "salary", "amount": "80000.00", "month": now.month, "year": now.year,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(IncomeRecord.objects.filter(user=self.user, source="salary").exists())
