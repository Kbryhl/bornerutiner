# BørneRutiner – Kids Routine Tracker 📋

A custom Home Assistant Lovelace card that helps children track their daily routines. Parents can manage tasks, children, and settings behind a PIN-protected admin panel.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)

---

## Features

- **Three Routine Sections** – Morning ☀️, After School 📚, and Evening 🌙
- **Multi-Child Support** – Add as many children as you need with custom avatars
- **Interactive Checkboxes** – Kids tap/click tasks to mark them done
- **Progress Bars** – Visual progress per routine section
- **Confetti Celebration** 🎉 – Fun animation when a routine is fully completed
- **PIN-Protected Parent Panel** – Add, edit, and remove tasks and children
- **Daily Auto-Reset** – Completions are tracked per day and reset automatically
- **Dark Mode Support** – Inherits your HA theme colors
- **No Extra Integrations Required** – Fully self-contained using browser localStorage

---

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant
2. Go to **Frontend** → click the **⋮** menu → **Custom repositories**
3. Add this repository URL and select **Lovelace** as the category
4. Click **Add** → find **BørneRutiner** → **Install**
5. **Restart Home Assistant** or clear browser cache

### Manual Installation

1. Download `dist/boerne-rutiner-card.js` from this repository
2. Copy the file to your Home Assistant `config/www/` directory
3. Add the resource in **Settings → Dashboards → ⋮ → Resources**:
   - URL: `/local/boerne-rutiner-card.js`
   - Type: **JavaScript Module**

---

## Configuration

Add the card to your dashboard via the UI editor or YAML:

### Minimal YAML

```yaml
type: custom:boerne-rutiner-card
```

### With Options

```yaml
type: custom:boerne-rutiner-card
title: "Family Routines"
pin: "5678"
```

| Option  | Type   | Default          | Description                      |
|---------|--------|------------------|----------------------------------|
| `title` | string | `Kids Routines`  | Card header title                |
| `pin`   | string | `1234`           | Initial parent PIN (changeable)  |

---

## Usage

### For Kids 👧👦

1. Select your name at the top of the card
2. Choose the current routine (Morning / After School / Evening)
3. Tap each task when you've completed it ✅
4. Complete all tasks to see a confetti celebration! 🎉

### For Parents 👨‍👩‍👧‍👦

1. Tap the **⚙️** gear icon in the top-right corner
2. Enter the 4-digit PIN (default: `1234`)
3. Use the admin panel to:

| Tab           | Actions                                      |
|---------------|----------------------------------------------|
| **📝 Tasks**     | Add, edit, or remove tasks per routine section |
| **👶 Children**  | Add, edit, or remove children                  |
| **🔑 PIN**       | Change the parent PIN code                     |

---

## Default Tasks

The card comes pre-configured with common tasks:

### ☀️ Morning Routine
- 🪥 Brush teeth
- 👕 Get dressed
- 🥣 Eat breakfast
- 🎒 Pack school bag

### 📚 After School
- 📝 Homework
- 🧹 Tidy room
- 🍽️ Set the table

### 🌙 Evening Routine
- 🚿 Shower / Bath
- 🪥 Brush teeth
- 👕 Put on pajamas
- 📖 Read a book

All tasks are fully customizable through the parent admin panel — no YAML editing required after initial setup.

---

## Data Storage

- All data (children, tasks, completions) is stored in the browser's **localStorage**
- Completions are tracked **per day** and old entries are pruned after 7 days
- Data is per-device/browser — if you access HA from multiple devices, each will have its own state

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Card not showing | Clear browser cache and reload. Verify the resource is added correctly. |
| Forgot PIN | Open browser DevTools → Console → run: `localStorage.removeItem("boerne-rutiner")` → reload |
| Tasks not resetting | Completions auto-reset each new day. Check your device's date/time settings. |

---

## License

MIT — free for personal and commercial use.
