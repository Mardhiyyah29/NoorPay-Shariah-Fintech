from django.urls import path
from . import views

urlpatterns = [
    path('',             views.TransactionList.as_view(), name='transactions'),
    path('<uuid:pk>/',   views.transaction_detail,        name='tx-detail'),
    path('transfer/internal/', views.internal_transfer,   name='internal-transfer'),
    path('airtime/',     views.buy_airtime,                name='buy-airtime'),
    path('data/',        views.buy_data,                   name='buy-data'),
]
