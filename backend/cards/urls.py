from django.urls import path
from .views import (
    VirtualCardDetailView, RevealCardView, FreezeCardView,
    SetSpendingLimitView, CardTransactionListView,
)

urlpatterns = [
    path("", VirtualCardDetailView.as_view(), name="card-detail"),
    path("reveal/", RevealCardView.as_view(), name="card-reveal"),
    path("freeze/", FreezeCardView.as_view(), name="card-freeze"),
    path("set-limit/", SetSpendingLimitView.as_view(), name="card-set-limit"),
    path("transactions/", CardTransactionListView.as_view(), name="card-transactions"),
]
