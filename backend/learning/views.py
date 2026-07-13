"""
learning/views.py
"""

from django.utils import timezone

from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination

from .models import Article, Course, CourseEnrollment, FAQ
from .serializers import (
    ArticleSerializer, ArticleListSerializer, CourseSerializer,
    MarkLessonCompleteSerializer, FAQSerializer,
)


class ArticlePagination(PageNumberPagination):
    page_size = 20


class ArticleListView(ListAPIView):
    """GET /api/learning/articles/?tag= — list articles, optionally filtered by tag."""

    serializer_class = ArticleListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ArticlePagination

    def get_queryset(self):
        qs = Article.objects.all()
        tag = self.request.query_params.get("tag")
        if tag:
            qs = qs.filter(tag=tag)
        return qs


class ArticleDetailView(RetrieveAPIView):
    """GET /api/learning/articles/<id>/ — full article body."""

    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated]


class CourseListView(ListAPIView):
    """GET /api/learning/courses/ — all courses with this user's progress attached."""

    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Course.objects.all()

    def get_serializer_context(self):
        return {"request": self.request}


class MarkLessonCompleteView(APIView):
    """POST /api/learning/courses/complete-lesson/ — advance the user's course progress by one lesson."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MarkLessonCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            course = Course.objects.get(id=serializer.validated_data["course_id"])
        except Course.DoesNotExist:
            return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        enrollment, _ = CourseEnrollment.objects.get_or_create(user=request.user, course=course)
        if enrollment.lessons_completed < course.total_lessons:
            enrollment.lessons_completed += 1
            if enrollment.lessons_completed >= course.total_lessons:
                enrollment.completed_at = timezone.now()

                # Award loyalty points for finishing a course (activity-based, not
                # balance-based) using the same points/tier system every other
                # app uses — accounts.User.add_points() logs to RewardLog and
                # recalculates tier automatically.
                request.user.add_points(100, reason=f"Completed course: {course.title}")
            enrollment.save()

        return Response({
            "course": course.title,
            "lessons_completed": enrollment.lessons_completed,
            "progress_percent": enrollment.progress_percent,
        })


class FAQListView(ListAPIView):
    """GET /api/learning/faqs/ — ordered list of FAQs."""

    serializer_class = FAQSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = FAQ.objects.all()
