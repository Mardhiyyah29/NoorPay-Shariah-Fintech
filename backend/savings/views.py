from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction as dbt
from decimal import Decimal
from shariah_fintech_backend.throttles import PinCheckRateThrottle
from .models import SavingsGoal


class SavingsSerializer(serializers.ModelSerializer):
    progress_pct = serializers.FloatField(read_only=True)
    remaining    = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model  = SavingsGoal
        fields = ['id','title','goal_type','target_amount','saved_amount','remaining',
                  'progress_pct','monthly_contribution','auto_save','deadline','status','created_at']
        read_only_fields = ['id','saved_amount','created_at']


class SavingsList(generics.ListCreateAPIView):
    serializer_class   = SavingsSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return SavingsGoal.objects.filter(user=self.request.user)
    def perform_create(self, s): s.save(user=self.request.user)


class SavingsDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SavingsSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return SavingsGoal.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def savings_summary(request):
    goals = SavingsGoal.objects.filter(user=request.user)
    return Response({
        'total_saved':   str(sum(g.saved_amount for g in goals)),
        'total_target':  str(sum(g.target_amount for g in goals)),
        'active_goals':  goals.filter(status='active').count(),
        'completed':     goals.filter(status='completed').count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PinCheckRateThrottle])
def deposit(request, pk):
    try: goal = SavingsGoal.objects.get(pk=pk, user=request.user)
    except SavingsGoal.DoesNotExist: return Response({'detail': 'Not found.'}, status=404)

    pin    = request.data.get('pin', '')
    amount = Decimal(str(request.data.get('amount', 0)))

    if not request.user.check_pin(pin): return Response({'detail': 'Incorrect PIN.'}, status=400)
    if amount <= 0: return Response({'detail': 'Amount must be greater than zero.'}, status=400)
    if request.user.wallet.balance < amount: return Response({'detail': 'Insufficient balance.'}, status=400)

    with dbt.atomic():
        request.user.wallet.debit(amount)
        goal.saved_amount += amount
        if goal.saved_amount >= goal.target_amount:
            goal.status = 'completed'
            request.user.add_points(150, f'Goal completed: {goal.title}')
        goal.save()

    return Response(SavingsSerializer(goal).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PinCheckRateThrottle])
def withdraw(request, pk):
    try: goal = SavingsGoal.objects.get(pk=pk, user=request.user)
    except SavingsGoal.DoesNotExist: return Response({'detail': 'Not found.'}, status=404)

    pin    = request.data.get('pin', '')
    amount = Decimal(str(request.data.get('amount', 0)))

    if not request.user.check_pin(pin): return Response({'detail': 'Incorrect PIN.'}, status=400)
    if amount > goal.saved_amount: return Response({'detail': 'Amount exceeds saved amount.'}, status=400)

    with dbt.atomic():
        request.user.wallet.credit(amount)
        goal.saved_amount -= amount
        goal.save()

    return Response(SavingsSerializer(goal).data)
