from django.contrib import admin

from .models import Article, Course, CourseEnrollment, FAQ


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "tag", "read_time_minutes", "created_at")
    list_filter = ("tag",)
    search_fields = ("title", "body")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "total_lessons")


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "lessons_completed", "completed_at")
    list_filter = ("course",)


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ("question", "order")
    ordering = ("order",)
