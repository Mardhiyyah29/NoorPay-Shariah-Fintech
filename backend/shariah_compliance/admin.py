from django.contrib import admin

from .models import ComplianceRule, ComplianceCheckLog


@admin.register(ComplianceRule)
class ComplianceRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "severity", "is_active", "created_at")
    list_filter = ("category", "severity", "is_active")
    search_fields = ("name", "keywords")


@admin.register(ComplianceCheckLog)
class ComplianceCheckLogAdmin(admin.ModelAdmin):
    list_display = ("source", "user", "verdict", "created_at")
    list_filter = ("verdict", "source")
    search_fields = ("user__full_name", "user__email", "text_checked")
    readonly_fields = ("source", "source_id", "text_checked", "verdict", "matched_rules", "user", "created_at")
