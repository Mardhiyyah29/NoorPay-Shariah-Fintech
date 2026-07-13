from django.contrib import admin

from .models import WaqfFund, WaqfDonation, ForumPost, ForumReply


@admin.register(WaqfFund)
class WaqfFundAdmin(admin.ModelAdmin):
    list_display = ("name", "target_amount", "raised_amount", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(WaqfDonation)
class WaqfDonationAdmin(admin.ModelAdmin):
    list_display = ("user", "fund", "amount", "is_anonymous", "created_at")
    search_fields = ("user__full_name", "user__email")


class ForumReplyInline(admin.TabularInline):
    model = ForumReply
    extra = 0
    readonly_fields = ("user", "body", "created_at")


@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "views", "created_at")
    search_fields = ("title", "user__full_name")
    inlines = [ForumReplyInline]
