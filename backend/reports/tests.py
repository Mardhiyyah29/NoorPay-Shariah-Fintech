from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from transactions.models import Transaction


class MonthlyReportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="reportuser@noorpay.ng", password="StrongPass123", full_name="Report User",
        )
        self.client.force_authenticate(user=self.user)
        self.now = timezone.now()
        Transaction.objects.create(
            user=self.user, type="credit", category="income", amount=Decimal("100000.00"), status="completed",
        )
        Transaction.objects.create(
            user=self.user, type="debit", category="food", amount=Decimal("20000.00"), status="completed",
        )
        Transaction.objects.create(
            user=self.user, type="zakat", category="zakat", amount=Decimal("2500.00"), status="completed",
        )
        Transaction.objects.create(
            user=self.user, type="sadaqah", category="sadaqah", amount=Decimal("1000.00"), status="completed",
        )
        # Pending transactions should NOT count toward the report
        Transaction.objects.create(
            user=self.user, type="debit", category="shopping", amount=Decimal("99999.00"), status="pending",
        )

    def test_monthly_report_computes_income_and_expenses(self):
        response = self.client.get(reverse("monthly-report"), {"month": self.now.month, "year": self.now.year})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data["income"]), 100000.0)
        self.assertEqual(float(response.data["expenses"]), 23500.0)  # 20000 + 2500 zakat + 1000 sadaqah
        self.assertEqual(float(response.data["net_savings"]), 76500.0)

    def test_pending_transactions_excluded_from_report(self):
        response = self.client.get(reverse("monthly-report"), {"month": self.now.month, "year": self.now.year})
        # If the pending 99999 leaked in, expenses would be ~123,499 instead of 23,500
        self.assertLess(float(response.data["expenses"]), 30000.0)

    def test_zakat_and_sadaqah_reported_separately(self):
        response = self.client.get(reverse("monthly-report"), {"month": self.now.month, "year": self.now.year})
        self.assertEqual(float(response.data["zakat_paid"]), 2500.0)
        self.assertEqual(float(response.data["sadaqah_paid"]), 1000.0)

    def test_halal_finance_score_is_present_and_bounded(self):
        response = self.client.get(reverse("monthly-report"), {"month": self.now.month, "year": self.now.year})
        score = response.data["halal_finance_score"]
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)

    def test_report_with_zero_income_does_not_crash(self):
        User_no_income = User.objects.create_user(
            email="noincome@noorpay.ng", password="StrongPass123", full_name="No Income User",
        )
        self.client.force_authenticate(user=User_no_income)
        response = self.client.get(reverse("monthly-report"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data["income"]), 0.0)


class AIPromptsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="promptuser@noorpay.ng", password="StrongPass123", full_name="Prompt User",
        )
        self.client.force_authenticate(user=self.user)

    def test_ai_prompts_returns_suggestion_list(self):
        response = self.client.get(reverse("ai-prompts"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data["prompts"]), 0)


@override_settings(ANTHROPIC_API_KEY="")
class AIChatWithoutKeyTests(TestCase):
    """Confirms the graceful fallback when no API key is configured, rather
    than crashing — this is the state the app will be in unless the key is
    explicitly set as an env var."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="aichatuser@noorpay.ng", password="StrongPass123", full_name="AI Chat User",
        )
        self.client.force_authenticate(user=self.user)

    def test_chat_without_api_key_returns_helpful_message_not_a_crash(self):
        response = self.client.post(reverse("ai-chat"), {"messages": [{"role": "user", "content": "Hi"}]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ANTHROPIC_API_KEY", response.data["reply"])

    def test_chat_requires_messages(self):
        response = self.client.post(reverse("ai-chat"), {"messages": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(ANTHROPIC_API_KEY="fake-test-key")
class AIChatWithKeyTests(TestCase):
    """Mocks the external Anthropic call — tests must never hit the real
    network or depend on a real API key."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="aichatkeyuser@noorpay.ng", password="StrongPass123", full_name="AI Chat Key User",
        )
        self.client.force_authenticate(user=self.user)

    @patch("reports.views.httpx.post")
    def test_chat_returns_mocked_reply(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"content": [{"text": "Zakat is 2.5% of eligible wealth."}]}
        mock_post.return_value = mock_response

        response = self.client.post(
            reverse("ai-chat"), {"messages": [{"role": "user", "content": "What is Zakat?"}]}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reply"], "Zakat is 2.5% of eligible wealth.")

    @patch("reports.views.httpx.post")
    def test_chat_handles_upstream_failure_gracefully(self, mock_post):
        mock_post.side_effect = Exception("Connection timed out")
        response = self.client.post(
            reverse("ai-chat"), {"messages": [{"role": "user", "content": "Hi"}]}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
