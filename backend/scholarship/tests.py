from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import Scholarship


class ScholarshipTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="scholaruser@noorpay.ng", password="StrongPass123", full_name="Scholar User",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_scholarship_tracker_entry(self):
        response = self.client.post(reverse("scholarships"), {
            "name": "MTN Foundation Scholarship", "organization": "MTN Foundation",
            "amount": "₦200,000", "status": "applied",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Scholarship.objects.filter(user=self.user, name="MTN Foundation Scholarship").exists())

    def test_list_only_returns_own_scholarships(self):
        other = User.objects.create_user(email="scholarother@noorpay.ng", password="StrongPass123", full_name="Other")
        Scholarship.objects.create(user=self.user, name="Mine")
        Scholarship.objects.create(user=other, name="Not Mine")

        response = self.client.get(reverse("scholarships"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Mine")

    def test_update_status_and_progress(self):
        scholarship = Scholarship.objects.create(user=self.user, name="NNPC/Total Scholarship", status="applied", progress=30)
        response = self.client.patch(reverse("scholarship-detail", args=[scholarship.id]), {
            "status": "in_review", "progress": 60,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        scholarship.refresh_from_db()
        self.assertEqual(scholarship.status, "in_review")
        self.assertEqual(scholarship.progress, 60)

    def test_cannot_access_someone_elses_scholarship(self):
        other = User.objects.create_user(email="scholarother2@noorpay.ng", password="StrongPass123", full_name="Other 2")
        their_scholarship = Scholarship.objects.create(user=other, name="Theirs")
        response = self.client.get(reverse("scholarship-detail", args=[their_scholarship.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_scholarship(self):
        scholarship = Scholarship.objects.create(user=self.user, name="To Delete")
        response = self.client.delete(reverse("scholarship-detail", args=[scholarship.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Scholarship.objects.filter(id=scholarship.id).exists())
