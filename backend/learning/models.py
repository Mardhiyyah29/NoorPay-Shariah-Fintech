"""
learning/models.py
Financial Literacy Centre: articles, courses (with per-user progress), and FAQs.
"""

from django.conf import settings
from django.db import models


class Article(models.Model):
    TAG_CHOICES = [
        ("islamic_finance", "Islamic Finance"), ("zakat", "Zakat"),
        ("education", "Education"), ("budgeting", "Budgeting"),
        ("debt_management", "Debt Management"), ("investing", "Investing"),
    ]

    title = models.CharField(max_length=200)
    tag = models.CharField(max_length=30, choices=TAG_CHOICES)
    emoji = models.CharField(max_length=8, default="📖")
    body = models.TextField()
    read_time_minutes = models.PositiveSmallIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Course(models.Model):
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    total_lessons = models.PositiveSmallIntegerField(default=1)
    color_hex = models.CharField(max_length=7, default="#0F5132")

    def __str__(self):
        return self.title


class CourseEnrollment(models.Model):
    """Tracks a user's progress through a course (lessons completed)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    lessons_completed = models.PositiveSmallIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "course")

    @property
    def progress_percent(self):
        if self.course.total_lessons == 0:
            return 0
        return min(round((self.lessons_completed / self.course.total_lessons) * 100), 100)

    def __str__(self):
        return f"{self.user.full_name} — {self.course.title} ({self.progress_percent}%)"


class FAQ(models.Model):
    question = models.CharField(max_length=255)
    answer = models.TextField()
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.question
