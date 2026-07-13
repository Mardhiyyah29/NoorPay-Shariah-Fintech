"""NoorPay - Accounts Serializers"""
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, OTPCode
import random, re, string
from django.utils import timezone
from datetime import timedelta

OTP_LENGTH = 6
OTP_EXPIRES_MINUTES = 5
NIGERIAN_PHONE_RE = re.compile(r'^(?:0|234)\d{10}$')


def normalize_nigerian_phone(value):
    digits = re.sub(r'\D', '', value or '')
    if digits.startswith('234') and len(digits) == 13:
        digits = '0' + digits[3:]
    if digits.startswith('0') and len(digits) == 11:
        return digits
    raise serializers.ValidationError('Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.')


class RegisterStep1Serializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email     = serializers.EmailField()
    phone     = serializers.CharField(max_length=20)
    user_type = serializers.ChoiceField(choices=['student','professional','entrepreneur','family','ngo'], default='student')
    bvn       = serializers.CharField(max_length=11, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate_bvn(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError("BVN must be 11 digits.")
        return value

    def validate_phone(self, value):
        if value:
            return normalize_nigerian_phone(value)
        return value

    def create(self, validated_data):
        user = User.objects.create(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            user_type=validated_data.get('user_type', 'student'),
            bvn=validated_data.get('bvn', ''),
            is_active=True,
            is_verified=False,
        )
        # Generate OTP
        code = ''.join(random.choices(string.digits, k=OTP_LENGTH))
        OTPCode.objects.create(
            user=user, code=code, purpose='registration',
            expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRES_MINUTES)
        )
        return user, code


class VerifyOTPSerializer(serializers.Serializer):
    email   = serializers.EmailField()
    code    = serializers.CharField(min_length=OTP_LENGTH, max_length=OTP_LENGTH)
    purpose = serializers.CharField(default='registration')

    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        otp = OTPCode.objects.filter(
            user=user, code=data['code'],
            purpose=data['purpose'], is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid():
            raise serializers.ValidationError("Invalid or expired OTP code.")

        data['user'] = user
        data['otp']  = otp
        return data


class CompleteRegistrationSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    pin      = serializers.CharField(min_length=4, max_length=6, write_only=True)

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
            if not user.is_verified:
                raise serializers.ValidationError("Email not verified yet.")
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return value

    def save(self, **kwargs):
        email    = self.validated_data['email']
        password = self.validated_data['password']
        pin      = self.validated_data['pin']
        user     = User.objects.get(email=email)
        user.set_password(password)
        user.set_pin(pin)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_verified:
            raise serializers.ValidationError("Please verify your account first.")
        if user.is_frozen:
            raise serializers.ValidationError("Your account is frozen. Contact support.")
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            'id', 'email', 'full_name', 'phone', 'user_type',
            'account_number', 'avatar', 'is_verified', 'is_frozen',
            'tier', 'reward_points', 'referral_code',
            'zakat_reminders', 'push_notifs', 'biometric',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'account_number', 'tier', 'reward_points', 'referral_code']


class ChangePINSerializer(serializers.Serializer):
    current_pin = serializers.CharField(min_length=4, max_length=6)
    new_pin     = serializers.CharField(min_length=4, max_length=6)
    confirm_pin = serializers.CharField(min_length=4, max_length=6)

    def validate(self, data):
        user = self.context['request'].user
        if not user.check_pin(data['current_pin']):
            raise serializers.ValidationError({'current_pin': 'Incorrect PIN.'})
        if data['new_pin'] != data['confirm_pin']:
            raise serializers.ValidationError({'confirm_pin': 'PINs do not match.'})
        return data
