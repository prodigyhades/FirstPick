import os
import sys
import django
from datetime import date, timedelta
import json

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tasks.scoring import calculate_score, STRATEGIES

def print_task_score(task, all_tasks, strategy='smart_balance'):
    score, explanation = calculate_score(task, all_tasks, strategy)
    print(f"Task: {task['title']}")
    print(f"Strategy: {strategy}")
    print(f"Score: {score}")
    print(f"Explanation: {explanation}")
    print("-" * 30)
    return score

def run_verification():
    print("=== SCORING ALGORITHM VERIFICATION ===\n")
    today = date.today()
    
    # Scenario 1: Overdue Task
    overdue_task = {
        'id': 1, 'title': 'Overdue Task',
        'due_date': (today - timedelta(days=5)).isoformat(),
        'importance': 5, 'estimated_hours': 4, 'dependencies': []
    }
    
    # Scenario 2: Imminent Task
    imminent_task = {
        'id': 2, 'title': 'Imminent Task',
        'due_date': (today + timedelta(days=1)).isoformat(),
        'importance': 5, 'estimated_hours': 4, 'dependencies': []
    }
    
    # Scenario 3: Future Task
    future_task = {
        'id': 3, 'title': 'Future Task',
        'due_date': (today + timedelta(days=10)).isoformat(),
        'importance': 5, 'estimated_hours': 4, 'dependencies': []
    }
    
    all_tasks = [overdue_task, imminent_task, future_task]
    
    print("--- Urgency Verification ---")
    s1 = print_task_score(overdue_task, all_tasks)
    s2 = print_task_score(imminent_task, all_tasks)
    s3 = print_task_score(future_task, all_tasks)
    
    if s1 > s2 > s3:
        print("PASS: Urgency ordering is correct (Overdue > Imminent > Future)")
    else:
        print("FAIL: Urgency ordering is INCORRECT")
        
    # Scenario 4: Circular Dependency
    print("\n--- Circular Dependency Verification ---")
    task_a = {'id': 10, 'title': 'Cycle A', 'dependencies': [11]}
    task_b = {'id': 11, 'title': 'Cycle B', 'dependencies': [10]}
    cycle_tasks = [task_a, task_b]
    
    score_a, expl_a = calculate_score(task_a, cycle_tasks)
    print(f"Cycle Task A Score: {score_a}")
    print(f"Explanation: {expl_a}")
    
    if "Circular Dependency" in expl_a:
        print("PASS: Circular dependency detected")
    else:
        print("FAIL: Circular dependency NOT detected")

    # Scenario 5: Strategy Verification
    print("\n--- Strategy Verification (Fastest Wins) ---")
    quick_task = {'id': 20, 'title': 'Quick', 'estimated_hours': 1, 'importance': 1, 'due_date': None}
    long_task = {'id': 21, 'title': 'Long', 'estimated_hours': 10, 'importance': 10, 'due_date': None}
    strat_tasks = [quick_task, long_task]
    
    s_quick = print_task_score(quick_task, strat_tasks, strategy='fastest_wins')
    s_long = print_task_score(long_task, strat_tasks, strategy='fastest_wins')
    
    if s_quick > s_long:
        print("PASS: Fastest Wins strategy correctly prioritizes quick task")
    else:
        print("FAIL: Fastest Wins strategy failed")

if __name__ == '__main__':
    run_verification()