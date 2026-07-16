from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from transactions.models import Transaction
from islamic_finance.models import QardHasanLoan
from .models import ComplianceRule, ComplianceCheckLog
from . import engine


def _seed_rules():
    ComplianceRule.objects.create(
        category="riba", name="Interest language", severity="block",
        keywords="interest rate, compound interest, apr, usury",
    )
    ComplianceRule.objects.create(
        category="gharar", name="Guaranteed-return language", severity="flag",
        keywords="guaranteed return, guaranteed profit, risk-free, double your money",
    )
    ComplianceRule.objects.create(
        category="maysir", name="Gambling language", severity="block",
        keywords="bet, betting, casino, lottery, jackpot, wager",
    )


class ScreenTextEngineTests(TestCase):
    def setUp(self):
        _seed_rules()
        self.user = User.objects.create_user(
            email="screen@noorpay.ng", password="StrongPass123", full_name="Screen User",
        )

    def test_detects_riba_language(self):
        result = engine.screen_text("This offers a great interest rate on savings", user=self.user)
        self.assertEqual(result["verdict"], "blocked")
        self.assertTrue(any(r["category"] == "riba" for r in result["matched_rules"]))

    def test_detects_gharar_language(self):
        result = engine.screen_text("Guaranteed return of 30% in 3 months, risk-free!", user=self.user)
        self.assertEqual(result["verdict"], "flagged")
        self.assertTrue(any(r["category"] == "gharar" for r in result["matched_rules"]))

    def test_detects_maysir_language(self):
        result = engine.screen_text("Join our lottery for a chance to win big", user=self.user)
        self.assertEqual(result["verdict"], "blocked")
        self.assertTrue(any(r["category"] == "maysir" for r in result["matched_rules"]))

    def test_clean_text_is_compliant(self):
        result = engine.screen_text("Monthly tuition savings deposit", user=self.user)
        self.assertEqual(result["verdict"], "compliant")
        self.assertEqual(result["matched_rules"], [])


class TransactionAutoScreeningTests(TestCase):
    """Confirms the post_save signal actually screens every new transaction."""

    def setUp(self):
        _seed_rules()
        self.user = User.objects.create_user(
            email="txscreen@noorpay.ng", password="StrongPass123", full_name="Tx User",
        )

    def test_qard_transaction_with_fee_is_blocked_structurally(self):
        Transaction.objects.create(
            user=self.user, type="qard", category="qard", amount=Decimal("5000.00"),
            fee=Decimal("50.00"), description="Qard Hasan disbursement",
        )
        log = ComplianceCheckLog.objects.filter(source="transaction").latest("created_at")
        self.assertEqual(log.verdict, "blocked")

    def test_qard_transaction_with_no_fee_is_compliant(self):
        Transaction.objects.create(
            user=self.user, type="qard", category="qard", amount=Decimal("5000.00"),
            fee=Decimal("0.00"), description="Qard Hasan disbursement",
        )
        log = ComplianceCheckLog.objects.filter(source="transaction").latest("created_at")
        self.assertEqual(log.verdict, "compliant")

    def test_transaction_description_with_gambling_language_is_flagged(self):
        Transaction.objects.create(
            user=self.user, type="debit", category="shopping", amount=Decimal("1000.00"),
            description="Casino night entry ticket",
        )
        log = ComplianceCheckLog.objects.filter(source="transaction").latest("created_at")
        self.assertIn(log.verdict, ["flagged", "blocked"])


class QardHasanScreeningTests(TestCase):
    def setUp(self):
        _seed_rules()
        self.user = User.objects.create_user(
            email="loanscreen@noorpay.ng", password="StrongPass123", full_name="Loan User",
        )

    def test_loan_with_vague_speculative_purpose_is_flagged(self):
        QardHasanLoan.objects.create(
            borrower=self.user, purpose="business",
            purpose_detail="Guaranteed return investment in a risk-free scheme",
            amount_requested=Decimal("10000.00"), repayment_months=6,
        )
        log = ComplianceCheckLog.objects.filter(source="qard_hasan_application").latest("created_at")
        self.assertEqual(log.verdict, "flagged")

    def test_loan_interest_rate_is_always_enforced_to_zero(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.user, purpose="education", purpose_detail="Tuition for final semester",
            amount_requested=Decimal("20000.00"), repayment_months=4,
        )
        self.assertEqual(loan.interest_rate, Decimal("0.0000"))
        log = ComplianceCheckLog.objects.filter(source="qard_hasan_application").latest("created_at")
        self.assertEqual(log.verdict, "compliant")


class ComplianceDashboardTests(TestCase):
    def setUp(self):
        _seed_rules()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="dash@noorpay.ng", password="StrongPass123", full_name="Dashboard User",
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_computes_real_compliance_rate(self):
        engine.screen_text("Normal tuition payment", user=self.user)
        engine.screen_text("Guaranteed profit, no risk", user=self.user)

        response = self.client.get(reverse("compliance-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_screened"], 2)
        self.assertEqual(response.data["flagged"], 1)
        self.assertEqual(response.data["compliance_rate_percent"], 50.0)
