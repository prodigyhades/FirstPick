let taskList = [];
let currentDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    const inputElement = document.getElementById('task-input');
    if (inputElement && inputElement.value.trim()) {
        try {
            taskList = JSON.parse(inputElement.value);
        } catch (e) {
            console.error("Failed to parse initial JSON", e);
        }
    }

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

    // Calendar Navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Initial Calendar Render
    renderCalendar();
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

    renderCalendar(); // Update heatmap
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

            // Ensure all tasks have an ID
            tasks = tasks.map((t, index) => {
                if (!t.id) {
                    return { ...t, id: Date.now() + index };
                }
                return t;
            });

            // Update global taskList to match analyzed tasks
            taskList = tasks;

            // Update the input field with the new JSON containing IDs
            inputElement.value = JSON.stringify(taskList, null, 2);

            renderCalendar(); // Update heatmap with latest data
        } catch (e) {
        }

        const strategy = strategyElement ? strategyElement.value : 'smart_balance';
        const response = await fetch(`http://127.0.0.1:8000/api/tasks/analyze/?strategy=${strategy}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskList)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
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
        resultsContainer.innerHTML = '<div class="placeholder-text">All caught up! Add a task to get started.</div>';
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
        renderCalendar(); // Update heatmap
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
            renderCalendar(); // Update heatmap
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

function toggleJsonVisibility() {
    const container = document.getElementById('json-container');
    const btn = document.getElementById('toggle-json-btn');

    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btn.textContent = "Hide Advanced JSON Data";
    } else {
        container.classList.add('hidden');
        btn.textContent = "Show Advanced JSON Data";
    }
}

// --- Heatmap / Calendar Logic ---

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update Header
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('current-month-year').textContent = `${monthNames[month]} ${year}`;

    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';

    // Add Day Headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    // Calculate days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calculate Task Counts per Day
    const taskCounts = {};
    let maxTasks = 0;

    taskList.forEach(task => {
        if (task.due_date) {
            const date = new Date(task.due_date);
            // Check if task is in current month view (optional, but good for optimization)
            // Actually we need exact date match string YYYY-MM-DD
            const dateStr = task.due_date;
            taskCounts[dateStr] = (taskCounts[dateStr] || 0) + 1;
            if (taskCounts[dateStr] > maxTasks) {
                maxTasks = taskCounts[dateStr];
            }
        }
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }

    // Days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = i;

        // Construct date string YYYY-MM-DD for matching
        // Note: Month is 0-indexed in JS Date, but 1-indexed in YYYY-MM-DD
        const currentMonthStr = (month + 1).toString().padStart(2, '0');
        const dayStr = i.toString().padStart(2, '0');
        const dateString = `${year}-${currentMonthStr}-${dayStr}`;

        // Highlight Today
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            dayCell.classList.add('today');
        }

        // Apply Heatmap Color
        if (taskCounts[dateString]) {
            const count = taskCounts[dateString];
            const alpha = maxTasks > 0 ? (count / maxTasks) : 0;
            // Using rgba(220, 53, 69, alpha) -> Red color
            // Ensure a minimum visibility for 1 task
            const adjustedAlpha = 0.2 + (alpha * 0.8);
            dayCell.style.backgroundColor = `rgba(220, 53, 69, ${adjustedAlpha})`;
            dayCell.style.color = adjustedAlpha > 0.5 ? 'white' : 'inherit';
            dayCell.title = `${count} task${count > 1 ? 's' : ''} due`;
        }

        calendarGrid.appendChild(dayCell);
    }
}