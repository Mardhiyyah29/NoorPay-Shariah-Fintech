from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import User, OTPCode, RewardLog


class RegistrationFlowTests(TestCase):
    """Covers the real 3-step flow: register_step1 -> verify_otp -> complete_registration."""

    def setUp(self):
        self.client = APIClient()

    def test_step1_creates_user_and_otp(self):
        response = self.client.post(reverse("register-step1"), {
            "full_name": "Amina Yusuf", "email": "amina@noorpay.ng", "phone": "08012345678",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="amina@noorpay.ng").exists())
        self.assertTrue(OTPCode.objects.filter(user__email="amina@noorpay.ng").exists())

    def test_step1_rejects_duplicate_email(self):
        User.objects.create(email="dupe@noorpay.ng", full_name="Existing User")
        response = self.client.post(reverse("register-step1"), {
            "full_name": "New Person", "email": "dupe@noorpay.ng", "phone": "08000000000",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_full_registration_flow_ends_with_working_login(self):
        # Step 1
        step1 = self.client.post(reverse("register-step1"), {
            "full_name": "Bilal Ahmad", "email": "bilal@noorpay.ng", "phone": "08011112222",
        })
        # Tests should not rely on DEBUG-only fields. Prefer the model fallback when
        # the API does not return `otp_debug` (CI runs with DEBUG=False).
        if "otp_debug" in getattr(step1, 'data', {}):
            otp_code = step1.data["otp_debug"]
        else:
            otp_code = OTPCode.objects.filter(user__email="bilal@noorpay.ng").order_by('-created_at').first().code

        # Step 2
        step2 = self.client.post(reverse("verify-otp"), {"email": "bilal@noorpay.ng", "code": otp_code})
        self.assertEqual(step2.status_code, status.HTTP_200_OK)

        # Step 3
        step3 = self.client.post(reverse("register-complete"), {
            "email": "bilal@noorpay.ng", "password": "StrongPass123", "pin": "1234",
        })
        self.assertEqual(step3.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", step3.data)

        # A wallet should have been auto-created
        from wallet.models import Wallet
        self.assertTrue(Wallet.objects.filter(user__email="bilal@noorpay.ng").exists())

        # Login should now succeed
        login = self.client.post(reverse("login"), {"email": "bilal@noorpay.ng", "password": "StrongPass123"})
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)

    def test_verify_otp_rejects_wrong_code(self):
        self.client.post(reverse("register-step1"), {
            "full_name": "Chidi Okafor", "email": "chidi@noorpay.ng", "phone": "08022223333",
        })
        response = self.client.post(reverse("verify-otp"), {"email": "chidi@noorpay.ng", "code": "000000"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="verified@noorpay.ng", password="StrongPass123", full_name="Verified User",
        )
        self.user.is_verified = True
        self.user.save()

    def test_login_succeeds_for_verified_user(self):
        response = self.client.post(reverse("login"), {"email": "verified@noorpay.ng", "password": "StrongPass123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_fails_for_unverified_user(self):
        User.objects.create_user(email="unverified@noorpay.ng", password="StrongPass123", full_name="Unverified")
        response = self.client.post(reverse("login"), {"email": "unverified@noorpay.ng", "password": "StrongPass123"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_fails_for_frozen_account(self):
        self.user.is_frozen = True
        self.user.save()
        response = self.client.post(reverse("login"), {"email": "verified@noorpay.ng", "password": "StrongPass123"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_fails_with_wrong_password(self):
        response = self.client.post(reverse("login"), {"email": "verified@noorpay.ng", "password": "WrongPass"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="profile@noorpay.ng", password="StrongPass123", full_name="Profile User",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "profile@noorpay.ng")

    def test_account_number_and_referral_code_auto_generated(self):
        self.assertEqual(len(self.user.account_number), 10)
        self.assertTrue(self.user.referral_code.startswith("AMAPA-"))

    def test_patch_profile_updates_editable_fields(self):
        response = self.client.patch(reverse("profile"), {"phone": "08099998888"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "08099998888")

    def test_patch_cannot_override_readonly_tier(self):
        response = self.client.patch(reverse("profile"), {"tier": "platinum"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.tier, "bronze")  # unaffected — tier is read_only


class PinAndSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="pinuser@noorpay.ng", password="StrongPass123", full_name="Pin User",
        )
        self.user.set_pin("1234")
        self.user.save()
        self.client.force_authenticate(user=self.user)

    def test_pin_is_hashed_not_plaintext(self):
        self.assertNotEqual(self.user.pin_hash, "1234")
        self.assertTrue(self.user.check_pin("1234"))
        self.assertFalse(self.user.check_pin("0000"))

    def test_change_pin_requires_correct_current_pin(self):
        response = self.client.post(reverse("change-pin"), {
            "current_pin": "0000", "new_pin": "5678", "confirm_pin": "5678",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_pin_succeeds_with_correct_current_pin(self):
        response = self.client.post(reverse("change-pin"), {
            "current_pin": "1234", "new_pin": "5678", "confirm_pin": "5678",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_pin("5678"))

    def test_freeze_account_toggles(self):
        response = self.client.post(reverse("freeze-account"))
        self.assertTrue(response.data["is_frozen"])
        response = self.client.post(reverse("freeze-account"))
        self.assertFalse(response.data["is_frozen"])


class RewardTierTests(TestCase):
    """The tier system every other app (rewards, learning) builds on."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="tieruser@noorpay.ng", password="StrongPass123", full_name="Tier User",
        )

    def test_add_points_creates_log_and_updates_tier(self):
        self.user.add_points(1500, reason="Referral bonus")
        self.assertEqual(self.user.reward_points, 1500)
        self.assertEqual(self.user.tier, "silver")
        self.assertTrue(RewardLog.objects.filter(user=self.user, points=1500).exists())

    def test_tier_thresholds(self):
        cases = [(0, "bronze"), (999, "bronze"), (1000, "silver"), (5000, "gold"), (15000, "platinum")]
        for points, expected_tier in cases:
            self.user.reward_points = points
            self.user.update_tier()
            self.assertEqual(self.user.tier, expected_tier, f"{points} points should be {expected_tier}")
