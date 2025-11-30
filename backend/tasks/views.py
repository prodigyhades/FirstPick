import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .scoring import calculate_score
from .models import Task

@method_decorator(csrf_exempt, name='dispatch')
class AnalyzeTasksView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            
            if isinstance(data, list):
                tasks_data = data
            else:
                tasks_data = data.get('tasks', [])
                
            strategy = request.GET.get('strategy', 'smart_balance')
            print(f"Analyzing with Strategy: {strategy}")
            
            if not isinstance(tasks_data, list):
                return JsonResponse({'error': 'Tasks must be a list'}, status=400)

            # Persist tasks to database
            # For simplicity in this prototype, we'll clear existing tasks and replace them
            # In a real app, we'd likely want to update/create based on ID or user
            Task.objects.all().delete()
            
            tasks_to_create = []
            for task_data_item in tasks_data:
                # Handle date parsing safely
                due_date = task_data_item.get('due_date')
                if due_date == "":
                    due_date = None
                
                tasks_to_create.append(Task(
                    id=task_data_item.get('id'), # Keep frontend ID if possible, or let DB auto-increment if None
                    title=task_data_item.get('title'),
                    due_date=due_date,
                    estimated_hours=task_data_item.get('estimated_hours', 1),
                    importance=task_data_item.get('importance', 5),
                    dependencies=task_data_item.get('dependencies', [])
                ))
            
            # Bulk create to save DB hits, but we need to be careful with IDs if we want to preserve them
            # Since we deleted all, we can try to preserve IDs if provided, or just let DB handle it.
            # However, bulk_create with manual IDs works on some DBs. SQLite is fine.
            Task.objects.bulk_create(tasks_to_create)

            # Now perform analysis
            analyzed_tasks = []
            for task in tasks_data:
                score, explanation = calculate_score(task, tasks_data, strategy)
                
                task_with_score = task.copy()
                task_with_score['score'] = score
                task_with_score['explanation'] = explanation
                analyzed_tasks.append(task_with_score)
                
            # Sort by score descending
            analyzed_tasks.sort(key=lambda x: x['score'], reverse=True)
            
            return JsonResponse({'tasks': analyzed_tasks})
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

class SuggestTasksView(View):
    def get(self, request):
        try:
            # Fetch all tasks from DB
            db_tasks = Task.objects.all()
            tasks_data = []
            for t in db_tasks:
                tasks_data.append({
                    'id': t.id,
                    'title': t.title,
                    'due_date': t.due_date.isoformat() if t.due_date else None,
                    'estimated_hours': t.estimated_hours,
                    'importance': t.importance,
                    'dependencies': t.dependencies
                })

            strategy = request.GET.get('strategy', 'smart_balance')
            
            analyzed_tasks = []
            for task in tasks_data:
                score, explanation = calculate_score(task, tasks_data, strategy)
                task_with_score = task.copy()
                task_with_score['score'] = score
                task_with_score['explanation'] = explanation
                analyzed_tasks.append(task_with_score)
            
            # Sort by score descending
            analyzed_tasks.sort(key=lambda x: x['score'], reverse=True)
            
            # Return top 3
            top_3 = analyzed_tasks[:3]
            
            return JsonResponse({'tasks': top_3})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)