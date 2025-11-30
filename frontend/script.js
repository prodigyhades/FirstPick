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