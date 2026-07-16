from rest_framework import serializers
from .models import QardHasanLoan, SadaqahCampaign


class SadaqahCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = SadaqahCampaign
        fields = '__all__'


class QardHasanLoanSerializer(serializers.ModelSerializer):
    remaining_balance = serializers.SerializerMethodField()

    class Meta:
        model = QardHasanLoan
        fields = [
            'id', 'borrower', 'purpose', 'purpose_detail',
            'amount_requested', 'amount_approved', 'amount_repaid',
            'interest_rate', 'repayment_months', 'status',
            'created_at', 'approved_at', 'remaining_balance',
        ]
        read_only_fields = [
            'id', 'borrower', 'amount_approved', 'amount_repaid',
            'interest_rate', 'status', 'created_at', 'approved_at',
            'remaining_balance',
        ]

    def get_remaining_balance(self, obj):
        return obj.remaining_balance
