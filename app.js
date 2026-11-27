let API_BASE = "";
let API_HEADERS = {};
let categories = [];

async function init() {
    const res = await fetch("config.json");
    const config = await res.json();

    const base = config.supabaseUrl.replace(/\/+$/, "");
    API_BASE = base.endsWith("/rest/v1") ? base : `${base}/rest/v1`;

    API_HEADERS = {
        "apikey": config.supabaseAnonKey,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
    if (config.supabaseAnonKey.startsWith("eyJ")) {
        API_HEADERS["Authorization"] = `Bearer ${config.supabaseAnonKey}`;
    }

    await loadCategories();
    await loadTasks();
}

async function loadCategories() {
    const res = await fetch(`${API_BASE}/categories?select=*&order=id.asc`, {
        headers: API_HEADERS
    });
    categories = await res.json();

    const categoryList = document.getElementById("category-list");
    const taskCategorySelect = document.getElementById("task-category");
    const filterCategorySelect = document.getElementById("filter-category");

    categoryList.innerHTML = "";
    taskCategorySelect.innerHTML = '<option value="">Select a category...</option>';
    filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';

    categories.forEach(cat => {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = cat.name;
        categoryList.appendChild(badge);

        const opt1 = document.createElement("option");
        opt1.value = cat.id;
        opt1.textContent = cat.name;
        taskCategorySelect.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = cat.id;
        opt2.textContent = cat.name;
        filterCategorySelect.appendChild(opt2);
    });
}

document.getElementById("category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("category-name");
    const name = nameInput.value.trim();
    if (!name) return;

    await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ name })
    });

    nameInput.value = "";
    await loadCategories();
});

async function loadTasks() {
    const categoryFilter = document.getElementById("filter-category").value;
    const statusFilter = document.getElementById("filter-status").value;

    let url = `${API_BASE}/tasks?select=*,categories(name)&order=id.asc`;
    if (categoryFilter !== "all") {
        url += `&category_id=eq.${categoryFilter}`;
    }
    if (statusFilter !== "all") {
        url += `&completed=eq.${statusFilter}`;
    }

    const res = await fetch(url, { headers: API_HEADERS });
    const tasks = await res.json();

    const taskList = document.getElementById("task-list");
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = "<li>No tasks found.</li>";
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = `task-item ${task.completed ? "completed" : ""}`;
        const categoryName = task.categories ? task.categories.name : "Uncategorized";

        li.innerHTML = `
            <div class="task-info">
                <strong class="task-title">${task.title}</strong>
                <span class="badge">${categoryName}</span>
                <div class="task-meta">${task.description || ""}</div>
            </div>
            <div class="task-actions">
                <button class="success" onclick="toggleTask(${task.id}, ${task.completed})">
                    ${task.completed ? "Undo" : "Complete"}
                </button>
                <button class="secondary" onclick="startEdit(${task.id}, '${escapeQuotes(task.title)}', '${escapeQuotes(task.description || "")}', ${task.category_id})">
                    Edit
                </button>
                <button class="danger" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("task-id").value;
    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-description").value.trim();
    const category_id = Number(document.getElementById("task-category").value);

    const payload = { title, description, category_id };

    if (id) {
        await fetch(`${API_BASE}/tasks?id=eq.${id}`, {
            method: "PATCH",
            headers: API_HEADERS,
            body: JSON.stringify(payload)
        });
    } else {
        await fetch(`${API_BASE}/tasks`, {
            method: "POST",
            headers: API_HEADERS,
            body: JSON.stringify({ ...payload, completed: false })
        });
    }

    resetForm();
    await loadTasks();
});

async function toggleTask(id, currentStatus) {
    await fetch(`${API_BASE}/tasks?id=eq.${id}`, {
        method: "PATCH",
        headers: API_HEADERS,
        body: JSON.stringify({ completed: !currentStatus })
    });
    await loadTasks();
}

async function deleteTask(id) {
    await fetch(`${API_BASE}/tasks?id=eq.${id}`, {
        method: "DELETE",
        headers: API_HEADERS
    });
    await loadTasks();
}

function startEdit(id, title, description, categoryId) {
    document.getElementById("task-id").value = id;
    document.getElementById("task-title").value = title;
    document.getElementById("task-description").value = description;
    document.getElementById("task-category").value = categoryId || "";
    document.getElementById("form-title").textContent = "Edit Task";
    document.getElementById("save-task-btn").textContent = "Update Task";
    document.getElementById("cancel-edit-btn").classList.remove("hidden");
}

function resetForm() {
    document.getElementById("task-form").reset();
    document.getElementById("task-id").value = "";
    document.getElementById("form-title").textContent = "Create New Task";
    document.getElementById("save-task-btn").textContent = "Add Task";
    document.getElementById("cancel-edit-btn").classList.add("hidden");
}

document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);
document.getElementById("filter-category").addEventListener("change", loadTasks);
document.getElementById("filter-status").addEventListener("change", loadTasks);

init();