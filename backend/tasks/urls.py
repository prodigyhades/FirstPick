from django.urls import path
from .views import AnalyzeTasksView, SuggestTasksView

urlpatterns = [
    path('analyze/', AnalyzeTasksView.as_view(), name='analyze_tasks'),
    path('suggest/', SuggestTasksView.as_view(), name='suggest_tasks'),
]