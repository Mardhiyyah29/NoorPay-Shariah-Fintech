from django.urls import path
from . import views

urlpatterns = [
    path('',           views.ScholarshipList.as_view(),   name='scholarships'),
    path('<uuid:pk>/', views.ScholarshipDetail.as_view(), name='scholarship-detail'),
]
