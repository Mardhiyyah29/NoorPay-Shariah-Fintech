"""
community/views.py
"""

from django.db import transaction as db_transaction

from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView

from shariah_fintech_backend.throttles import PinCheckRateThrottle
from .models import WaqfFund, WaqfDonation, ForumPost, ForumReply
from .serializers import (
    WaqfFundSerializer, WaqfDonateSerializer,
    ForumPostListSerializer, ForumPostDetailSerializer,
    ForumPostCreateSerializer, ForumReplySerializer, ForumReplyCreateSerializer,
)


class WaqfFundListView(ListAPIView):
    """GET /api/community/waqf/ — active Waqf endowment funds."""

    serializer_class = WaqfFundSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = WaqfFund.objects.filter(is_active=True)


class WaqfDonateView(APIView):
    """
    POST /api/community/waqf/donate/
    Donate from the wallet toward a Waqf fund. Mirrors the exact pattern
    islamic_finance.donate_sadaqah uses: PIN check, wallet.debit(), and a
    Transaction record with type/category='sadaqah' (Waqf is a form of
    Sadaqah Jariyah — ongoing charity). No return is ever credited to the donor.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PinCheckRateThrottle]

    def post(self, request):
        serializer = WaqfDonateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if not request.user.check_pin(data["pin"]):
            return Response({"detail": "Incorrect PIN."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fund = WaqfFund.objects.get(id=data["fund_id"], is_active=True)
        except WaqfFund.DoesNotExist:
            return Response({"detail": "Waqf fund not found."}, status=status.HTTP_404_NOT_FOUND)

        wallet = request.user.wallet
        if wallet.balance < data["amount"]:
            return Response({"detail": "Insufficient balance."}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            wallet.debit(data["amount"])
            fund.raised_amount += data["amount"]
            fund.save()

            WaqfDonation.objects.create(
                user=request.user, fund=fund, amount=data["amount"],
                is_anonymous=data.get("is_anonymous", False),
            )

            from transactions.models import Transaction
            Transaction.objects.create(
                user=request.user, type="sadaqah", category="sadaqah",
                amount=data["amount"], description=f"Waqf contribution: {fund.name}",
            )

        return Response({"detail": "Waqf contribution recorded. JazakAllahu Khayran!"})


class ForumPostListView(ListAPIView):
    """GET /api/community/forum/ — all discussion threads."""

    serializer_class = ForumPostListSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ForumPost.objects.all()


class ForumPostDetailView(RetrieveAPIView):
    """GET /api/community/forum/<id>/ — a thread with all its replies. Increments the view count."""

    serializer_class = ForumPostDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ForumPost.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=["views"])
        return Response(self.get_serializer(instance).data)


class ForumPostCreateView(CreateAPIView):
    """POST /api/community/forum/create/ — start a new discussion."""

    serializer_class = ForumPostCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ForumReplyCreateView(APIView):
    """POST /api/community/forum/<id>/reply/ — reply to a discussion thread."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        serializer = ForumReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            post = ForumPost.objects.get(id=pk)
        except ForumPost.DoesNotExist:
            return Response({"error": "Discussion not found."}, status=status.HTTP_404_NOT_FOUND)

        reply = ForumReply.objects.create(post=post, user=request.user, body=serializer.validated_data["body"])
        return Response(ForumReplySerializer(reply).data, status=status.HTTP_201_CREATED)
