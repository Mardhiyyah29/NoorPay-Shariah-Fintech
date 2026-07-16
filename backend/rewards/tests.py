from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import RedemptionItem


class RewardsOverviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="rewuser@noorpay.ng", password="StrongPass123", full_name="Reward User",
        )
        self.user.add_points(1200, reason="Referral bonus")
        self.client.force_authenticate(user=self.user)

    def test_overview_reports_correct_tier(self):
        response = self.client.get(reverse("rewards-overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["points"], 1200)
        self.assertEqual(response.data["tier"], "silver")


class RedemptionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="redeemuser@noorpay.ng", password="StrongPass123", full_name="Redeem User",
        )
        self.user.add_points(1000, reason="Loyalty bonus")
        self.client.force_authenticate(user=self.user)
        self.item = RedemptionItem.objects.create(title="₦500 Airtime", category="airtime", points_cost=500)

    def test_redeem_deducts_points(self):
        response = self.client.post(reverse("rewards-redeem"), {"item_id": self.item.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        overview = self.client.get(reverse("rewards-overview"))
        self.assertEqual(overview.data["points"], 500)

    def test_redeem_fails_with_insufficient_points(self):
        expensive = RedemptionItem.objects.create(title="Big Prize", category="cashback", points_cost=99999)
        response = self.client.post(reverse("rewards-redeem"), {"item_id": expensive.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
