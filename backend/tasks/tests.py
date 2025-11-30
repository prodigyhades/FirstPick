from django.test import TestCase
from datetime import date, timedelta
from tasks.scoring import calculate_score

class TaskScoringTests(TestCase):
    def test_overdue_priority(self):
        """Test 1: Verify scoring logic for an OVERDUE task (must have high score)."""
        today = date.today()
        overdue_task = {
            'id': 1,
            'title': 'Overdue Task',
            'due_date': (today - timedelta(days=1)).isoformat(),
            'importance': 5,
            'estimated_hours': 4,
            'dependencies': []
        }
        future_task = {
            'id': 2,
            'title': 'Future Task',
            'due_date': (today + timedelta(days=30)).isoformat(),
            'importance': 5,
            'estimated_hours': 4,
            'dependencies': []
        }
        
        all_tasks = [overdue_task, future_task]
        
        score_overdue, _ = calculate_score(overdue_task, all_tasks)
        score_future, _ = calculate_score(future_task, all_tasks)
        
        self.assertGreater(score_overdue, score_future, "Overdue task should have higher score than future task")

    def test_quick_win_strategy(self):
        """Test 2: Verify scoring logic for Fastest Wins strategy."""
        low_effort_task = {
            'id': 1,
            'title': 'Quick Win',
            'due_date': None,
            'importance': 3,
            'estimated_hours': 1, # <= 2 hours -> score 1.0 for effort
            'dependencies': []
        }
        high_effort_task = {
            'id': 2,
            'title': 'Big Project',
            'due_date': None,
            'importance': 9,
            'estimated_hours': 10, # > 8 hours -> score 0.0 for effort
            'dependencies': []
        }
        
        all_tasks = [low_effort_task, high_effort_task]
        
        # Strategy: 'fastest_wins': {urgency: 0.1, importance: 0.1, effort: 0.7, dependency: 0.1}
        score_low, _ = calculate_score(low_effort_task, all_tasks, strategy='fastest_wins')
        score_high, _ = calculate_score(high_effort_task, all_tasks, strategy='fastest_wins')
        
        self.assertGreater(score_low, score_high, "Low effort task should win in fastest_wins strategy")

    def test_circular_dependency(self):
        """Test 3: Verify scoring logic for a CIRCULAR DEPENDENCY."""
        task_a = {
            'id': 1,
            'title': 'Task A',
            'dependencies': [2]
        }
        task_b = {
            'id': 2,
            'title': 'Task B',
            'dependencies': [1]
        }
        
        all_tasks = [task_a, task_b]
        
        # Should not crash and apply penalty
        score_a, explanation_a = calculate_score(task_a, all_tasks)
        
        self.assertIn("Circular Dependency", explanation_a)