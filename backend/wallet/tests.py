from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import Wallet, Beneficiary


class WalletModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="walletmodel@noorpay.ng", password="StrongPass123", full_name="Wallet Model User",
        )
        self.wallet = Wallet.objects.create(user=self.user, balance=Decimal("1000.00"))

    def test_credit_increases_balance(self):
        self.wallet.credit(500)
        self.assertEqual(self.wallet.balance, Decimal("1500.00"))

    def test_debit_decreases_balance(self):
        self.wallet.debit(300)
        self.assertEqual(self.wallet.balance, Decimal("700.00"))

    def test_debit_raises_on_insufficient_balance(self):
        with self.assertRaises(ValueError):
            self.wallet.debit(5000)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("1000.00"))  # unchanged


class WalletEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="walletendpoint@noorpay.ng", password="StrongPass123", full_name="Wallet Endpoint User",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_wallet_auto_creates_if_missing(self):
        response = self.client.get(reverse("wallet"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Wallet.objects.filter(user=self.user).exists())
        self.assertEqual(Decimal(response.data["balance"]), Decimal("0.00"))
        self.assertEqual(response.data["currency"], "NGN")


class BeneficiaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="benuser@noorpay.ng", password="StrongPass123", full_name="Beneficiary User",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_beneficiary(self):
        response = self.client.post(reverse("beneficiaries"), {
            "name": "Fatima Bello", "account_number": "0123456789", "bank_name": "GTBank",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Beneficiary.objects.filter(user=self.user, name="Fatima Bello").exists())

    def test_list_only_returns_own_beneficiaries(self):
        other_user = User.objects.create_user(
            email="otheruser@noorpay.ng", password="StrongPass123", full_name="Other User",
        )
        Beneficiary.objects.create(user=self.user, name="Mine", account_number="111", bank_name="NoorPay")
        Beneficiary.objects.create(user=other_user, name="Not Mine", account_number="222", bank_name="NoorPay")

        response = self.client.get(reverse("beneficiaries"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Mine")

    def test_toggle_favourite(self):
        beneficiary = Beneficiary.objects.create(
            user=self.user, name="Toggle Test", account_number="333", bank_name="NoorPay",
        )
        response = self.client.post(reverse("toggle-favourite", args=[beneficiary.id]))
        self.assertTrue(response.data["is_favourite"])
        response = self.client.post(reverse("toggle-favourite", args=[beneficiary.id]))
        self.assertFalse(response.data["is_favourite"])

    def test_cannot_toggle_favourite_on_others_beneficiary(self):
        other_user = User.objects.create_user(
            email="otherowner@noorpay.ng", password="StrongPass123", full_name="Other Owner",
        )
        beneficiary = Beneficiary.objects.create(
            user=other_user, name="Not Yours", account_number="444", bank_name="NoorPay",
        )
        response = self.client.post(reverse("toggle-favourite", args=[beneficiary.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
