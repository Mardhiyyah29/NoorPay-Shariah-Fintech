"""
community/serializers.py
"""

from decimal import Decimal

from rest_framework import serializers

from .models import WaqfFund, WaqfDonation, ForumPost, ForumReply


class WaqfFundSerializer(serializers.ModelSerializer):
    progress_percent = serializers.ReadOnlyField()

    class Meta:
        model = WaqfFund
        fields = ["id", "name", "description", "emoji", "target_amount", "raised_amount", "progress_percent", "is_active"]
        read_only_fields = fields


class WaqfDonateSerializer(serializers.Serializer):
    fund_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("50.00"))
    pin = serializers.RegexField(regex=r"^\d{4}$")
    is_anonymous = serializers.BooleanField(required=False, default=False)


class ForumReplySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ForumReply
        fields = ["id", "full_name", "body", "created_at"]
        read_only_fields = ["id", "full_name", "created_at"]


class ForumPostListSerializer(serializers.ModelSerializer):
    reply_count = serializers.ReadOnlyField()
    is_hot = serializers.ReadOnlyField()
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ForumPost
        fields = ["id", "title", "full_name", "views", "reply_count", "is_hot", "created_at"]
        read_only_fields = fields


class ForumPostDetailSerializer(serializers.ModelSerializer):
    reply_count = serializers.ReadOnlyField()
    is_hot = serializers.ReadOnlyField()
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    replies = ForumReplySerializer(many=True, read_only=True)

    class Meta:
        model = ForumPost
        fields = ["id", "title", "body", "full_name", "views", "reply_count", "is_hot", "created_at", "replies"]
        read_only_fields = fields


class ForumPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumPost
        fields = ["id", "title", "body"]
        read_only_fields = ["id"]


class ForumReplyCreateSerializer(serializers.Serializer):
    body = serializers.CharField()
