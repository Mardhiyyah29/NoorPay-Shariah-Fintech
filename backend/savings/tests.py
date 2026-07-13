from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from wallet.models import Wallet
from .models import SavingsGoal


def _user_with_wallet(email, full_name, balance=Decimal("0.00"), pin="1234"):
    user = User.objects.create_user(email=email, password="StrongPass123", full_name=full_name)
    user.set_pin(pin)
    user.save()
    Wallet.objects.create(user=user, balance=balance)
    return user


class SavingsGoalModelTests(TestCase):
    def setUp(self):
        self.user = _user_with_wallet("savingsmodel@noorpay.ng", "Savings Model User")
        self.goal = SavingsGoal.objects.create(
            user=self.user, title="Hajj Fund", goal_type="hajj",
            target_amount=Decimal("2000000.00"), saved_amount=Decimal("500000.00"),
        )

    def test_progress_pct(self):
        self.assertEqual(self.goal.progress_pct, 25.0)

    def test_remaining(self):
        self.assertEqual(self.goal.remaining, Decimal("1500000.00"))

    def test_remaining_never_negative(self):
        self.goal.saved_amount = Decimal("2500000.00")
        self.assertEqual(self.goal.remaining, Decimal("0"))

    def test_no_interest_field_exists(self):
        field_names = [f.name for f in SavingsGoal._meta.get_fields()]
        for forbidden in ("interest_rate", "apr", "apy", "interest"):
            self.assertNotIn(forbidden, field_names)


class SavingsGoalEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet("savingsendpoint@noorpay.ng", "Savings Endpoint User")
        self.client.force_authenticate(user=self.user)

    def test_create_goal(self):
        response = self.client.post(reverse("savings"), {
            "title": "New Laptop", "goal_type": "laptop", "target_amount": "350000.00",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_only_own_goals(self):
        other = _user_with_wallet("otherowner@noorpay.ng", "Other Owner")
        SavingsGoal.objects.create(user=self.user, title="Mine", target_amount=Decimal("1000.00"))
        SavingsGoal.objects.create(user=other, title="Not Mine", target_amount=Decimal("1000.00"))

        response = self.client.get(reverse("savings"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Mine")

    def test_summary_aggregates_correctly(self):
        SavingsGoal.objects.create(
            user=self.user, title="Goal 1", target_amount=Decimal("1000.00"),
            saved_amount=Decimal("400.00"), status="active",
        )
        SavingsGoal.objects.create(
            user=self.user, title="Goal 2", target_amount=Decimal("500.00"),
            saved_amount=Decimal("500.00"), status="completed",
        )
        response = self.client.get(reverse("savings-summary"))
        self.assertEqual(Decimal(response.data["total_saved"]), Decimal("900.00"))
        self.assertEqual(Decimal(response.data["total_target"]), Decimal("1500.00"))
        self.assertEqual(response.data["active_goals"], 1)
        self.assertEqual(response.data["completed"], 1)


class SavingsDepositWithdrawTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet(
            "savingsdw@noorpay.ng", "Deposit Withdraw User", balance=Decimal("5000.00"), pin="1234",
        )
        self.client.force_authenticate(user=self.user)
        self.goal = SavingsGoal.objects.create(
            user=self.user, title="Tuition", target_amount=Decimal("2000.00"),
        )

    def test_deposit_moves_funds_from_wallet_to_goal(self):
        response = self.client.post(reverse("savings-deposit", args=[self.goal.id]), {
            "pin": "1234", "amount": "1000.00",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.wallet.refresh_from_db()
        self.goal.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, Decimal("4000.00"))
        self.assertEqual(self.goal.saved_amount, Decimal("1000.00"))

    def test_deposit_fails_with_wrong_pin(self):
        response = self.client.post(reverse("savings-deposit", args=[self.goal.id]), {
            "pin": "0000", "amount": "1000.00",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reaching_target_marks_goal_completed_and_awards_points(self):
        self.user.reward_points = 0
        self.user.save()
        self.client.post(reverse("savings-deposit", args=[self.goal.id]), {
            "pin": "1234", "amount": "2000.00",
        })
        self.goal.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.goal.status, "completed")
        self.assertEqual(self.user.reward_points, 150)

    def test_withdraw_moves_funds_back_to_wallet(self):
        self.goal.saved_amount = Decimal("500.00")
        self.goal.save()

        response = self.client.post(reverse("savings-withdraw", args=[self.goal.id]), {
            "pin": "1234", "amount": "200.00",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.wallet.refresh_from_db()
        self.goal.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, Decimal("5200.00"))
        self.assertEqual(self.goal.saved_amount, Decimal("300.00"))

    def test_withdraw_fails_exceeding_saved_amount(self):
        self.goal.saved_amount = Decimal("100.00")
        self.goal.save()
        response = self.client.post(reverse("savings-withdraw", args=[self.goal.id]), {
            "pin": "1234", "amount": "500.00",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
