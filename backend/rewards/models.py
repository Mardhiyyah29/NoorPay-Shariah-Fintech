"""
rewards/models.py

Points and tier are already tracked directly on accounts.User (reward_points,
tier) with a full ledger in accounts.RewardLog (via User.add_points()) — this
app does NOT duplicate that. It only adds what accounts doesn't have: a
redemption catalog and a record of what a user has redeemed their points for.
"""

from django.conf import settings
from django.db import models


class RedemptionItem(models.Model):
    CATEGORY_CHOICES = [
        ("airtime", "Airtime"), ("data", "Data"), ("cashback", "Cashback"),
        ("transfer", "Transfer"), ("charity", "Charity"), ("service", "Service"), ("education", "Education"),
    ]

    title = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    points_cost = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} ({self.points_cost} pts)"


class RedemptionHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="redemptions")
    item = models.ForeignKey(RedemptionItem, on_delete=models.PROTECT, related_name="redemptions")
    points_spent = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.full_name} redeemed {self.item.title}"


# Points thresholds for each tier — mirrors accounts.User.update_tier() exactly,
# kept here only for computing "points needed for next tier" in the API response.
TIER_THRESHOLDS = [
    ("bronze", 0), ("silver", 1000), ("gold", 5000), ("platinum", 15000),
]
