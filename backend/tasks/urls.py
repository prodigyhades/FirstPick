from django.urls import path
from .views import AnalyzeTasksView

urlpatterns = [
    path('analyze/', AnalyzeTasksView.as_view(), name='analyze_tasks'),
]