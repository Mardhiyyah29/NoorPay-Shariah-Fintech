"""
cards/views.py
"""

from django.utils import timezone

from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import RetrieveAPIView, ListAPIView

from shariah_fintech_backend.throttles import PinCheckRateThrottle
from .models import VirtualCard, CardTransaction
from .serializers import (
    VirtualCardSerializer,
    VirtualCardRevealSerializer,
    RevealCardSerializer,
    SetSpendingLimitSerializer,
    CardTransactionSerializer,
)


def _get_or_create_card(user):
    card, _ = VirtualCard.objects.get_or_create(
        user=user, defaults={"cardholder_name": user.full_name or user.email}
    )
    return card


class VirtualCardDetailView(RetrieveAPIView):
    """GET /api/cards/ — masked card details (auto-provisions a card on first call)."""

    serializer_class = VirtualCardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return _get_or_create_card(self.request.user)


class RevealCardView(APIView):
    """
    POST /api/cards/reveal/
    Returns the full card number + CVV, but only after the transaction PIN
    is confirmed via the User model's own check_pin() — mirrors how real
    banking apps gate sensitive card data.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PinCheckRateThrottle]

    def post(self, request):
        serializer = RevealCardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.pin_hash or not user.check_pin(serializer.validated_data["pin"]):
            return Response({"error": "Incorrect transaction PIN."}, status=status.HTTP_400_BAD_REQUEST)

        card = _get_or_create_card(user)
        return Response(VirtualCardRevealSerializer(card).data)


class FreezeCardView(APIView):
    """POST /api/cards/freeze/ — toggle freeze on/off."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        card = _get_or_create_card(request.user)
        card.is_frozen = not card.is_frozen
        card.save()
        return Response(VirtualCardSerializer(card).data)


class SetSpendingLimitView(APIView):
    """POST /api/cards/set-limit/ — update the self-imposed spending limit."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SetSpendingLimitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        card = _get_or_create_card(request.user)
        card.spending_limit = serializer.validated_data["limit"]
        card.save()
        return Response(VirtualCardSerializer(card).data)


class CardTransactionListView(ListAPIView):
    """GET /api/cards/transactions/ — spend history against the card."""

    serializer_class = CardTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        card = _get_or_create_card(self.request.user)
        return CardTransaction.objects.filter(card=card)
