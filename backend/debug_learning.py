import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shariah_fintech_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from learning.models import Article
from learning.views import ArticleListView

User = get_user_model()
user = User.objects.create_user(email='learndebug1@noorpay.ng', password='StrongPass123', full_name='Learn Debug')
Article.objects.create(title='Understanding Zakat', tag='zakat', body='...', read_time_minutes=7)
Article.objects.create(title='Why Riba is Forbidden', tag='islamic_finance', body='...', read_time_minutes=6)

factory = APIRequestFactory()
request = factory.get('/articles/')
force_authenticate(request, user=user)
view = ArticleListView.as_view()
response = view(request)
print('response status', response.status_code)
print('response data type', type(response.data))
print('response data', response.data)
