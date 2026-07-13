from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from .models import StudentExpense, Allowance


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentExpense
        fields = '__all__'
        read_only_fields = ['id','user','created_at']


class AllowanceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Allowance
        fields = '__all__'
        read_only_fields = ['id','user','created_at']


class ExpenseList(generics.ListCreateAPIView):
    serializer_class   = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        now = timezone.now()
        m   = self.request.query_params.get('month', now.month)
        y   = self.request.query_params.get('year',  now.year)
        return StudentExpense.objects.filter(user=self.request.user, month=m, year=y)
    def perform_create(self, s): s.save(user=self.request.user)


class AllowanceList(generics.ListCreateAPIView):
    serializer_class   = AllowanceSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Allowance.objects.filter(user=self.request.user)
    def perform_create(self, s): s.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_summary(request):
    now = timezone.now()
    m   = int(request.query_params.get('month', now.month))
    y   = int(request.query_params.get('year',  now.year))
    expenses  = StudentExpense.objects.filter(user=request.user, month=m, year=y)
    allowance = Allowance.objects.filter(user=request.user, month=m, year=y).aggregate(Sum('amount'))['amount__sum'] or 0
    total_spent = expenses.aggregate(Sum('amount'))['amount__sum'] or 0
    by_cat = {}
    for e in expenses:
        by_cat[e.category] = by_cat.get(e.category, 0) + float(e.amount)
    return Response({
        'month': m, 'year': y,
        'allowance': str(allowance),
        'total_spent': str(total_spent),
        'remaining': str(float(allowance) - float(total_spent)),
        'by_category': by_cat,
    })
