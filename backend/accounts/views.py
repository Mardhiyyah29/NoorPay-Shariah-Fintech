"""NoorPay - Accounts Views"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from datetime import timedelta
import random, string

from .models import User, OTPCode, UserSession
from django.conf import settings
from .serializers import (
    RegisterStep1Serializer, VerifyOTPSerializer,
    CompleteRegistrationSerializer, LoginSerializer,
    UserSerializer, ChangePINSerializer,
    OTP_LENGTH, OTP_EXPIRES_MINUTES,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_step1(request):
    """Step 1: Submit personal info → sends OTP"""
    s = RegisterStep1Serializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=400)
    user, code = s.create(s.validated_data)
    # In production: send SMS via Termii/Twilio
    if settings.DEBUG:
        print(f"[DEV] OTP for {user.email}: {code}")
    resp = {'detail': f'OTP sent to {user.phone or user.email}', 'email': user.email}
    if settings.DEBUG:
        resp['otp_debug'] = code
    return Response(resp, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """Step 2: Verify OTP"""
    s = VerifyOTPSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=400)
    user = s.validated_data['user']
    otp  = s.validated_data['otp']
    otp.is_used = True
    otp.save()
    user.is_verified = True
    user.save(update_fields=['is_verified'])
    return Response({'detail': 'Phone verified successfully.', 'email': user.email})


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    """Resend OTP code"""
    email = request.data.get('email', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)
    code = ''.join(random.choices(string.digits, k=OTP_LENGTH))
    OTPCode.objects.create(
        user=user, code=code, purpose='registration',
        expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRES_MINUTES)
    )
    if settings.DEBUG:
        print(f"[DEV] Resent OTP for {email}: {code}")
    resp = {'detail': 'OTP resent.'}
    if settings.DEBUG:
        resp['otp_debug'] = code
    return Response(resp)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Start password reset by email"""
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'Email is required.'}, status=400)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'detail': 'If an account with that email exists, password reset instructions have been sent.'})

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    if settings.DEBUG:
        print(f"[DEV] Password reset for {user.email}: uid={uid}, token={token}")

    resp = {'detail': 'Password reset instructions have been sent.'}
    if settings.DEBUG:
        resp['reset_debug'] = {'uid': uid, 'token': token}
    return Response(resp)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password with uid and token"""
    uid = request.data.get('uid', '')
    token = request.data.get('token', '')
    password = request.data.get('password', '')
    if not uid or not token or not password:
        return Response({'detail': 'UID, token and password are required.'}, status=400)
    if len(password) < 8:
        return Response({'detail': 'Password must be at least 8 characters long.'}, status=400)
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'detail': 'Invalid reset link.'}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'Invalid or expired reset token.'}, status=400)
    user.set_password(password)
    user.save()
    return Response({'detail': 'Password has been reset successfully.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def complete_registration(request):
    """Step 3: Set password and PIN"""
    s = CompleteRegistrationSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=400)
    user = s.save()
    # Create wallet automatically
    from wallet.models import Wallet
    Wallet.objects.get_or_create(user=user)
    refresh = RefreshToken.for_user(user)
    return Response({
        'detail': 'Account created successfully.',
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    UserSerializer(user).data,
    }, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with email and password"""
    s = LoginSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=401)
    user = s.validated_data['user']
    # Create wallet if missing
    from wallet.models import Wallet
    Wallet.objects.get_or_create(user=user)
    # Log session
    UserSession.objects.create(
        user=user,
        device=request.META.get('HTTP_USER_AGENT', 'Unknown')[:200],
        ip_address=request.META.get('REMOTE_ADDR'),
    )
    refresh = RefreshToken.for_user(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Blacklist refresh token"""
    try:
        token = RefreshToken(request.data.get('refresh'))
        token.blacklist()
    except (TokenError, Exception):
        pass
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get or update user profile"""
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    s = UserSerializer(request.user, data=request.data, partial=True)
    if not s.is_valid():
        return Response(s.errors, status=400)
    s.save()
    return Response(s.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_pin(request):
    """Change transaction PIN"""
    s = ChangePINSerializer(data=request.data, context={'request': request})
    if not s.is_valid():
        return Response(s.errors, status=400)
    request.user.set_pin(s.validated_data['new_pin'])
    request.user.save(update_fields=['pin_hash'])
    return Response({'detail': 'PIN changed successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_biometric(request):
    """Toggle biometric login"""
    user = request.user
    user.biometric = not user.biometric
    user.save(update_fields=['biometric'])
    return Response({'biometric': user.biometric})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def freeze_account(request):
    """Freeze or unfreeze account"""
    user = request.user
    user.is_frozen = not user.is_frozen
    user.save(update_fields=['is_frozen'])
    return Response({
        'is_frozen': user.is_frozen,
        'detail':    f'Account {"frozen" if user.is_frozen else "unfrozen"}.',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sessions(request):
    """List active sessions"""
    from .serializers import UserSerializer
    sess = UserSession.objects.filter(user=request.user, is_active=True).order_by('-last_seen')
    data = [{
        'id':         str(s.id),
        'device':     s.device,
        'location':   s.location or 'Unknown',
        'last_seen':  s.last_seen,
        'created_at': s.created_at,
    } for s in sess]
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def end_session(request, session_id):
    """Terminate a specific session"""
    try:
        sess = UserSession.objects.get(id=session_id, user=request.user)
        sess.is_active = False
        sess.save()
        return Response({'detail': 'Session terminated.'})
    except UserSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def end_all_sessions(request):
    """Terminate all other sessions"""
    UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
    return Response({'detail': 'All sessions terminated.'})



@api_view(['POST'])
@permission_classes([AllowAny])
def test_create_user(request):
    """Create a test user quickly (DEBUG-only).

    This endpoint exists to help CI/e2e smoke runs create a known user without
    going through OTP flows. It is only available when `settings.DEBUG` is True.
    """
    if not settings.DEBUG:
        return Response({'detail': 'Not available.'}, status=404)
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    full_name = request.data.get('full_name') or 'CI Tester'
    if not email or not password:
        return Response({'detail': 'email and password required.'}, status=400)
    user, created = User.objects.get_or_create(email=email, defaults={'full_name': full_name})
    user.set_password(password)
    user.is_verified = True
    user.save()
    refresh = RefreshToken.for_user(user)
    return Response({'email': user.email, 'access': str(refresh.access_token), 'refresh': str(refresh)})
