from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import VirtualCard


class VirtualCardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="carduser@noorpay.ng", password="StrongPass123", full_name="Card User",
        )
        self.user.set_pin("1234")
        self.user.save()
        self.client.force_authenticate(user=self.user)

    def test_card_auto_provisions_on_first_access(self):
        response = self.client.get(reverse("card-detail"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(VirtualCard.objects.filter(user=self.user).exists())
        self.assertIn("••••", response.data["masked_number"])

    def test_reveal_requires_correct_pin(self):
        response = self.client.post(reverse("card-reveal"), {"pin": "0000"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(reverse("card-reveal"), {"pin": "1234"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("card_number", response.data)

    def test_freeze_toggles(self):
        response = self.client.post(reverse("card-freeze"))
        self.assertTrue(response.data["is_frozen"])
        response = self.client.post(reverse("card-freeze"))
        self.assertFalse(response.data["is_frozen"])

    def test_set_spending_limit(self):
        response = self.client.post(reverse("card-set-limit"), {"limit": "50000.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["spending_limit"]), Decimal("50000.00"))
