from django.urls import path
from .views import (
    WaqfFundListView, WaqfDonateView,
    ForumPostListView, ForumPostDetailView, ForumPostCreateView, ForumReplyCreateView,
)

urlpatterns = [
    path("waqf/", WaqfFundListView.as_view(), name="community-waqf"),
    path("waqf/donate/", WaqfDonateView.as_view(), name="community-waqf-donate"),
    path("forum/", ForumPostListView.as_view(), name="community-forum-list"),
    path("forum/create/", ForumPostCreateView.as_view(), name="community-forum-create"),
    path("forum/<int:pk>/", ForumPostDetailView.as_view(), name="community-forum-detail"),
    path("forum/<int:pk>/reply/", ForumReplyCreateView.as_view(), name="community-forum-reply"),
]
