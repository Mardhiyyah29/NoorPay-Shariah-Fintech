from django.urls import path
from .views import (
    ArticleListView, ArticleDetailView, CourseListView,
    MarkLessonCompleteView, FAQListView,
)

urlpatterns = [
    path("articles/", ArticleListView.as_view(), name="learning-articles"),
    path("articles/<int:pk>/", ArticleDetailView.as_view(), name="learning-article-detail"),
    path("courses/", CourseListView.as_view(), name="learning-courses"),
    path("courses/complete-lesson/", MarkLessonCompleteView.as_view(), name="learning-complete-lesson"),
    path("faqs/", FAQListView.as_view(), name="learning-faqs"),
]
