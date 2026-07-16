"""
URL configuration for shariah_fintech_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""


"""NoorPay - Main URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path('', RedirectView.as_view(url='/api/auth/', permanent=False)),
    path('admin/', admin.site.urls),

    # JWT token refresh
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # App routes
    path('api/auth/',           include('accounts.urls')),
    path('api/wallet/',         include('wallet.urls')),
    path('api/transactions/',   include('transactions.urls')),
    path('api/budgets/',        include('budgets.urls')),
    path('api/savings/',        include('savings.urls')),
    path('api/islamic-finance/',include('islamic_finance.urls')),
    path('api/cards/',          include('cards.urls')),
    path('api/rewards/',        include('rewards.urls')),
    path('api/notifications/',  include('notifications.urls')),
    path('api/learning/',       include('learning.urls')),
    path('api/scholarship/',    include('scholarship.urls')),
    path('api/student-finance/',include('student_finance.urls')),
    path('api/community/',      include('community.urls')),
    path('api/reports/',        include('reports.urls')),
    path('api/compliance/',     include('shariah_compliance.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
