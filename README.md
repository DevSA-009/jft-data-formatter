# JFT Data Formatter — Vite + TypeScript

## 🚀 Features

- ✅ Full TypeScript implementation with TSDoc comments
- ✅ Vite for fast development and building
- ✅ **Format 1 — Standard Layout**: classic table-based detail view (landscape print)
- ✅ **Raw View**: compact bordered size-boxes layout, A4 portrait print
- ✅ Smart column detection (only shows columns when data exists)
- ✅ Validation for SLEEVE, RIB, PANT with per-cell error highlighting
- ✅ Invalid row highlighting with reasons
- ✅ Placeholder image support (paste, upload, or drag)
- ✅ Plain text copy functionality
- ✅ JSON export — includes `SLEEVE` and `PANT` per player
- ✅ Column resizing (Format 1 table)
- ✅ Keyboard shortcuts

---

## 📁 Project Structure

```
jft-data-formatter/
├── src/
│   ├── main.ts              # Entry point
│   ├── app.ts               # Main application controller
│   ├── types.ts             # Type & enum definitions
│   ├── utils.ts             # Pure utility functions
│   ├── dataProcessor.ts     # Parsing, validation, export logic
│   ├── imageHandler.ts      # Image upload / paste handling
│   ├── htmlGenerator.ts     # HTML output generation (table + raw boxes)
│   └── columnResizer.ts     # Interactive column resizing
├── public/
│   └── vite.svg
├── index.html
├── style.css
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📝 Input Format

Each line follows:

```
SIZE --- NAME --- NUMBER --- SLEEVE --- RIB --- PANT
```

**Example:**

```
M --- Player One --- 10 --- LONG --- NO --- SHORT
L --- Player Two --- 7  --- SHORT --- NO --- NO
```

---

## 🖨️ Print Formats

| Format                        | Page         | Detail style                                |
| ----------------------------- | ------------ | ------------------------------------------- |
| **Format 1: Standard Layout** | A4 Landscape | Full table with all columns                 |
| **Raw View**                  | A4 Portrait  | Bordered size-box grid, player list per box |

### Raw View — Detail Boxes

Each size that has players gets its own solid-border box:

```
┌──────────────────────┐
│          M           │
├──────────────────────┤
│  Player One [10]     │
│  Player Two [11]     │
│  ...                 │
└──────────────────────┘
```

- Sizes with no players are **skipped**.
- If a size has more than **5 players**, the box splits into side-by-side column boxes (max 5 wide) to fit A4 portrait.
- The `top-info-grid` is preserved with a tighter gap and vertically-centred image.

---

## 📤 JSON Export

`Copy JSON` exports structured data. Each player entry now includes:

```json
{ "NAME": "Player One", "NUMBER": "10", "SLEEVE": "LONG", "PANT": "SHORT" }
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action                    |
| -------- | ------------------------- |
| `Ctrl+I` | Open image selector       |
| `Ctrl+F` | Format orders             |
| `Ctrl+C` | Copy JSON (output page)   |
| `Ctrl+P` | Print / PDF (output page) |

---

## ✔️ Valid Values

| Field      | Valid values                                                |
| ---------- | ----------------------------------------------------------- |
| **SIZE**   | `XS S M L XL 2XL 3XL 4XL 5XL` · kids: `2 4 6 8 10 12 14 16` |
| **SLEEVE** | `LONG`, `SHORT`, or empty                                   |
| **RIB**    | `RIB`, `CUFF`, `NO`, or empty                               |
| **PANT**   | `LONG`, `SHORT`, `NO`, or empty                             |

---

**By DevSA-009**
