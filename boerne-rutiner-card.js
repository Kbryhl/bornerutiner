/**
 * BørneRutiner - Kids Routine Tracker Card for Home Assistant
 * A Lovelace card where children can track daily routines
 * and parents can manage tasks behind a PIN code.
 *
 * Version: 1.0.0
 */

const STORAGE_KEY = "boerne-rutiner";
const STORAGE_ENTITY = "sensor.boerne_rutiner_data";
const VERSION = "1.4.0";

/* ───────── Default data ───────── */
function defaultData() {
  return {
    pin: "1234",
    children: [
      { id: _uid(), name: "Child 1", avatar: "👦" },
    ],
    routines: {
      morning: {
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
      afterschool: {
        name: "After School",
        icon: "📚",
        color: "#2196F3",
        tasks: [
          { id: _uid(), name: "Homework", icon: "📝" },
          { id: _uid(), name: "Tidy room", icon: "🧹" },
          { id: _uid(), name: "Set the table", icon: "🍽️" },
        ],
      },
      evening: {
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
    },
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

/* ───────── Storage (server‑level shared entity) ───────── */
function ensureStructure(d) {
  const def = defaultData();
  if (!d.routines) d.routines = def.routines;
  if (!d.children || d.children.length === 0) d.children = def.children;
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

/**
 * Load data – priority:
 *  1. Shared entity (server‑level, visible to all HA users)
 *  2. Per‑user frontend storage (survives restarts)
 *  3. localStorage legacy fallback
 *  4. Defaults
 */
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

/** Save to shared entity (all users) + per‑user backup (restart‑safe). */
function saveDataShared(hass, data) {
  _pruneCompletions(data);

  if (!hass) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return;
  }

  // Primary: shared entity via REST API
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

  // Backup: per‑user storage (survives HA restarts)
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
    this._activeRoutine = "morning";
    this._adminMode = false;
    this._adminView = "tasks"; // tasks | children | pin
    this._editingTask = null;
    this._editingChild = null;
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
    if (this._dataLoaded) {
      this._render();
    }
  }

  set hass(hass) {
    const hadHass = !!this._hass;
    this._hass = hass;
    if (!hadHass && hass && !this._dataLoaded) {
      this._loadFromHA();
      return;
    }
    if (this._dataLoaded && hass) {
      // Real‑time sync: HA pushes entity state changes to all clients
      const entity = hass.states?.[STORAGE_ENTITY];
      if (entity) {
        const lu = entity.last_updated;
        if (lu !== this._lastEntityUpdate) {
          this._lastEntityUpdate = lu;
          // Skip echo from our own save
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
    // Persist to shared entity so all devices see the data
    saveDataShared(this._hass, this._data);
    const entity = this._hass.states?.[STORAGE_ENTITY];
    if (entity) this._lastEntityUpdate = entity.last_updated;
    this._render();
  }

  /** Apply data from the shared entity if it differs from local state. */
  _syncFromEntity(entity) {
    const fresh = _parseStore(entity);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(this._data)) {
      this._data = fresh;
      this._render();
    }
  }

  /** Re‑sync on visibility change (tab/app foregrounded). */
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

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {};
  }

  /* ── Completions helpers ── */
  _getCompletions(childId, routineKey) {
    const day = todayKey();
    const c = this._data.completions;
    if (!c[day]) c[day] = {};
    if (!c[day][childId]) c[day][childId] = {};
    if (!c[day][childId][routineKey]) c[day][childId][routineKey] = {};
    return c[day][childId][routineKey];
  }

  _toggleTask(childId, routineKey, taskId) {
    const comp = this._getCompletions(childId, routineKey);
    comp[taskId] = !comp[taskId];
    this._save();

    // Check if all tasks in routine are done
    const tasks = this._data.routines[routineKey].tasks;
    const allDone = tasks.every((t) => comp[t.id]);
    if (allDone) {
      setTimeout(() => {
        const container = this.shadowRoot.querySelector(".card-container");
        if (container) launchConfetti(container);
      }, 150);
    }

    this._render();
  }

  _getProgress(childId, routineKey) {
    const comp = this._getCompletions(childId, routineKey);
    const tasks = this._data.routines[routineKey].tasks;
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => comp[t.id]).length;
    return Math.round((done / tasks.length) * 100);
  }

  /* ── Admin helpers ── */
  _verifyPin(entered) {
    return entered === this._data.pin;
  }

  _addTask(routineKey, name, icon) {
    this._data.routines[routineKey].tasks.push({ id: _uid(), name, icon: icon || "✅" });
    this._save();
    this._render();
  }

  _removeTask(routineKey, taskId) {
    this._data.routines[routineKey].tasks = this._data.routines[routineKey].tasks.filter(
      (t) => t.id !== taskId
    );
    this._save();
    this._render();
  }

  _updateTask(routineKey, taskId, name, icon) {
    const t = this._data.routines[routineKey].tasks.find((t) => t.id === taskId);
    if (t) {
      t.name = name;
      t.icon = icon;
    }
    this._save();
    this._render();
  }

  _addChild(name, avatar) {
    this._data.children.push({ id: _uid(), name, avatar: avatar || "👦" });
    this._save();
    this._render();
  }

  _removeChild(childId) {
    this._data.children = this._data.children.filter((c) => c.id !== childId);
    if (this._selectedChild >= this._data.children.length)
      this._selectedChild = Math.max(0, this._data.children.length - 1);
    this._save();
    this._render();
  }

  _updateChild(childId, name, avatar) {
    const c = this._data.children.find((c) => c.id === childId);
    if (c) {
      c.name = name;
      c.avatar = avatar;
    }
    this._save();
    this._render();
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

    const child =
      this._data.children.length > 0 ? this._data.children[this._selectedChild] : null;

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

    return `
      ${this._renderChildTabs()}
      ${this._renderRoutineTabs()}
      ${this._renderTasks(child)}
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

  _renderRoutineTabs() {
    const keys = Object.keys(this._data.routines);
    return `
      <div class="routine-tabs">
        ${keys
          .map((k) => {
            const r = this._data.routines[k];
            const child = this._data.children[this._selectedChild];
            const pct = child ? this._getProgress(child.id, k) : 0;
            return `
            <button class="routine-tab ${k === this._activeRoutine ? "active" : ""}"
                    data-action="select-routine" data-key="${k}"
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

  _renderTasks(child) {
    const rk = this._activeRoutine;
    const routine = this._data.routines[rk];
    if (!routine) return "";
    const comp = this._getCompletions(child.id, rk);
    const pct = this._getProgress(child.id, rk);
    const allDone = pct === 100;

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
                    data-action="toggle-task" data-routine="${rk}" data-task="${t.id}">
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

  /* ── Admin panel ── */
  _renderAdmin() {
    if (!this._adminUnlocked) {
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

    return `
      <div class="admin-panel">
        <div class="admin-tabs">
          <button class="admin-tab ${this._adminView === "tasks" ? "active" : ""}"
                  data-action="admin-view" data-view="tasks">📝 Tasks</button>
          <button class="admin-tab ${this._adminView === "children" ? "active" : ""}"
                  data-action="admin-view" data-view="children">👶 Children</button>
          <button class="admin-tab ${this._adminView === "pin" ? "active" : ""}"
                  data-action="admin-view" data-view="pin">🔑 PIN</button>
        </div>
        <div class="admin-content">
          ${this._adminView === "tasks" ? this._renderAdminTasks() : ""}
          ${this._adminView === "children" ? this._renderAdminChildren() : ""}
          ${this._adminView === "pin" ? this._renderAdminPin() : ""}
        </div>
      </div>
    `;
  }

  _renderAdminTasks() {
    const keys = Object.keys(this._data.routines);
    return `
      <div class="admin-tasks">
        <div class="admin-routine-tabs">
          ${keys
            .map(
              (k) => `
            <button class="admin-routine-tab ${k === this._adminRoutine || (!this._adminRoutine && k === keys[0]) ? "active" : ""}"
                    data-action="admin-routine" data-key="${k}">
              ${this._data.routines[k].icon} ${this._data.routines[k].name}
            </button>`
            )
            .join("")}
        </div>
        ${this._renderAdminTaskList(this._adminRoutine || keys[0])}
      </div>
    `;
  }

  _renderAdminTaskList(routineKey) {
    const routine = this._data.routines[routineKey];
    if (!routine) return "";
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
            <button class="small-btn add-btn" data-action="save-task"
                    data-routine="${routineKey}" data-task="${t.id}">💾</button>
            <button class="small-btn" data-action="cancel-edit-task">✕</button>
          </div>` : `
          <div class="admin-task-item">
            <span class="admin-task-icon">${t.icon}</span>
            <span class="admin-task-name">${t.name}</span>
            <button class="small-btn edit-btn" data-action="edit-task"
                    data-routine="${routineKey}" data-task="${t.id}"
                    data-name="${t.name}" data-icon="${t.icon}">✏️</button>
            <button class="small-btn del-btn" data-action="delete-task"
                    data-routine="${routineKey}" data-task="${t.id}">🗑️</button>
          </div>`
          )
          .join("")}
        <div class="add-form" id="add-task-form">
          <input type="text" class="form-input" id="new-task-icon" placeholder="Icon" maxlength="4"
                 style="width:60px;text-align:center;">
          <input type="text" class="form-input" id="new-task-name" placeholder="Add new task...">
          <button class="small-btn add-btn" data-action="add-task" data-routine="${routineKey}">➕</button>
        </div>
      </div>
    `;
  }

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

  _doSaveTask(routineKey, taskId) {
    const nameEl = this.shadowRoot.getElementById(`edit-task-name-${taskId}`);
    const iconEl = this.shadowRoot.getElementById(`edit-task-icon-${taskId}`);
    const name = nameEl?.value?.trim();
    const icon = iconEl?.value?.trim() || "✅";
    if (!name) return;
    this._editingTask = null;
    const t = this._data.routines[routineKey]?.tasks.find((t) => t.id === taskId);
    if (t) {
      t.name = name;
      t.icon = icon;
    }
    this._save();
    this._render();
  }

  _doAddTask(routineKey) {
    const nameEl = this.shadowRoot.getElementById("new-task-name");
    const iconEl = this.shadowRoot.getElementById("new-task-icon");
    const name = nameEl?.value?.trim();
    const icon = iconEl?.value?.trim() || "✅";
    if (!name) return;
    this._data.routines[routineKey].tasks.push({ id: _uid(), name, icon });
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
    if (c) {
      c.name = name;
      c.avatar = avatar;
    }
    this._save();
    this._render();
  }

  _doAddChild() {
    const nameEl = this.shadowRoot.getElementById("new-child-name");
    const avatarEl = this.shadowRoot.getElementById("new-child-avatar");
    const name = nameEl?.value?.trim();
    const avatar = avatarEl?.value?.trim() || "👦";
    if (!name) return;
    this._data.children.push({ id: _uid(), name, avatar });
    this._save();
    this._render();
  }

  _attachEvents() {
    // ── Enter key support on all inputs ──
    this.shadowRoot.querySelectorAll("input.form-input").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        // Determine which save action to trigger
        const parent = input.closest(".admin-task-item");
        if (parent?.classList.contains("editing")) {
          const saveBtn = parent.querySelector("[data-action='save-task']");
          if (saveBtn) {
            this._doSaveTask(saveBtn.dataset.routine, saveBtn.dataset.task);
            return;
          }
        }

        const childParent = input.closest(".admin-child-item");
        if (childParent?.classList.contains("editing")) {
          const saveBtn = childParent.querySelector("[data-action='save-child']");
          if (saveBtn) {
            this._doSaveChild(saveBtn.dataset.child);
            return;
          }
        }

        const addForm = input.closest(".add-form");
        if (addForm) {
          const addTaskBtn = addForm.querySelector("[data-action='add-task']");
          if (addTaskBtn) {
            this._doAddTask(addTaskBtn.dataset.routine);
            return;
          }
          const addChildBtn = addForm.querySelector("[data-action='add-child']");
          if (addChildBtn) {
            this._doAddChild();
            return;
          }
          const savePinBtn = addForm.querySelector("[data-action='save-pin']");
          if (savePinBtn) {
            savePinBtn.click();
            return;
          }
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
            this._render();
            break;

          case "select-routine":
            this._activeRoutine = btn.dataset.key;
            this._render();
            break;

          case "toggle-task":
            this._toggleTask(
              this._data.children[this._selectedChild].id,
              btn.dataset.routine,
              btn.dataset.task
            );
            break;

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
                  this._adminRoutine = Object.keys(this._data.routines)[0];
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
            this._pinSaved = false;
            this._render();
            break;

          case "admin-routine":
            this._adminRoutine = btn.dataset.key;
            this._editingTask = null;
            this._render();
            break;

          /* -- Task CRUD -- */
          case "save-task":
            this._doSaveTask(btn.dataset.routine, btn.dataset.task);
            break;

          case "add-task":
            this._doAddTask(btn.dataset.routine);
            break;

          case "edit-task":
            this._editingTask = {
              id: btn.dataset.task,
              name: btn.dataset.name,
              icon: btn.dataset.icon,
              routine: btn.dataset.routine,
            };
            this._render();
            setTimeout(() => {
              const el = this.shadowRoot.getElementById(`edit-task-name-${btn.dataset.task}`);
              if (el) el.focus();
            }, 50);
            break;

          case "delete-task":
            this._removeTask(btn.dataset.routine, btn.dataset.task);
            break;

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
            if (this._data.children.length <= 1) {
              // Don't allow deleting the last child
              break;
            }
            this._removeChild(btn.dataset.child);
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
    this.shadowRoot.querySelectorAll("[data-action='save-task'], [data-action='save-child'], [data-action='add-task'], [data-action='add-child']").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
    });
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
      .header-icon {
        font-size: 24px;
      }
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
      .icon-btn:hover {
        background: rgba(0,0,0,0.06);
      }

      /* ── Child tabs ── */
      .child-tabs {
        display: flex;
        gap: 6px;
        padding: 4px 16px 8px;
        overflow-x: auto;
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
      .child-tab:hover {
        border-color: var(--primary);
      }
      .child-tab.active {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
      }
      .child-avatar {
        font-size: 18px;
      }
      .child-name {
        font-size: 14px;
      }

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
      .routine-tab:hover {
        border-color: var(--routine-color, var(--primary));
      }
      .routine-tab.active {
        border-color: var(--routine-color, var(--primary));
        background: color-mix(in srgb, var(--routine-color, var(--primary)) 12%, transparent);
      }
      .routine-icon {
        font-size: 22px;
      }
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
      .tasks-section {
        padding: 0 8px 8px;
      }
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
      .task-item:hover {
        background: rgba(0,0,0,0.05);
      }
      .task-item.done {
        background: rgba(76, 175, 80, 0.08);
      }
      .task-item.done .task-name {
        text-decoration: line-through;
        opacity: 0.6;
      }
      .task-check {
        font-size: 22px;
        transition: transform 0.2s;
      }
      .task-item:active .task-check {
        transform: scale(1.3);
      }
      .task-icon {
        font-size: 20px;
      }
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
      .pin-dots {
        display: flex;
        gap: 12px;
        margin-bottom: 8px;
      }
      .pin-dot {
        width: 16px;
        height: 16px;
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
        width: 64px;
        height: 56px;
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
      .pin-key:hover {
        background: rgba(0,0,0,0.05);
      }
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
      .admin-panel {
        padding: 0 16px 16px;
      }
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
      }
      .admin-routine-tab {
        flex: 1;
        padding: 8px;
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
      }
      .admin-routine-tab.active {
        border-color: var(--primary);
        background: rgba(92, 107, 192, 0.08);
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
      }
      .admin-task-icon, .admin-child-avatar {
        font-size: 20px;
      }
      .admin-task-name, .admin-child-name {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
      }
      .small-btn {
        width: 34px;
        height: 34px;
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
      .small-btn:hover {
        background: rgba(0,0,0,0.1);
      }
      .del-btn:hover {
        background: rgba(229, 57, 53, 0.15);
      }
      .add-btn {
        background: rgba(76, 175, 80, 0.12);
      }
      .add-btn:hover {
        background: rgba(76, 175, 80, 0.25);
      }

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
      .inline-name-input {
        flex: 1;
      }

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

      .admin-pin {
        text-align: center;
        padding: 16px;
      }
      .admin-pin-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 12px;
      }
      .admin-pin .add-form {
        justify-content: center;
      }
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
