from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from django.db import transaction as db_transaction
from decimal import Decimal
from shariah_fintech_backend.throttles import PinCheckRateThrottle
from .models import Transaction
from accounts.models import User
from wallet.models import Wallet


class TxSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Transaction
        fields = '__all__'
        read_only_fields = ['id', 'user', 'reference', 'status', 'created_at']


class TransactionList(generics.ListAPIView):
    serializer_class   = TxSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ['type', 'category', 'status']
    search_fields      = ['description', 'recipient_name', 'reference']

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_detail(request, pk):
    try:
        tx = Transaction.objects.get(pk=pk, user=request.user)
        return Response(TxSerializer(tx).data)
    except Transaction.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PinCheckRateThrottle])
def internal_transfer(request):
    """NoorPay to NoorPay transfer - zero fee, Shari'ah compliant"""
    data    = request.data
    pin     = data.get('pin', '')
    amount  = Decimal(str(data.get('amount', 0)))
    acct    = data.get('recipient_account', '')
    note    = data.get('note', '')

    if not request.user.check_pin(pin):
        return Response({'detail': 'Incorrect PIN.'}, status=400)
    if amount <= 0:
        return Response({'detail': 'Amount must be greater than zero.'}, status=400)
    try:
        recipient = User.objects.get(account_number=acct)
    except User.DoesNotExist:
        return Response({'detail': 'Recipient account not found.'}, status=404)
    if recipient == request.user:
        return Response({'detail': 'Cannot transfer to yourself.'}, status=400)

    sender_wallet    = request.user.wallet
    recipient_wallet = recipient.wallet

    if sender_wallet.balance < amount:
        return Response({'detail': 'Insufficient balance.'}, status=400)

    with db_transaction.atomic():
        sender_wallet.debit(amount)
        recipient_wallet.credit(amount)

        # Record debit
        tx = Transaction.objects.create(
            user=request.user, type='transfer', category='transfer',
            amount=amount, fee=Decimal('0.00'),
            description=f'Transfer to {recipient.full_name}',
            recipient_name=recipient.full_name,
            recipient_account=acct, bank_name='NoorPay', note=note,
        )
        # Record credit for recipient
        Transaction.objects.create(
            user=recipient, type='credit', category='income',
            amount=amount, fee=Decimal('0.00'),
            description=f'Transfer from {request.user.full_name}',
            recipient_name=request.user.full_name,
            recipient_account=request.user.account_number,
            bank_name='NoorPay', note=note,
        )
        # Award points
        request.user.add_points(int(amount / 1000) * 10, 'Transfer bonus')

    return Response({
        'detail':    'Transfer successful.',
        'reference': tx.reference,
        'amount':    str(amount),
        'balance':   str(sender_wallet.balance),
        'recipient': recipient.full_name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PinCheckRateThrottle])
def buy_airtime(request):
    data   = request.data
    pin    = data.get('pin', '')
    amount = Decimal(str(data.get('amount', 0)))
    phone  = data.get('phone', '')
    network= data.get('network', '')

    if not request.user.check_pin(pin):
        return Response({'detail': 'Incorrect PIN.'}, status=400)
    if amount < 50:
        return Response({'detail': 'Minimum airtime is ₦50.'}, status=400)

    wallet = request.user.wallet
    if wallet.balance < amount:
        return Response({'detail': 'Insufficient balance.'}, status=400)

    wallet.debit(amount)
    tx = Transaction.objects.create(
        user=request.user, type='airtime', category='bills',
        amount=amount, description=f'{network.upper()} Airtime - {phone}',
        recipient_account=phone, bank_name=network.upper(),
    )
    request.user.add_points(25, 'Airtime purchase')
    return Response({'detail': 'Airtime sent.', 'reference': tx.reference, 'balance': str(wallet.balance)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PinCheckRateThrottle])
def buy_data(request):
    data    = request.data
    pin     = data.get('pin', '')
    amount  = Decimal(str(data.get('amount', 0)))
    phone   = data.get('phone', '')
    network = data.get('network', '')
    bundle  = data.get('bundle_name', '')

    if not request.user.check_pin(pin):
        return Response({'detail': 'Incorrect PIN.'}, status=400)

    wallet = request.user.wallet
    if wallet.balance < amount:
        return Response({'detail': 'Insufficient balance.'}, status=400)

    wallet.debit(amount)
    tx = Transaction.objects.create(
        user=request.user, type='data', category='bills',
        amount=amount, description=f'{network.upper()} Data {bundle} - {phone}',
        recipient_account=phone, bank_name=network.upper(),
    )
    request.user.add_points(25, 'Data purchase')
    return Response({'detail': 'Data bundle activated.', 'reference': tx.reference, 'balance': str(wallet.balance)})
