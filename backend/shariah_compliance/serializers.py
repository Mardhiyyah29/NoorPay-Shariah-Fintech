"""
shariah_compliance/serializers.py
"""

from rest_framework import serializers

from .models import ComplianceRule, ComplianceCheckLog


class ComplianceRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceRule
        fields = ["id", "category", "name", "severity", "is_active"]
        read_only_fields = fields


class ComplianceCheckLogSerializer(serializers.ModelSerializer):
    matched_rule_names = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceCheckLog
        fields = ["id", "source", "verdict", "matched_rule_names", "created_at"]
        read_only_fields = fields

    def get_matched_rule_names(self, obj):
        return [f"{r.get_category_display()}: {r.name}" for r in obj.matched_rules.all()]


class ScreenTextSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000)
