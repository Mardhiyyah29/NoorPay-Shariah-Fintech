from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.validators import UniqueTogetherValidator
from django.utils import timezone
from .models import Budget, IncomeRecord


class BudgetSerializer(serializers.ModelSerializer):
    user            = serializers.HiddenField(default=serializers.CurrentUserDefault())
    spent           = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining       = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    percentage_used = serializers.FloatField(read_only=True)

    class Meta:
        model = Budget
        fields = ['id','user','category','monthly_limit','spent','remaining','percentage_used','month','year','is_active']
        read_only_fields = ['id']
        validators = [
            UniqueTogetherValidator(
                queryset=Budget.objects.all(),
                fields=['user','category','month','year'],
                message='A budget for this category, month and year already exists.',
            )
        ]


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IncomeRecord
        fields = ['id','source','amount','description','month','year','date_received']
        read_only_fields = ['id']


class BudgetList(generics.ListCreateAPIView):
    serializer_class   = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        now = timezone.now()
        m   = self.request.query_params.get('month', now.month)
        y   = self.request.query_params.get('year',  now.year)
        return Budget.objects.filter(user=self.request.user, month=m, year=y)

    def perform_create(self, s):
        s.save(user=self.request.user)


class BudgetDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BudgetSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Budget.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budget_summary(request):
    from django.db.models import Sum
    from transactions.models import Transaction
    now = timezone.now()
    m   = int(request.query_params.get('month', now.month))
    y   = int(request.query_params.get('year',  now.year))

    income = IncomeRecord.objects.filter(user=request.user, month=m, year=y).aggregate(Sum('amount'))['amount__sum'] or 0
    expenses= Transaction.objects.filter(
        user=request.user, created_at__month=m, created_at__year=y, status='completed',
        type__in=['debit','transfer','airtime','data','bill']).aggregate(Sum('amount'))['amount__sum'] or 0

    return Response({
        'month': m, 'year': y,
        'total_income': str(income),
        'total_spent':  str(expenses),
        'net_savings':  str(income - expenses),
    })


class IncomeList(generics.ListCreateAPIView):
    serializer_class   = IncomeSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        now = timezone.now()
        m   = self.request.query_params.get('month', now.month)
        y   = self.request.query_params.get('year',  now.year)
        return IncomeRecord.objects.filter(user=self.request.user, month=m, year=y)
    def perform_create(self, s): s.save(user=self.request.user)
