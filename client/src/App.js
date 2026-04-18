import { useState, useEffect } from "react";
import axios from "axios";

// ─── API base URL ──────────────────────────────────────────────────────────
const API = "http://localhost:5000/api/tasks";

// ─── Hook: tracks window width for responsive adjustments ─────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

// ─── Requirements 2 placeholder page ──────────────────────────────────────
function Req2Page({ onBack }) {
  return (
    <div style={r2.page}>
      <div style={r2.card}>
        <button style={r2.backBtn} onClick={onBack}>← Back</button>
        <div style={r2.label}>Requirements 2</div>
        <h1 style={r2.heading}>Over to you guys,</h1>
        <p style={r2.sig}>— Areej</p>
      </div>
    </div>
  );
}

const r2 = {
  page: {
    minHeight: "100vh",
    background: "#fafaf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, serif",
    padding: "20px",
  },
  card: {
    maxWidth: "440px",
    width: "100%",
    background: "#fff",
    border: "1px solid #eeecea",
    borderRadius: "12px",
    padding: "48px 40px",
    textAlign: "center",
  },
  backBtn: {
    display: "block",
    textAlign: "left",
    background: "none",
    border: "none",
    color: "#888780",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    padding: 0,
    marginBottom: "32px",
  },
  label: {
    fontSize: "11px",
    color: "#b4b2a9",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: "20px",
  },
  heading: {
    fontSize: "36px",
    fontWeight: "400",
    color: "#1a1a18",
    letterSpacing: "-0.5px",
    margin: "0 0 16px",
  },
  sig: {
    fontSize: "20px",
    color: "#888780",
    fontStyle: "italic",
    margin: 0,
  },
};

// ─── Priority badge component ──────────────────────────────────────────────
const PRIORITY_STYLES = {
  low:    { background: "#eaf3de", color: "#3B6D11" },
  medium: { background: "#faeeda", color: "#854F0B" },
  high:   { background: "#fcebeb", color: "#A32D2D" },
};

function PriorityBadge({ level }) {
  const st = PRIORITY_STYLES[level] || PRIORITY_STYLES.low;
  return (
    <span style={{
      fontSize: "10px",
      padding: "2px 9px",
      borderRadius: "10px",
      fontFamily: "Georgia, serif",
      whiteSpace: "nowrap",
      ...st,
    }}>
      {level}
    </span>
  );
}

// ─── Main App Component ────────────────────────────────────────────────────
export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [tasks, setTasks]         = useState([]);
  const [input, setInput]         = useState("");
  const [priority, setPriority]   = useState("medium");
  const [filter, setFilter]       = useState("all");
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState("req1"); // "req1" | "req2"

  // ── Responsive breakpoints ───────────────────────────────────────────────
  const width    = useWindowWidth();
  const isMobile = width < 600;         // phone
  const isTablet = width >= 600 && width < 1024; // tablet

  // ── Fetch tasks on mount ─────────────────────────────────────────────────
  useEffect(() => {
    axios.get(API).then((res) => {
      setTasks(res.data);
      setLoading(false);
    });
  }, []);

  // ── Show Req2 page if toggled ────────────────────────────────────────────
  if (page === "req2") return <Req2Page onBack={() => setPage("req1")} />;

  // ── CRUD handlers ────────────────────────────────────────────────────────
  const addTask = async () => {
    if (!input.trim()) return;
    const res = await axios.post(API, { title: input, priority });
    setTasks([res.data, ...tasks]);
    setInput("");
    setPriority("medium");
  };

  const toggleTask = async (task) => {
    const res = await axios.put(`${API}/${task._id}`, {
      completed: !task.completed,
    });
    setTasks(tasks.map((t) => (t._id === task._id ? res.data : t)));
  };

  const deleteTask = async (id) => {
    await axios.delete(`${API}/${id}`);
    setTasks(tasks.filter((t) => t._id !== id));
  };

  const clearCompleted = () =>
    tasks.filter((t) => t.completed).forEach((t) => deleteTask(t._id));

  // ── Filtered task list based on active tab ───────────────────────────────
  const filtered = tasks.filter((t) => {
    if (filter === "active")    return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  // ── Derived stats ────────────────────────────────────────────────────────
  const total   = tasks.length;
  const done    = tasks.filter((t) => t.completed).length;
  const left    = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // ── Responsive layout values ─────────────────────────────────────────────
  const outerPad    = isMobile ? "20px 16px" : isTablet ? "36px 32px" : "48px 60px";
  const titleSize   = isMobile ? "28px" : isTablet ? "32px" : "38px";
  const inputRow    = isMobile ? "column" : "row"; // stack input on mobile

  return (
    <div style={{ ...s.page, padding: outerPad, position: "relative" }}>

      {/* ── Mode 2 toggle — fixed top-right corner ─────────────────────── */}
      <div style={{
        position: "fixed",
        top: isMobile ? "12px" : "20px",
        right: isMobile ? "12px" : "24px",
        textAlign: "right",
        zIndex: 100,
      }}>
        <div style={s.toggleCaption}>Switch design mode</div>
        <button style={s.toggleBtn} onClick={() => setPage("req2")}>
          Mode 2 →
        </button>
      </div>

      {/* ── Main content wrapper — full width with max-width cap ─────────── */}
      <div style={{
        width: "100%",
        maxWidth: isMobile ? "100%" : isTablet ? "760px" : "900px",
        margin: "0 auto",
        paddingTop: isMobile ? "48px" : "0", // avoid overlap with fixed toggle on mobile
      }}>

        {/* ── Page heading ───────────────────────────────────────────────── */}
        <h1 style={{ ...s.title, fontSize: titleSize }}>My Tasks</h1>
        <p style={s.date}>{today}</p>

        {/* ── Stats row: total / done / left / progress bar ──────────────── */}
        <div style={{
          ...s.statsRow,
          flexWrap: isMobile ? "wrap" : "nowrap",
          marginBottom: isMobile ? "20px" : "28px",
        }}>
          {[["total", total], ["done", done], ["left", left]].map(([label, val]) => (
            <div key={label} style={s.statBox}>
              <span style={s.statNum}>{val}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
          {/* Progress bar card — stretches to fill remaining space */}
          <div style={{ ...s.statBox, flex: 1, minWidth: isMobile ? "100%" : "160px", flexDirection: "row", alignItems: "center", gap: "12px" }}>
            <div style={s.progressTrack}>
              <div style={{ ...s.progressFill, width: `${percent}%` }} />
            </div>
            <span style={{ fontSize: "12px", color: "#888780", whiteSpace: "nowrap" }}>
              {percent}%
            </span>
          </div>
        </div>

        {/* ── Add task input row ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: inputRow, gap: "10px", marginBottom: "6px" }}>

          {/* Task input with label */}
          <div style={{ flex: 1 }}>
            <div style={s.fieldLabel}>Task</div>
            <input
              style={{ ...s.input, width: "100%", boxSizing: "border-box" }}
              placeholder="What needs to be done?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
          </div>

          {/* Priority dropdown with label */}
          <div style={{ minWidth: isMobile ? "100%" : "130px" }}>
            <div style={s.fieldLabel}>Priority</div>
            <select
              style={{ ...s.select, width: "100%" }}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Add button — aligns to bottom of the flex row */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <button
              style={{ ...s.addBtn, width: isMobile ? "100%" : "auto" }}
              onClick={addTask}
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* ── Filter tabs ────────────────────────────────────────────────── */}
        <div style={{ ...s.tabs, marginTop: "20px" }}>
          {["all", "active", "completed"].map((f) => (
            <button
              key={f}
              style={{
                ...s.tab,
                ...(filter === f ? s.tabActive : {}),
                flex: isMobile ? 1 : "none",
                fontSize: isMobile ? "12px" : "13px",
              }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Task list ──────────────────────────────────────────────────── */}
        <ul style={s.list}>
          {loading && <li style={s.empty}>Loading...</li>}
          {!loading && filtered.length === 0 && (
            <li style={s.empty}>
              {filter === "completed" ? "No completed tasks yet."
               : filter === "active"  ? "Nothing left to do!"
               : "Add your first task above."}
            </li>
          )}
          {filtered.map((task) => (
            <li key={task._id} style={{
              ...s.item,
              padding: isMobile ? "13px 0" : "14px 0",
            }}>
              {/* Completion toggle circle */}
              <button
                style={{ ...s.check, ...(task.completed ? s.checkDone : {}) }}
                onClick={() => toggleTask(task)}
              >
                {task.completed ? "✓" : ""}
              </button>

              {/* Task title */}
              <span style={{
                ...s.taskText,
                ...(task.completed ? s.taskDone : {}),
                fontSize: isMobile ? "13px" : "15px",
              }}>
                {task.title}
              </span>

              {/* Priority badge */}
              <PriorityBadge level={task.priority || "low"} />

              {/* Delete button */}
              <button style={s.deleteBtn} onClick={() => deleteTask(task._id)}>×</button>
            </li>
          ))}
        </ul>

        {/* ── Footer: remaining count + clear completed ───────────────────── */}
        {total > 0 && (
          <div style={s.footer}>
            <span style={s.footerText}>
              {left} task{left !== 1 ? "s" : ""} remaining
            </span>
            {done > 0 && (
              <button style={s.clearBtn} onClick={clearCompleted}>
                Clear completed
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#fafaf8",
    fontFamily: "Georgia, serif",
    boxSizing: "border-box",
  },
  title: {
    fontWeight: "400",
    color: "#1a1a18",
    letterSpacing: "-1px",
    margin: "0 0 4px",
  },
  date: {
    fontSize: "13px",
    color: "#888780",
    margin: "0 0 24px",
  },

  // ── Toggle button (fixed corner) ─────────────────────────────────────────
  toggleCaption: {
    fontSize: "10px",
    color: "#b4b2a9",
    marginBottom: "4px",
    letterSpacing: "0.4px",
  },
  toggleBtn: {
    fontSize: "11px",
    fontFamily: "Georgia, serif",
    background: "#1a1a18",
    color: "#fafaf8",
    border: "none",
    borderRadius: "5px",
    padding: "6px 13px",
    cursor: "pointer",
  },

  // ── Stats row ─────────────────────────────────────────────────────────────
  statsRow: {
    display: "flex",
    gap: "10px",
  },
  statBox: {
    background: "#fff",
    border: "1px solid #eeecea",
    borderRadius: "8px",
    padding: "10px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  statNum: {
    fontSize: "20px",
    fontWeight: "400",
    color: "#1a1a18",
  },
  statLabel: {
    fontSize: "10px",
    color: "#888780",
  },

  // ── Progress bar (inside stat box) ───────────────────────────────────────
  progressTrack: {
    flex: 1,
    height: "4px",
    background: "#eeecea",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#1a1a18",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },

  // ── Input fields ──────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: "11px",
    color: "#b4b2a9",
    marginBottom: "5px",
    letterSpacing: "0.3px",
  },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #d3d1c7",
    borderRadius: "6px",
    background: "#fff",
    color: "#1a1a18",
    outline: "none",
    fontFamily: "Georgia, serif",
  },
  select: {
    padding: "10px 8px",
    fontSize: "13px",
    border: "1px solid #d3d1c7",
    borderRadius: "6px",
    background: "#fff",
    color: "#888780",
    fontFamily: "Georgia, serif",
    outline: "none",
  },
  addBtn: {
    padding: "10px 22px",
    borderRadius: "6px",
    border: "none",
    background: "#1a1a18",
    color: "#fafaf8",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    whiteSpace: "nowrap",
  },

  // ── Filter tabs ───────────────────────────────────────────────────────────
  tabs: {
    display: "flex",
    borderBottom: "1px solid #eeecea",
    marginBottom: "16px",
  },
  tab: {
    padding: "8px 16px",
    color: "#888780",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    textAlign: "center",
  },
  tabActive: {
    color: "#1a1a18",
    borderBottom: "2px solid #1a1a18",
  },

  // ── Task list ─────────────────────────────────────────────────────────────
  list: { listStyle: "none", padding: 0, margin: 0 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    borderBottom: "1px solid #eeecea",
  },
  check: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "1.5px solid #b4b2a9",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    color: "#fff",
    flexShrink: 0,
  },
  checkDone: {
    background: "#1a1a18",
    borderColor: "#1a1a18",
  },
  taskText: {
    flex: 1,
    color: "#1a1a18",
    fontFamily: "Georgia, serif",
  },
  taskDone: {
    textDecoration: "line-through",
    color: "#b4b2a9",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#d3d1c7",
    fontSize: "20px",
    cursor: "pointer",
    padding: "0 2px",
    lineHeight: 1,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  empty: {
    color: "#888780",
    fontSize: "14px",
    padding: "24px 0",
    fontFamily: "Georgia, serif",
  },
  footer: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: "12px",
    color: "#b4b2a9",
    fontFamily: "Georgia, serif",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#b4b2a9",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    textDecoration: "underline",
  },
};