/**
 * BørneRutiner - Kids Routine Tracker Card for Home Assistant
 * A Lovelace card where children can track daily routines
 * and parents can manage tasks behind a PIN code.
 *
 * Version: 1.0.1
 */

const STORAGE_KEY = "boerne-rutiner";
const STORAGE_ENTITY = "sensor.boerne_rutiner_data";
const VERSION = "1.0.1";

/* ───────── Default routines (template for new children) ───────── */
function defaultRoutines() {
  return [
    {
      id: _uid(),
      name: "Morning Routine",
      icon: "☀️",
      color: "#FF9800",
      tasks: [
        { id: _uid(), name: "Brush teeth", icon: "🪥" },
        { id: _uid(), name: "Get dressed", icon: "👕" },
        { id: _uid(), name: "Eat breakfast", icon: "🥣" },
        { id: _uid(), name: "Pack school bag", icon: "🎒" },
      ],
    },
    {
      id: _uid(),
      name: "After School",
      icon: "📚",
      color: "#2196F3",
      tasks: [
        { id: _uid(), name: "Homework", icon: "📝" },
        { id: _uid(), name: "Tidy room", icon: "🧹" },
        { id: _uid(), name: "Set the table", icon: "🍽️" },
      ],
    },
    {
      id: _uid(),
      name: "Evening Routine",
      icon: "🌙",
      color: "#7C4DFF",
      tasks: [
        { id: _uid(), name: "Shower / Bath", icon: "🚿" },
        { id: _uid(), name: "Brush teeth", icon: "🪥" },
        { id: _uid(), name: "Put on pajamas", icon: "👕" },
        { id: _uid(), name: "Read a book", icon: "📖" },
      ],
    },
  ];
}

function defaultData() {
  return {
    pin: "1234",
    children: [
      { id: _uid(), name: "Child 1", avatar: "👦", routines: defaultRoutines() },
    ],
    completions: {},
  };
}

/* ───────── Helpers ───────── */
function _uid() {
  return Math.random().toString(36).substring(2, 10);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ROUTINE_COLORS = [
  "#FF9800", "#2196F3", "#7C4DFF", "#4CAF50", "#E91E63",
  "#00BCD4", "#FF5722", "#9C27B0", "#009688", "#795548",
];

/* ───────── Storage (server‑level shared entity) ───────── */

/**
 * Migrate old format (global routines object) → new format (per‑child routines array).
 */
function _migrateData(d) {
  if (!d.routines) return d; // already new format or default
  // Old format: d.routines = { morning: {name,icon,color,tasks}, ... }
  const globalRoutines = Object.values(d.routines).map((r) => ({
    id: _uid(),
    name: r.name,
    icon: r.icon,
    color: r.color,
    tasks: (r.tasks || []).map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
  }));
  (d.children || []).forEach((child) => {
    if (!child.routines) {
      // Deep clone so each child gets independent copy
      child.routines = JSON.parse(JSON.stringify(globalRoutines));
      // Give each child unique routine/task IDs
      child.routines.forEach((r) => {
        r.id = _uid();
        r.tasks.forEach((t) => { t.id = _uid(); });
      });
    }
  });
  delete d.routines;
  console.info("BørneRutiner: migrated from global routines to per‑child routines.");
  return d;
}

function ensureStructure(d) {
  d = _migrateData(d);
  if (!d.children || d.children.length === 0) {
    d.children = defaultData().children;
  }
  d.children.forEach((child) => {
    if (!child.routines || child.routines.length === 0) {
      child.routines = defaultRoutines();
    }
  });
  if (!d.completions) d.completions = {};
  if (!d.pin) d.pin = "1234";
  return d;
}

function _pruneCompletions(data) {
  const keys = Object.keys(data.completions || {});
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  keys.forEach((k) => { if (new Date(k) < cutoff) delete data.completions[k]; });
}

/** Parse the store attribute from the shared entity. */
function _parseStore(entity) {
  if (!entity?.attributes?.store) return null;
  try {
    const raw = entity.attributes.store;
    return ensureStructure(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch (_) { return null; }
}

async function loadDataShared(hass) {
  // 1. Shared entity
  const fromEntity = _parseStore(hass.states?.[STORAGE_ENTITY]);
  if (fromEntity) return fromEntity;

  // 2. Per‑user storage (migration / restart recovery)
  try {
    const result = await hass.callWS({ type: "frontend/get_user_data", key: STORAGE_KEY });
    if (result?.value) {
      console.info("BørneRutiner: restoring data from per‑user storage to shared entity.");
      return ensureStructure(result.value);
    }
  } catch (_) { /* ignore */ }

  // 3. localStorage legacy
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return ensureStructure(JSON.parse(raw));
  } catch (_) { /* ignore */ }

  return defaultData();
}

function saveDataShared(hass, data) {
  _pruneCompletions(data);

  if (!hass) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return;
  }

  hass.callApi("POST", `states/${STORAGE_ENTITY}`, {
    state: todayKey(),
    attributes: {
      friendly_name: "B\u00f8rneRutiner Data",
      icon: "mdi:clipboard-check-outline",
      store: data,
    },
  }).catch((e) => {
    console.warn("B\u00f8rneRutiner: shared entity save failed.", e);
  });

  hass.callWS({ type: "frontend/set_user_data", key: STORAGE_KEY, value: data }).catch(() => {});
}

/* ───────── Confetti mini-module ───────── */
function launchConfetti(container) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;";
  container.style.position = "relative";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  const pieces = [];
  const colors = ["#FF9800", "#2196F3", "#7C4DFF", "#4CAF50", "#E91E63", "#FFEB3B"];
  for (let i = 0; i < 60; i++) {
    pieces.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 1) * 10 - 2,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10,
      life: 1,
    });
  }
  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach((p) => {
      p.x += p.vx;
      p.vy += 0.25;
      p.y += p.vy;
      p.rot += p.rv;
      p.life -= 0.012;
      if (p.life <= 0) return;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    frame++;
    if (alive && frame < 120) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}

/* ═══════════════════════════════════════
   Main Card Class
   ═══════════════════════════════════════ */
class BoerneRutinerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = defaultData();
    this._dataLoaded = false;
    this._selectedChild = 0;
    this._activeRoutine = 0; // index into child.routines[]
    this._adminMode = false;
    this._adminView = "tasks"; // tasks | children | pin
    this._adminChild = 0;     // which child we're editing in admin
    this._adminRoutine = 0;   // which routine index in admin
    this._editingTask = null;
    this._editingChild = null;
    this._editingRoutine = null;
    this._lastEntityUpdate = null;
    this._lastSaveTime = 0;
  }

  /* ── Lifecycle (visibility‑based refresh) ── */
  connectedCallback() {
    this._onVisibilityChange = () => {
      if (document.visibilityState === "visible" && this._hass && this._dataLoaded) {
        this._resync();
      }
    };
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  disconnectedCallback() {
    if (this._onVisibilityChange) {
      document.removeEventListener("visibilitychange", this._onVisibilityChange);
    }
  }

  /* ── Lovelace interface ── */
  setConfig(config) {
    this._config = config;
    if (this._dataLoaded) this._render();
  }

  set hass(hass) {
    const hadHass = !!this._hass;
    this._hass = hass;
    if (!hadHass && hass && !this._dataLoaded) {
      this._loadFromHA();
      return;
    }
    if (this._dataLoaded && hass) {
      const entity = hass.states?.[STORAGE_ENTITY];
      if (entity) {
        const lu = entity.last_updated;
        if (lu !== this._lastEntityUpdate) {
          this._lastEntityUpdate = lu;
          if (Date.now() - this._lastSaveTime > 2000) {
            this._syncFromEntity(entity);
          }
        }
      }
    }
  }

  async _loadFromHA() {
    this._data = await loadDataShared(this._hass);
    if (this._config?.pin && !this._data._pinOverridden) {
      this._data.pin = this._config.pin;
      this._data._pinOverridden = true;
    }
    this._dataLoaded = true;
    this._lastSaveTime = Date.now();
    saveDataShared(this._hass, this._data);
    const entity = this._hass.states?.[STORAGE_ENTITY];
    if (entity) this._lastEntityUpdate = entity.last_updated;
    this._render();
  }

  _syncFromEntity(entity) {
    const fresh = _parseStore(entity);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(this._data)) {
      this._data = fresh;
      this._render();
    }
  }

  _resync() {
    if (!this._hass) return;
    const entity = this._hass.states?.[STORAGE_ENTITY];
    if (entity) {
      this._lastEntityUpdate = entity.last_updated;
      this._syncFromEntity(entity);
    }
  }

  _save() {
    this._lastSaveTime = Date.now();
    saveDataShared(this._hass, this._data);
  }

  getCardSize() { return 6; }
  static getStubConfig() { return {}; }

  /* ── Helpers to get child / routine safely ── */
  _currentChild() {
    const children = this._data.children;
    if (!children.length) return null;
    if (this._selectedChild >= children.length) this._selectedChild = 0;
    return children[this._selectedChild];
  }

  _childRoutines(child) {
    return child?.routines || [];
  }

  _currentRoutine(child) {
    const routines = this._childRoutines(child);
    if (!routines.length) return null;
    if (this._activeRoutine >= routines.length) this._activeRoutine = 0;
    return routines[this._activeRoutine];
  }

  /* ── Completions helpers ── */
  _getCompletions(childId, routineId) {
    const day = todayKey();
    const c = this._data.completions;
    if (!c[day]) c[day] = {};
    if (!c[day][childId]) c[day][childId] = {};
    if (!c[day][childId][routineId]) c[day][childId][routineId] = {};
    return c[day][childId][routineId];
  }

  _toggleTask(childId, routineId, taskId) {
    const comp = this._getCompletions(childId, routineId);
    comp[taskId] = !comp[taskId];
    this._save();

    const child = this._data.children.find((c) => c.id === childId);
    const routine = child?.routines.find((r) => r.id === routineId);
    if (routine) {
      const allDone = routine.tasks.every((t) => comp[t.id]);
      if (allDone) {
        setTimeout(() => {
          const container = this.shadowRoot.querySelector(".card-container");
          if (container) launchConfetti(container);
        }, 150);
      }
    }
    this._render();
  }

  _getProgress(childId, routineId) {
    const child = this._data.children.find((c) => c.id === childId);
    const routine = child?.routines.find((r) => r.id === routineId);
    if (!routine || routine.tasks.length === 0) return 0;
    const comp = this._getCompletions(childId, routineId);
    const done = routine.tasks.filter((t) => comp[t.id]).length;
    return Math.round((done / routine.tasks.length) * 100);
  }

  /* ── Admin helpers ── */
  _verifyPin(entered) {
    return entered === this._data.pin;
  }

  _changePin(newPin) {
    this._data.pin = newPin;
    this._save();
  }

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */
  _render() {
    if (!this._dataLoaded) {
      this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>
        <ha-card>
          <div class="card-container">
            <div class="loading">Loading routines…</div>
          </div>
        </ha-card>
      `;
      return;
    }

    const child = this._currentChild();

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        <div class="card-container">
          ${this._renderHeader()}
          ${this._adminMode ? this._renderAdmin() : this._renderMain(child)}
        </div>
      </ha-card>
    `;
    this._attachEvents();
  }

  /* ── Header ── */
  _renderHeader() {
    return `
      <div class="header">
        <div class="header-left">
          <span class="header-icon">📋</span>
          <span class="header-title">${this._config?.title || "Kids Routines"}</span>
        </div>
        <button class="icon-btn settings-btn" data-action="toggle-admin" title="Parent Settings">
          ${this._adminMode ? "✕" : "⚙️"}
        </button>
      </div>
    `;
  }

  /* ── Main child view ── */
  _renderMain(child) {
    if (!child) return `<div class="empty">No children added. Open settings to add one.</div>`;
    const routine = this._currentRoutine(child);
    return `
      ${this._renderChildTabs()}
      ${this._renderRoutineTabs(child)}
      ${routine ? this._renderTasks(child, routine) : `<div class="empty">No routines yet.</div>`}
    `;
  }

  _renderChildTabs() {
    return `
      <div class="child-tabs">
        ${this._data.children
          .map(
            (c, i) => `
          <button class="child-tab ${i === this._selectedChild ? "active" : ""}"
                  data-action="select-child" data-index="${i}">
            <span class="child-avatar">${c.avatar}</span>
            <span class="child-name">${c.name}</span>
          </button>`
          )
          .join("")}
      </div>
    `;
  }

  _renderRoutineTabs(child) {
    const routines = this._childRoutines(child);
    if (routines.length === 0) return "";
    return `
      <div class="routine-tabs">
        ${routines
          .map((r, i) => {
            const pct = this._getProgress(child.id, r.id);
            return `
            <button class="routine-tab ${i === this._activeRoutine ? "active" : ""}"
                    data-action="select-routine" data-index="${i}"
                    style="--routine-color: ${r.color}">
              <span class="routine-icon">${r.icon}</span>
              <span class="routine-label">${r.name}</span>
              <span class="routine-pct">${pct}%</span>
            </button>`;
          })
          .join("")}
      </div>
    `;
  }

  _renderTasks(child, routine) {
    const comp = this._getCompletions(child.id, routine.id);
    const pct = this._getProgress(child.id, routine.id);
    const allDone = pct === 100 && routine.tasks.length > 0;

    return `
      <div class="tasks-section">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width:${pct}%; background:${routine.color}"></div>
        </div>
        ${allDone ? `<div class="all-done">🎉 All done! Great job, ${child.name}!</div>` : ""}
        <div class="task-list">
          ${routine.tasks
            .map(
              (t) => `
            <button class="task-item ${comp[t.id] ? "done" : ""}"
                    data-action="toggle-task" data-routine="${routine.id}" data-task="${t.id}">
              <span class="task-check">${comp[t.id] ? "✅" : "⬜"}</span>
              <span class="task-icon">${t.icon}</span>
              <span class="task-name">${t.name}</span>
            </button>`
            )
            .join("")}
        </div>
        ${routine.tasks.length === 0 ? `<div class="empty">No tasks yet.</div>` : ""}
      </div>
    `;
  }

  /* ══════════════════════════════════
     ADMIN PANEL
     ══════════════════════════════════ */
  _renderAdmin() {
    if (!this._adminUnlocked) {
      return this._renderPinEntry();
    }

    return `
      <div class="admin-panel">
        <div class="admin-tabs">
          <button class="admin-tab ${this._adminView === "tasks" ? "active" : ""}"
                  data-action="admin-view" data-view="tasks">📝 Routines</button>
          <button class="admin-tab ${this._adminView === "children" ? "active" : ""}"
                  data-action="admin-view" data-view="children">👶 Children</button>
          <button class="admin-tab ${this._adminView === "pin" ? "active" : ""}"
                  data-action="admin-view" data-view="pin">🔑 PIN</button>
        </div>
        <div class="admin-content">
          ${this._adminView === "tasks" ? this._renderAdminRoutines() : ""}
          ${this._adminView === "children" ? this._renderAdminChildren() : ""}
          ${this._adminView === "pin" ? this._renderAdminPin() : ""}
        </div>
      </div>
    `;
  }

  _renderPinEntry() {
    return `
      <div class="pin-entry">
        <div class="pin-title">🔒 Parent Login</div>
        <div class="pin-subtitle">Enter PIN to access settings</div>
        <div class="pin-dots">
          <span class="pin-dot ${this._pinBuffer?.length >= 1 ? "filled" : ""}"></span>
          <span class="pin-dot ${this._pinBuffer?.length >= 2 ? "filled" : ""}"></span>
          <span class="pin-dot ${this._pinBuffer?.length >= 3 ? "filled" : ""}"></span>
          <span class="pin-dot ${this._pinBuffer?.length >= 4 ? "filled" : ""}"></span>
        </div>
        ${this._pinError ? `<div class="pin-error">Incorrect PIN</div>` : ""}
        <div class="pin-pad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"]
            .map(
              (n) =>
                n === ""
                  ? `<div class="pin-key empty"></div>`
                  : `<button class="pin-key" data-action="pin-key" data-key="${n}">${n}</button>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  /* ── Admin: Routines & Tasks (per child) ── */
  _renderAdminRoutines() {
    const children = this._data.children;
    if (children.length === 0) return `<div class="empty">Add a child first.</div>`;
    if (this._adminChild >= children.length) this._adminChild = 0;
    const child = children[this._adminChild];
    const routines = child.routines || [];
    if (this._adminRoutine >= routines.length) this._adminRoutine = Math.max(0, routines.length - 1);
    const routine = routines[this._adminRoutine];

    return `
      <div class="admin-tasks">
        <!-- Child selector -->
        <div class="admin-child-selector">
          ${children
            .map(
              (c, i) => `
            <button class="child-tab small ${i === this._adminChild ? "active" : ""}"
                    data-action="admin-select-child" data-index="${i}">
              <span class="child-avatar">${c.avatar}</span>
              <span class="child-name">${c.name}</span>
            </button>`
            )
            .join("")}
        </div>

        <!-- Routine tabs + add button -->
        <div class="admin-routine-tabs">
          ${routines
            .map(
              (r, i) => `
            <button class="admin-routine-tab ${i === this._adminRoutine ? "active" : ""}"
                    data-action="admin-routine" data-index="${i}"
                    draggable="true" data-drag-type="routine" data-drag-index="${i}"
                    style="--tab-color: ${r.color}">
              <span class="drag-handle-inline" data-drag-grip>⠿</span> ${r.icon} ${r.name}
            </button>`
            )
            .join("")}
          <button class="admin-routine-tab add-routine-tab" data-action="add-routine" title="Add routine to this child">➕</button>
        </div>

        ${routine && this._data.children.length > 1 ? `
        <button class="add-all-btn" data-action="copy-routine-all">👨‍👩‍👧‍👦 Kopiér denne rutine til alle børn</button>` : ""}

        ${routine ? this._renderAdminRoutineDetail(child, routine) : `<div class="empty">No routines. Click ➕ to add one.</div>`}
      </div>
    `;
  }

  _renderAdminRoutineDetail(child, routine) {
    const isEditingRoutine = this._editingRoutine && this._editingRoutine.id === routine.id;

    return `
      <!-- Routine settings -->
      <div class="routine-settings">
        ${isEditingRoutine ? `
        <div class="routine-edit-row">
          <input type="text" class="form-input inline-icon-input" id="edit-routine-icon" value="${this._editingRoutine.icon}" maxlength="4">
          <input type="text" class="form-input inline-name-input" id="edit-routine-name" value="${this._editingRoutine.name}">
          <input type="color" class="color-input" id="edit-routine-color" value="${this._editingRoutine.color}">
          <button class="small-btn add-btn" data-action="save-routine">💾</button>
          <button class="small-btn" data-action="cancel-edit-routine">✕</button>
        </div>
        ` : `
        <div class="routine-edit-row">
          <span class="routine-icon">${routine.icon}</span>
          <span class="routine-detail-name">${routine.name}</span>
          <span class="routine-color-dot" style="background:${routine.color}"></span>
          <button class="small-btn edit-btn" data-action="edit-routine"
                  data-name="${routine.name}" data-icon="${routine.icon}" data-color="${routine.color}">✏️</button>
          <button class="small-btn del-btn" data-action="delete-routine">🗑️</button>
        </div>
        `}
      </div>

      <!-- Task list -->
      ${this._renderAdminTaskList(child, routine)}
    `;
  }

  _renderAdminTaskList(child, routine) {
    const isEditing = (id) => this._editingTask && this._editingTask.id === id;
    return `
      <div class="admin-task-list">
        ${routine.tasks
          .map(
            (t) => isEditing(t.id) ? `
          <div class="admin-task-item editing">
            <input type="text" class="form-input inline-icon-input" id="edit-task-icon-${t.id}"
                   value="${this._editingTask.icon}" maxlength="4">
            <input type="text" class="form-input inline-name-input" id="edit-task-name-${t.id}"
                   value="${this._editingTask.name}">
            <button class="small-btn add-btn" data-action="save-task" data-task="${t.id}">💾</button>
            <button class="small-btn" data-action="cancel-edit-task">✕</button>
          </div>` : `
          <div class="admin-task-item" draggable="true" data-drag-type="task" data-drag-id="${t.id}">
            <span class="drag-handle" data-drag-grip>☰</span>
            <span class="admin-task-icon">${t.icon}</span>
            <span class="admin-task-name">${t.name}</span>
            <button class="small-btn edit-btn" data-action="edit-task"
                    data-task="${t.id}" data-name="${t.name}" data-icon="${t.icon}">✏️</button>
            <button class="small-btn del-btn" data-action="delete-task" data-task="${t.id}">🗑️</button>
          </div>`
          )
          .join("")}
        <div class="add-form" id="add-task-form">
          <input type="text" class="form-input" id="new-task-icon" placeholder="Icon" maxlength="4"
                 style="width:60px;text-align:center;">
          <input type="text" class="form-input" id="new-task-name" placeholder="Add new task...">
          <button class="small-btn add-btn" data-action="add-task">➕</button>
        </div>
      </div>
    `;
  }

  /* ── Admin: Children ── */
  _renderAdminChildren() {
    const isEditing = (id) => this._editingChild && this._editingChild.id === id;
    return `
      <div class="admin-children">
        ${this._data.children
          .map(
            (c) => isEditing(c.id) ? `
          <div class="admin-child-item editing">
            <input type="text" class="form-input inline-icon-input" id="edit-child-avatar-${c.id}"
                   value="${this._editingChild.avatar}" maxlength="4">
            <input type="text" class="form-input inline-name-input" id="edit-child-name-${c.id}"
                   value="${this._editingChild.name}">
            <button class="small-btn add-btn" data-action="save-child"
                    data-child="${c.id}">💾</button>
            <button class="small-btn" data-action="cancel-edit-child">✕</button>
          </div>` : `
          <div class="admin-child-item">
            <span class="admin-child-avatar">${c.avatar}</span>
            <span class="admin-child-name">${c.name}</span>
            <button class="small-btn edit-btn" data-action="edit-child"
                    data-child="${c.id}" data-name="${c.name}" data-avatar="${c.avatar}">✏️</button>
            <button class="small-btn del-btn" data-action="delete-child"
                    data-child="${c.id}">🗑️</button>
          </div>`
          )
          .join("")}
        <div class="add-form" id="add-child-form">
          <input type="text" class="form-input" id="new-child-avatar" placeholder="Avatar" maxlength="4"
                 style="width:60px;text-align:center;">
          <input type="text" class="form-input" id="new-child-name" placeholder="Add new child...">
          <button class="small-btn add-btn" data-action="add-child">➕</button>
        </div>
      </div>
    `;
  }

  /* ── Admin: PIN ── */
  _renderAdminPin() {
    return `
      <div class="admin-pin">
        <p class="admin-pin-label">Change Parent PIN</p>
        <div class="add-form">
          <input type="password" class="form-input" id="new-pin" placeholder="New 4-digit PIN"
                 maxlength="8" style="width:150px;text-align:center;letter-spacing:8px;">
          <button class="small-btn add-btn" data-action="save-pin">💾 Save</button>
        </div>
        ${this._pinSaved ? `<div class="pin-saved">✅ PIN updated!</div>` : ""}
      </div>
    `;
  }

  /* ═══════════════════
     EVENT HANDLING
     ═══════════════════ */

  /** Get the child currently being edited in admin. */
  _adminCurrentChild() {
    const children = this._data.children;
    if (this._adminChild >= children.length) this._adminChild = 0;
    return children[this._adminChild] || null;
  }

  /** Get the routine currently being edited in admin. */
  _adminCurrentRoutine() {
    const child = this._adminCurrentChild();
    if (!child) return null;
    const routines = child.routines || [];
    if (this._adminRoutine >= routines.length) this._adminRoutine = 0;
    return routines[this._adminRoutine] || null;
  }

  _doSaveTask(taskId) {
    const nameEl = this.shadowRoot.getElementById(`edit-task-name-${taskId}`);
    const iconEl = this.shadowRoot.getElementById(`edit-task-icon-${taskId}`);
    const name = nameEl?.value?.trim();
    const icon = iconEl?.value?.trim() || "✅";
    if (!name) return;
    this._editingTask = null;
    const routine = this._adminCurrentRoutine();
    const t = routine?.tasks.find((t) => t.id === taskId);
    if (t) { t.name = name; t.icon = icon; }
    this._save();
    this._render();
  }

  _doAddTask() {
    const nameEl = this.shadowRoot.getElementById("new-task-name");
    const iconEl = this.shadowRoot.getElementById("new-task-icon");
    const name = nameEl?.value?.trim();
    const icon = iconEl?.value?.trim() || "✅";
    if (!name) return;
    const routine = this._adminCurrentRoutine();
    if (routine) routine.tasks.push({ id: _uid(), name, icon });
    this._save();
    this._render();
  }

  _doSaveChild(childId) {
    const nameEl = this.shadowRoot.getElementById(`edit-child-name-${childId}`);
    const avatarEl = this.shadowRoot.getElementById(`edit-child-avatar-${childId}`);
    const name = nameEl?.value?.trim();
    const avatar = avatarEl?.value?.trim() || "👦";
    if (!name) return;
    this._editingChild = null;
    const c = this._data.children.find((c) => c.id === childId);
    if (c) { c.name = name; c.avatar = avatar; }
    this._save();
    this._render();
  }

  _doAddChild() {
    const nameEl = this.shadowRoot.getElementById("new-child-name");
    const avatarEl = this.shadowRoot.getElementById("new-child-avatar");
    const name = nameEl?.value?.trim();
    const avatar = avatarEl?.value?.trim() || "👦";
    if (!name) return;
    this._data.children.push({ id: _uid(), name, avatar, routines: defaultRoutines() });
    this._save();
    this._render();
  }

  _doSaveRoutine() {
    const nameEl = this.shadowRoot.getElementById("edit-routine-name");
    const iconEl = this.shadowRoot.getElementById("edit-routine-icon");
    const colorEl = this.shadowRoot.getElementById("edit-routine-color");
    const name = nameEl?.value?.trim();
    const icon = iconEl?.value?.trim() || "📋";
    const color = colorEl?.value || "#FF9800";
    if (!name) return;
    this._editingRoutine = null;
    const routine = this._adminCurrentRoutine();
    if (routine) { routine.name = name; routine.icon = icon; routine.color = color; }
    this._save();
    this._render();
  }

  _attachEvents() {
    // ── Enter key support on all inputs ──
    this.shadowRoot.querySelectorAll("input.form-input").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        const parent = input.closest(".admin-task-item");
        if (parent?.classList.contains("editing")) {
          const saveBtn = parent.querySelector("[data-action='save-task']");
          if (saveBtn) { this._doSaveTask(saveBtn.dataset.task); return; }
        }

        const childParent = input.closest(".admin-child-item");
        if (childParent?.classList.contains("editing")) {
          const saveBtn = childParent.querySelector("[data-action='save-child']");
          if (saveBtn) { this._doSaveChild(saveBtn.dataset.child); return; }
        }

        const routineRow = input.closest(".routine-edit-row");
        if (routineRow) {
          const saveBtn = routineRow.querySelector("[data-action='save-routine']");
          if (saveBtn) { this._doSaveRoutine(); return; }
        }

        const addForm = input.closest(".add-form");
        if (addForm) {
          if (addForm.querySelector("[data-action='add-task']")) { this._doAddTask(); return; }
          if (addForm.querySelector("[data-action='add-child']")) { this._doAddChild(); return; }
          const savePinBtn = addForm.querySelector("[data-action='save-pin']");
          if (savePinBtn) { savePinBtn.click(); return; }
        }
      });
    });

    // ── Click handlers ──
    this.shadowRoot.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const action = btn.dataset.action;

        switch (action) {
          /* -- Main view -- */
          case "select-child":
            this._selectedChild = parseInt(btn.dataset.index);
            this._activeRoutine = 0;
            this._render();
            break;

          case "select-routine":
            this._activeRoutine = parseInt(btn.dataset.index);
            this._render();
            break;

          case "toggle-task": {
            const child = this._currentChild();
            if (child) this._toggleTask(child.id, btn.dataset.routine, btn.dataset.task);
            break;
          }

          /* -- Admin toggle -- */
          case "toggle-admin":
            if (this._adminMode) {
              this._adminMode = false;
              this._adminUnlocked = false;
              this._pinBuffer = "";
              this._pinError = false;
            } else {
              this._adminMode = true;
              this._pinBuffer = "";
              this._pinError = false;
            }
            this._render();
            break;

          /* -- PIN pad -- */
          case "pin-key": {
            const key = btn.dataset.key;
            if (key === "⌫") {
              this._pinBuffer = (this._pinBuffer || "").slice(0, -1);
              this._pinError = false;
              this._render();
            } else {
              this._pinBuffer = (this._pinBuffer || "") + key;
              if (this._pinBuffer.length >= 4) {
                if (this._verifyPin(this._pinBuffer)) {
                  this._adminUnlocked = true;
                  this._pinError = false;
                  this._adminChild = 0;
                  this._adminRoutine = 0;
                } else {
                  this._pinError = true;
                  this._pinBuffer = "";
                }
              }
              this._render();
            }
            break;
          }

          /* -- Admin navigation -- */
          case "admin-view":
            this._adminView = btn.dataset.view;
            this._editingTask = null;
            this._editingChild = null;
            this._editingRoutine = null;
            this._pinSaved = false;
            this._render();
            break;

          case "admin-select-child":
            this._adminChild = parseInt(btn.dataset.index);
            this._adminRoutine = 0;
            this._editingTask = null;
            this._editingRoutine = null;
            this._render();
            break;

          case "admin-routine":
            this._adminRoutine = parseInt(btn.dataset.index);
            this._editingTask = null;
            this._editingRoutine = null;
            this._render();
            break;

          /* -- Routine CRUD -- */
          case "add-routine": {
            const child = this._adminCurrentChild();
            if (child) {
              const colorIdx = (child.routines?.length || 0) % ROUTINE_COLORS.length;
              child.routines.push({
                id: _uid(),
                name: "New Routine",
                icon: "📋",
                color: ROUTINE_COLORS[colorIdx],
                tasks: [],
              });
              this._adminRoutine = child.routines.length - 1;
              this._editingRoutine = { ...child.routines[this._adminRoutine] };
              this._save();
              this._render();
              setTimeout(() => {
                const el = this.shadowRoot.getElementById("edit-routine-name");
                if (el) { el.focus(); el.select(); }
              }, 50);
            }
            break;
          }

          case "copy-routine-all": {
            const srcRoutine = this._adminCurrentRoutine();
            const srcChild = this._adminCurrentChild();
            if (srcRoutine && srcChild) {
              this._data.children.forEach((c) => {
                if (c.id === srcChild.id) return; // skip source child
                const copy = {
                  id: _uid(),
                  name: srcRoutine.name,
                  icon: srcRoutine.icon,
                  color: srcRoutine.color,
                  tasks: srcRoutine.tasks.map((t) => ({ id: _uid(), name: t.name, icon: t.icon })),
                };
                c.routines.push(copy);
              });
              this._save();
              this._render();
            }
            break;
          }

          case "edit-routine":
            this._editingRoutine = {
              id: this._adminCurrentRoutine()?.id,
              name: btn.dataset.name,
              icon: btn.dataset.icon,
              color: btn.dataset.color,
            };
            this._render();
            setTimeout(() => {
              const el = this.shadowRoot.getElementById("edit-routine-name");
              if (el) el.focus();
            }, 50);
            break;

          case "save-routine":
            this._doSaveRoutine();
            break;

          case "cancel-edit-routine":
            this._editingRoutine = null;
            this._render();
            break;

          case "delete-routine": {
            const child = this._adminCurrentChild();
            if (child && child.routines.length > 0) {
              child.routines.splice(this._adminRoutine, 1);
              if (this._adminRoutine >= child.routines.length) {
                this._adminRoutine = Math.max(0, child.routines.length - 1);
              }
              this._save();
              this._render();
            }
            break;
          }

          /* -- Task CRUD -- */
          case "save-task":
            this._doSaveTask(btn.dataset.task);
            break;

          case "add-task":
            this._doAddTask();
            break;

          case "edit-task":
            this._editingTask = {
              id: btn.dataset.task,
              name: btn.dataset.name,
              icon: btn.dataset.icon,
            };
            this._render();
            setTimeout(() => {
              const el = this.shadowRoot.getElementById(`edit-task-name-${btn.dataset.task}`);
              if (el) el.focus();
            }, 50);
            break;

          case "delete-task": {
            const routine = this._adminCurrentRoutine();
            if (routine) {
              routine.tasks = routine.tasks.filter((t) => t.id !== btn.dataset.task);
              this._save();
              this._render();
            }
            break;
          }

          case "cancel-edit-task":
            this._editingTask = null;
            this._render();
            break;

          /* -- Child CRUD -- */
          case "save-child":
            this._doSaveChild(btn.dataset.child);
            break;

          case "add-child":
            this._doAddChild();
            break;

          case "edit-child":
            this._editingChild = {
              id: btn.dataset.child,
              name: btn.dataset.name,
              avatar: btn.dataset.avatar,
            };
            this._render();
            setTimeout(() => {
              const el = this.shadowRoot.getElementById(`edit-child-name-${btn.dataset.child}`);
              if (el) el.focus();
            }, 50);
            break;

          case "delete-child":
            if (this._data.children.length <= 1) break;
            this._data.children = this._data.children.filter((c) => c.id !== btn.dataset.child);
            if (this._selectedChild >= this._data.children.length)
              this._selectedChild = Math.max(0, this._data.children.length - 1);
            if (this._adminChild >= this._data.children.length)
              this._adminChild = Math.max(0, this._data.children.length - 1);
            this._save();
            this._render();
            break;

          case "cancel-edit-child":
            this._editingChild = null;
            this._render();
            break;

          /* -- PIN change -- */
          case "save-pin": {
            const pinEl = this.shadowRoot.getElementById("new-pin");
            const newPin = pinEl?.value?.trim();
            if (newPin && newPin.length >= 4) {
              this._changePin(newPin);
              this._pinSaved = true;
              this._render();
            }
            break;
          }
        }
      });
    });

    // ── Prevent save buttons from stealing focus from inputs ──
    this.shadowRoot.querySelectorAll("[data-action='save-task'], [data-action='save-child'], [data-action='add-task'], [data-action='add-child'], [data-action='save-routine']").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => { e.preventDefault(); });
    });

    // ── Drag & drop for tasks and routines ──
    this._attachDragAndDrop();
  }

  _attachDragAndDrop() {
    const shadow = this.shadowRoot;
    let dragType = null;
    let dragId = null;
    let dragIndex = null;

    shadow.querySelectorAll("[data-drag-type]").forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        dragType = el.dataset.dragType;
        dragId = el.dataset.dragId || null;
        dragIndex = el.dataset.dragIndex != null ? parseInt(el.dataset.dragIndex) : null;
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
      });

      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        shadow.querySelectorAll(".drag-over").forEach((d) => d.classList.remove("drag-over"));
        dragType = null;
        dragId = null;
        dragIndex = null;
      });

      el.addEventListener("dragover", (e) => {
        if (!dragType) return;
        const targetType = el.dataset.dragType;
        if (targetType !== dragType) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        shadow.querySelectorAll(".drag-over").forEach((d) => d.classList.remove("drag-over"));
        el.classList.add("drag-over");
      });

      el.addEventListener("dragleave", () => {
        el.classList.remove("drag-over");
      });

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("drag-over");
        const targetType = el.dataset.dragType;
        if (targetType !== dragType) return;

        if (dragType === "task") {
          const targetId = el.dataset.dragId;
          if (!dragId || dragId === targetId) return;
          const routine = this._adminCurrentRoutine();
          if (!routine) return;
          const tasks = routine.tasks;
          const fromIdx = tasks.findIndex((t) => t.id === dragId);
          const toIdx = tasks.findIndex((t) => t.id === targetId);
          if (fromIdx === -1 || toIdx === -1) return;
          const [moved] = tasks.splice(fromIdx, 1);
          tasks.splice(toIdx, 0, moved);
          this._save();
          this._render();
        }

        if (dragType === "routine") {
          const targetIndex = parseInt(el.dataset.dragIndex);
          if (dragIndex == null || dragIndex === targetIndex) return;
          const child = this._adminCurrentChild();
          if (!child) return;
          const routines = child.routines;
          const [moved] = routines.splice(dragIndex, 1);
          routines.splice(targetIndex, 0, moved);
          this._adminRoutine = targetIndex;
          this._save();
          this._render();
        }
      });
    });

    // ── Touch drag support for mobile ──
    let touchDragEl = null;
    let touchClone = null;
    let touchType = null;
    let touchStartY = 0;
    let touchMoved = false;

    shadow.querySelectorAll("[data-drag-grip]").forEach((grip) => {
      grip.addEventListener("touchstart", (e) => {
        const item = grip.closest("[data-drag-type]");
        if (!item) return;
        touchDragEl = item;
        touchType = item.dataset.dragType;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;

        touchClone = item.cloneNode(true);
        touchClone.classList.add("drag-clone");
        const rect = item.getBoundingClientRect();
        const hostRect = this.getBoundingClientRect();
        touchClone.style.width = rect.width + "px";
        touchClone.style.left = (rect.left - hostRect.left) + "px";
        touchClone.style.top = (rect.top - hostRect.top) + "px";
        shadow.querySelector(".card-container").appendChild(touchClone);
        item.classList.add("dragging");
      }, { passive: true });
    });

    const onTouchMove = (e) => {
      if (!touchDragEl || !touchClone) return;
      const touch = e.touches[0];
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dy) > 5) touchMoved = true;
      if (!touchMoved) return;
      e.preventDefault();
      const hostRect = this.getBoundingClientRect();
      const origRect = touchDragEl.getBoundingClientRect();
      touchClone.style.top = (origRect.top - hostRect.top + dy) + "px";

      // Highlight drop target
      shadow.querySelectorAll(".drag-over").forEach((d) => d.classList.remove("drag-over"));
      const elemBelow = shadow.elementFromPoint(touch.clientX - hostRect.left, touch.clientY - hostRect.top);
      const target = elemBelow?.closest(`[data-drag-type='${touchType}']`);
      if (target && target !== touchDragEl) target.classList.add("drag-over");
    };

    const onTouchEnd = () => {
      if (!touchDragEl) return;
      const overEl = shadow.querySelector(".drag-over");
      if (overEl && touchMoved) {
        if (touchType === "task") {
          const fromId = touchDragEl.dataset.dragId;
          const toId = overEl.dataset.dragId;
          if (fromId && toId && fromId !== toId) {
            const routine = this._adminCurrentRoutine();
            if (routine) {
              const tasks = routine.tasks;
              const fromIdx = tasks.findIndex((t) => t.id === fromId);
              const toIdx = tasks.findIndex((t) => t.id === toId);
              if (fromIdx !== -1 && toIdx !== -1) {
                const [moved] = tasks.splice(fromIdx, 1);
                tasks.splice(toIdx, 0, moved);
                this._save();
              }
            }
          }
        }
        if (touchType === "routine") {
          const fromIdx = parseInt(touchDragEl.dataset.dragIndex);
          const toIdx = parseInt(overEl.dataset.dragIndex);
          if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) {
            const child = this._adminCurrentChild();
            if (child) {
              const [moved] = child.routines.splice(fromIdx, 1);
              child.routines.splice(toIdx, 0, moved);
              this._adminRoutine = toIdx;
              this._save();
            }
          }
        }
      }
      touchDragEl.classList.remove("dragging");
      shadow.querySelectorAll(".drag-over").forEach((d) => d.classList.remove("drag-over"));
      if (touchClone) touchClone.remove();
      touchDragEl = null;
      touchClone = null;
      touchType = null;
      touchMoved = false;
      this._render();
    };

    shadow.addEventListener("touchmove", onTouchMove, { passive: false });
    shadow.addEventListener("touchend", onTouchEnd);
    shadow.addEventListener("touchcancel", onTouchEnd);
  }

  /* ═══════════════════
     STYLES
     ═══════════════════ */
  _styles() {
    return `
      :host {
        --primary: #5C6BC0;
        --bg: var(--ha-card-background, var(--card-background-color, #fff));
        --text: var(--primary-text-color, #333);
        --text-secondary: var(--secondary-text-color, #666);
        --divider: var(--divider-color, #e0e0e0);
        --radius: 12px;
      }

      ha-card {
        overflow: hidden;
        font-family: var(--ha-card-font-family, 'Segoe UI', Roboto, sans-serif);
      }

      .card-container {
        position: relative;
        padding-bottom: 8px;
      }

      /* ── Header ── */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 16px 8px;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .header-icon { font-size: 24px; }
      .header-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
      }
      .icon-btn {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 8px;
        transition: background 0.2s;
      }
      .icon-btn:hover { background: rgba(0,0,0,0.06); }

      /* ── Child tabs ── */
      .child-tabs, .admin-child-selector {
        display: flex;
        gap: 6px;
        padding: 4px 16px 8px;
        overflow-x: auto;
      }
      .admin-child-selector {
        padding: 0 0 12px;
      }
      .child-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 24px;
        border: 2px solid var(--divider);
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-secondary);
        transition: all 0.2s;
        white-space: nowrap;
        font-family: inherit;
      }
      .child-tab.small {
        padding: 6px 12px;
        font-size: 13px;
      }
      .child-tab:hover { border-color: var(--primary); }
      .child-tab.active {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
      }
      .child-avatar { font-size: 18px; }
      .child-name { font-size: 14px; }
      .child-tab.small .child-avatar { font-size: 16px; }
      .child-tab.small .child-name { font-size: 12px; }

      /* ── Routine tabs ── */
      .routine-tabs {
        display: flex;
        gap: 6px;
        padding: 4px 16px 4px;
        overflow-x: auto;
      }
      .routine-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 10px 8px 8px;
        border-radius: var(--radius);
        border: 2px solid var(--divider);
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 90px;
        font-family: inherit;
      }
      .routine-tab:hover { border-color: var(--routine-color, var(--primary)); }
      .routine-tab.active {
        border-color: var(--routine-color, var(--primary));
        background: color-mix(in srgb, var(--routine-color, var(--primary)) 12%, transparent);
      }
      .routine-icon { font-size: 22px; }
      .routine-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text);
        text-align: center;
        line-height: 1.2;
      }
      .routine-pct {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary);
      }
      .routine-tab.active .routine-pct {
        color: var(--routine-color, var(--primary));
      }

      /* ── Progress bar ── */
      .progress-bar-container {
        height: 6px;
        background: var(--divider);
        border-radius: 3px;
        margin: 12px 16px 4px;
        overflow: hidden;
      }
      .progress-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
      }

      /* ── All done ── */
      .all-done {
        text-align: center;
        font-size: 18px;
        font-weight: 700;
        padding: 8px;
        color: #4CAF50;
        animation: pop 0.4s ease;
      }
      @keyframes pop {
        0% { transform: scale(0.8); opacity: 0; }
        60% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }

      /* ── Tasks ── */
      .tasks-section { padding: 0 8px 8px; }
      .task-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px 0;
      }
      .task-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-radius: var(--radius);
        border: none;
        background: rgba(0,0,0,0.02);
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        text-align: left;
        font-family: inherit;
      }
      .task-item:hover { background: rgba(0,0,0,0.05); }
      .task-item.done { background: rgba(76, 175, 80, 0.08); }
      .task-item.done .task-name {
        text-decoration: line-through;
        opacity: 0.6;
      }
      .task-check {
        font-size: 22px;
        transition: transform 0.2s;
      }
      .task-item:active .task-check { transform: scale(1.3); }
      .task-icon { font-size: 20px; }
      .task-name {
        font-size: 16px;
        font-weight: 500;
        color: var(--text);
        flex: 1;
      }

      /* ── Empty / Loading ── */
      .empty, .loading {
        text-align: center;
        padding: 32px 16px;
        color: var(--text-secondary);
        font-size: 14px;
      }
      .loading {
        font-size: 16px;
        padding: 48px 16px;
        opacity: 0.6;
      }

      /* ═══════ Admin ═══════ */

      /* ── PIN entry ── */
      .pin-entry {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 16px 16px;
      }
      .pin-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 4px;
      }
      .pin-subtitle {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 20px;
      }
      .pin-dots { display: flex; gap: 12px; margin-bottom: 8px; }
      .pin-dot {
        width: 16px; height: 16px;
        border-radius: 50%;
        border: 2px solid var(--divider);
        transition: all 0.2s;
      }
      .pin-dot.filled {
        background: var(--primary);
        border-color: var(--primary);
      }
      .pin-error {
        color: #E53935;
        font-size: 13px;
        font-weight: 600;
        margin: 4px 0;
        animation: shake 0.3s ease;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        75% { transform: translateX(6px); }
      }
      .pin-pad {
        display: grid;
        grid-template-columns: repeat(3, 64px);
        gap: 8px;
        margin-top: 12px;
      }
      .pin-key {
        width: 64px; height: 56px;
        border-radius: 12px;
        border: 1px solid var(--divider);
        background: var(--bg);
        font-size: 22px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        color: var(--text);
        font-family: inherit;
      }
      .pin-key:hover { background: rgba(0,0,0,0.05); }
      .pin-key:active {
        transform: scale(0.95);
        background: rgba(0,0,0,0.1);
      }
      .pin-key.empty {
        border: none;
        background: transparent;
        cursor: default;
      }

      /* ── Admin panel ── */
      .admin-panel { padding: 0 16px 16px; }
      .admin-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }
      .admin-tab {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: rgba(0,0,0,0.04);
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        transition: all 0.2s;
        font-family: inherit;
      }
      .admin-tab.active {
        background: var(--primary);
        color: #fff;
      }

      .admin-routine-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
        overflow-x: auto;
      }
      .admin-routine-tab {
        padding: 8px 12px;
        border: 2px solid var(--divider);
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
        transition: all 0.2s;
        text-align: center;
        font-family: inherit;
        white-space: nowrap;
      }
      .admin-routine-tab.active {
        border-color: var(--tab-color, var(--primary));
        background: rgba(92, 107, 192, 0.08);
      }
      .add-routine-tab {
        border-style: dashed;
        color: var(--text-secondary);
        min-width: 42px;
      }
      .add-routine-tab:hover {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.08);
      }

      .add-all-btn {
        display: block;
        width: 100%;
        padding: 10px;
        margin-bottom: 12px;
        border: 2px dashed var(--divider);
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        transition: all 0.2s;
        font-family: inherit;
      }
      .add-all-btn:hover {
        border-color: var(--primary);
        background: rgba(92, 107, 192, 0.08);
        color: var(--primary);
      }

      /* ── Routine settings row ── */
      .routine-settings {
        margin-bottom: 12px;
      }
      .routine-edit-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(0,0,0,0.03);
      }
      .routine-detail-name {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
      }
      .routine-color-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .color-input {
        width: 34px;
        height: 34px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        padding: 0;
        background: transparent;
      }

      /* ── Admin task list ── */
      .admin-task-item, .admin-child-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(0,0,0,0.02);
        margin-bottom: 4px;
        transition: transform 0.15s, opacity 0.15s, background 0.15s;
      }

      /* ── Drag & Drop ── */
      .drag-handle {
        cursor: grab;
        opacity: 0.35;
        font-size: 14px;
        padding: 2px 4px;
        user-select: none;
        touch-action: none;
      }
      .drag-handle:hover { opacity: 0.7; }
      .drag-handle-inline {
        opacity: 0.3;
        font-size: 10px;
        user-select: none;
        touch-action: none;
        cursor: grab;
      }
      .drag-handle-inline:hover { opacity: 0.6; }
      .dragging {
        opacity: 0.3 !important;
      }
      .drag-over {
        background: rgba(92, 107, 192, 0.15) !important;
        transform: scale(1.02);
      }
      .drag-clone {
        position: absolute;
        z-index: 200;
        pointer-events: none;
        opacity: 0.85;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        border-radius: 8px;
        background: var(--bg);
      }
      [draggable='true'] {
        cursor: grab;
      }
      .admin-routine-tab[draggable='true'] {
        cursor: grab;
      }
      .admin-task-icon, .admin-child-avatar { font-size: 20px; }
      .admin-task-name, .admin-child-name {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
      }
      .small-btn {
        width: 34px; height: 34px;
        border: none;
        border-radius: 8px;
        background: rgba(0,0,0,0.05);
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .small-btn:hover { background: rgba(0,0,0,0.1); }
      .del-btn:hover { background: rgba(229, 57, 53, 0.15); }
      .add-btn {
        background: rgba(76, 175, 80, 0.12);
      }
      .add-btn:hover { background: rgba(76, 175, 80, 0.25); }
      .edit-btn:hover { background: rgba(33, 150, 243, 0.15); }

      /* ── Inline editing ── */
      .admin-task-item.editing,
      .admin-child-item.editing {
        background: rgba(92, 107, 192, 0.08);
        border: 2px solid var(--primary);
        padding: 8px 10px;
      }
      .inline-icon-input {
        width: 50px !important;
        text-align: center;
        flex: 0 0 50px;
      }
      .inline-name-input { flex: 1; }

      .add-form {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-top: 8px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(0,0,0,0.03);
      }
      .form-input {
        padding: 8px 12px;
        border: 1px solid var(--divider);
        border-radius: 8px;
        font-size: 14px;
        flex: 1;
        background: var(--bg);
        color: var(--text);
        font-family: inherit;
      }
      .form-input:focus {
        outline: none;
        border-color: var(--primary);
      }

      .admin-pin { text-align: center; padding: 16px; }
      .admin-pin-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 12px;
      }
      .admin-pin .add-form { justify-content: center; }
      .pin-saved {
        color: #4CAF50;
        font-weight: 600;
        margin-top: 8px;
        font-size: 13px;
      }

      /* ── Scrollbar ── */
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
    `;
  }
}

/* ───────── Register ───────── */
customElements.define("boerne-rutiner-card", BoerneRutinerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "boerne-rutiner-card",
  name: "BørneRutiner - Kids Routine Tracker",
  description: "A card for children to track daily routines with parent admin panel.",
  preview: true,
});

console.info(
  `%c BørneRutiner Card v${VERSION} `,
  "background: #5C6BC0; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;"
);
