"""
cards/serializers.py
"""

from decimal import Decimal

from rest_framework import serializers

from .models import VirtualCard, CardTransaction


class VirtualCardSerializer(serializers.ModelSerializer):
    masked_number = serializers.ReadOnlyField()
    available_to_spend = serializers.ReadOnlyField()

    class Meta:
        model = VirtualCard
        fields = [
            "id", "masked_number", "cardholder_name", "expiry_date", "is_frozen",
            "spending_limit", "amount_spent_this_period", "available_to_spend", "updated_at",
        ]
        read_only_fields = fields


class VirtualCardRevealSerializer(serializers.ModelSerializer):
    """Only returned when the user confirms their transaction PIN — see RevealCardView."""

    class Meta:
        model = VirtualCard
        fields = ["card_number", "cvv", "expiry_date", "cardholder_name"]
        read_only_fields = fields


class RevealCardSerializer(serializers.Serializer):
    pin = serializers.RegexField(regex=r"^\d{4}$")


class SetSpendingLimitSerializer(serializers.Serializer):
    limit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1000.00"))


class CardTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardTransaction
        fields = ["id", "merchant", "amount", "created_at"]
        read_only_fields = fields
