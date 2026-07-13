from django.urls import path
from .views import (
    RewardsOverviewView, RewardHistoryView, RedemptionCatalogView,
    RedeemView, RedemptionHistoryListView,
)

urlpatterns = [
    path("", RewardsOverviewView.as_view(), name="rewards-overview"),
    path("history/", RewardHistoryView.as_view(), name="rewards-history"),
    path("catalog/", RedemptionCatalogView.as_view(), name="rewards-catalog"),
    path("redeem/", RedeemView.as_view(), name="rewards-redeem"),
    path("redemptions/", RedemptionHistoryListView.as_view(), name="rewards-redemptions"),
]
