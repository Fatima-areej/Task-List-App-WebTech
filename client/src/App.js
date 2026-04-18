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
  const COLS = ["#c4b5fd","#67e8f9","#6ee7b7","#fcd34d","#f9a8d4","#93c5fd"];
  useEffect(() => {
    if (!active) return;
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: Date.now() + i,
      color: COLS[i % COLS.length],
      left: 2 + Math.random() * 96,
      delay: Math.random() * 0.4,
      dur: 1 + Math.random() * 0.6,
      size: 5 + Math.random() * 7,
      shape: Math.random() > 0.4 ? "50%" : "2px",
    })));
    setTimeout(() => setParticles([]), 2000);
  }, [active]);
  if (!particles.length) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute", top:"-20px", left:`${p.left}%`,
          width:p.size, height:p.size, background:p.color, borderRadius:p.shape,
          animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

function ScorePopup({ value, combo, id }) {
  return (
    <div key={id} style={{
      position:"fixed", top:"35%", left:"50%",
      display:"flex", flexDirection:"column", alignItems:"center", gap:"4px",
      pointerEvents:"none", zIndex:9998,
      animation:"scoreRise 1.3s ease-out forwards",
      fontFamily:"'Inter', sans-serif",
    }}>
      <span style={{
        fontSize:"52px", fontWeight:900, lineHeight:1,
        background:"linear-gradient(135deg,#fcd34d,#f97316)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}>
        +{value.toLocaleString()}
      </span>
      {combo > 1 && (
        <span style={{
          fontSize:"18px", fontWeight:800,
          background:"linear-gradient(135deg,#c4b5fd,#67e8f9)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>
          {combo}× COMBO!
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
      animation:"flashOut 0.4s ease-out forwards",
    }} />
  );
}

function LevelUpBanner({ show, title }) {
  if (!show) return null;
  return (
    <div style={{
      position:"fixed", top:"50%", left:"50%",
      transform:"translate(-50%,-50%)",
      display:"flex", flexDirection:"column", alignItems:"center", gap:"8px",
      pointerEvents:"none", zIndex:9996,
      animation:"levelUp 2.2s ease forwards",
      textAlign:"center",
    }}>
      <span style={{ fontSize:"13px", fontWeight:700, color:"#c4b5fd", letterSpacing:"4px", fontFamily:"'Inter',sans-serif" }}>
        LEVEL UP
      </span>
      <span style={{
        fontSize:"56px", fontWeight:900, lineHeight:1,
        background:"linear-gradient(135deg,#c4b5fd,#67e8f9,#6ee7b7)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        fontFamily:"'Inter',sans-serif",
      }}>
        {title}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  HUD BAR — top bar with score, level, streak
// ══════════════════════════════════════════════════════════════════════════
function ArcadeHUD({ score, hiScore, streak, combo, levelInfo, isMobile }) {
  const { cur, nxt, pct } = levelInfo;
  return (
    <div style={{
      background:"#1a1a2e",
      borderBottom:"1px solid rgba(196,181,253,0.15)",
      padding: isMobile ? "10px 16px" : "12px 40px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      gap:"12px", flexWrap:"wrap",
      fontFamily:"'Inter',sans-serif",
    }}>
      {/* Level */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
        <div style={{
          width: isMobile ? "40px" : "48px", height: isMobile ? "40px" : "48px",
          borderRadius:"10px",
          background:"linear-gradient(135deg,#7c3aed,#2563eb)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: isMobile ? "17px" : "20px", fontWeight:900, color:"#fff",
          flexShrink:0,
        }}>
          {cur.level}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"4px", minWidth:"110px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <span style={{ fontSize: isMobile ? "12px" : "14px", fontWeight:700, color:"#e2e8f0" }}>{cur.title}</span>
            {nxt && <span style={{ fontSize:"11px", color:"#64748b" }}>{nxt.title} →</span>}
          </div>
          <div style={{ height:"4px", background:"rgba(255,255,255,0.1)", borderRadius:"99px", overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${pct}%`,
              background:"linear-gradient(90deg,#7c3aed,#2563eb)",
              borderRadius:"99px", transition:"width 0.6s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Score */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <span style={{ fontSize:"10px", fontWeight:600, color:"#64748b", letterSpacing:"2px" }}>SCORE</span>
        <span style={{
          fontSize: isMobile ? "20px" : "26px", fontWeight:900,
          background:"linear-gradient(135deg,#fcd34d,#f97316)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>
          {score.toLocaleString()}
        </span>
      </div>

      {/* Best */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <span style={{ fontSize:"10px", fontWeight:600, color:"#64748b", letterSpacing:"2px" }}>BEST</span>
        <span style={{ fontSize: isMobile ? "15px" : "18px", fontWeight:800, color:"#f97316" }}>
          {hiScore.toLocaleString()}
        </span>
      </div>

      {/* Streak + combo */}
      <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"6px 12px", borderRadius:"10px",
          background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.15)",
        }}>
          <span style={{ fontSize:"10px", fontWeight:600, color:"#f472b6", letterSpacing:"1px" }}>STREAK</span>
          <span style={{ fontSize: isMobile ? "16px" : "20px", fontWeight:900, color:"#f472b6" }}>🔥 {streak}</span>
        </div>
        {combo > 1 && (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            padding:"6px 12px", borderRadius:"10px",
            background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)",
            animation:"comboPop 0.35s ease",
          }}>
            <span style={{ fontSize:"10px", fontWeight:600, color:"#a78bfa", letterSpacing:"1px" }}>COMBO</span>
            <span style={{ fontSize: isMobile ? "16px" : "20px", fontWeight:900, color:"#a78bfa" }}>{combo}×</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  TASK CARD — individual task in arcade mode
// ══════════════════════════════════════════════════════════════════════════
function ArcadeTaskItem({ task, onToggle, onDelete, isMobile }) {
  const [removing, setRemoving] = useState(false);
  const r = RARITY[task.priority] || RARITY.low;

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => onDelete(task._id), 280);
  };

  return (
    <li style={{
      display:"flex", alignItems:"center", gap:"14px",
      padding: isMobile ? "14px 16px" : "16px 24px",
      background: task.completed ? "rgba(110,231,183,0.04)" : "rgba(255,255,255,0.025)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      transition:"all 0.28s cubic-bezier(.4,0,.2,1)",
      opacity: removing ? 0 : 1,
      transform: removing ? "translateX(20px)" : "none",
      animation:"slideIn 0.22s ease",
    }}>
      {/* Checkbox */}
      <button onClick={() => onToggle(task)} style={{
        width:"26px", height:"26px", borderRadius:"7px", flexShrink:0,
        border:`2px solid ${task.completed ? "#34d399" : r.border}`,
        background: task.completed ? "linear-gradient(135deg,#34d399,#059669)" : "transparent",
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.2s", color:"#fff", fontSize:"13px", fontWeight:700,
      }}>
        {task.completed ? "✓" : ""}
      </button>

      {/* Title */}
      <span style={{
        flex:1, fontSize: isMobile ? "14px" : "15px", fontWeight:500,
        fontFamily:"'Inter',sans-serif", color: task.completed ? "#64748b" : "#e2e8f0",
        textDecoration: task.completed ? "line-through" : "none",
        transition:"color 0.2s",
      }}>
        {task.title}
      </span>

      {/* Rarity chip — hidden on mobile */}
      {!isMobile && (
        <span style={{
          fontSize:"10px", fontWeight:700, padding:"3px 9px", borderRadius:"99px",
          background:r.bg, border:`1px solid ${r.border}`, color:r.color,
          letterSpacing:"0.5px", whiteSpace:"nowrap",
        }}>
          {r.label}
        </span>
      )}

      {/* Points */}
      <span style={{
        fontSize:"13px", fontWeight:700, color:"#fcd34d",
        whiteSpace:"nowrap", opacity: task.completed ? 0.35 : 0.9,
        fontFamily:"'Inter',sans-serif",
      }}>
        {r.pts.toLocaleString()} pts
      </span>

      {/* Delete */}
      <button onClick={handleDelete} style={{
        background:"transparent", border:"1px solid rgba(239,68,68,0.15)",
        borderRadius:"7px", color:"rgba(239,68,68,0.4)", fontSize:"16px",
        cursor:"pointer", padding:"3px 8px", lineHeight:1, flexShrink:0,
        transition:"all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.08)"; e.currentTarget.style.color="#ef4444"; }}
        onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(239,68,68,0.4)"; }}
      >×</button>
    </li>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  FLOATING ORBS — decorative animated background blobs
// ══════════════════════════════════════════════════════════════════════════
function FloatingOrbs() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {/* top-left orb */}
      <div style={{
        position:"absolute", top:"-10%", left:"-8%",
        width:"520px", height:"520px", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
        animation:"orbFloat1 12s ease-in-out infinite",
      }} />
      {/* top-right orb */}
      <div style={{
        position:"absolute", top:"-5%", right:"-10%",
        width:"440px", height:"440px", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
        animation:"orbFloat2 15s ease-in-out infinite",
      }} />
      {/* bottom-center orb */}
      <div style={{
        position:"absolute", bottom:"-10%", left:"30%",
        width:"500px", height:"500px", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
        animation:"orbFloat3 18s ease-in-out infinite",
      }} />
      {/* mid-right orb */}
      <div style={{
        position:"absolute", top:"40%", right:"-5%",
        width:"320px", height:"320px", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)",
        animation:"orbFloat2 10s ease-in-out infinite reverse",
      }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  SIDE PANELS — fill wide screens with stats on left, tips on right
// ══════════════════════════════════════════════════════════════════════════
function LeftPanel({ score, streak, total, done, levelInfo }) {
  const { cur, nxt, pct } = levelInfo;
  const achievements = [
    { icon:"⚡", label:"First Quest",  unlocked: total >= 1 },
    { icon:"🔥", label:"On Fire",      unlocked: streak >= 3 },
    { icon:"💎", label:"Epic Mode",    unlocked: score >= 1000 },
    { icon:"👑", label:"Master",       unlocked: score >= 2500 },
    { icon:"🌟", label:"Legend",       unlocked: score >= 7000 },
  ];
  return (
    <div style={{
      width:"220px", flexShrink:0,
      display:"flex", flexDirection:"column", gap:"16px",
      fontFamily:"'Inter',sans-serif",
      position:"sticky", top:"20px", alignSelf:"flex-start",
    }}>
      {/* XP card */}
      <div style={{
        background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:"16px", padding:"18px",
      }}>
        <p style={{ fontSize:"11px", color:"#64748b", letterSpacing:"1.5px", margin:"0 0 10px", fontWeight:600 }}>CURRENT LEVEL</p>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
          <div style={{
            width:"36px", height:"36px", borderRadius:"8px",
            background:"linear-gradient(135deg,#7c3aed,#2563eb)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"16px", fontWeight:900, color:"#fff",
          }}>{cur.level}</div>
          <span style={{ fontSize:"16px", fontWeight:700, color:"#e2e8f0" }}>{cur.title}</span>
        </div>
        <div style={{ height:"5px", background:"rgba(255,255,255,0.08)", borderRadius:"99px", overflow:"hidden", marginBottom:"6px" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#7c3aed,#2563eb)", borderRadius:"99px", transition:"width 0.6s ease" }} />
        </div>
        {nxt && <p style={{ fontSize:"11px", color:"#64748b", margin:0 }}>{pct}% → {nxt.title}</p>}
      </div>

      {/* Achievements */}
      <div style={{
        background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:"16px", padding:"18px",
      }}>
        <p style={{ fontSize:"11px", color:"#64748b", letterSpacing:"1.5px", margin:"0 0 12px", fontWeight:600 }}>ACHIEVEMENTS</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {achievements.map(a => (
            <div key={a.label} style={{
              display:"flex", alignItems:"center", gap:"10px",
              opacity: a.unlocked ? 1 : 0.3,
              transition:"opacity 0.3s",
            }}>
              <span style={{ fontSize:"18px" }}>{a.icon}</span>
              <span style={{ fontSize:"13px", fontWeight: a.unlocked ? 600 : 400, color: a.unlocked ? "#e2e8f0" : "#64748b" }}>
                {a.label}
              </span>
              {a.unlocked && <span style={{ marginLeft:"auto", fontSize:"10px", color:"#6ee7b7", fontWeight:700 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Mini stats */}
      <div style={{
        background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:"16px", padding:"18px",
      }}>
        <p style={{ fontSize:"11px", color:"#64748b", letterSpacing:"1.5px", margin:"0 0 12px", fontWeight:600 }}>STATS</p>
        {[
          ["Completion", total > 0 ? `${Math.round((done/total)*100)}%` : "0%"],
          ["Best Streak", `${streak} 🔥`],
          ["Total Score", score.toLocaleString()],
        ].map(([label, val]) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
            <span style={{ fontSize:"12px", color:"#64748b" }}>{label}</span>
            <span style={{ fontSize:"12px", fontWeight:700, color:"#e2e8f0" }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RightPanel({ tasks }) {
  const done    = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);
  const tips = [
    "Complete high-priority quests for 5× more points",
    "Chain completions quickly to build your combo multiplier",
    "Reach a 3× streak to unlock the On Fire achievement",
    "Score 1000+ points to unlock Epic Mode badge",
  ];
  return (
    <div style={{
      width:"200px", flexShrink:0,
      display:"flex", flexDirection:"column", gap:"16px",
      fontFamily:"'Inter',sans-serif",
      position:"sticky", top:"20px", alignSelf:"flex-start",
    }}>
      {/* Tips */}
      <div style={{
        background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:"16px", padding:"18px",
      }}>
        <p style={{ fontSize:"11px", color:"#64748b", letterSpacing:"1.5px", margin:"0 0 12px", fontWeight:600 }}>PRO TIPS</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
              <span style={{ fontSize:"14px", flexShrink:0 }}>💡</span>
              <span style={{ fontSize:"12px", color:"#94a3b8", lineHeight:"1.5" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recently done */}
      {done.length > 0 && (
        <div style={{
          background:"rgba(110,231,183,0.05)", border:"1px solid rgba(110,231,183,0.12)",
          borderRadius:"16px", padding:"18px",
        }}>
          <p style={{ fontSize:"11px", color:"#6ee7b7", letterSpacing:"1.5px", margin:"0 0 12px", fontWeight:600 }}>CLEARED</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {done.slice(-4).reverse().map(t => (
              <div key={t._id} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                <span style={{ fontSize:"12px", color:"#6ee7b7" }}>✓</span>
                <span style={{ fontSize:"12px", color:"#94a3b8", textDecoration:"line-through" }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {pending.length > 0 && (
        <div style={{
          background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.12)",
          borderRadius:"16px", padding:"18px",
        }}>
          <p style={{ fontSize:"11px", color:"#a78bfa", letterSpacing:"1.5px", margin:"0 0 12px", fontWeight:600 }}>UP NEXT</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {pending.slice(0, 4).map(t => (
              <div key={t._id} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                <span style={{ fontSize:"10px", color:"#a78bfa" }}>▶</span>
                <span style={{ fontSize:"12px", color:"#94a3b8" }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MODE 2 — ARCADE PAGE  (full redesign)
// ══════════════════════════════════════════════════════════════════════════
function Req2Page({ tasks, onBack, onToggle, onDelete, onAdd }) {
  injectFonts();
  injectKeyframes();

  const [input, setInput]       = useState("");
  const [priority, setPriority] = useState("medium");
  const [filter, setFilter]     = useState("all");

  const [score,   setScore]   = useState(() => parseInt(localStorage.getItem("arc_score")  || "0", 10));
  const [hiScore, setHiScore] = useState(() => parseInt(localStorage.getItem("arc_hi")     || "0", 10));
  const [streak,  setStreak]  = useState(() => parseInt(localStorage.getItem("arc_streak") || "0", 10));
  const [combo,   setCombo]   = useState(1);
  const comboTimer            = useRef(null);

  const [confetti,   setConfetti]   = useState(false);
  const [flash,      setFlash]      = useState(null);
  const [popup,      setPopup]      = useState(null);
  const [levelUpMsg, setLevelUpMsg] = useState(null);

  const prevDoneRef = useRef(tasks.filter(t => t.completed).length);
  const prevLevel   = useRef(getLevelInfo(score).cur.level);

  const width      = useWindowWidth();
  const isMobile   = width < 600;
  const isWide     = width >= 1280; // show side panels

  // ── Detect task completion and fire FX ─────────────────────────────────
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

      setScore(newScore); setStreak(newStreak); setHiScore(newHi); setCombo(newCombo);
      localStorage.setItem("arc_score", newScore);
      localStorage.setItem("arc_streak", newStreak);
      localStorage.setItem("arc_hi", newHi);

      const newLvl = getLevelInfo(newScore);
      if (newLvl.cur.level > prevLevel.current) {
        setLevelUpMsg(newLvl.cur.title);
        setTimeout(() => setLevelUpMsg(null), 2200);
      }
      prevLevel.current = newLvl.cur.level;

      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => { setCombo(1); comboTimer.current = null; }, COMBO_MS);

      setConfetti(true);
      setFlash("rgba(124,58,237,0.12)");
      setPopup({ value: earned, combo: newCombo, id: Date.now() });
      setTimeout(() => setConfetti(false), 1800);
      setTimeout(() => setFlash(null), 400);
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

  const total     = tasks.length;
  const done      = tasks.filter(t => t.completed).length;
  const left      = total - done;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const levelInfo = getLevelInfo(score);
  const FILTERS   = [["All","all"],["Active","active"],["Done","completed"]];

  return (
    <div style={{
      minHeight:"100vh",
      background:"#0f0f1a",
      fontFamily:"'Inter',sans-serif",
      display:"flex", flexDirection:"column",
    }}>
      {/* Animated background orbs */}
      <FloatingOrbs />

      {/* Extra keyframes for orbs injected once */}
      {(() => {
        if (document.getElementById("orb-kf")) return null;
        const s = document.createElement("style");
        s.id = "orb-kf";
        s.textContent = `
          @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
          @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-30px,40px) scale(1.04)} 70%{transform:translate(20px,-15px) scale(0.98)} }
          @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-40px) scale(1.06)} }
        `;
        document.head.appendChild(s);
        return null;
      })()}

      {/* FX layers */}
      <Confetti active={confetti} />
      <FlashOverlay color={flash} />
      {popup && <ScorePopup value={popup.value} combo={popup.combo} id={popup.id} />}
      {levelUpMsg && <LevelUpBanner show title={levelUpMsg} />}

      {/* HUD */}
      <div style={{ position:"relative", zIndex:10 }}>
        <ArcadeHUD score={score} hiScore={hiScore} streak={streak} combo={combo} levelInfo={levelInfo} isMobile={isMobile} />
      </div>

      {/* Main layout — side panels on wide screens */}
      <div style={{
        flex:1, display:"flex", gap:"24px",
        padding: isMobile ? "20px 14px" : isWide ? "28px 40px" : "24px 32px",
        boxSizing:"border-box", position:"relative", zIndex:1,
        maxWidth:"1600px", margin:"0 auto", width:"100%",
      }}>

        {/* Left panel — only on wide screens */}
        {isWide && <LeftPanel score={score} streak={streak} total={total} done={done} levelInfo={levelInfo} />}

        {/* Centre content */}
        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:"20px" }}>

          {/* Header row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? "26px" : "34px", fontWeight:900,
                margin:"0 0 4px", letterSpacing:"-1px", lineHeight:1,
                background:"linear-gradient(135deg,#e2e8f0 30%,#a78bfa)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>
                Quest Board
              </h1>
              <p style={{ fontSize:"14px", color:"#64748b", margin:0, fontWeight:500 }}>
                {left === 0 && total > 0 ? "🎉 All quests cleared!" : `${left} quest${left !== 1 ? "s" : ""} remaining`}
              </p>
            </div>
            <button onClick={onBack} style={{
              fontSize:"13px", fontWeight:600, padding:"10px 18px",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:"10px", color:"#64748b", cursor:"pointer",
              transition:"all 0.2s", fontFamily:"'Inter',sans-serif",
            }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#e2e8f0"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#64748b"; }}
            >← Minimal Mode</button>
          </div>

          {/* Stats row */}
          <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
            {[
              { label:"Total Quests", val:total, color:"#e2e8f0", icon:"📋" },
              { label:"Cleared",      val:done,  color:"#6ee7b7", icon:"✅" },
              { label:"Remaining",    val:left,  color:"#fb923c", icon:"⚡" },
            ].map(({ label, val, color, icon }) => (
              <div key={label} style={{
                flex:1, minWidth:"90px",
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:"14px", padding:"16px",
                display:"flex", flexDirection:"column", gap:"4px",
              }}>
                <span style={{ fontSize:"18px" }}>{icon}</span>
                <span style={{ fontSize: isMobile ? "24px" : "30px", fontWeight:900, color, lineHeight:1 }}>{val}</span>
                <span style={{ fontSize:"12px", color:"#64748b", fontWeight:500 }}>{label}</span>
              </div>
            ))}
            {/* Progress card */}
            <div style={{
              flex:2, minWidth:"160px",
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"14px", padding:"16px",
              display:"flex", flexDirection:"column", justifyContent:"center", gap:"10px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"13px", fontWeight:600, color:"#64748b" }}>Overall Progress</span>
                <span style={{ fontSize:"22px", fontWeight:900, color:"#a78bfa" }}>{pct}%</span>
              </div>
              <div style={{ height:"7px", background:"rgba(255,255,255,0.06)", borderRadius:"99px", overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${pct}%`,
                  background:"linear-gradient(90deg,#7c3aed,#2563eb)",
                  borderRadius:"99px", transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
            </div>
          </div>

          {/* Add task panel */}
          <div style={{
            display:"flex", flexDirection: isMobile ? "column" : "row",
            gap:"10px", padding:"16px",
            background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"14px",
          }}>
            <input
              style={{
                flex:1, padding:"11px 15px",
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"9px", color:"#e2e8f0",
                fontFamily:"'Inter',sans-serif", fontSize:"14px", fontWeight:500,
                outline:"none", width: isMobile ? "100%" : "auto", boxSizing:"border-box",
              }}
              placeholder="Add a new quest..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              onFocus={e => { e.target.style.borderColor="rgba(124,58,237,0.5)"; e.target.style.boxShadow="0 0 0 3px rgba(124,58,237,0.1)"; }}
              onBlur={e =>  { e.target.style.borderColor="rgba(255,255,255,0.1)"; e.target.style.boxShadow="none"; }}
            />
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{
              padding:"11px 12px",
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:"9px", color:"#94a3b8",
              fontFamily:"'Inter',sans-serif", fontSize:"13px",
              outline:"none", cursor:"pointer", width: isMobile ? "100%" : "180px",
            }}>
              <option value="low">Common — 100 pts</option>
              <option value="medium">Rare — 250 pts</option>
              <option value="high">Epic — 500 pts</option>
            </select>
            <button onClick={addTask} style={{
              padding:"11px 24px", borderRadius:"9px", border:"none",
              background:"linear-gradient(135deg,#7c3aed,#2563eb)",
              color:"#fff", fontSize:"14px", fontWeight:700,
              cursor:"pointer", whiteSpace:"nowrap",
              fontFamily:"'Inter',sans-serif",
              transition:"all 0.2s", width: isMobile ? "100%" : "auto",
            }}
              onMouseEnter={e => e.currentTarget.style.transform="translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform="none"}
            >+ Add Quest</button>
          </div>

          {/* Filter tabs */}
          <div style={{
            display:"flex", gap:"6px",
            padding:"4px", background:"rgba(255,255,255,0.03)",
            borderRadius:"11px", border:"1px solid rgba(255,255,255,0.06)",
          }}>
            {FILTERS.map(([label, val]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                flex:1, padding:"9px",
                background: filter === val
                  ? "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(37,99,235,0.15))"
                  : "transparent",
                border: filter === val ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
                borderRadius:"8px",
                color: filter === val ? "#e2e8f0" : "#64748b",
                fontFamily:"'Inter',sans-serif", fontSize:"13px", fontWeight:600,
                cursor:"pointer", transition:"all 0.2s",
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"14px", overflow:"hidden",
          }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 24px" }}>
                <div style={{ fontSize:"36px", marginBottom:"10px" }}>
                  {filter === "completed" ? "🏆" : filter === "active" ? "🎯" : "📋"}
                </div>
                <p style={{ fontSize:"15px", fontWeight:600, color:"#334155", margin:0 }}>
                  {filter === "completed" ? "No quests cleared yet"
                   : filter === "active"  ? "Inbox zero — you're a legend"
                   : "Add your first quest above"}
                </p>
              </div>
            ) : (
              <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                {filtered.map(task => (
                  <ArcadeTaskItem key={task._id} task={task} onToggle={onToggle} onDelete={onDelete} isMobile={isMobile} />
                ))}
              </ul>
            )}
          </div>

          {/* Clear completed */}
          {done > 0 && (
            <div style={{ textAlign:"right" }}>
              <button onClick={() => tasks.filter(t => t.completed).forEach(t => onDelete(t._id))} style={{
                background:"none", border:"none", color:"#475569", fontSize:"13px",
                fontWeight:500, cursor:"pointer", fontFamily:"'Inter',sans-serif",
                textDecoration:"underline", textUnderlineOffset:"3px",
              }}>
                Clear completed
              </button>
            </div>
          )}
        </div>

        {/* Right panel — only on wide screens */}
        {isWide && <RightPanel tasks={tasks} />}
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