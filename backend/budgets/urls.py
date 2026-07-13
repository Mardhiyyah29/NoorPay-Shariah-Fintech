from django.urls import path
from . import views

urlpatterns = [
    path('',         views.BudgetList.as_view(),  name='budgets'),
    path('<uuid:pk>/',views.BudgetDetail.as_view(),name='budget-detail'),
    path('summary/', views.budget_summary,         name='budget-summary'),
    path('income/',  views.IncomeList.as_view(),   name='income'),
]
