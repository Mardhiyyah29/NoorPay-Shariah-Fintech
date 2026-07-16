"""
Run once after migration to populate the default compliance rule registry:
    python manage.py shell -c "from shariah_compliance.seed_rules import seed; seed()"
"""

from .models import ComplianceRule

DEFAULT_RULES = [
    ("riba", "Interest / usury language", "block",
     "interest rate, compound interest, apr, apy, usury, loan interest, interest-bearing"),
    ("riba", "Late payment penalty fee", "block",
     "late fee, penalty interest, overdue charge, default interest"),
    ("gharar", "Guaranteed-return / risk-free language", "flag",
     "guaranteed return, guaranteed profit, risk-free, no-risk, double your money, fixed high returns"),
    ("gharar", "Speculative / undefined-outcome instruments", "flag",
     "binary option, forex signal, crypto pump, futures contract, day trading tips, pyramid scheme, ponzi"),
    ("maysir", "Gambling / games of chance", "block",
     "bet, betting, gamble, gambling, casino, lottery, lotto, wager, stake, jackpot, odds, slot machine"),
]


def seed():
    created = 0
    for category, name, severity, keywords in DEFAULT_RULES:
        _, was_created = ComplianceRule.objects.get_or_create(
            category=category, name=name,
            defaults={"severity": severity, "keywords": keywords, "is_active": True},
        )
        created += int(was_created)
    print(f"Seeded {created} new compliance rules ({ComplianceRule.objects.count()} total).")
