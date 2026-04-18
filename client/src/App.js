import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/tasks";

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

// ══════════════════════════════════════════════════════════════════════════
//  ARCADE MODE CONSTANTS
// ══════════════════════════════════════════════════════════════════════════
const POINTS   = { low: 100, medium: 250, high: 500 };
const COMBO_MS = 4000;
const LEVELS   = [
  { level: 1, title: "Rookie",      min: 0    },
  { level: 2, title: "Challenger",  min: 500  },
  { level: 3, title: "Elite",       min: 1200 },
  { level: 4, title: "Master",      min: 2500 },
  { level: 5, title: "Grandmaster", min: 4500 },
  { level: 6, title: "Legend",      min: 7000 },
];

function getLevelInfo(score) {
  let cur = LEVELS[0], nxt = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (score >= LEVELS[i].min) { cur = LEVELS[i]; nxt = LEVELS[i + 1] || null; }
  }
  const pct = nxt
    ? Math.min(100, Math.round(((score - cur.min) / (nxt.min - cur.min)) * 100))
    : 100;
  return { cur, nxt, pct };
}

const RARITY = {
  low:    { label: "COMMON", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)",  pts: 100 },
  medium: { label: "RARE",   color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.25)",  pts: 250 },
  high:   { label: "EPIC",   color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.3)",  pts: 500 },
};

// ── Google font injection ──────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById("arc-fonts")) return;
  const l = document.createElement("link");
  l.id   = "arc-fonts";
  l.rel  = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
  document.head.appendChild(l);
}

// ── Global keyframes injected once ────────────────────────────────────────
function injectKeyframes() {
  if (document.getElementById("arc-kf")) return;
  const style = document.createElement("style");
  style.id = "arc-kf";
  style.textContent = `
    @keyframes confettiFall {
      0%   { transform: translateY(-20px) rotate(0deg) scale(1);   opacity: 1; }
      80%  { opacity: 1; }
      100% { transform: translateY(105vh) rotate(900deg) scale(0.4); opacity: 0; }
    }
    @keyframes scoreRise {
      0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.7); }
      15%  { opacity: 1; transform: translateX(-50%) translateY(0px)  scale(1.1); }
      70%  { opacity: 1; transform: translateX(-50%) translateY(-50px) scale(1);  }
      100% { opacity: 0; transform: translateX(-50%) translateY(-90px) scale(0.9);}
    }
    @keyframes flashOut  { 0% { opacity:1; } 100% { opacity:0; } }
    @keyframes slideIn   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideOut  { from { opacity:1; transform:translateX(0);    } to { opacity:0; transform:translateX(30px); } }
    @keyframes comboPop  { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 100%{transform:scale(1)} }
    @keyframes shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
    @keyframes streakBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
    @keyframes levelUp   { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)} 20%{opacity:1;transform:translate(-50%,-50%) scale(1.05)} 80%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.1)} }
  `;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════════════════════════════════════
//  FX COMPONENTS
// ══════════════════════════════════════════════════════════════════════════

function Confetti({ active }) {
  const [particles, setParticles] = useState([]);
  const COLS = ["#a78bfa","#38bdf8","#34d399","#fb923c","#f472b6","#facc15","#60a5fa"];
  useEffect(() => {
    if (!active) return;
    setParticles(Array.from({ length: 48 }, (_, i) => ({
      id: Date.now() + i,
      color: COLS[i % COLS.length],
      left:  2 + Math.random() * 96,
      delay: Math.random() * 0.5,
      dur:   0.8 + Math.random() * 0.8,
      size:  5 + Math.random() * 9,
      shape: Math.random() > 0.4 ? "50%" : Math.random() > 0.5 ? "2px" : "0",
    })));
  }, [active]);
  if (!active && !particles.length) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute", top:"-20px", left:`${p.left}%`,
          width:p.size, height:p.size,
          background:p.color, borderRadius:p.shape,
          boxShadow:`0 0 8px ${p.color}88`,
          animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

function ScorePopup({ value, combo, id }) {
  return (
    <div key={id} style={{
      position:"fixed", top:"38%", left:"50%",
      display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
      pointerEvents:"none", zIndex:9998,
      animation:"scoreRise 1.3s ease-out forwards",
      fontFamily:"'Inter', sans-serif",
    }}>
      <span style={{
        fontSize:"48px", fontWeight:900, lineHeight:1,
        background:"linear-gradient(135deg,#facc15,#fb923c)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        filter:"drop-shadow(0 0 20px rgba(250,204,21,0.7))",
      }}>
        +{value.toLocaleString()}
      </span>
      {combo > 1 && (
        <span style={{
          fontSize:"20px", fontWeight:800,
          background:"linear-gradient(135deg,#a78bfa,#38bdf8)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          filter:"drop-shadow(0 0 12px rgba(167,139,250,0.8))",
        }}>
          {combo}× COMBO
        </span>
      )}
    </div>
  );
}

function FlashOverlay({ color }) {
  if (!color) return null;
  return (
    <div style={{
      position:"fixed", inset:0, background:color,
      pointerEvents:"none", zIndex:9997,
      animation:"flashOut 0.5s ease-out forwards",
    }} />
  );
}

function LevelUpBanner({ show, title }) {
  if (!show) return null;
  return (
    <div style={{
      position:"fixed", top:"50%", left:"50%",
      transform:"translate(-50%,-50%)",
      display:"flex", flexDirection:"column", alignItems:"center", gap:"10px",
      pointerEvents:"none", zIndex:9996,
      animation:"levelUp 2.2s ease forwards",
      textAlign:"center",
    }}>
      <span style={{ fontSize:"16px", fontWeight:700, color:"#a78bfa", letterSpacing:"4px", fontFamily:"'Inter',sans-serif" }}>
        LEVEL UP
      </span>
      <span style={{
        fontSize:"52px", fontWeight:900, lineHeight:1,
        background:"linear-gradient(135deg,#a78bfa,#38bdf8,#34d399)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        filter:"drop-shadow(0 0 30px rgba(167,139,250,0.9))",
        fontFamily:"'Inter',sans-serif",
      }}>
        {title}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  HUD BAR
// ══════════════════════════════════════════════════════════════════════════
function ArcadeHUD({ score, hiScore, streak, combo, levelInfo, isMobile }) {
  const { cur, nxt, pct } = levelInfo;
  return (
    <div style={{
      background:"rgba(10,10,20,0.95)",
      borderBottom:"1px solid rgba(167,139,250,0.2)",
      backdropFilter:"blur(20px)",
      padding: isMobile ? "12px 16px" : "14px 32px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      gap:"16px", flexWrap:"wrap",
      fontFamily:"'Inter',sans-serif",
      boxShadow:"0 4px 30px rgba(0,0,0,0.5)",
    }}>
      {/* Level block */}
      <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
        <div style={{
          width: isMobile ? "44px" : "52px", height: isMobile ? "44px" : "52px",
          borderRadius:"12px",
          background:"linear-gradient(135deg,#a78bfa,#38bdf8)",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 0 20px rgba(167,139,250,0.5)",
          fontSize: isMobile ? "18px" : "22px", fontWeight:900, color:"#fff",
          flexShrink:0,
        }}>
          {cur.level}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"4px", minWidth:"120px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <span style={{ fontSize: isMobile ? "13px" : "15px", fontWeight:700, color:"#e2e8f0" }}>{cur.title}</span>
            {nxt && <span style={{ fontSize:"11px", color:"#475569" }}>{nxt.title} →</span>}
          </div>
          <div style={{ height:"5px", background:"rgba(255,255,255,0.08)", borderRadius:"99px", overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${pct}%`,
              background:"linear-gradient(90deg,#a78bfa,#38bdf8)",
              borderRadius:"99px", transition:"width 0.6s ease",
              boxShadow:"0 0 8px rgba(167,139,250,0.6)",
            }} />
          </div>
        </div>
      </div>

      {/* Score */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <span style={{ fontSize:"10px", fontWeight:600, color:"#475569", letterSpacing:"2px", textTransform:"uppercase" }}>Score</span>
        <span style={{
          fontSize: isMobile ? "22px" : "28px", fontWeight:900, letterSpacing:"-1px",
          background:"linear-gradient(135deg,#facc15,#fb923c)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>
          {score.toLocaleString()}
        </span>
      </div>

      {/* Hi-Score */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <span style={{ fontSize:"10px", fontWeight:600, color:"#475569", letterSpacing:"2px", textTransform:"uppercase" }}>Best</span>
        <span style={{ fontSize: isMobile ? "16px" : "20px", fontWeight:800, color:"#fb923c" }}>
          {hiScore.toLocaleString()}
        </span>
      </div>

      {/* Streak + combo */}
      <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"8px 14px", borderRadius:"12px",
          background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.2)",
          animation: streak > 0 ? "streakBounce 0.5s ease" : "none",
        }}>
          <span style={{ fontSize:"10px", fontWeight:600, color:"#f472b6", letterSpacing:"1px" }}>STREAK</span>
          <span style={{ fontSize: isMobile ? "18px" : "22px", fontWeight:900, color:"#f472b6" }}>🔥 {streak}</span>
        </div>
        {combo > 1 && (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            padding:"8px 14px", borderRadius:"12px",
            background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.3)",
            animation:"comboPop 0.35s ease",
          }}>
            <span style={{ fontSize:"10px", fontWeight:600, color:"#a78bfa", letterSpacing:"1px" }}>COMBO</span>
            <span style={{ fontSize: isMobile ? "18px" : "22px", fontWeight:900, color:"#a78bfa" }}>{combo}×</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  TASK ITEM
// ══════════════════════════════════════════════════════════════════════════
function ArcadeTaskItem({ task, onToggle, onDelete, isMobile }) {
  const [removing, setRemoving] = useState(false);
  const r = RARITY[task.priority] || RARITY.low;

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => onDelete(task._id), 300);
  };

  return (
    <li style={{
      display:"flex", alignItems:"center", gap:"14px",
      padding: isMobile ? "14px 16px" : "16px 22px",
      background: task.completed
        ? "rgba(52,211,153,0.04)"
        : "rgba(255,255,255,0.02)",
      borderBottom:"1px solid rgba(255,255,255,0.05)",
      transition:"all 0.3s cubic-bezier(.4,0,.2,1)",
      opacity: removing ? 0 : 1,
      transform: removing ? "translateX(24px)" : "none",
      animation: "slideIn 0.25s ease",
      cursor: "default",
    }}>
      {/* Check button */}
      <button
        onClick={() => onToggle(task)}
        style={{
          width:"28px", height:"28px", borderRadius:"8px", flexShrink:0,
          border:`2px solid ${task.completed ? "#34d399" : r.border}`,
          background: task.completed
            ? "linear-gradient(135deg,#34d399,#059669)"
            : "transparent",
          boxShadow: task.completed ? "0 0 14px rgba(52,211,153,0.5)" : `0 0 8px ${r.bg}`,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all 0.2s ease", color:"#fff", fontSize:"14px", fontWeight:700,
        }}
      >
        {task.completed ? "✓" : ""}
      </button>

      {/* Title */}
      <span style={{
        flex:1, fontSize: isMobile ? "14px" : "15px", fontWeight:500,
        fontFamily:"'Inter',sans-serif", lineHeight:1.5,
        color: task.completed ? "#475569" : "#e2e8f0",
        textDecoration: task.completed ? "line-through" : "none",
        wordBreak:"break-word",
        transition:"color 0.2s",
      }}>
        {task.title}
      </span>

      {/* Rarity chip */}
      <span style={{
        fontSize:"11px", fontWeight:700, padding:"4px 10px", borderRadius:"99px",
        background:r.bg, border:`1px solid ${r.border}`, color:r.color,
        letterSpacing:"0.5px", whiteSpace:"nowrap",
        boxShadow:`0 0 8px ${r.bg}`,
        display: isMobile ? "none" : "inline",
      }}>
        {r.label}
      </span>

      {/* Points */}
      <span style={{
        fontSize:"13px", fontWeight:700, color:"#facc15",
        whiteSpace:"nowrap", opacity: task.completed ? 0.4 : 0.8,
        fontFamily:"'Inter',sans-serif",
      }}>
        {r.pts.toLocaleString()} pts
      </span>

      {/* Delete */}
      <button
        onClick={handleDelete}
        style={{
          background:"transparent", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:"8px", color:"rgba(239,68,68,0.5)", fontSize:"16px",
          cursor:"pointer", padding:"4px 8px", lineHeight:1, flexShrink:0,
          transition:"all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.1)"; e.currentTarget.style.color="#ef4444"; e.currentTarget.style.borderColor="rgba(239,68,68,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(239,68,68,0.5)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.2)"; }}
      >
        ×
      </button>
    </li>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MODE 2 — ARCADE PAGE
// ══════════════════════════════════════════════════════════════════════════
function Req2Page({ tasks, onBack, onToggle, onDelete, onAdd }) {
  injectFonts();
  injectKeyframes();

  const [input, setInput]       = useState("");
  const [priority, setPriority] = useState("medium");
  const [filter, setFilter]     = useState("all");

  const [score,   setScore]   = useState(() => parseInt(localStorage.getItem("arc_score")  || "0",  10));
  const [hiScore, setHiScore] = useState(() => parseInt(localStorage.getItem("arc_hi")     || "0",  10));
  const [streak,  setStreak]  = useState(() => parseInt(localStorage.getItem("arc_streak") || "0",  10));
  const [combo,   setCombo]   = useState(1);
  const comboTimer            = useRef(null);

  const [confetti,   setConfetti]   = useState(false);
  const [flash,      setFlash]      = useState(null);
  const [popup,      setPopup]      = useState(null);
  const [levelUpMsg, setLevelUpMsg] = useState(null);

  const prevDoneRef = useRef(tasks.filter(t => t.completed).length);
  const prevLevel   = useRef(getLevelInfo(score).cur.level);

  const width    = useWindowWidth();
  const isMobile = width < 600;

  useEffect(() => {
    const nowDone = tasks.filter(t => t.completed).length;
    const prev    = prevDoneRef.current;

    if (nowDone > prev) {
      const justDone  = [...tasks].filter(t => t.completed).pop();
      const base      = POINTS[justDone?.priority || "low"];
      const newCombo  = comboTimer.current ? combo + 1 : 1;
      const earned    = base * newCombo;
      const newScore  = score + earned;
      const newStreak = streak + 1;
      const newHi     = Math.max(hiScore, newScore);

      setScore(newScore);
      setStreak(newStreak);
      setHiScore(newHi);
      setCombo(newCombo);
      localStorage.setItem("arc_score",  newScore);
      localStorage.setItem("arc_streak", newStreak);
      localStorage.setItem("arc_hi",     newHi);

      // Check level up
      const newLevelInfo = getLevelInfo(newScore);
      if (newLevelInfo.cur.level > prevLevel.current) {
        setLevelUpMsg(newLevelInfo.cur.title);
        setTimeout(() => setLevelUpMsg(null), 2200);
      }
      prevLevel.current = newLevelInfo.cur.level;

      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => { setCombo(1); comboTimer.current = null; }, COMBO_MS);

      setConfetti(true);
      setFlash("rgba(167,139,250,0.15)");
      setPopup({ value: earned, combo: newCombo, id: Date.now() });
      setTimeout(() => setConfetti(false), 1600);
      setTimeout(() => setFlash(null), 500);
      setTimeout(() => setPopup(null), 1300);
    }
    prevDoneRef.current = nowDone;
  }, [tasks]);

  const addTask = async () => {
    if (!input.trim()) return;
    await onAdd(input, priority);
    setInput(""); setPriority("medium");
  };

  const filtered = tasks.filter(t => {
    if (filter === "active")    return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const total = tasks.length;
  const done  = tasks.filter(t => t.completed).length;
  const left  = total - done;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const levelInfo = getLevelInfo(score);

  const FILTERS = [["All", "all"], ["Active", "active"], ["Done", "completed"]];

  return (
    <div style={{
      minHeight:"100vh", background:"#060610",
      fontFamily:"'Inter',sans-serif", display:"flex", flexDirection:"column",
      backgroundImage:`
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(167,139,250,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(56,189,248,0.1) 0%, transparent 60%)
      `,
    }}>
      <Confetti active={confetti} />
      <FlashOverlay color={flash} />
      {popup && <ScorePopup value={popup.value} combo={popup.combo} id={popup.id} />}
      {levelUpMsg && <LevelUpBanner show title={levelUpMsg} />}

      <ArcadeHUD score={score} hiScore={hiScore} streak={streak} combo={combo} levelInfo={levelInfo} isMobile={isMobile} />

      <div style={{
        flex:1, width:"100%", maxWidth:"820px",
        margin:"0 auto", padding: isMobile ? "20px 16px" : "32px 32px",
        boxSizing:"border-box",
      }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"28px" }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? "26px" : "34px", fontWeight:900,
              margin:"0 0 4px", letterSpacing:"-1px", lineHeight:1,
              background:"linear-gradient(135deg,#e2e8f0 30%,#a78bfa)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>
              Quest Board
            </h1>
            <p style={{ fontSize:"14px", color:"#475569", margin:0, fontWeight:500 }}>
              {left === 0 && total > 0
                ? "🎉 All quests cleared!"
                : `${left} quest${left !== 1 ? "s" : ""} remaining`}
            </p>
          </div>
          <button
            onClick={onBack}
            style={{
              fontSize:"13px", fontWeight:600, padding:"10px 18px",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:"10px", color:"#64748b", cursor:"pointer",
              transition:"all 0.2s", fontFamily:"'Inter',sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#64748b"; }}
          >
            ← Minimal Mode
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display:"flex", gap:"12px", marginBottom:"24px", flexWrap:"wrap" }}>
          {[
            { label:"Total Quests", val:total, color:"#e2e8f0",  icon:"📋" },
            { label:"Cleared",      val:done,  color:"#34d399",  icon:"✅" },
            { label:"Remaining",    val:left,  color:"#fb923c",  icon:"⚡" },
          ].map(({ label, val, color, icon }) => (
            <div key={label} style={{
              flex:1, minWidth:"90px",
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"16px", padding:"16px",
              display:"flex", flexDirection:"column", gap:"4px",
              backdropFilter:"blur(10px)",
            }}>
              <span style={{ fontSize:"20px" }}>{icon}</span>
              <span style={{ fontSize: isMobile ? "26px" : "32px", fontWeight:900, color, lineHeight:1 }}>{val}</span>
              <span style={{ fontSize:"12px", color:"#475569", fontWeight:500 }}>{label}</span>
            </div>
          ))}
          {/* Progress card */}
          <div style={{
            flex:2, minWidth:"160px",
            background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"16px", padding:"16px",
            display:"flex", flexDirection:"column", justifyContent:"center", gap:"10px",
            backdropFilter:"blur(10px)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:"13px", fontWeight:600, color:"#64748b" }}>Overall Progress</span>
              <span style={{ fontSize:"22px", fontWeight:900, color:"#a78bfa" }}>{pct}%</span>
            </div>
            <div style={{ height:"8px", background:"rgba(255,255,255,0.06)", borderRadius:"99px", overflow:"hidden" }}>
              <div style={{
                height:"100%", width:`${pct}%`,
                background:"linear-gradient(90deg,#a78bfa,#38bdf8)",
                borderRadius:"99px", transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                boxShadow:"0 0 12px rgba(167,139,250,0.5)",
              }} />
            </div>
          </div>
        </div>

        {/* Sound tip */}
        <div style={{
          display:"flex", alignItems:"center", gap:"8px",
          padding:"10px 14px", borderRadius:"10px", marginBottom:"20px",
          background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.12)",
        }}>
          <span style={{ fontSize:"16px" }}>🔊</span>
          <span style={{ fontSize:"12px", color:"#38bdf8", fontWeight:500 }}>
            Tip: Turn on sound for the full arcade experience
          </span>
        </div>

        {/* Add task */}
        <div style={{
          display:"flex", flexDirection: isMobile ? "column" : "row",
          gap:"10px", marginBottom:"20px",
          padding:"16px", borderRadius:"16px",
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
        }}>
          <input
            style={{
              flex:1, padding:"12px 16px",
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:"10px", color:"#e2e8f0",
              fontFamily:"'Inter',sans-serif", fontSize:"15px", fontWeight:500,
              outline:"none", transition:"border-color 0.2s, box-shadow 0.2s",
              width: isMobile ? "100%" : "auto", boxSizing:"border-box",
            }}
            placeholder="Add a new quest..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            onFocus={e => { e.target.style.borderColor="rgba(167,139,250,0.5)"; e.target.style.boxShadow="0 0 0 3px rgba(167,139,250,0.1)"; }}
            onBlur={e => { e.target.style.borderColor="rgba(255,255,255,0.1)"; e.target.style.boxShadow="none"; }}
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            style={{
              padding:"12px 14px", background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px",
              color:"#94a3b8", fontFamily:"'Inter',sans-serif", fontSize:"14px",
              outline:"none", cursor:"pointer",
              width: isMobile ? "100%" : "160px",
            }}
          >
            <option value="low">Common  — 100 pts</option>
            <option value="medium">Rare      — 250 pts</option>
            <option value="high">Epic       — 500 pts</option>
          </select>
          <button
            onClick={addTask}
            style={{
              padding:"12px 24px", borderRadius:"10px", border:"none",
              background:"linear-gradient(135deg,#a78bfa,#38bdf8)",
              color:"#fff", fontSize:"15px", fontWeight:700,
              cursor:"pointer", whiteSpace:"nowrap",
              fontFamily:"'Inter',sans-serif",
              boxShadow:"0 4px 20px rgba(167,139,250,0.35)",
              transition:"all 0.2s", width: isMobile ? "100%" : "auto",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 28px rgba(167,139,250,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 20px rgba(167,139,250,0.35)"; }}
          >
            + Add Quest
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{
          display:"flex", gap:"6px", marginBottom:"14px",
          padding:"4px", background:"rgba(255,255,255,0.03)",
          borderRadius:"12px", border:"1px solid rgba(255,255,255,0.06)",
        }}>
          {FILTERS.map(([label, val]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                flex:1, padding:"9px",
                background: filter === val
                  ? "linear-gradient(135deg,rgba(167,139,250,0.2),rgba(56,189,248,0.15))"
                  : "transparent",
                border: filter === val ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
                borderRadius:"9px",
                color: filter === val ? "#e2e8f0" : "#475569",
                fontFamily:"'Inter',sans-serif", fontSize:"14px", fontWeight:600,
                cursor:"pointer", transition:"all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"16px", overflow:"hidden",
          backdropFilter:"blur(10px)",
        }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 24px" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>
                {filter === "completed" ? "🏆" : filter === "active" ? "🎯" : "📋"}
              </div>
              <p style={{ fontSize:"16px", fontWeight:600, color:"#334155", margin:0 }}>
                {filter === "completed" ? "No quests cleared yet"
                 : filter === "active"  ? "Inbox zero — you're a legend"
                 : "Add your first quest above"}
              </p>
            </div>
          ) : (
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {filtered.map(task => (
                <ArcadeTaskItem
                  key={task._id} task={task}
                  onToggle={onToggle} onDelete={onDelete} isMobile={isMobile}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Clear completed */}
        {done > 0 && (
          <div style={{ textAlign:"right", marginTop:"12px" }}>
            <button
              onClick={() => filtered.filter(t => t.completed).forEach(t => onDelete(t._id))}
              style={{
                background:"none", border:"none",
                color:"#475569", fontSize:"13px", fontWeight:500,
                cursor:"pointer", fontFamily:"'Inter',sans-serif",
                textDecoration:"underline", textUnderlineOffset:"3px",
              }}
            >
              Clear completed
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  PRIORITY BADGE — Mode 1
// ══════════════════════════════════════════════════════════════════════════
const PRIORITY_STYLES = {
  low:    { background: "#eaf3de", color: "#3B6D11" },
  medium: { background: "#faeeda", color: "#854F0B" },
  high:   { background: "#fcebeb", color: "#A32D2D" },
};
function PriorityBadge({ level }) {
  const st = PRIORITY_STYLES[level] || PRIORITY_STYLES.low;
  return (
    <span style={{ fontSize:"10px", padding:"2px 9px", borderRadius:"10px", fontFamily:"Georgia, serif", whiteSpace:"nowrap", ...st }}>
      {level}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tasks, setTasks]       = useState([]);
  const [input, setInput]       = useState("");
  const [priority, setPriority] = useState("medium");
  const [filter, setFilter]     = useState("all");
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState("req1");

  const width    = useWindowWidth();
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;

  useEffect(() => {
    axios.get(API).then(res => { setTasks(res.data); setLoading(false); });
  }, []);

  const addTask = async (title, prio) => {
    const res = await axios.post(API, { title, priority: prio });
    setTasks(prev => [res.data, ...prev]);
  };
  const toggleTask = async (task) => {
    const res = await axios.put(`${API}/${task._id}`, { completed: !task.completed });
    setTasks(prev => prev.map(t => t._id === task._id ? res.data : t));
  };
  const deleteTask = async (id) => {
    await axios.delete(`${API}/${id}`);
    setTasks(prev => prev.filter(t => t._id !== id));
  };
  const clearCompleted = () => tasks.filter(t => t.completed).forEach(t => deleteTask(t._id));

  if (page === "req2") {
    return <Req2Page tasks={tasks} onBack={() => setPage("req1")} onToggle={toggleTask} onDelete={deleteTask} onAdd={addTask} />;
  }

  const filtered = tasks.filter(t => {
    if (filter === "active")    return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const left    = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const today   = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
  const outerPad  = isMobile ? "20px 16px" : isTablet ? "36px 32px" : "48px 60px";
  const titleSize = isMobile ? "28px" : isTablet ? "32px" : "38px";
  const inputRow  = isMobile ? "column" : "row";
  const handleAdd = () => { if (!input.trim()) return; addTask(input, priority); setInput(""); setPriority("medium"); };

  return (
    <div style={{ ...s.page, padding: outerPad, position:"relative" }}>
      <div style={{ position:"fixed", top: isMobile?"12px":"20px", right: isMobile?"12px":"24px", textAlign:"right", zIndex:100 }}>
        <div style={s.toggleCaption}>Switch design mode</div>
        <button style={s.toggleBtn} onClick={() => setPage("req2")}>Mode 2 →</button>
      </div>
      <div style={{ width:"100%", maxWidth: isMobile?"100%":isTablet?"760px":"900px", margin:"0 auto", paddingTop: isMobile?"48px":"0" }}>
        <h1 style={{ ...s.title, fontSize: titleSize }}>My Tasks</h1>
        <p style={s.date}>{today}</p>
        <div style={{ ...s.statsRow, flexWrap: isMobile?"wrap":"nowrap", marginBottom: isMobile?"20px":"28px" }}>
          {[["total",total],["done",done],["left",left]].map(([label,val]) => (
            <div key={label} style={s.statBox}>
              <span style={s.statNum}>{val}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
          <div style={{ ...s.statBox, flex:1, minWidth: isMobile?"100%":"160px", flexDirection:"row", alignItems:"center", gap:"12px" }}>
            <div style={s.progressTrack}><div style={{ ...s.progressFill, width:`${percent}%` }} /></div>
            <span style={{ fontSize:"12px", color:"#888780", whiteSpace:"nowrap" }}>{percent}%</span>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:inputRow, gap:"10px", marginBottom:"6px" }}>
          <div style={{ flex:1 }}>
            <div style={s.fieldLabel}>Task</div>
            <input style={{ ...s.input, width:"100%", boxSizing:"border-box" }} placeholder="What needs to be done?" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && handleAdd()} />
          </div>
          <div style={{ minWidth: isMobile?"100%":"130px" }}>
            <div style={s.fieldLabel}>Priority</div>
            <select style={{ ...s.select, width:"100%" }} value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
            <button style={{ ...s.addBtn, width: isMobile?"100%":"auto" }} onClick={handleAdd}>+ Add Task</button>
          </div>
        </div>
        <div style={{ ...s.tabs, marginTop:"20px" }}>
          {["all","active","completed"].map(f => (
            <button key={f} style={{ ...s.tab, ...(filter===f?s.tabActive:{}), flex: isMobile?1:"none", fontSize: isMobile?"12px":"13px" }} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <ul style={s.list}>
          {loading && <li style={s.empty}>Loading...</li>}
          {!loading && filtered.length===0 && (
            <li style={s.empty}>
              {filter==="completed"?"No completed tasks yet.":filter==="active"?"Nothing left to do!":"Add your first task above."}
            </li>
          )}
          {filtered.map(task => (
            <li key={task._id} style={{ ...s.item, padding: isMobile?"13px 0":"14px 0" }}>
              <button style={{ ...s.check, ...(task.completed?s.checkDone:{}) }} onClick={() => toggleTask(task)}>
                {task.completed?"✓":""}
              </button>
              <span style={{ ...s.taskText, ...(task.completed?s.taskDone:{}), fontSize: isMobile?"13px":"15px" }}>
                {task.title}
              </span>
              <PriorityBadge level={task.priority||"low"} />
              <button style={s.deleteBtn} onClick={() => deleteTask(task._id)}>×</button>
            </li>
          ))}
        </ul>
        {total > 0 && (
          <div style={s.footer}>
            <span style={s.footerText}>{left} task{left!==1?"s":""} remaining</span>
            {done > 0 && <button style={s.clearBtn} onClick={clearCompleted}>Clear completed</button>}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:          { minHeight:"100vh", background:"#fafaf8", fontFamily:"Georgia, serif", boxSizing:"border-box" },
  title:         { fontWeight:"400", color:"#1a1a18", letterSpacing:"-1px", margin:"0 0 4px" },
  date:          { fontSize:"13px", color:"#888780", margin:"0 0 24px" },
  toggleCaption: { fontSize:"10px", color:"#b4b2a9", marginBottom:"4px", letterSpacing:"0.4px" },
  toggleBtn:     { fontSize:"11px", fontFamily:"Georgia, serif", background:"#1a1a18", color:"#fafaf8", border:"none", borderRadius:"5px", padding:"6px 13px", cursor:"pointer" },
  statsRow:      { display:"flex", gap:"10px" },
  statBox:       { background:"#fff", border:"1px solid #eeecea", borderRadius:"8px", padding:"10px 20px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
  statNum:       { fontSize:"20px", fontWeight:"400", color:"#1a1a18" },
  statLabel:     { fontSize:"10px", color:"#888780" },
  progressTrack: { flex:1, height:"4px", background:"#eeecea", borderRadius:"2px", overflow:"hidden" },
  progressFill:  { height:"100%", background:"#1a1a18", borderRadius:"2px", transition:"width 0.4s ease" },
  fieldLabel:    { fontSize:"11px", color:"#b4b2a9", marginBottom:"5px", letterSpacing:"0.3px" },
  input:         { padding:"10px 14px", fontSize:"14px", border:"1px solid #d3d1c7", borderRadius:"6px", background:"#fff", color:"#1a1a18", outline:"none", fontFamily:"Georgia, serif" },
  select:        { padding:"10px 8px", fontSize:"13px", border:"1px solid #d3d1c7", borderRadius:"6px", background:"#fff", color:"#888780", fontFamily:"Georgia, serif", outline:"none" },
  addBtn:        { padding:"10px 22px", borderRadius:"6px", border:"none", background:"#1a1a18", color:"#fafaf8", fontSize:"13px", cursor:"pointer", fontFamily:"Georgia, serif", whiteSpace:"nowrap" },
  tabs:          { display:"flex", borderBottom:"1px solid #eeecea", marginBottom:"16px" },
  tab:           { padding:"8px 16px", color:"#888780", background:"none", border:"none", borderBottom:"2px solid transparent", cursor:"pointer", fontFamily:"Georgia, serif", textAlign:"center" },
  tabActive:     { color:"#1a1a18", borderBottom:"2px solid #1a1a18" },
  list:          { listStyle:"none", padding:0, margin:0 },
  item:          { display:"flex", alignItems:"center", gap:"14px", borderBottom:"1px solid #eeecea" },
  check:         { width:"20px", height:"20px", borderRadius:"50%", border:"1.5px solid #b4b2a9", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#fff", flexShrink:0 },
  checkDone:     { background:"#1a1a18", borderColor:"#1a1a18" },
  taskText:      { flex:1, color:"#1a1a18", fontFamily:"Georgia, serif" },
  taskDone:      { textDecoration:"line-through", color:"#b4b2a9" },
  deleteBtn:     { background:"none", border:"none", color:"#d3d1c7", fontSize:"20px", cursor:"pointer", padding:"0 2px", lineHeight:1 },
  empty:         { color:"#888780", fontSize:"14px", padding:"24px 0", fontFamily:"Georgia, serif" },
  footer:        { marginTop:"18px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  footerText:    { fontSize:"12px", color:"#b4b2a9", fontFamily:"Georgia, serif" },
  clearBtn:      { background:"none", border:"none", color:"#b4b2a9", fontSize:"12px", cursor:"pointer", fontFamily:"Georgia, serif", textDecoration:"underline" },
};