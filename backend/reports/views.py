from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from django.conf import settings
import httpx


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    """Secure AI advisor proxy - API key never exposed to frontend"""
    messages = request.data.get('messages', [])
    if not messages:
        return Response({'detail': 'Messages are required.'}, status=400)

    if not settings.ANTHROPIC_API_KEY:
        return Response({'reply': 'AI Advisor requires an ANTHROPIC_API_KEY in your .env file.'})

    try:
        prompt = request.data.get('system') or getattr(
            settings,
            'SHARIAH_AI_PROMPT',
            'You are a helpful Islamic finance advisor. Keep responses concise and compliant with Shariah principles.',
        )
        res = httpx.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key':         settings.ANTHROPIC_API_KEY,
                'anthropic-version':  '2023-06-01',
                'content-type':       'application/json',
            },
            json={
                'model':      'claude-sonnet-4-6',
                'max_tokens': 450,
                'system':     prompt,
                'messages':   [
                    {'role': m['role'], 'content': m['content']}
                    for m in messages if m.get('role') in ['user', 'assistant']
                ],
            },
            timeout=30,
        )
        data  = res.json()
        reply = data.get('content', [{'text': ''}])[0].get('text', '')
        return Response({'reply': reply})
    except Exception as e:
        return Response({'reply': f'Connection error: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_report(request):
    from transactions.models import Transaction
    now = timezone.now()
    m   = int(request.query_params.get('month', now.month))
    y   = int(request.query_params.get('year',  now.year))

    txns    = Transaction.objects.filter(user=request.user, created_at__month=m, created_at__year=y, status='completed')
    income  = txns.filter(type__in=['credit']).aggregate(Sum('amount'))['amount__sum'] or 0
    expenses= txns.exclude(type='credit').aggregate(Sum('amount'))['amount__sum'] or 0
    zakat   = txns.filter(type='zakat').aggregate(Sum('amount'))['amount__sum'] or 0
    sadaqah = txns.filter(type='sadaqah').aggregate(Sum('amount'))['amount__sum'] or 0

    income   = float(income)
    expenses = float(expenses)

    # Halal Finance Score (0-100)
    savings_rate = (income - expenses) / income * 100 if income > 0 else 0
    giving_score = min(float(zakat + sadaqah) / max(income, 1) * 1000, 100)
    halal_score  = round((savings_rate * 0.4 + giving_score * 0.3 + 100 * 0.3), 1)

    return Response({
        'period':             {'month': m, 'year': y},
        'income':             str(income),
        'expenses':           str(expenses),
        'net_savings':        str(income - expenses),
        'savings_rate':       f'{savings_rate:.1f}%',
        'zakat_paid':         str(zakat),
        'sadaqah_paid':       str(sadaqah),
        'halal_finance_score': halal_score,
        'ai_insights': [
            f'Your savings rate is {savings_rate:.1f}% — {"excellent" if savings_rate > 30 else "keep working on it"}.',
            f'You paid ₦{float(zakat):,.0f} in Zakat and ₦{float(sadaqah):,.0f} in Sadaqah.',
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_prompts(request):
    return Response({'prompts': [
        'How do I calculate my Zakat?',
        'What is Mudarabah investment?',
        'Help me create a halal budget',
        'Explain Qard Hasan loans',
        'Is cryptocurrency halal?',
        'Best halal savings strategy?',
        'How to track student expenses?',
        'What is Waqf endowment?',
    ]})
