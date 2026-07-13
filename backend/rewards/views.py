"""
rewards/views.py
"""

from django.db import transaction as db_transaction

from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView

from accounts.models import RewardLog
from .models import RedemptionItem, RedemptionHistory, TIER_THRESHOLDS
from .serializers import (
    RewardLogSerializer,
    RedemptionItemSerializer,
    RedemptionHistorySerializer,
    RedeemSerializer,
)


def _next_tier_info(points):
    """Returns (next_tier_name_or_None, points_needed_or_0), mirroring
    accounts.User.update_tier()'s thresholds exactly."""
    for name, threshold in TIER_THRESHOLDS:
        if points < threshold:
            return name, threshold - points
    return None, 0


class RewardsOverviewView(APIView):
    """GET /api/rewards/ — points balance, current tier, and progress to next tier."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        next_tier, points_needed = _next_tier_info(user.reward_points)
        return Response({
            "points": user.reward_points,
            "tier": user.tier,
            "next_tier": next_tier,
            "points_to_next_tier": points_needed,
        })


class RewardHistoryView(ListAPIView):
    """GET /api/rewards/history/ — full points earn/redeem ledger, from accounts.RewardLog."""

    serializer_class = RewardLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RewardLog.objects.filter(user=self.request.user)


class RedemptionCatalogView(ListAPIView):
    """GET /api/rewards/catalog/ — items available to redeem points for."""

    serializer_class = RedemptionItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = RedemptionItem.objects.filter(is_active=True)


class RedeemView(APIView):
    """
    POST /api/rewards/redeem/ — spend points on a catalog item.
    Uses User.add_points() (with a negative value) so the deduction, the
    RewardLog entry, and the tier recalculation all happen the same way
    they do for every other point-earning action in the app.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RedeemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            item = RedemptionItem.objects.get(id=serializer.validated_data["item_id"], is_active=True)
        except RedemptionItem.DoesNotExist:
            return Response({"error": "Redemption item not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.reward_points < item.points_cost:
            return Response({"error": "Not enough points."}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            user.add_points(-item.points_cost, reason=f"Redeemed: {item.title}")
            history = RedemptionHistory.objects.create(user=user, item=item, points_spent=item.points_cost)

        return Response(RedemptionHistorySerializer(history).data, status=status.HTTP_201_CREATED)


class RedemptionHistoryListView(ListAPIView):
    """GET /api/rewards/redemptions/ — past redemptions."""

    serializer_class = RedemptionHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RedemptionHistory.objects.filter(user=self.request.user)
