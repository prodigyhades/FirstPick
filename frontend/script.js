let taskList = [];
let currentDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize from hidden textarea if present
    const inputElement = document.getElementById('task-input');
    if (inputElement && inputElement.value.trim()) {
        try {
            taskList = JSON.parse(inputElement.value);
        } catch (e) {
            console.error("Failed to parse initial JSON", e);
        }
    }

    // Modal Logic
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.querySelector(".close-modal");

    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.style.display = "none";
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Sliders
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

    // Initial Renders
    renderCalendar();
    updateStats();
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
    const hue = ((100 - percentage) * 1.2).toFixed(0);
    const color = `hsl(${hue}, 100%, 50%)`;

    slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
}

function addTask() {
    const title = document.getElementById('new-task-title').value;
    const dueDate = document.getElementById('new-task-due').value;
    const importanceInput = document.getElementById('new-task-importance').value;
    const hoursInput = document.getElementById('new-task-hours').value;
    const depsStr = document.getElementById('new-task-deps').value;
    const errorMessage = document.getElementById('error-message');

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

    // Clear inputs
    document.getElementById('new-task-title').value = '';
    document.getElementById('new-task-due').value = '';
    document.getElementById('new-task-importance').value = '';
    document.getElementById('new-task-hours').value = '';
    document.getElementById('new-task-deps').value = '';

    renderCalendar();
    updateStats();

    // Animate button
    const btn = document.querySelector('.btn-primary');
    btn.innerHTML = '<i class="ri-check-line"></i> Added!';
    setTimeout(() => {
        btn.innerHTML = '<i class="ri-add-line"></i> Add to Queue';
    }, 1500);
}

async function analyzeTasks() {
    const inputElement = document.getElementById('task-input');
    const strategyElement = document.getElementById('strategy-select');
    const resultsContainer = document.getElementById('results-container');
    const errorMessage = document.getElementById('error-message');
    const badge = document.getElementById('task-count-badge');

    resultsContainer.innerHTML = '<div class="empty-state"><i class="ri-loader-4-line ri-spin"></i><p>Analyzing...</p></div>';
    errorMessage.textContent = '';

    try {
        const tasksJson = inputElement.value;
        if (!tasksJson.trim()) {
            throw new Error("Please enter tasks in JSON format.");
        }

        let tasks;
        try {
            tasks = JSON.parse(tasksJson);
            // Ensure IDs
            tasks = tasks.map((t, index) => {
                if (!t.id) return { ...t, id: Date.now() + index };
                return t;
            });
            taskList = tasks;
            inputElement.value = JSON.stringify(taskList, null, 2);
            renderCalendar();
            updateStats();
        } catch (e) { }

        const strategy = strategyElement ? strategyElement.value : 'smart_balance';
        const response = await fetch(`http://127.0.0.1:8000/api/tasks/analyze/?strategy=${strategy}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskList)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        renderResults(data.tasks);

        if (badge) badge.textContent = data.tasks.length;

    } catch (error) {
        errorMessage.textContent = error.message;
        resultsContainer.innerHTML = '<div class="empty-state"><i class="ri-error-warning-line"></i><p>Analysis failed.</p></div>';
    }
}

function renderResults(tasks) {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '';

    if (tasks.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state"><i class="ri-check-double-line"></i><p>All caught up!</p></div>';
        return;
    }

    tasks.forEach((task, index) => {
        const card = document.createElement('div');
        card.className = `task-card ${getPriorityClass(task.score)}`;
        // Stagger animation
        card.style.animationDelay = `${index * 0.1}s`;

        const scoreDisplay = (task.score).toFixed(2);
        const dueDateDisplay = task.due_date ? task.due_date : 'No Date';

        card.innerHTML = `
            <h3>${escapeHtml(task.title)}</h3>
            <div class="task-meta">
                <span><i class="ri-bar-chart-fill"></i> Score: <strong>${scoreDisplay}</strong></span>
                <span><i class="ri-calendar-line"></i> ${dueDateDisplay}</span>
            </div>
            <div class="task-explanation">
                ${escapeHtml(task.explanation)}
            </div>
            <div class="task-actions">
                <button class="btn-action btn-complete" onclick="completeTask(${task.id})"><i class="ri-check-line"></i> Done</button>
                <button class="btn-action btn-edit" onclick="openEditModal(${task.id})"><i class="ri-pencil-line"></i> Edit</button>
                <button class="btn-action btn-delete" onclick="deleteTask(${task.id})"><i class="ri-delete-bin-line"></i></button>
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
        renderCalendar();
        updateStats();
        analyzeTasks();
    } catch (e) {
        console.error("Error deleting task", e);
    }
}

function completeTask(id) {
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

        updateSlider(document.getElementById('edit-task-importance'), 'edit-importance-val');
        updateSlider(document.getElementById('edit-task-hours'), 'edit-hours-val');

        document.getElementById('edit-modal').style.display = "flex"; // Flex for centering
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
            renderCalendar();
            updateStats();
            analyzeTasks();
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
        btn.innerHTML = '<i class="ri-code-s-slash-line"></i> Hide JSON';
    } else {
        container.classList.add('hidden');
        btn.innerHTML = '<i class="ri-code-s-slash-line"></i> Advanced JSON';
    }
}

// --- Live Stats Widget Logic ---
function updateStats() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];

    let countToday = 0;
    let countMonth = 0;
    let countYear = 0;

    taskList.forEach(task => {
        if (task.due_date) {
            const taskDate = new Date(task.due_date);
            const taskDateStr = task.due_date; // Assuming YYYY-MM-DD format

            if (taskDateStr === todayStr) {
                countToday++;
            }
            if (taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear) {
                countMonth++;
            }
            if (taskDate.getFullYear() === currentYear) {
                countYear++;
            }
        }
    });

    animateValue("stat-today", parseInt(document.getElementById("stat-today").textContent), countToday, 1000);
    animateValue("stat-month", parseInt(document.getElementById("stat-month").textContent), countMonth, 1000);
    animateValue("stat-year", parseInt(document.getElementById("stat-year").textContent), countYear, 1000);
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);

    // If stepTime is too small (large range), just jump to end to avoid freezing
    if (stepTime < 10) {
        obj.textContent = end;
        return;
    }

    const timer = setInterval(function () {
        current += increment;
        obj.textContent = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// --- Heatmap / Calendar Logic ---
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    document.getElementById('current-month-year').textContent = `${monthNames[month]} ${year}`;

    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';

    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const taskCounts = {};
    let maxTasks = 0;

    taskList.forEach(task => {
        if (task.due_date) {
            const dateStr = task.due_date;
            taskCounts[dateStr] = (taskCounts[dateStr] || 0) + 1;
            if (taskCounts[dateStr] > maxTasks) {
                maxTasks = taskCounts[dateStr];
            }
        }
    });

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        emptyCell.style.background = 'transparent';
        calendarGrid.appendChild(emptyCell);
    }

    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = i;

        const currentMonthStr = (month + 1).toString().padStart(2, '0');
        const dayStr = i.toString().padStart(2, '0');
        const dateString = `${year}-${currentMonthStr}-${dayStr}`;

        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            dayCell.classList.add('today');
        }

        if (taskCounts[dateString]) {
            const count = taskCounts[dateString];
            const alpha = maxTasks > 0 ? (count / maxTasks) : 0;
            // Use brand color (Indigo) for heatmap
            const adjustedAlpha = 0.2 + (alpha * 0.8);
            dayCell.style.backgroundColor = `rgba(99, 102, 241, ${adjustedAlpha})`;
            dayCell.style.color = adjustedAlpha > 0.5 ? 'white' : 'inherit';
            dayCell.title = `${count} task${count > 1 ? 's' : ''} due`;
        }

        calendarGrid.appendChild(dayCell);
    }
}