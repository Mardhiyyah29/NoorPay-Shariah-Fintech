"""
shariah_compliance/views.py
"""

from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView

from . import engine
from .models import ComplianceRule, ComplianceCheckLog
from .serializers import ComplianceRuleSerializer, ComplianceCheckLogSerializer, ScreenTextSerializer


class ComplianceRuleListView(ListAPIView):
    """GET /api/compliance/rules/ — the active screening rules (transparency: what does this system actually check?)."""

    serializer_class = ComplianceRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ComplianceRule.objects.filter(is_active=True)


class MyComplianceLogView(ListAPIView):
    """GET /api/compliance/logs/ — this user's own screening history."""

    serializer_class = ComplianceCheckLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ComplianceCheckLog.objects.filter(user=self.request.user)


class ScreenTextView(APIView):
    """
    POST /api/compliance/screen-text/
    Manually screen arbitrary text — this is the live demo endpoint: type
    something like "guaranteed 20% return, no risk" and see it get flagged
    as Gharar in real time.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ScreenTextSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = engine.screen_text(
            serializer.validated_data["text"], user=request.user, source="manual",
        )
        return Response(result)


class ComplianceDashboardView(APIView):
    """
    GET /api/compliance/dashboard/
    Aggregate compliance statistics computed from real ComplianceCheckLog
    rows — this is a genuine, reproducible number for "ethical compliance
    performance" (objective 8), not a claimed percentage.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        logs = ComplianceCheckLog.objects.all()
        total = logs.count()
        flagged = logs.exclude(verdict="compliant").count()
        blocked = logs.filter(verdict="blocked").count()
        compliant = total - flagged

        by_category = {}
        for category, label in ComplianceRule.CATEGORY_CHOICES:
            by_category[category] = logs.filter(matched_rules__category=category).distinct().count()

        compliance_rate = round((compliant / total) * 100, 1) if total else 100.0

        return Response({
            "total_screened": total,
            "compliant": compliant,
            "flagged": flagged,
            "blocked": blocked,
            "compliance_rate_percent": compliance_rate,
            "violations_by_category": by_category,
        })
