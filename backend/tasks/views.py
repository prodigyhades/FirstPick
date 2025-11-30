import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .scoring import calculate_score

@method_decorator(csrf_exempt, name='dispatch')
class AnalyzeTasksView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            tasks = data.get('tasks', [])
            strategy = request.GET.get('strategy', 'smart_balance')
            print(f"Analyzing with Strategy: {strategy}")
            
            if not isinstance(tasks, list):
                return JsonResponse({'error': 'Tasks must be a list'}, status=400)
                
            analyzed_tasks = []
            for task in tasks:
                
                score, explanation = calculate_score(task, tasks, strategy)
                
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