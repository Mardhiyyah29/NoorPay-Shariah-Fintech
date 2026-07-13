"""
shariah_compliance/engine.py

The screening engine. Two layers of detection:

1. STRUCTURAL checks — inspecting numeric/schema-level fields directly
   (e.g. an interest_rate that somehow isn't zero, a fee charged on a
   Qard Hasan repayment). These catch violations no amount of keyword
   matching would.
2. TEXTUAL checks — keyword/phrase matching against free-text fields
   (description, note, purpose_detail) using the ComplianceRule registry,
   for Riba, Gharar, and Maysir language patterns.

Every call logs its result via ComplianceCheckLog — see log_result().
"""

from decimal import Decimal

from .models import ComplianceRule, ComplianceCheckLog


def _matching_rules(text, category=None):
    """Returns the list of active ComplianceRule objects whose keywords appear in `text`."""
    if not text:
        return []
    text_lower = text.lower()
    qs = ComplianceRule.objects.filter(is_active=True)
    if category:
        qs = qs.filter(category=category)

    matched = []
    for rule in qs:
        if any(keyword in text_lower for keyword in rule.keyword_list()):
            matched.append(rule)
    return matched


def log_result(user, source, source_id, text_checked, matched_rules):
    verdict = "compliant"
    if matched_rules:
        verdict = "blocked" if any(r.severity == "block" for r in matched_rules) else "flagged"

    log = ComplianceCheckLog.objects.create(
        user=user, source=source, source_id=str(source_id),
        text_checked=text_checked[:2000], verdict=verdict,
    )
    if matched_rules:
        log.matched_rules.set(matched_rules)
    return log


def screen_text(text, user=None, source="manual", source_id=""):
    """
    Screen an arbitrary piece of text against all three categories.
    This is what powers the live "type something and watch it get flagged"
    demo endpoint — POST /api/compliance/screen-text/.
    """
    matched = _matching_rules(text)
    log = log_result(user, source, source_id, text, matched)
    return {
        "verdict": log.verdict,
        "matched_rules": [
            {"category": r.category, "name": r.name, "severity": r.severity} for r in matched
        ],
    }


def screen_transaction(transaction):
    """
    STRUCTURAL: a Qard Hasan transaction must never carry a fee — any fee
    on type='qard' is itself a Riba violation, regardless of wording.
    TEXTUAL: description + note are screened for Riba/Gharar/Maysir language.
    """
    matched = []

    if transaction.type == "qard" and transaction.fee and transaction.fee > Decimal("0.00"):
        riba_fee_rule, _ = ComplianceRule.objects.get_or_create(
            category="riba", name="Fee charged on Qard Hasan transaction",
            defaults={"keywords": "", "severity": "block"},
        )
        matched.append(riba_fee_rule)

    combined_text = f"{transaction.description} {transaction.note}".strip()
    matched += _matching_rules(combined_text)

    return log_result(
        user=transaction.user, source="transaction", source_id=str(transaction.id),
        text_checked=combined_text, matched_rules=matched,
    )


def screen_qard_hasan_application(loan):
    """
    STRUCTURAL: interest_rate must be exactly 0 — QardHasanLoan.save()
    already enforces this, but this is an independent, active re-check
    (the whole point of a "detection module" is that it doesn't just
    trust the rest of the system).
    TEXTUAL: purpose_detail is screened for Gharar (vague/speculative
    intent — e.g. "invest in crypto", "forex trading") and Maysir
    (gambling-adjacent purposes).
    """
    matched = []

    if loan.interest_rate and loan.interest_rate != Decimal("0.0000"):
        riba_rule, _ = ComplianceRule.objects.get_or_create(
            category="riba", name="Non-zero interest rate on Qard Hasan loan",
            defaults={"keywords": "", "severity": "block"},
        )
        matched.append(riba_rule)

    matched += _matching_rules(loan.purpose_detail, category="gharar")
    matched += _matching_rules(loan.purpose_detail, category="maysir")

    return log_result(
        user=loan.borrower, source="qard_hasan_application", source_id=str(loan.id),
        text_checked=loan.purpose_detail, matched_rules=matched,
    )
