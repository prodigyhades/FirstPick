let taskList = [];

// Initialize taskList from textarea if present
document.addEventListener('DOMContentLoaded', () => {
    const inputElement = document.getElementById('task-input');
    if (inputElement.value.trim()) {
        try {
            taskList = JSON.parse(inputElement.value);
        } catch (e) {
            console.error("Failed to parse initial JSON", e);
        }
    }
});

function addTask() {
    const title = document.getElementById('new-task-title').value;
    const dueDate = document.getElementById('new-task-due').value;
    const importanceInput = document.getElementById('new-task-importance').value;
    const hoursInput = document.getElementById('new-task-hours').value;
    const depsStr = document.getElementById('new-task-deps').value;
    const errorMessage = document.getElementById('error-message');

    // Clear error message
    if (errorMessage) errorMessage.textContent = '';

    if (!title) {
        alert("Please enter a title");
        return;
    }

    const importance = importanceInput ? parseInt(importanceInput) : 5;
    const hours = hoursInput ? parseFloat(hoursInput) : 1;

    const dependencies = depsStr ? depsStr.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n)) : [];

    // Sync with current textarea content first
    const inputElement = document.getElementById('task-input');
    try {
        if (inputElement.value.trim()) {
            taskList = JSON.parse(inputElement.value);
        }
    } catch (e) {
        console.warn("Invalid JSON in textarea, overwriting with current list + new task");
    }

    // Simple ID generation
    const newId = taskList.length > 0 ? Math.max(...taskList.map(t => t.id || 0)) + 1 : 1;

    const newTask = {
        id: newId,
        title: title,
        due_date: dueDate || null,
        importance: importance,
        estimated_hours: hours,
        dependencies: dependencies
    };

    taskList.push(newTask);

    inputElement.value = JSON.stringify(taskList, null, 2);

    // Clear title input for convenience
    document.getElementById('new-task-title').value = '';
}

async function analyzeTasks() {
    const inputElement = document.getElementById('task-input');
    const strategyElement = document.getElementById('strategy-select');
    const resultsContainer = document.getElementById('results-container');
    const errorMessage = document.getElementById('error-message');

    // Clear previous results and errors
    resultsContainer.innerHTML = '<div class="placeholder-text">Analyzing...</div>';
    errorMessage.textContent = '';

    try {
        const tasksJson = inputElement.value;
        if (!tasksJson.trim()) {
            throw new Error("Please enter tasks in JSON format.");
        }

        let tasks;
        try {
            tasks = JSON.parse(tasksJson);
        } catch (e) {
            throw new Error("Invalid JSON format. Please check your syntax.");
        }

        const strategy = strategyElement.value;

        const response = await fetch('http://127.0.0.1:8000/api/tasks/analyze/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tasks: tasks,
                strategy: strategy
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        const data = await response.json();
        renderResults(data.tasks);

    } catch (error) {
        errorMessage.textContent = error.message;
        resultsContainer.innerHTML = '<div class="placeholder-text">Analysis failed.</div>';
    }
}

function renderResults(tasks) {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '';

    if (tasks.length === 0) {
        resultsContainer.innerHTML = '<div class="placeholder-text">No tasks returned.</div>';
        return;
    }

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${getPriorityClass(task.score)}`;

        const scoreDisplay = (task.score).toFixed(2);
        const dueDateDisplay = task.due_date ? task.due_date : 'No Date';

        card.innerHTML = `
            <h3>${escapeHtml(task.title)}</h3>
            <div class="task-meta">
                <span>Score: <strong>${scoreDisplay}</strong></span>
                <span>Due: ${dueDateDisplay}</span>
            </div>
            <div class="task-explanation">
                ${escapeHtml(task.explanation)}
            </div>
        `;

        resultsContainer.appendChild(card);
    });
}

function getPriorityClass(score) {
    if (score >= 1.5) return 'high-priority';
    if (score >= 0.8) return 'medium-priority';
    return 'low-priority';
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}