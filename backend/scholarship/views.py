from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from .models import Scholarship


class ScholarshipSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Scholarship
        fields = ['id','name','organization','amount','deadline','status','progress','notes','link','created_at']
        read_only_fields = ['id','created_at']


class ScholarshipList(generics.ListCreateAPIView):
    serializer_class   = ScholarshipSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Scholarship.objects.filter(user=self.request.user)
    def perform_create(self, s): s.save(user=self.request.user)


class ScholarshipDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ScholarshipSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Scholarship.objects.filter(user=self.request.user)
