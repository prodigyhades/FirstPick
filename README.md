# FirstPick: Smart Task Analyzer 🧠

A Django-based application that intelligently prioritizes tasks based on urgency, importance, effort, and dependencies. Built for the Singularium Technologies Internship Assessment.

---

## 1. How the Algorithm Works

The core of this application is a weighted scoring algorithm located in `tasks/scoring.py`. It assigns a normalized priority score (0.0 - 100.0) to each task based on four key heuristics.

### I. Urgency (Non-Linear Decay)
Urgency is calculated relative to the `due_date`.
* **Overdue Tasks:** Receive a massive score boost (>100) to ensure immediate visibility.
* **Imminent Tasks (0-2 days):** Locked at maximum urgency score.
* **Future Tasks:** Score decays linearly over a 21-day window. Tasks due further out receive progressively lower scores, ensuring the user focuses on immediate deadlines.

### II. Importance
Importance is a direct normalization of the user-assigned integer (1-10).
* Formula: `(Importance / 10)`
* Result: A level 10 task contributes 100% of the importance weight, while a level 1 task contributes 10%.

### III. Effort (The "Quick Win" Heuristic)
To prevent "analysis paralysis," the system rewards low-effort tasks to encourage clearing the backlog.
* **Quick Tasks (< 2 hours):** Receive a bonus score.
* **Long Tasks (> 8 hours):** Receive no effort bonus.

### IV. Dependency Propagation
* **Blocking Bonus:** Tasks that block other tasks receive a significant score increase. This ensures bottlenecks are cleared first.
* **Circular Dependency Protection:** The system performs a Depth-First Search (DFS) to detect cycles (e.g., A -> B -> A). If a cycle is detected, the involved tasks are penalized to prevent infinite loops, and the user is flagged via the explanation output.

---

## 2. Bonus Challenges Implemented 🏆

In addition to the core requirements, the following bonus features were implemented:

* **Date Intelligence (Workload Heatmap):** A custom-built, 3-column Dashboard featuring a calendar heatmap. It visualizes the density of deadlines per day (darker red = higher workload), allowing users to spot crunch days at a glance.
* **Unit Tests:** Comprehensive test suite covering scoring logic, circular dependency detection, and overdue handling.
* **Dynamic Strategies:** Users can toggle between "Fastest Wins", "High Impact", and "Deadline Driven" modes to adjust the algorithm's weighting dynamically.

---

## 3. API Endpoints

The backend exposes the following RESTful endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/tasks/analyze/?strategy=<strategy>` | Accepts a list of tasks, saves them, and returns them sorted by priority score. |
| **GET** | `/api/tasks/suggest/?strategy=<strategy>` | Returns the top 3 suggested tasks for *today* based on the current database state. |

---

## 4. Design Decisions & Trade-offs

**Zero-Dependency Frontend**
*   **Decision:** Built using Vanilla JavaScript, HTML5, and CSS3.
*   **Rationale:** Avoided the complexity of a build chain (Webpack/React) for a focused MVP. This ensures the application is lightweight and browser-native.
*   **Features:** Includes a custom **Workload Heatmap** to visualize task density over the month and a **Dynamic Strategy Selector**.

**Weighted Scoring Model**
*   **Decision:** Implemented a multi-factor normalized scoring system rather than a simple SQL `ORDER BY`.
*   **Rationale:** Real-world prioritization is complex. A low-importance task due tomorrow should not necessarily outrank a critical project due in 3 days. The weighted model balances these competing factors.

**Depth-First Search (DFS) for Validation**
*   **Decision:** Used DFS for cycle detection in the dependency graph.
*   **Rationale:** While computationally more expensive than a linear check, it is the only robust mathematical method to guarantee the scoring engine does not enter an infinite recursion loop.

---

## 5. Time Breakdown

| Phase | Duration |
| :--- | :--- |
| **Backend Architecture** (Models, Views, API) | 1 hr 00 mins |
| **Algorithm Design** (Scoring Logic & DFS) | 1 hr 15 mins |
| **Frontend Development** (UI/UX & Integration) | 1 hr 30 mins |
| **Testing & Documentation** | 0 hr 45 mins |
| **Total** | **~4.5 Hours** |

---

## 6. Future Improvements

With more time, the following features would be prioritized:
*   **Authentication:** Multi-user support with private task lists.
*   **Drag-and-Drop Interface:** Visual dependency mapping to link tasks intuitively.
*   **Database Upgrade:** Migration from SQLite to PostgreSQL for production concurrency.
*   **Persistent History:** Analytics tracking how a task's priority score evolves over time.

---

## 7. Setup Instructions

**1. Clone the repository**
```bash
git clone <repository_url>
cd Smart_Task_Analyzer
```

**2. Create and Activate Virtual Environment**
```bash
python -m venv venv
# Windows (Git Bash):
source venv/Scripts/activate
# Windows (Command Prompt):
# venv\Scripts\activate
```

**3. Install Dependencies**
```bash
pip install -r requirements.txt
```

**4. Initialise Database**
```bash
cd backend
python manage.py migrate
```

**5. Start Server**
```bash
python manage.py runserver
```

**6. Launch Application**
Open `frontend/index.html` in your web browser.
