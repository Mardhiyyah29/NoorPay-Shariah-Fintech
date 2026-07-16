from django.urls import path
from . import views

urlpatterns = [
    path('',                      views.get_wallet,            name='wallet'),
    path('beneficiaries/',        views.BeneficiaryListCreate.as_view(), name='beneficiaries'),
    path('beneficiaries/<uuid:pk>/', views.BeneficiaryDetail.as_view(),  name='beneficiary-detail'),
    path('beneficiaries/<uuid:pk>/favourite/', views.toggle_favourite,   name='toggle-favourite'),
]
