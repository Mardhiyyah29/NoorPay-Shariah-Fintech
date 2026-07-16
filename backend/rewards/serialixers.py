"""
rewards/serializers.py
"""

from rest_framework import serializers

from accounts.models import RewardLog
from .models import RedemptionItem, RedemptionHistory


class RewardLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardLog
        fields = ["id", "points", "reason", "created_at"]
        read_only_fields = fields


class RedemptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RedemptionItem
        fields = ["id", "title", "category", "points_cost", "is_active"]
        read_only_fields = fields


class RedemptionHistorySerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source="item.title", read_only=True)

    class Meta:
        model = RedemptionHistory
        fields = ["id", "item_title", "points_spent", "created_at"]
        read_only_fields = fields


class RedeemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
