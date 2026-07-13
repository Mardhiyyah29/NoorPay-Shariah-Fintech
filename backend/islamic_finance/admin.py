from django.contrib import admin

from .models import ZakatRecord, SadaqahCampaign, SadaqahDonation, QardHasanLoan


@admin.register(ZakatRecord)
class ZakatRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "zakat_amount", "is_paid", "paid_at", "created_at")
    list_filter = ("is_paid",)
    search_fields = ("user__full_name", "user__email")


@admin.register(SadaqahCampaign)
class SadaqahCampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "target_amount", "raised_amount", "is_urgent", "is_active")
    list_filter = ("is_urgent", "is_active")
    search_fields = ("title", "organization")


@admin.register(SadaqahDonation)
class SadaqahDonationAdmin(admin.ModelAdmin):
    list_display = ("user", "campaign", "amount", "is_anonymous", "created_at")
    search_fields = ("user__full_name",)


@admin.register(QardHasanLoan)
class QardHasanLoanAdmin(admin.ModelAdmin):
    """
    This is currently the ONLY interface that can move a loan from
    'pending' to 'approved' — there is no approval API endpoint (see the
    new approve_qard/reject_qard views for that). Without this admin
    registration, no Qard Hasan loan could ever be approved anywhere.
    """
    list_display = ("borrower", "amount_requested", "amount_approved", "status", "created_at")
    list_filter = ("status", "purpose")
    search_fields = ("borrower__full_name", "borrower__email")
    readonly_fields = ("interest_rate",)  # always 0 — enforced in Model.save(), not editable here
