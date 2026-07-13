from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPCode, UserSession, RewardLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'full_name', 'user_type', 'tier', 'reward_points', 'is_verified', 'created_at']
    list_filter   = ['user_type', 'tier', 'is_verified', 'is_frozen']
    search_fields = ['email', 'full_name', 'account_number', 'phone']
    ordering      = ['-created_at']
    readonly_fields = ['account_number', 'referral_code', 'created_at', 'updated_at']

    fieldsets = (
        ('Login Info',   {'fields': ('email', 'password')}),
        ('Personal',     {'fields': ('full_name', 'phone', 'avatar', 'user_type', 'bvn')}),
        ('Account',      {'fields': ('account_number', 'referral_code', 'referred_by')}),
        ('Status',       {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified', 'is_frozen')}),
        ('Rewards',      {'fields': ('tier', 'reward_points')}),
        ('Security',     {'fields': ('pin_hash', 'biometric')}),
        ('Preferences',  {'fields': ('zakat_reminders', 'push_notifs')}),
        ('Timestamps',   {'fields': ('created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'password1', 'password2')}),
    )


@admin.register(OTPCode)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'purpose', 'is_used', 'expires_at']
    list_filter  = ['purpose', 'is_used']


@admin.register(UserSession)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'device', 'ip_address', 'is_active', 'last_seen']
    list_filter  = ['is_active']


admin.site.site_header = "NoorPay Admin — Shari'ah-Compliant Finance"
admin.site.site_title  = "NoorPay"
admin.site.index_title = "Platform Administration"
