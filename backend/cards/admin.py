from django.contrib import admin

from .models import VirtualCard, CardTransaction


@admin.register(VirtualCard)
class VirtualCardAdmin(admin.ModelAdmin):
    list_display = ("user", "masked_number", "is_frozen", "spending_limit", "amount_spent_this_period")
    list_filter = ("is_frozen",)
    search_fields = ("user__full_name", "card_number")


@admin.register(CardTransaction)
class CardTransactionAdmin(admin.ModelAdmin):
    list_display = ("card", "merchant", "amount", "created_at")
    search_fields = ("card__user__full_name", "merchant")
