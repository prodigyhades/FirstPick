let taskList = [];

// Initialize taskList from textarea if present
document.addEventListener('DOMContentLoaded', () => {
    const inputElement = document.getElementById('task-input');
    if (inputElement && inputElement.value.trim()) {
        try {
            taskList = JSON.parse(inputElement.value);
        } catch (e) {
            console.error("Failed to parse initial JSON", e);
        }
    }

    // Initialize Edit Modal
    const modal = document.getElementById('edit-modal');
    const span = document.getElementsByClassName("close-modal")[0];

    if (span) {
        span.onclick = function () {
            modal.style.display = "none";
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Initialize Edit Sliders
    const editImportanceSlider = document.getElementById('edit-task-importance');
    const editHoursSlider = document.getElementById('edit-task-hours');

    if (editImportanceSlider) {
        updateSlider(editImportanceSlider, 'edit-importance-val');
        editImportanceSlider.addEventListener('input', () => updateSlider(editImportanceSlider, 'edit-importance-val'));
    }

    if (editHoursSlider) {
        updateSlider(editHoursSlider, 'edit-hours-val');
        editHoursSlider.addEventListener('input', () => updateSlider(editHoursSlider, 'edit-hours-val'));
    }
});

function updateSlider(slider, displayId) {
    const value = slider.value;
    const min = slider.min || 0;
    const max = slider.max || 100;
    const percentage = ((value - min) / (max - min)) * 100;

    // Update display text
    const displayElement = document.getElementById(displayId);
    if (displayElement) {
        displayElement.textContent = value;
    }

    // Update background gradient (Green -> Red)
    // 0% = Green (120 hue), 100% = Red (0 hue)
    const hue = ((100 - percentage) * 1.2).toFixed(0); // Map 0-100 to 120-0
    const color = `hsl(${hue}, 100%, 50%)`;

    slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #d3d3d3 ${percentage}%, #d3d3d3 100%)`;
}

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
            <div class="task-actions">
                <button class="btn-action btn-complete" onclick="completeTask(${task.id})">Completed</button>
                <button class="btn-action btn-edit" onclick="openEditModal(${task.id})">Edit</button>
                <button class="btn-action btn-delete" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        `;

        resultsContainer.appendChild(card);
    });
}

function deleteTask(id) {
    const inputElement = document.getElementById('task-input');
    try {
        taskList = JSON.parse(inputElement.value);
        taskList = taskList.filter(t => t.id !== id);
        inputElement.value = JSON.stringify(taskList, null, 2);
        analyzeTasks(); // Re-analyze to update UI
    } catch (e) {
        console.error("Error deleting task", e);
    }
}

function completeTask(id) {
    // For now, completing a task just removes it, same as delete
    deleteTask(id);
}

function openEditModal(id) {
    const inputElement = document.getElementById('task-input');
    try {
        taskList = JSON.parse(inputElement.value);
        const task = taskList.find(t => t.id === id);
        if (!task) return;

        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-due').value = task.due_date || '';
        document.getElementById('edit-task-importance').value = task.importance;
        document.getElementById('edit-task-hours').value = task.estimated_hours;
        document.getElementById('edit-task-deps').value = (task.dependencies || []).join(', ');

        // Update sliders visual state
        updateSlider(document.getElementById('edit-task-importance'), 'edit-importance-val');
        updateSlider(document.getElementById('edit-task-hours'), 'edit-hours-val');

        document.getElementById('edit-modal').style.display = "block";
    } catch (e) {
        console.error("Error opening edit modal", e);
    }
}

function saveEditTask() {
    const id = parseInt(document.getElementById('edit-task-id').value);
    const title = document.getElementById('edit-task-title').value;
    const dueDate = document.getElementById('edit-task-due').value;
    const importance = parseInt(document.getElementById('edit-task-importance').value);
    const hours = parseFloat(document.getElementById('edit-task-hours').value);
    const depsStr = document.getElementById('edit-task-deps').value;

    const dependencies = depsStr ? depsStr.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n)) : [];

    const inputElement = document.getElementById('task-input');
    try {
        taskList = JSON.parse(inputElement.value);
        const taskIndex = taskList.findIndex(t => t.id === id);

        if (taskIndex !== -1) {
            taskList[taskIndex] = {
                ...taskList[taskIndex],
                title: title,
                due_date: dueDate || null,
                importance: importance,
                estimated_hours: hours,
                dependencies: dependencies
            };

            inputElement.value = JSON.stringify(taskList, null, 2);
            document.getElementById('edit-modal').style.display = "none";
            analyzeTasks(); // Re-analyze to update UI
        }
    } catch (e) {
        console.error("Error saving edited task", e);
    }
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