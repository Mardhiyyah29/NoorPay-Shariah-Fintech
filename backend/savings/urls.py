from django.urls import path
from . import views

urlpatterns = [
    path('',              views.SavingsList.as_view(), name='savings'),
    path('summary/',      views.savings_summary,       name='savings-summary'),
    path('<uuid:pk>/',    views.SavingsDetail.as_view(),name='savings-detail'),
    path('<uuid:pk>/deposit/',  views.deposit,         name='savings-deposit'),
    path('<uuid:pk>/withdraw/', views.withdraw,        name='savings-withdraw'),
]
