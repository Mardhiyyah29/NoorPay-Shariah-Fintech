from django.urls import path
from . import views

urlpatterns = [
    path('zakat/calculate/', views.calculate_zakat, name='zakat-calculate'),
    path('zakat/pay/',       views.pay_zakat,       name='zakat-pay'),
    path('sadaqah/campaigns/',views.list_campaigns, name='campaigns'),
    path('sadaqah/donate/',  views.donate_sadaqah,  name='donate'),
    path('qard/',            views.QardList.as_view(),name='qard'),
    path('qard/<uuid:pk>/repay/', views.repay_qard, name='qard-repay'),
    path('qard/<uuid:pk>/approve/', views.approve_qard, name='qard-approve'),
    path('qard/<uuid:pk>/reject/',  views.reject_qard,  name='qard-reject'),
]
