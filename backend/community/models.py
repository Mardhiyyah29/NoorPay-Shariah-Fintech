"""
community/models.py

NOTE: time-bound crowdfunding campaigns already exist as
islamic_finance.SadaqahCampaign / SadaqahDonation (exposed at
/api/islamic-finance/sadaqah/) — this app does not duplicate that. It adds
the two things the platform doesn't have yet: perpetual Waqf endowment funds,
and a community discussion forum.

Waqf donations, like Sadaqah, are voluntary contributions — no return is
ever promised or paid to the donor.
"""

from django.conf import settings
from django.db import models


class WaqfFund(models.Model):
    """A perpetual Islamic endowment fund (masjid construction, Quran printing, etc.)."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    emoji = models.CharField(max_length=8, default="🕌")
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    raised_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def progress_percent(self):
        if self.target_amount == 0:
            return 0
        return min(round((self.raised_amount / self.target_amount) * 100), 100)

    def __str__(self):
        return self.name


class WaqfDonation(models.Model):
    """A single contribution toward a WaqfFund."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="waqf_donations")
    fund = models.ForeignKey(WaqfFund, on_delete=models.CASCADE, related_name="donations")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.full_name} → {self.fund.name}: ₦{self.amount}"


class ForumPost(models.Model):
    """A community discussion thread on Islamic/personal finance topics."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_posts")
    title = models.CharField(max_length=255)
    body = models.TextField()
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def reply_count(self):
        return self.replies.count()

    @property
    def is_hot(self):
        return self.reply_count >= 20 or self.views >= 500

    def __str__(self):
        return self.title


class ForumReply(models.Model):
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name="replies")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_replies")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply by {self.user.full_name} on {self.post.title}"
