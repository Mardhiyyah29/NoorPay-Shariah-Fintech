from decimal import Decimal

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from wallet.models import Wallet
from .models import ZakatRecord, SadaqahCampaign, SadaqahDonation, QardHasanLoan


def _user_with_wallet(email, full_name, balance=Decimal("0.00"), pin="1234"):
    user = User.objects.create_user(email=email, password="StrongPass123", full_name=full_name)
    user.set_pin(pin)
    user.save()
    Wallet.objects.create(user=user, balance=balance)
    return user


@override_settings(GOLD_PRICE_PER_GRAM=50000, NISAB_VALUE=85 * 50000, ZAKAT_RATE=0.025)
class ZakatCalculationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet("zakatcalc@noorpay.ng", "Zakat Calc User")
        self.client.force_authenticate(user=self.user)

    def test_wealth_above_nisab_is_eligible_with_correct_rate(self):
        response = self.client.post(reverse("zakat-calculate"), {
            "cash_savings": "5000000", "gold_grams": "0", "liabilities": "0",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_eligible"])
        # 2.5% of 5,000,000 = 125,000
        self.assertEqual(Decimal(response.data["zakat_due"]), Decimal("125000.00"))

    def test_wealth_below_nisab_is_not_eligible(self):
        response = self.client.post(reverse("zakat-calculate"), {
            "cash_savings": "100000", "gold_grams": "0", "liabilities": "0",
        })
        self.assertFalse(response.data["is_eligible"])
        self.assertEqual(Decimal(response.data["zakat_due"]), Decimal("0.00"))

    def test_liabilities_reduce_zakatable_wealth(self):
        response = self.client.post(reverse("zakat-calculate"), {
            "cash_savings": "5000000", "gold_grams": "0", "liabilities": "1000000",
        })
        self.assertEqual(Decimal(response.data["zakatable_wealth"]), Decimal("4000000"))

    def test_gold_is_converted_using_gold_price(self):
        response = self.client.post(reverse("zakat-calculate"), {
            "cash_savings": "0", "gold_grams": "100", "liabilities": "0",
        })
        # 100g * 50000/g = 5,000,000
        self.assertEqual(Decimal(response.data["zakatable_wealth"]), Decimal("5000000"))


class ZakatPaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet("zakatpay@noorpay.ng", "Zakat Pay User", balance=Decimal("200000.00"), pin="1234")
        self.client.force_authenticate(user=self.user)

    def test_pay_zakat_deducts_wallet_and_creates_record(self):
        response = self.client.post(reverse("zakat-pay"), {"pin": "1234", "amount": "50000.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, Decimal("150000.00"))
        self.assertTrue(ZakatRecord.objects.filter(user=self.user, is_paid=True).exists())

    def test_pay_zakat_awards_points(self):
        self.user.reward_points = 0
        self.user.save()
        self.client.post(reverse("zakat-pay"), {"pin": "1234", "amount": "50000.00"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.reward_points, 200)

    def test_pay_zakat_fails_with_wrong_pin(self):
        response = self.client.post(reverse("zakat-pay"), {"pin": "0000", "amount": "50000.00"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pay_zakat_fails_with_insufficient_balance(self):
        response = self.client.post(reverse("zakat-pay"), {"pin": "1234", "amount": "999999.00"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SadaqahCampaignTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet("sadaqah@noorpay.ng", "Sadaqah User", balance=Decimal("10000.00"), pin="1234")
        self.client.force_authenticate(user=self.user)
        self.campaign = SadaqahCampaign.objects.create(
            title="Medical Fund", organization="NoorPay Community", description="Help fund surgery.",
            target_amount=Decimal("500000.00"),
        )

    def test_list_only_returns_active_campaigns(self):
        SadaqahCampaign.objects.create(
            title="Closed Campaign", organization="Old Org", description="Done.",
            target_amount=Decimal("1000.00"), is_active=False,
        )
        response = self.client.get(reverse("campaigns"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Medical Fund")

    def test_donate_deducts_wallet_and_updates_campaign(self):
        response = self.client.post(reverse("donate"), {
            "pin": "1234", "amount": "1000.00", "campaign_id": str(self.campaign.id),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.wallet.refresh_from_db()
        self.campaign.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, Decimal("9000.00"))
        self.assertEqual(self.campaign.raised_amount, Decimal("1000.00"))
        self.assertTrue(SadaqahDonation.objects.filter(user=self.user, campaign=self.campaign).exists())

    def test_donate_fails_for_unknown_campaign(self):
        response = self.client.post(reverse("donate"), {
            "pin": "1234", "amount": "1000.00", "campaign_id": "00000000-0000-0000-0000-000000000000",
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_campaign_progress_pct(self):
        self.campaign.raised_amount = Decimal("250000.00")
        self.campaign.save()
        self.assertEqual(self.campaign.progress_pct, 50.0)


class QardHasanZeroInterestTests(TestCase):
    """The single most important test file for objective 7 and the
    Riba-avoidance claim underpinning objective 6."""

    def setUp(self):
        self.borrower = _user_with_wallet("borrower@noorpay.ng", "Borrower", pin="1234")

    def test_interest_rate_is_always_zero_even_if_explicitly_set_otherwise(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="education", purpose_detail="Tuition fees",
            amount_requested=Decimal("50000.00"), interest_rate=Decimal("0.15"),  # attempt to sneak in 15%
        )
        loan.refresh_from_db()
        self.assertEqual(loan.interest_rate, Decimal("0.0000"))  # save() overrides it — no exceptions

    def test_interest_rate_stays_zero_across_updates(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="business", purpose_detail="Small shop stock",
            amount_requested=Decimal("30000.00"),
        )
        loan.interest_rate = Decimal("0.05")
        loan.save()
        loan.refresh_from_db()
        self.assertEqual(loan.interest_rate, Decimal("0.0000"))


class QardHasanWorkflowTests(TestCase):
    """Full request -> approve -> disburse -> repay -> completed lifecycle."""

    def setUp(self):
        self.client = APIClient()
        self.borrower = _user_with_wallet("qardworkflow@noorpay.ng", "Qard Borrower", pin="1234")
        self.admin = User.objects.create_superuser(
            email="admin@noorpay.ng", password="StrongPass123", full_name="Admin",
        )

    def test_borrower_can_apply(self):
        self.client.force_authenticate(user=self.borrower)
        response = self.client.post(reverse("qard"), {
            "purpose": "education", "purpose_detail": "Final year tuition",
            "amount_requested": "40000.00",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(Decimal(response.data["interest_rate"]), Decimal("0.0000"))

    def test_non_admin_cannot_approve(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="education", purpose_detail="Tuition",
            amount_requested=Decimal("40000.00"),
        )
        self.client.force_authenticate(user=self.borrower)
        response = self.client.post(reverse("qard-approve", args=[loan.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_approve_disburses_funds_and_starts_repayment(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="business", purpose_detail="Stock purchase",
            amount_requested=Decimal("40000.00"),
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("qard-approve", args=[loan.id]), {"amount_approved": "40000.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        loan.refresh_from_db()
        self.borrower.wallet.refresh_from_db()
        self.assertEqual(loan.status, "repaying")
        self.assertEqual(loan.amount_approved, Decimal("40000.00"))
        self.assertEqual(self.borrower.wallet.balance, Decimal("40000.00"))

    def test_admin_reject_sets_status(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="other", purpose_detail="Vague reason",
            amount_requested=Decimal("10000.00"),
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("qard-reject", args=[loan.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        loan.refresh_from_db()
        self.assertEqual(loan.status, "rejected")

    def test_full_repayment_marks_loan_completed(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="education", purpose_detail="Tuition",
            amount_requested=Decimal("20000.00"),
        )
        self.client.force_authenticate(user=self.admin)
        self.client.post(reverse("qard-approve", args=[loan.id]), {"amount_approved": "20000.00"})

        self.client.force_authenticate(user=self.borrower)
        response = self.client.post(reverse("qard-repay", args=[loan.id]), {"pin": "1234", "amount": "20000.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        loan.refresh_from_db()
        self.assertEqual(loan.status, "completed")
        self.assertEqual(loan.remaining_balance, Decimal("0"))

    def test_repayment_amount_never_exceeds_principal_no_interest_added(self):
        """Confirms total repayable never exceeds what was disbursed - the
        practical proof that no interest accrues over the loan's life."""
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="housing", purpose_detail="Rent deposit",
            amount_requested=Decimal("15000.00"),
        )
        self.client.force_authenticate(user=self.admin)
        self.client.post(reverse("qard-approve", args=[loan.id]), {"amount_approved": "15000.00"})

        self.client.force_authenticate(user=self.borrower)
        response = self.client.post(reverse("qard-repay", args=[loan.id]), {"pin": "1234", "amount": "16000.00"})
        # 16,000 > remaining_balance (15,000) — must be rejected, proving no
        # code path allows collecting more than what was actually lent
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_repay_fails_with_wrong_pin(self):
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="medical", purpose_detail="Hospital bill",
            amount_requested=Decimal("10000.00"),
        )
        self.client.force_authenticate(user=self.admin)
        self.client.post(reverse("qard-approve", args=[loan.id]), {"amount_approved": "10000.00"})

        self.client.force_authenticate(user=self.borrower)
        response = self.client.post(reverse("qard-repay", args=[loan.id]), {"pin": "0000", "amount": "5000.00"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_borrower_cannot_repay_someone_elses_loan(self):
        other_borrower = _user_with_wallet("otherborrower@noorpay.ng", "Other Borrower", pin="1234")
        loan = QardHasanLoan.objects.create(
            borrower=self.borrower, purpose="education", purpose_detail="Tuition",
            amount_requested=Decimal("10000.00"),
        )
        self.client.force_authenticate(user=self.admin)
        self.client.post(reverse("qard-approve", args=[loan.id]), {"amount_approved": "10000.00"})

        self.client.force_authenticate(user=other_borrower)
        response = self.client.post(reverse("qard-repay", args=[loan.id]), {"pin": "1234", "amount": "5000.00"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
