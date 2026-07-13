from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from wallet.models import Wallet
from .models import WaqfFund


class WaqfDonationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="donor@noorpay.ng", password="StrongPass123", full_name="Donor",
        )
        self.user.set_pin("1234")
        self.user.save()
        Wallet.objects.create(user=self.user, balance=Decimal("10000.00"))
        self.client.force_authenticate(user=self.user)
        self.fund = WaqfFund.objects.create(name="Masjid Renovation Waqf", target_amount=Decimal("500000.00"))

    def test_donate_to_waqf_deducts_wallet_and_updates_raised_amount(self):
        response = self.client.post(reverse("community-waqf-donate"), {
            "fund_id": self.fund.id, "amount": "1000.00", "pin": "1234",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.fund.refresh_from_db()
        self.assertEqual(self.fund.raised_amount, Decimal("1000.00"))

        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance, Decimal("9000.00"))

    def test_donate_fails_with_wrong_pin(self):
        response = self.client.post(reverse("community-waqf-donate"), {
            "fund_id": self.fund.id, "amount": "1000.00", "pin": "0000",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_donate_fails_with_insufficient_balance(self):
        response = self.client.post(reverse("community-waqf-donate"), {
            "fund_id": self.fund.id, "amount": "50000.00", "pin": "1234",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ForumTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="poster@noorpay.ng", password="StrongPass123", full_name="Poster",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_post_and_reply(self):
        response = self.client.post(reverse("community-forum-create"), {
            "title": "Tips for saving as a student", "body": "Any advice?",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        post_id = response.data["id"]

        reply_response = self.client.post(reverse("community-forum-reply", args=[post_id]), {"body": "Great question!"})
        self.assertEqual(reply_response.status_code, status.HTTP_201_CREATED)

        detail = self.client.get(reverse("community-forum-detail", args=[post_id]))
        self.assertEqual(detail.data["reply_count"], 1)
