from rest_framework import serializers
from .models import Wallet, Beneficiary


class WalletSerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(source='user.account_number', read_only=True)
    full_name      = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model  = Wallet
        fields = ['id', 'balance', 'currency', 'is_active', 'account_number', 'full_name']


class BeneficiarySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Beneficiary
        fields = ['id', 'name', 'account_number', 'bank_name', 'bank_code', 'is_favourite', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_account_number(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Account number must be exactly 10 digits.")
        return value
