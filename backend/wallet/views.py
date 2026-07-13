from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Wallet, Beneficiary
from .serializers import WalletSerializer, BeneficiarySerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet(request):
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    return Response(WalletSerializer(wallet).data)


class BeneficiaryListCreate(generics.ListCreateAPIView):
    serializer_class   = BeneficiarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Beneficiary.objects.filter(user=self.request.user).order_by('-is_favourite', 'name')

    def perform_create(self, s):
        s.save(user=self.request.user)


class BeneficiaryDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BeneficiarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Beneficiary.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favourite(request, pk):
    try:
        b = Beneficiary.objects.get(pk=pk, user=request.user)
        b.is_favourite = not b.is_favourite
        b.save()
        return Response({'is_favourite': b.is_favourite})
    except Beneficiary.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
