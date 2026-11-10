const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE = { tasks: "campushub_tasks_v1", notes: "campushub_notes_v1" };
let tasks = readStore(STORAGE.tasks, []);
let notes = readStore(STORAGE.notes, []);
let currentFilter = "all";
let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}
function formatDate(dateString) {
  if (!dateString) return "No due date";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month:"short", day:"numeric" });
}
function render() {
  const completed = tasks.filter(task => task.done).length;
  const pending = tasks.length - completed;
  $("#completedStat").textContent = completed;
  $("#pendingStat").textContent = pending;
  $("#notesStat").textContent = notes.length;
  $("#taskNavCount").textContent = pending;
  $("#taskCountLabel").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressRing").style.background = `conic-gradient(var(--purple) ${percent * 3.6}deg, #eeecf6 0deg)`;
  $("#progressCaption").textContent = tasks.length ? (percent === 100 ? "Everything is checked off. Amazing work!" : "You're making progress. Keep going!") : "Start with one task. You've got this!";
  renderTasks($("#todayTaskList"), tasks.slice(0, 4));
  const filtered = tasks.filter(task => currentFilter === "all" || (currentFilter === "active" ? !task.done : task.done));
  renderTasks($("#allTaskList"), filtered);
  renderNotes();
}
function renderTasks(container, list) {
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><b>Nothing here yet.</b>Add a task and make a start.</div>`;
    return;
  }
  container.innerHTML = list.map(task => `
    <div class="task-item ${task.done ? "is-done" : ""}">
      <input class="task-check" type="checkbox" data-toggle="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark ${escapeHTML(task.title)} complete">
      <div class="task-main"><span class="task-title">${escapeHTML(task.title)}</span><div class="task-meta"><span>${escapeHTML(task.category)}</span><span>•</span><span>${formatDate(task.due)}</span></div></div>
      <span class="priority ${task.priority}">${escapeHTML(task.priority)}</span>
      <button class="delete-task" data-delete="${task.id}" aria-label="Delete task">×</button>
    </div>`).join("");
}
function renderNotes() {
  $("#notesGrid").innerHTML = notes.length ? notes.map(note => `
    <article class="note-card"><button class="note-delete" data-note-delete="${note.id}" aria-label="Delete note">×</button>
      <h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.body)}</p><small>${new Date(note.created).toLocaleDateString()}</small>
    </article>`).join("") : `<div class="empty-state"><b>Your notes will show up here.</b>Save an idea, reminder or useful link.</div>`;
}
function openTaskModal() {
  $("#taskModal").classList.add("show");
  $("#taskModal").setAttribute("aria-hidden", "false");
  $("#taskTitle").focus();
}
function closeTaskModal() {
  $("#taskModal").classList.remove("show");
  $("#taskModal").setAttribute("aria-hidden", "true");
  $("#taskForm").reset();
}
function addTask(event) {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  tasks.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title, category: $("#taskCategory").value, due: $("#taskDue").value, priority: $("#taskPriority").value, done: false });
  saveStore(STORAGE.tasks, tasks);
  render(); closeTaskModal(); showToast("Task added to your list.");
}
function navigate(view) {
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `${view}View`));
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#crumbTitle").textContent = view.charAt(0).toUpperCase() + view.slice(1);
  $("#sidebar").classList.remove("open");
}
function saveNote() {
  const title = $("#noteTitle").value.trim();
  const body = $("#noteBody").value.trim();
  if (!title || !body) { showToast("Add a title and some note text first."); return; }
  notes.unshift({ id: String(Date.now()), title, body, created: new Date().toISOString() });
  saveStore(STORAGE.notes, notes);
  $("#noteTitle").value = ""; $("#noteBody").value = "";
  render(); showToast("Note saved.");
}
function setTimer(minutes, mode) {
  pauseTimer();
  timerSeconds = minutes * 60;
  $("#timerMode").textContent = mode;
  updateTimerDisplay();
  $$(".mode-btn").forEach(button => button.classList.toggle("active", Number(button.dataset.minutes) === minutes));
}
function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  $("#timerDisplay").textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}
function pauseTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null; timerRunning = false;
  $("#timerStart").textContent = "Start session";
}
function startTimer() {
  if (timerRunning) { pauseTimer(); return; }
  timerRunning = true; $("#timerStart").textContent = "Pause";
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      pauseTimer();
      showToast("Session complete. Take a short break!");
      $("#timerStart").textContent = "Start again";
    }
  }, 1000);
}

$("#todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
const hour = new Date().getHours();
$("#greeting").textContent = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";
$$(".nav-link").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$$("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
["#addTaskTop", "#addTaskInline", "#addTaskPage"].forEach(selector => $(selector).addEventListener("click", openTaskModal));
$("#closeModal").addEventListener("click", closeTaskModal);
$("#cancelModal").addEventListener("click", closeTaskModal);
$("#taskModal").addEventListener("click", event => { if (event.target === $("#taskModal")) closeTaskModal(); });
$("#taskForm").addEventListener("submit", addTask);
$("#saveNote").addEventListener("click", saveNote);
$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$$(".filter-btn").forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  $$(".filter-btn").forEach(item => item.classList.toggle("active", item === button));
  render();
}));
document.addEventListener("click", event => {
  const toggle = event.target.closest("[data-toggle]");
  const remove = event.target.closest("[data-delete]");
  const noteRemove = event.target.closest("[data-note-delete]");
  if (toggle) {
    const task = tasks.find(item => item.id === toggle.dataset.toggle);
    if (task) task.done = toggle.checked;
    saveStore(STORAGE.tasks, tasks); render();
  }
  if (remove) {
    tasks = tasks.filter(item => item.id !== remove.dataset.delete);
    saveStore(STORAGE.tasks, tasks); render(); showToast("Task deleted.");
  }
  if (noteRemove) {
    notes = notes.filter(item => item.id !== noteRemove.dataset.noteDelete);
    saveStore(STORAGE.notes, notes); render(); showToast("Note deleted.");
  }
});
$$(".mode-btn").forEach(button => button.addEventListener("click", () => setTimer(Number(button.dataset.minutes), button.dataset.mode)));
$("#timerStart").addEventListener("click", startTimer);
$("#timerReset").addEventListener("click", () => {
  const active = $(".mode-btn.active");
  setTimer(Number(active.dataset.minutes), active.dataset.mode);
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeTaskModal(); });
render();
