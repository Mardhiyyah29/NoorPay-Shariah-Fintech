from django.apps import AppConfig


class ShariahComplianceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "shariah_compliance"
    verbose_name = "Shari'ah Compliance Screening"

    def ready(self):
        import shariah_compliance.signals  # noqa: F401 — registers the auto-screening hooks
