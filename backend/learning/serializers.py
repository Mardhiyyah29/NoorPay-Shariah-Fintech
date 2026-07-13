"""
learning/serializers.py
"""

from rest_framework import serializers

from .models import Article, Course, CourseEnrollment, FAQ


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["id", "title", "tag", "emoji", "body", "read_time_minutes", "created_at"]
        read_only_fields = fields


class ArticleListSerializer(serializers.ModelSerializer):
    """Lighter payload for list views — omits full body text."""

    class Meta:
        model = Article
        fields = ["id", "title", "tag", "emoji", "read_time_minutes", "created_at"]
        read_only_fields = fields


class CourseSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ["id", "title", "description", "total_lessons", "color_hex", "progress"]
        read_only_fields = fields

    def get_progress(self, obj):
        user = self.context["request"].user
        enrollment = obj.enrollments.filter(user=user).first()
        return enrollment.progress_percent if enrollment else 0


class MarkLessonCompleteSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "question", "answer", "order"]
        read_only_fields = fields
