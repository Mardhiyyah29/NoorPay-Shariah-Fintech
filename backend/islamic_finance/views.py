from decimal import Decimal
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status

from .models import QardHasanLoan, SadaqahCampaign, SadaqahDonation, ZakatRecord
from wallet.models import Wallet
from .serializers import QardHasanLoanSerializer, SadaqahCampaignSerializer


def _parse_decimal(value, default=Decimal('0')):
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        return default


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_zakat(request):
    cash_savings = _parse_decimal(request.data.get('cash_savings', '0'))
    gold_grams = _parse_decimal(request.data.get('gold_grams', '0'))
    liabilities = _parse_decimal(request.data.get('liabilities', '0'))

    gold_price = _parse_decimal(getattr(settings, 'GOLD_PRICE_PER_GRAM', '0'))
    nisab_value = _parse_decimal(getattr(settings, 'NISAB_VALUE', '0'))
    zakat_rate = _parse_decimal(getattr(settings, 'ZAKAT_RATE', '0.025'))

    gold_value = gold_grams * gold_price
    zakatable_wealth = max(cash_savings + gold_value - liabilities, Decimal('0'))
    is_eligible = zakatable_wealth >= nisab_value
    zakat_due = (zakatable_wealth * zakat_rate).quantize(Decimal('0.01')) if is_eligible else Decimal('0.00')

    return Response({
        'is_eligible': is_eligible,
        'zakatable_wealth': zakatable_wealth,
        'zakat_due': zakat_due,
        'nisab_value': nisab_value,
        'gold_value': gold_value,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_zakat(request):
    pin = request.data.get('pin', '')
    amount = _parse_decimal(request.data.get('amount', '0'))

    if not request.user.check_pin(pin):
        return Response({'error': 'Invalid PIN.'}, status=status.HTTP_400_BAD_REQUEST)
    if amount <= 0:
        return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

    wallet = request.user.wallet
    if wallet.balance < amount:
        return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

    wallet.debit(amount)
    points_awarded = int(amount / Decimal('250'))
    if points_awarded > 0:
        request.user.add_points(points_awarded, reason=f'Paid zakat: ₦{amount}')

    ZakatRecord.objects.create(
        user=request.user,
        cash_savings=Decimal('0'),
        gold_grams=Decimal('0'),
        liabilities=Decimal('0'),
        nisab_used=Decimal('0'),
        zakat_amount=amount,
        is_paid=True,
    )

    return Response({'detail': 'Zakat payment recorded.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_campaigns(request):
    qs = SadaqahCampaign.objects.filter(is_active=True)
    return Response(SadaqahCampaignSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def donate_sadaqah(request):
    pin = request.data.get('pin', '')
    amount = _parse_decimal(request.data.get('amount', '0'))
    campaign_id = request.data.get('campaign_id')

    if not request.user.check_pin(pin):
        return Response({'error': 'Invalid PIN.'}, status=status.HTTP_400_BAD_REQUEST)
    if amount <= 0:
        return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

    campaign = SadaqahCampaign.objects.filter(id=campaign_id, is_active=True).first()
    if campaign is None:
        return Response({'error': 'Campaign not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        wallet = Wallet.objects.get(user=request.user)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found.'}, status=status.HTTP_400_BAD_REQUEST)

    if wallet.balance < amount:
        return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet.debit(amount)
    except ValueError:
        return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

    campaign.raised_amount += amount
    campaign.save(update_fields=['raised_amount'])
    SadaqahDonation.objects.create(user=request.user, campaign=campaign, amount=amount)

    return Response({'detail': 'Donation received.'}, status=status.HTTP_200_OK)


class QardList(generics.ListCreateAPIView):
    queryset = QardHasanLoan.objects.all()
    serializer_class = QardHasanLoanSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(borrower=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def repay_qard(request, pk):
    loan = get_object_or_404(QardHasanLoan, pk=pk)
    if request.user != loan.borrower:
        return Response({'detail': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)

    pin = request.data.get('pin', '')
    amount = _parse_decimal(request.data.get('amount', '0'))
    if not request.user.check_pin(pin):
        return Response({'error': 'Invalid PIN.'}, status=status.HTTP_400_BAD_REQUEST)
    if amount <= 0 or amount > loan.remaining_balance:
        return Response({'error': 'Invalid repayment amount.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = Wallet.objects.get(user=request.user)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found.'}, status=status.HTTP_400_BAD_REQUEST)

    if wallet.balance < amount:
        return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet.debit(amount)
    except ValueError:
        return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

    loan.amount_repaid += amount
    loan.status = 'completed' if loan.remaining_balance == 0 else 'repaying'
    loan.save(update_fields=['amount_repaid', 'status'])

    return Response({'detail': 'Repayment recorded.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_qard(request, pk):
    loan = get_object_or_404(QardHasanLoan, pk=pk)
    if not request.user.is_superuser:
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

    amount_approved = _parse_decimal(request.data.get('amount_approved', '0'))
    if amount_approved <= 0:
        return Response({'error': 'Invalid amount approved.'}, status=status.HTTP_400_BAD_REQUEST)

    loan.amount_approved = amount_approved
    loan.status = 'repaying'
    loan.approved_at = timezone.now()
    loan.save(update_fields=['amount_approved', 'status', 'approved_at'])
    loan.borrower.wallet.credit(amount_approved)

    return Response({'detail': 'Qard approved.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_qard(request, pk):
    loan = get_object_or_404(QardHasanLoan, pk=pk)
    if not request.user.is_superuser:
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

    loan.status = 'rejected'
    loan.save(update_fields=['status'])
    return Response({'detail': 'Qard rejected.'}, status=status.HTTP_200_OK)
