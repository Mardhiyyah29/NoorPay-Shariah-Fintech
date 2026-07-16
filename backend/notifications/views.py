from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification


class NotifSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id','type','title','body','is_read','created_at']
        read_only_fields = ['id','created_at']


class NotifList(generics.ListAPIView):
    serializer_class   = NotifSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        if self.request.query_params.get('unread'): qs = qs.filter(is_read=False)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'detail': 'All notifications marked as read.'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk, user=request.user)
        n.is_read = True; n.save()
        return Response(NotifSerializer(n).data)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, pk):
    try:
        Notification.objects.get(pk=pk, user=request.user).delete()
        return Response(status=204)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)
