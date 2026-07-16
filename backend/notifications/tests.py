from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import Notification


class NotificationListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="notifuser@noorpay.ng", password="StrongPass123", full_name="Notif User",
        )
        self.client.force_authenticate(user=self.user)
        Notification.objects.create(user=self.user, type="zakat", title="Zakat due", body="...", is_read=False)
        Notification.objects.create(user=self.user, type="reward", title="Points earned", body="...", is_read=True)

    def test_list_returns_only_own_notifications(self):
        other = User.objects.create_user(email="notifother@noorpay.ng", password="StrongPass123", full_name="Other")
        Notification.objects.create(user=other, type="system", title="Not mine", body="...")

        response = self.client.get(reverse("notifications"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_unread_filter(self):
        response = self.client.get(reverse("notifications"), {"unread": "1"})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Zakat due")

    def test_unread_count(self):
        response = self.client.get(reverse("unread-count"))
        self.assertEqual(response.data["unread_count"], 1)


class NotificationActionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="notifaction@noorpay.ng", password="StrongPass123", full_name="Notif Action User",
        )
        self.client.force_authenticate(user=self.user)
        self.notif = Notification.objects.create(user=self.user, type="budget", title="Over budget", body="...")

    def test_mark_read(self):
        response = self.client.patch(reverse("mark-read", args=[self.notif.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_mark_all_read(self):
        Notification.objects.create(user=self.user, type="savings", title="Goal reached", body="...")
        response = self.client.post(reverse("mark-all-read"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)

    def test_delete_notification(self):
        response = self.client.delete(reverse("delete-notif", args=[self.notif.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(id=self.notif.id).exists())

    def test_cannot_mark_read_someone_elses_notification(self):
        other = User.objects.create_user(email="notifother2@noorpay.ng", password="StrongPass123", full_name="Other 2")
        their_notif = Notification.objects.create(user=other, type="system", title="Theirs", body="...")
        response = self.client.patch(reverse("mark-read", args=[their_notif.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
