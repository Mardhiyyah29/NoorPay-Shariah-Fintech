from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from wallet.models import Wallet
from .models import Transaction


def _user_with_wallet(email, full_name, balance=Decimal("0.00"), pin="1234"):
    user = User.objects.create_user(email=email, password="StrongPass123", full_name=full_name)
    user.set_pin(pin)
    user.save()
    Wallet.objects.create(user=user, balance=balance)
    return user


class TransactionListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet("txlist@noorpay.ng", "Tx List User")
        self.client.force_authenticate(user=self.user)
        Transaction.objects.create(user=self.user, type="credit", category="income", amount=Decimal("500.00"), description="Deposit")
        Transaction.objects.create(user=self.user, type="zakat", category="zakat", amount=Decimal("100.00"), description="Zakat payment")

    def test_list_only_returns_own_transactions(self):
        other = _user_with_wallet("txother@noorpay.ng", "Other")
        Transaction.objects.create(user=other, type="credit", category="income", amount=Decimal("999.00"), description="Not mine")

        response = self.client.get(reverse("transactions"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data if isinstance(response.data, list) else response.data.get("results", response.data)
        self.assertEqual(len(results), 2)

    def test_reference_auto_generated_with_correct_prefix(self):
        tx = Transaction.objects.first()
        self.assertTrue(tx.reference.startswith("AMP"))

    def test_transaction_detail_view(self):
        tx = Transaction.objects.first()
        response = self.client.get(reverse("tx-detail", args=[tx.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_transaction_detail_404_for_others_transaction(self):
        other = _user_with_wallet("txother2@noorpay.ng", "Other 2")
        their_tx = Transaction.objects.create(user=other, type="credit", category="income", amount=Decimal("50.00"), description="Theirs")
        response = self.client.get(reverse("tx-detail", args=[their_tx.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class InternalTransferTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.sender = _user_with_wallet("sender@noorpay.ng", "Sender", balance=Decimal("1000.00"), pin="1234")
        self.recipient = _user_with_wallet("recipient@noorpay.ng", "Recipient", balance=Decimal("0.00"))
        self.client.force_authenticate(user=self.sender)

    def test_transfer_moves_funds_with_zero_fee(self):
        response = self.client.post(reverse("internal-transfer"), {
            "pin": "1234", "amount": "200.00", "recipient_account": self.recipient.account_number,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.sender.wallet.refresh_from_db()
        self.recipient.wallet.refresh_from_db()
        self.assertEqual(self.sender.wallet.balance, Decimal("800.00"))
        self.assertEqual(self.recipient.wallet.balance, Decimal("200.00"))

        debit_tx = Transaction.objects.filter(user=self.sender, type="transfer").first()
        self.assertEqual(debit_tx.fee, Decimal("0.00"))

    def test_transfer_fails_with_wrong_pin(self):
        response = self.client.post(reverse("internal-transfer"), {
            "pin": "0000", "amount": "200.00", "recipient_account": self.recipient.account_number,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_fails_to_self(self):
        response = self.client.post(reverse("internal-transfer"), {
            "pin": "1234", "amount": "100.00", "recipient_account": self.sender.account_number,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_fails_with_insufficient_balance(self):
        response = self.client.post(reverse("internal-transfer"), {
            "pin": "1234", "amount": "5000.00", "recipient_account": self.recipient.account_number,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_fails_for_unknown_account(self):
        response = self.client.post(reverse("internal-transfer"), {
            "pin": "1234", "amount": "100.00", "recipient_account": "0000000000",
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_successful_transfer_awards_sender_points(self):
        self.sender.reward_points = 0
        self.sender.save()
        self.client.post(reverse("internal-transfer"), {
            "pin": "1234", "amount": "1000.00", "recipient_account": self.recipient.account_number,
        })
        self.sender.refresh_from_db()
        self.assertEqual(self.sender.reward_points, 10)


class AirtimeDataTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _user_with_wallet("airtime@noorpay.ng", "Airtime User", balance=Decimal("1000.00"), pin="1234")
        self.client.force_authenticate(user=self.user)

    def test_buy_airtime_succeeds(self):
        response = self.client.post(reverse("buy-airtime"), {
            "pin": "1234", "amount": "500", "phone": "08012345678", "network": "mtn",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, Decimal("500.00"))

    def test_buy_airtime_rejects_below_minimum(self):
        response = self.client.post(reverse("buy-airtime"), {
            "pin": "1234", "amount": "20", "phone": "08012345678", "network": "mtn",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_buy_data_succeeds_and_awards_points(self):
        self.user.reward_points = 0
        self.user.save()
        response = self.client.post(reverse("buy-data"), {
            "pin": "1234", "amount": "300", "phone": "08012345678", "network": "airtel", "bundle_name": "1GB",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.reward_points, 25)

    def test_buy_data_fails_with_wrong_pin(self):
        response = self.client.post(reverse("buy-data"), {
            "pin": "9999", "amount": "300", "phone": "08012345678", "network": "airtel", "bundle_name": "1GB",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
