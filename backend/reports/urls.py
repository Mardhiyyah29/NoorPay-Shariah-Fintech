from django.urls import path
from . import views

urlpatterns = [
    path('monthly/',   views.monthly_report, name='monthly-report'),
    path('ai/chat/',   views.ai_chat,        name='ai-chat'),
    path('ai/prompts/',views.ai_prompts,      name='ai-prompts'),
]
