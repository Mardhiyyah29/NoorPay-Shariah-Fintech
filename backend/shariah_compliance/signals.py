"""
shariah_compliance/signals.py

Hooks the screening engine into the real data flow: every Transaction and
every QardHasanLoan application gets screened the moment it's created,
regardless of which app/view created it. This is what makes the module
"active" rather than something you'd only run manually for a demo.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="transactions.Transaction")
def screen_transaction_on_save(sender, instance, created, **kwargs):
    if not created:
        return
    from . import engine
    engine.screen_transaction(instance)


@receiver(post_save, sender="islamic_finance.QardHasanLoan")
def screen_qard_hasan_on_save(sender, instance, created, **kwargs):
    if not created:
        return
    from . import engine
    engine.screen_qard_hasan_application(instance)
