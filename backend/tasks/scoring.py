from datetime import date

STRATEGIES = {
    'smart_balance': {'urgency': 0.45, 'importance': 0.35, 'effort': 0.1, 'dependency': 0.1},
    'fastest_wins': {'urgency': 0.1, 'importance': 0.1, 'effort': 0.7, 'dependency': 0.1},
    'deadline_driven': {'urgency': 0.8, 'importance': 0.1, 'effort': 0.05, 'dependency': 0.05},
    'high_impact': {'urgency': 0.1, 'importance': 0.8, 'effort': 0.05, 'dependency': 0.05}
}

def calculate_score(task, all_tasks, strategy='smart_balance'):

    # Calculates the priority score for a task based on the given strategy.

    weights = STRATEGIES.get(strategy, STRATEGIES['smart_balance'])
    today = date.today()
    
    # 1. Urgency
    norm_urgency = 0.0
    days_until_due = None
    if task.get('due_date'):
        due_date = date.fromisoformat(task['due_date'])
        days_until_due = (due_date - today).days
        
        if days_until_due < 0:
            # Overdue: 1.0 + (days_overdue * 0.05) [Cap at 2.0]
            days_overdue = abs(days_until_due)
            norm_urgency = min(2.0, 1.0 + (days_overdue * 0.05))
        elif days_until_due <= 2:
            # Due within 0-2 days
            norm_urgency = 1.0
        else:
            # Linear decay from 1.0 down to 0.0 over 21 days
            # If days_until_due is 3, score is slightly less than 1.0
            # If days_until_due is 23, score is 0.0
            remaining_days = days_until_due - 2
            norm_urgency = max(0.0, 1.0 - (remaining_days / 21.0))
    
    # 2. Importance
    importance = task.get('importance', 5)
    norm_importance = importance / 10.0
    
    # 3. Effort (Quick Wins)
    estimated_hours = task.get('estimated_hours', 1)
    norm_effort = 0.0
    if estimated_hours <= 2:
        norm_effort = 1.0
    elif estimated_hours > 8:
        norm_effort = 0.0
    else:
        # Linear decay between 2 and 8
        # Range is 6 hours (8 - 2)
        # If hours = 5, (8 - 5) / 6 = 3/6 = 0.5
        norm_effort = (8 - estimated_hours) / 6.0
        
    # 4. Dependency Bonus
    # Check if this task blocks others
    task_id = task.get('id')
    blocks_others = False
    if task_id is not None:
        for other_task in all_tasks:
            if task_id in other_task.get('dependencies', []):
                blocks_others = True
                break
    norm_dependency = 1.0 if blocks_others else 0.0
    
    # 5. Circular Dependency Check
    in_cycle = False
    if task_id is not None:
        visited = set()
        recursion_stack = set()
        
        def is_cyclic(current_id):
            visited.add(current_id)
            recursion_stack.add(current_id)
            
            # Find the task object for current_id
            current_task_obj = next((t for t in all_tasks if t.get('id') == current_id), None)
            if current_task_obj:
                for dep_id in current_task_obj.get('dependencies', []):
                    if dep_id not in visited:
                        if is_cyclic(dep_id):
                            return True
                    elif dep_id in recursion_stack:
                        return True
            
            recursion_stack.remove(current_id)
            return False

        # Only check cycles starting from this task to see if it's part of one
        in_cycle = is_cyclic(task_id)

    # Final Calculation
    weighted_score = (
        (norm_urgency * weights['urgency']) +
        (norm_importance * weights['importance']) +
        (norm_effort * weights['effort']) +
        (norm_dependency * weights['dependency'])
    )
    
    if in_cycle:
        weighted_score *= 0.5
        
    # Explanation
    explanation = "Balanced priority."
    factors = [
        (norm_urgency * weights['urgency'], "High Urgency"),
        (norm_importance * weights['importance'], "High Importance"),
        (norm_effort * weights['effort'], "Quick Win"),
        (norm_dependency * weights['dependency'], "Blocks Other Tasks")
    ]
    factors.sort(key=lambda x: x[0], reverse=True)
    
    if in_cycle:
        explanation = "Circular Dependency Detected (Penalty Applied)."
    elif factors[0][0] > 0.1: # Threshold for explanation
        top_factor = factors[0][1]
        if top_factor == "High Urgency":
            if days_until_due is not None and days_until_due < 0:
                explanation = f"High Urgency: Overdue by {abs(days_until_due)} days"
            elif days_until_due is not None:
                explanation = f"High Urgency: Due in {days_until_due} days"
        elif top_factor == "High Importance":
            explanation = f"High Importance: Level {importance}"
        elif top_factor == "Quick Win":
            explanation = f"Quick Win: Only {estimated_hours} hours"
        elif top_factor == "Blocks Other Tasks":
            explanation = "Critical: Blocks other tasks"
            
    return weighted_score, explanation
