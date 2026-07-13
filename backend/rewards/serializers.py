from rest_framework import serializers
from .models import RedemptionItem, RedemptionHistory
from accounts.models import RewardLog


class RewardLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardLog
        fields = '__all__'


class RedemptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RedemptionItem
        fields = '__all__'


class RedemptionHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RedemptionHistory
        fields = '__all__'


class RedeemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
