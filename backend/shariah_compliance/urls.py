from django.urls import path
from .views import (
    ComplianceRuleListView, MyComplianceLogView, ScreenTextView, ComplianceDashboardView,
)

urlpatterns = [
    path("rules/", ComplianceRuleListView.as_view(), name="compliance-rules"),
    path("logs/", MyComplianceLogView.as_view(), name="compliance-logs"),
    path("screen-text/", ScreenTextView.as_view(), name="compliance-screen-text"),
    path("dashboard/", ComplianceDashboardView.as_view(), name="compliance-dashboard"),
]
