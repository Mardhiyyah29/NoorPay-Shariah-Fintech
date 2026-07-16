"""
shariah_fintech_backend/throttles.py

A dedicated, tighter rate limit for any endpoint that checks a transaction
PIN. A 4-digit PIN is only 10,000 combinations — without this, brute-forcing
it is trivial. Applied directly (not via throttle_scope) so it works
identically on both class-based views and function-based (@api_view) views.
"""

from rest_framework.throttling import UserRateThrottle


class PinCheckRateThrottle(UserRateThrottle):
    scope = "pin_check"
