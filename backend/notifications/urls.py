from django.urls import path
from . import views

urlpatterns = [
    path('',                 views.NotifList.as_view(), name='notifications'),
    path('unread-count/',    views.unread_count,        name='unread-count'),
    path('mark-all-read/',   views.mark_all_read,       name='mark-all-read'),
    path('<uuid:pk>/read/',  views.mark_read,           name='mark-read'),
    path('<uuid:pk>/delete/',views.delete_notification,  name='delete-notif'),
]
