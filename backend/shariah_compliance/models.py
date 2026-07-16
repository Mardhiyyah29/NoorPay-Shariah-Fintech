"""
shariah_compliance/models.py

An active screening layer, distinct from "compliance by construction"
elsewhere in the app (e.g. QardHasanLoan.interest_rate being hardcoded to
zero). This module actively inspects real data — transaction descriptions,
fees, loan applications — against a rule registry for the three classical
categories of prohibited financial elements:

  - Riba    (interest / usury)
  - Gharar  (excessive uncertainty / speculative, undefined-outcome deals)
  - Maysir  (gambling / games of pure chance)

Every screening run is logged to ComplianceCheckLog, which is what makes
objective 8 ("evaluate ethical compliance performance") a real, computable
number instead of a claimed one — see views.ComplianceDashboardView.
"""

from django.conf import settings
from django.db import models


class ComplianceRule(models.Model):
    """
    A single screening rule. Stored in the DB (not hardcoded in Python) so
    new prohibited patterns can be added by an admin without a code deploy —
    this is itself part of the "detection module" requirement: the system
    can be extended to catch new Riba/Gharar/Maysir patterns over time.
    """

    CATEGORY_CHOICES = [
        ("riba", "Riba (Interest/Usury)"),
        ("gharar", "Gharar (Excessive Uncertainty)"),
        ("maysir", "Maysir (Gambling)"),
    ]
    SEVERITY_CHOICES = [
        ("block", "Block — reject the action entirely"),
        ("flag", "Flag — allow but log for review"),
    ]

    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=100)
    # Comma-separated keywords/phrases matched case-insensitively against
    # free-text fields (description, note, purpose_detail, etc).
    keywords = models.TextField(
        help_text="Comma-separated keywords or phrases, matched case-insensitively."
    )
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="flag")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["category", "name"]

    def keyword_list(self):
        return [k.strip().lower() for k in self.keywords.split(",") if k.strip()]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.name}"


class ComplianceCheckLog(models.Model):
    """
    An audit trail entry for a single screening run. `source` identifies
    what was screened (e.g. 'transaction', 'qard_hasan_application',
    'manual'), so this table doubles as evidence for both objective 6
    (the detection module ran) and objective 8 (aggregate compliance rate).
    """

    VERDICT_CHOICES = [
        ("compliant", "Compliant"),
        ("flagged", "Flagged"),
        ("blocked", "Blocked"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="compliance_checks", null=True, blank=True,
    )
    source = models.CharField(max_length=50)
    source_id = models.CharField(max_length=64, blank=True)
    text_checked = models.TextField()
    verdict = models.CharField(max_length=10, choices=VERDICT_CHOICES)
    matched_rules = models.ManyToManyField(ComplianceRule, blank=True, related_name="matches")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.source} — {self.verdict} ({self.created_at:%Y-%m-%d %H:%M})"
