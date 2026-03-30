"use client";
import { useState, useEffect } from "react";

function useGoogleSession() {
  const [data,   setData]   = useState(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) { setData(d); setStatus("authenticated"); }
        else setStatus("unauthenticated");
      })
      .catch(() => setStatus("unauthenticated"));
  }, []);
  return { data, status };
}

// ─── Design tokens (matches HomeOS) ───────────────────────────────
const C = {
  ink:        "#1c1c1a",
  paper:      "#f6f3ee",
  warm:       "#ede8df",
  card:       "#ffffff",
  accent:     "#b87333",
  accentSoft: "#e8cdb0",
  muted:      "#8c8880",
  soft:       "#ddd9d2",
  green:      "#5c7a60",
  greenSoft:  "#c8d9ca",
  blue:       "#4a6580",
  blueSoft:   "#c4d2de",
};

// ─── Shared primitives ────────────────────────────────────────────
function MonoLabel({ children }) {
  return (
    <div style={{
      fontFamily: "monospace", fontSize: 10, textTransform: "uppercase",
      letterSpacing: 2, color: C.muted, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{
      fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500,
      marginBottom: 16, color: C.ink,
    }}>
      {children}
    </h3>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${C.soft}`, margin: "28px 0" }} />;
}

// ─── 1. Commitment Bars ───────────────────────────────────────────
function CommitmentBars({ onGoToCheckin }) {
  const [checkin, setCheckin] = useState(undefined); // undefined = hydrating

  useEffect(() => {
    try {
      const raw = localStorage.getItem("homeOS4");
      const parsed = raw ? JSON.parse(raw) : null;
      setCheckin(parsed?.checkins?.[0] ?? null);
    } catch {
      setCheckin(null);
    }
  }, []);

  if (checkin === undefined) return null;

  if (!checkin) {
    return (
      <div style={{
        background: C.warm, border: `1px solid ${C.soft}`, borderRadius: 3,
        padding: "24px 22px", textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
          No check-in found for this week.
        </div>
        <button
          onClick={onGoToCheckin}
          style={{
            padding: "9px 20px", background: C.accent, color: "white",
            border: "none", borderRadius: 3, fontFamily: "sans-serif",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          Do the weekly check-in →
        </button>
      </div>
    );
  }

  const bars = [
    { label: "Partnership", value: checkin.us,   color: C.accent },
    { label: "Kids",        value: checkin.kids,  color: C.green  },
    { label: "Home",        value: checkin.home,  color: C.blue   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {bars.map(({ label, value, color }) => (
        <div key={label} style={{
          background: C.warm, borderLeft: `3px solid ${color}`,
          borderRadius: "0 3px 3px 0", padding: "13px 16px",
        }}>
          <MonoLabel>{label}</MonoLabel>
          <div style={{
            fontSize: 14, fontWeight: 500, lineHeight: 1.4,
            color: value ? C.ink : C.muted,
            fontStyle: value ? "normal" : "italic",
          }}>
            {value || "Nothing set"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 2. Google Calendar Week Strip ────────────────────────────────
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates() {
  const today = new Date();
  const dow = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(d) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function formatEventTime(event) {
  if (!event.start?.dateTime) return "All day";
  return new Date(event.start.dateTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function CalendarSection() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setEvents(d.events || []);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const weekDates = getWeekDates();
  const todayISO  = toISO(new Date());

  const eventsOn = (d) => {
    const iso = toISO(d);
    return events.filter((e) =>
      (e.start?.dateTime || e.start?.date || "").startsWith(iso)
    );
  };

  const todayEvents = eventsOn(new Date());

  return (
    <div>
      <SectionTitle>Calendar</SectionTitle>

      {/* 7-day strip */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
        {weekDates.map((d, i) => {
          const isToday = toISO(d) === todayISO;
          const count   = eventsOn(d).length;
          return (
            <div key={i} style={{
              flex: 1, textAlign: "center", padding: "8px 3px 10px",
              background: isToday ? C.accent : C.warm,
              borderRadius: 4,
              border: `1px solid ${isToday ? C.accent : C.soft}`,
            }}>
              <div style={{
                fontFamily: "monospace", fontSize: 9, textTransform: "uppercase",
                letterSpacing: 0.5,
                color: isToday ? "rgba(255,255,255,0.8)" : C.muted,
              }}>
                {DAY_LABELS[i]}
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: 13, marginTop: 2,
                fontWeight: isToday ? 600 : 400,
                color: isToday ? "white" : C.ink,
              }}>
                {d.getDate()}
              </div>
              {count > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 5 }}>
                  {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                    <div key={j} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: isToday ? "rgba(255,255,255,0.7)" : C.accent,
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Today's events */}
      <MonoLabel>Today's events</MonoLabel>
      {loading && (
        <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>Loading…</div>
      )}
      {error && (
        <div style={{ fontSize: 13, color: "#c0392b" }}>Couldn't load calendar.</div>
      )}
      {!loading && !error && todayEvents.length === 0 && (
        <div style={{ fontSize: 13, color: C.muted }}>Nothing on the calendar today.</div>
      )}
      {!loading && !error && todayEvents.map((e, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "9px 0",
          borderBottom: i < todayEvents.length - 1 ? `1px solid ${C.warm}` : "none",
        }}>
          <div style={{
            fontFamily: "monospace", fontSize: 11, color: C.muted, minWidth: 70,
          }}>
            {formatEventTime(e)}
          </div>
          <div style={{ flex: 1, fontSize: 14, color: C.ink }}>
            {e.summary || "(No title)"}
          </div>
          <div style={{
            fontSize: 9, fontFamily: "monospace", letterSpacing: 0.8,
            background: C.blueSoft, color: C.blue,
            padding: "2px 8px", borderRadius: 20, textTransform: "uppercase",
            flexShrink: 0,
          }}>
            Work
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 3. Drip Matrix ───────────────────────────────────────────────
const DRIP_KEY   = "homeOS4_drip";
const EMPTY_MTX  = { Production: [], Replacement: [], Investment: [], Delegation: [] };

const QUAD_META = [
  { key: "Production",  color: C.green,   desc: "High · Energizing — do it now"      },
  { key: "Replacement", color: C.accent,  desc: "High · Draining — hire or automate" },
  { key: "Investment",  color: C.blue,    desc: "Low · Energizing — grow into it"    },
  { key: "Delegation",  color: "#6c6864", desc: "Low · Draining — delegate or drop"  },
];

function getQuadrant(impact, energy) {
  const high = impact === "$$$" || impact === "$$$$";
  if (high  && energy === "Energizing") return "Production";
  if (high  && energy === "Draining")   return "Replacement";
  if (!high && energy === "Energizing") return "Investment";
  return "Delegation";
}

function DripMatrix({ hasGoogle }) {
  const [text,    setText]    = useState("");
  const [impact,  setImpact]  = useState("");
  const [energy,  setEnergy]  = useState("");
  const [tasks,   setTasks]   = useState(EMPTY_MTX);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRIP_KEY);
      if (raw) setTasks({ ...EMPTY_MTX, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const add = async () => {
    if (!text.trim() || !impact || !energy) return;
    const quadrant = getQuadrant(impact, energy);
    const item = { id: Date.now(), text: text.trim(), impact, energy };
    const updated = { ...tasks, [quadrant]: [item, ...tasks[quadrant]] };
    setTasks(updated);
    localStorage.setItem(DRIP_KEY, JSON.stringify(updated));
    setText(""); setImpact(""); setEnergy("");

    if (hasGoogle) {
      setSyncing(true);
      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: item.text, quadrant }),
        });
      } catch {}
      setSyncing(false);
    }
  };

  const remove = (quadrant, id) => {
    const updated = { ...tasks, [quadrant]: tasks[quadrant].filter((t) => t.id !== id) };
    setTasks(updated);
    localStorage.setItem(DRIP_KEY, JSON.stringify(updated));
  };

  const canAdd  = !!(text.trim() && impact && energy);
  const preview = impact && energy ? getQuadrant(impact, energy) : null;

  return (
    <div>
      <SectionTitle>
        Task <em style={{ fontStyle: "italic", color: C.accent }}>Matrix</em>
      </SectionTitle>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
        Sort tasks by impact and energy. Do, hire, grow, or drop.
      </p>

      {/* Capture form */}
      <div style={{
        background: C.card, border: `1px solid ${C.soft}`,
        borderRadius: 3, padding: "18px 20px", marginBottom: 20,
      }}>
        <MonoLabel>Add a task</MonoLabel>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="What task are you adding?"
          style={{
            width: "100%", background: C.warm, border: `1px solid ${C.soft}`,
            borderRadius: 3, padding: "10px 13px", fontFamily: "sans-serif",
            fontSize: 14, color: C.ink, marginBottom: 12,
          }}
        />

        {/* Impact pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
          {["$", "$$", "$$$", "$$$$"].map((v) => (
            <button key={v} onClick={() => setImpact(impact === v ? "" : v)} style={{
              padding: "5px 13px", borderRadius: 20, cursor: "pointer",
              border: `1.5px solid ${impact === v ? C.accent : C.soft}`,
              background: impact === v ? C.accent : C.card,
              color: impact === v ? "white" : C.muted,
              fontFamily: "monospace", fontSize: 12,
            }}>{v}</button>
          ))}
          <div style={{ width: 1, background: C.soft, alignSelf: "stretch", margin: "0 2px" }} />
          {/* Energy pills */}
          {["Energizing", "Draining"].map((v) => {
            const activeColor = v === "Energizing" ? C.green : C.accent;
            return (
              <button key={v} onClick={() => setEnergy(energy === v ? "" : v)} style={{
                padding: "5px 13px", borderRadius: 20, cursor: "pointer",
                border: `1.5px solid ${energy === v ? activeColor : C.soft}`,
                background: energy === v ? activeColor : C.card,
                color: energy === v ? "white" : C.muted,
                fontFamily: "sans-serif", fontSize: 12,
              }}>{v}</button>
            );
          })}
        </div>

        {preview && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontStyle: "italic" }}>
            → {preview}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={add}
            disabled={!canAdd || syncing}
            style={{
              padding: "9px 20px", border: "none", borderRadius: 3,
              background: canAdd ? C.accent : C.soft, color: "white",
              fontFamily: "sans-serif", fontSize: 13, fontWeight: 500,
              cursor: canAdd ? "pointer" : "default",
            }}
          >
            {syncing ? "Syncing…" : "Add to matrix"}
          </button>
          {!hasGoogle && (
            <span style={{ fontSize: 11, color: C.muted }}>
              Connect Google above to also sync to Tasks
            </span>
          )}
        </div>
      </div>

      {/* 2 × 2 quadrant grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {QUAD_META.map(({ key, color, desc }) => (
          <div key={key} style={{
            background: C.card, border: `1px solid ${C.soft}`,
            borderRadius: 3, padding: "15px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: C.ink }}>
                {key}
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 12, fontStyle: "italic", lineHeight: 1.4 }}>
              {desc}
            </div>
            {tasks[key].length === 0 ? (
              <div style={{ fontSize: 12, color: C.soft, textAlign: "center", padding: "4px 0" }}>—</div>
            ) : (
              tasks[key].map((t, i) => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 7,
                  padding: "5px 0",
                  borderTop: i > 0 ? `1px solid ${C.warm}` : "none",
                }}>
                  <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4, color: C.ink }}>{t.text}</div>
                  <button onClick={() => remove(key, t.id)} style={{
                    background: "none", border: "none", color: C.soft,
                    cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0,
                  }}>×</button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Connect Google prompt ────────────────────────────────────────
function ConnectGoogle() {
  return (
    <div style={{
      background: C.warm, border: `1px solid ${C.soft}`, borderRadius: 3,
      padding: "24px 22px", textAlign: "center",
    }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
        Connect Google to see your calendar here<br />and sync tasks to Google Tasks.
      </div>
      <button
        onClick={() => { window.location.href = "/api/auth/signin/google"; }}
        style={{
          padding: "10px 24px", background: C.accent, color: "white",
          border: "none", borderRadius: 3, fontFamily: "sans-serif",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}
      >
        Connect Google
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────
export default function MondayDashboard({ onGoToCheckin }) {
  const { data: session, status } = useGoogleSession();
  const isAuth = status === "authenticated";

  const now    = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 500, marginBottom: 6 }}>
          Monday <em style={{ fontStyle: "italic", color: C.accent }}>Dashboard</em>
        </h2>
        <div style={{ fontSize: 13, color: C.muted }}>
          {days[now.getDay()]} · {months[now.getMonth()]} {now.getDate()}
        </div>
      </div>

      {/* Commitment bars */}
      <MonoLabel>This week's commitments</MonoLabel>
      <CommitmentBars onGoToCheckin={onGoToCheckin} />

      <Divider />

      {/* Google-dependent sections */}
      {status !== "loading" && (
        !isAuth ? (
          <>
            <ConnectGoogle />
            <Divider />
            <DripMatrix hasGoogle={false} />
          </>
        ) : (
          <>
            <CalendarSection />
            <Divider />
            <DripMatrix hasGoogle={true} />
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                onClick={() => { window.location.href = "/api/auth/signout"; }}
                style={{
                  fontSize: 11, color: C.muted, background: "none",
                  border: "none", cursor: "pointer", fontFamily: "sans-serif",
                }}
              >
                {session?.user?.email} · Disconnect
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
