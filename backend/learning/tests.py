from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from .models import Article, Course, CourseEnrollment


class ArticleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="learner@noorpay.ng", password="StrongPass123", full_name="Learner",
        )
        self.client.force_authenticate(user=self.user)
        Article.objects.create(title="Understanding Zakat", tag="zakat", body="...", read_time_minutes=7)
        Article.objects.create(title="Why Riba is Forbidden", tag="islamic_finance", body="...", read_time_minutes=6)

    def test_list_articles(self):
        response = self.client.get(reverse("learning-articles"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_tag(self):
        response = self.client.get(reverse("learning-articles"), {"tag": "zakat"})
        self.assertEqual(response.data["count"], 1)


class CourseProgressTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="student@noorpay.ng", password="StrongPass123", full_name="Student",
        )
        self.client.force_authenticate(user=self.user)
        self.course = Course.objects.create(title="Islamic Finance Fundamentals", total_lessons=2)

    def test_completing_all_lessons_marks_course_complete_and_awards_points(self):
        self.client.post(reverse("learning-complete-lesson"), {"course_id": self.course.id})
        response = self.client.post(reverse("learning-complete-lesson"), {"course_id": self.course.id})
        self.assertEqual(response.data["progress_percent"], 100)

        enrollment = CourseEnrollment.objects.get(user=self.user, course=self.course)
        self.assertIsNotNone(enrollment.completed_at)

        self.user.refresh_from_db()
        self.assertEqual(self.user.reward_points, 100)
