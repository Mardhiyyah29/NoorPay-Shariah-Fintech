"""
NoorPay - Accounts Models
Custom User model with Shari'ah-compliant financial tracking
"""
import uuid
import random
import string
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('is_verified', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    USER_TYPES = [
        ('student',      'Student'),
        ('professional', 'Working Professional'),
        ('entrepreneur', 'Entrepreneur / Business Owner'),
        ('family',       'Family / Individual'),
        ('ngo',          'NGO / Islamic Organization'),
    ]
    TIERS = [
        ('bronze',   'Bronze'),
        ('silver',   'Silver'),
        ('gold',     'Gold'),
        ('platinum', 'Platinum'),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email          = models.EmailField(unique=True)
    full_name      = models.CharField(max_length=150)
    phone          = models.CharField(max_length=20, blank=True)
    user_type      = models.CharField(max_length=20, choices=USER_TYPES, default='student')
    account_number = models.CharField(max_length=10, unique=True, blank=True)
    bvn            = models.CharField(max_length=11, blank=True)
    avatar         = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # Status
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_frozen   = models.BooleanField(default=False)

    # Shari'ah features
    tier          = models.CharField(max_length=10, choices=TIERS, default='bronze')
    reward_points = models.PositiveIntegerField(default=0)
    referral_code = models.CharField(max_length=12, unique=True, blank=True)
    referred_by   = models.ForeignKey('self', null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='referrals')

    # PIN (SHA-256 hashed)
    pin_hash = models.CharField(max_length=128, blank=True)

    # Preferences
    zakat_reminders = models.BooleanField(default=True)
    push_notifs     = models.BooleanField(default=True)
    biometric       = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    def save(self, *args, **kwargs):
        if not self.account_number:
            self.account_number = self._generate_account_number()
        if not self.referral_code:
            self.referral_code = self._generate_referral_code()
        super().save(*args, **kwargs)

    def _generate_account_number(self):
        while True:
            num = ''.join(random.choices(string.digits, k=10))
            if not User.objects.filter(account_number=num).exists():
                return num

    def _generate_referral_code(self):
        while True:
            code = 'AMAPA-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            if not User.objects.filter(referral_code=code).exists():
                return code

    def set_pin(self, raw_pin):
        from django.contrib.auth.hashers import make_password
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        from django.contrib.auth.hashers import check_password
        if not self.pin_hash:
            return False
        return check_password(raw_pin, self.pin_hash)

    def update_tier(self, save=True):
        pts = self.reward_points
        if   pts >= 15000: self.tier = 'platinum'
        elif pts >= 5000:  self.tier = 'gold'
        elif pts >= 1000:  self.tier = 'silver'
        else:              self.tier = 'bronze'
        if save:
            self.save(update_fields=['tier'])

    def add_points(self, points, reason=''):
        self.reward_points += points
        self.update_tier(save=False)
        self.save(update_fields=['reward_points', 'tier'])
        RewardLog.objects.create(user=self, points=points, reason=reason)


class OTPCode(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code       = models.CharField(max_length=6)
    purpose    = models.CharField(max_length=20, default='registration')
    is_used    = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'otp_codes'

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()


class UserSession(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    device     = models.CharField(max_length=200)
    location   = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_sessions'


class RewardLog(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reward_logs')
    points     = models.IntegerField()
    reason     = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reward_logs'
        ordering = ['-created_at']
