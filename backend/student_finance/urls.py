from django.urls import path
from . import views

urlpatterns = [
    path('',          views.ExpenseList.as_view(),   name='student-expenses'),
    path('allowance/',views.AllowanceList.as_view(),  name='allowance'),
    path('summary/',  views.student_summary,          name='student-summary'),
]
