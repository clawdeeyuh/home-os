"use client";
// HomeOS.jsx
// Full source for the Home OS app.

import { useState } from "react";

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  ink:         "#1c1c1a",
  paper:       "#f6f3ee",
  warm:        "#ede8df",
  card:        "#ffffff",
  accent:      "#b87333",
  accentSoft:  "#e8cdb0",
  muted:       "#8c8880",
  soft:        "#ddd9d2",
  green:       "#5c7a60",
  greenSoft:   "#c8d9ca",
  blue:        "#4a6580",
  blueSoft:    "#c4d2de",
};

// ─── Local-storage persistence ────────────────────────────────────
const LS = {
  key: "homeOS4",
  get: () => {
    try { const d = localStorage.getItem("homeOS4"); return d ? JSON.parse(d) : null; }
    catch { return null; }
  },
  set: (v) => {
    try { localStorage.setItem("homeOS4", JSON.stringify(v)); } catch {}
  },
};

const defaultState = {
  items:       [],   // Initiative Bank items
  checkins:    [],   // Weekly check-in history
  reflections: [],   // Friday Signal history
  ciDone:      false,
  intent:      "",
};

// ─── Shared primitives ────────────────────────────────────────────

function Tag({ type }) {
  const map = {
    us:   { bg: C.accentSoft, color: C.accent, label: "Partnership" },
    kids: { bg: C.greenSoft,  color: C.green,  label: "Kids" },
    home: { bg: C.blueSoft,   color: C.blue,   label: "Home" },
  };
  const { bg, color, label } = map[type];
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      fontSize: 10, fontFamily: "monospace", background: bg, color,
      letterSpacing: 0.5, marginRight: 4,
    }}>
      {label}
    </span>
  );
}

function Pill({ label, active, colorKey, onClick }) {
  const colorMap = { us: C.accent, kids: C.green, home: C.blue, bank: C.ink };
  const bg = active ? (colorMap[colorKey] || C.ink) : C.card;
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20,
      border: `1.5px solid ${active ? bg : C.soft}`,
      fontSize: 12, cursor: "pointer", background: bg,
      color: active ? "white" : C.muted,
      fontFamily: "sans-serif", fontWeight: 500, transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

function Card({ children, bar }) {
  return (
    <div style={{
      display: bar ? "flex" : "block", gap: bar ? 16 : 0,
      background: C.card, border: `1px solid ${C.soft}`,
      borderRadius: 3, padding: "20px 22px", marginBottom: 16,
    }}>
      {bar && <div style={{ width: 3, background: bar, borderRadius: 2, flexShrink: 0, alignSelf: "stretch" }} />}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

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

function Textarea({ value, onChange, placeholder, minHeight = 78 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", background: C.warm, border: `1px solid ${C.soft}`,
        borderRadius: 3, padding: "11px 14px", fontFamily: "sans-serif",
        fontSize: 14, color: C.ink, resize: "vertical", minHeight, lineHeight: 1.5,
      }}
    />
  );
}

function Btn({ children, onClick, variant = "primary", disabled, fullWidth, style: sx }) {
  const variants = {
    primary: { background: disabled ? C.soft : C.accent, color: "white", border: "none" },
    ghost:   { background: "none", color: C.muted, border: `1px solid ${C.soft}` },
    green:   { background: C.green, color: "white", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px", borderRadius: 3, fontFamily: "sans-serif",
        fontSize: 13, fontWeight: 500, cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s", width: fullWidth ? "100%" : undefined,
        ...variants[variant], ...sx,
      }}
    >
      {children}
    </button>
  );
}

// ─── AI Idea Generation ───────────────────────────────────────────
async function fetchIdeas(type, cat) {
  const res = await fetch("/api/generate-ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, cat }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.ideas;
}

function IdeasBox({ ideas, loading, error, onUse }) {
  if (!loading && !ideas.length && !error) return null;
  return (
    <div style={{
      background: C.warm, border: `1px solid ${C.soft}`,
      borderRadius: 3, padding: "14px 16px", marginBottom: 12,
    }}>
      {loading && <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>✦ Generating ideas...</div>}
      {error && <div style={{ fontSize: 13, color: "#c0392b" }}>{error}</div>}
      {!loading && !error && ideas.length > 0 && (
        <>
          <MonoLabel>Tap an idea to use it</MonoLabel>
          {ideas.map((idea, i) => (
            <div
              key={i}
              onClick={() => onUse(idea)}
              style={{
                display: "flex", gap: 10, padding: "8px 0",
                borderBottom: i < ideas.length - 1 ? `1px solid ${C.soft}` : "none",
                cursor: "pointer", alignItems: "flex-start",
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: C.card,
                border: `1px solid ${C.soft}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 12, color: C.muted,
                flexShrink: 0, marginTop: 1,
              }}>+</div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: C.ink }}>{idea}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Weekly Check-in Panel ────────────────────────────────────────
function CheckinPanel({ state, setState }) {
  const [step,       setStep]       = useState(0);
  const [usCat,      setUsCat]      = useState("");
  const [kidsCat,    setKidsCat]    = useState("");
  const [usVal,      setUsVal]      = useState("");
  const [kidsVal,    setKidsVal]    = useState("");
  const [homeVal,    setHomeVal]    = useState("");
  const [intentVal,  setIntentVal]  = useState("");
  const [usIdeas,    setUsIdeas]    = useState([]);
  const [kidsIdeas,  setKidsIdeas]  = useState([]);
  const [loadingUs,  setLoadingUs]  = useState(false);
  const [loadingKids,setLoadingKids]= useState(false);
  const [usErr,      setUsErr]      = useState("");
  const [kidsErr,    setKidsErr]    = useState("");

  const generate = async (type) => {
    const cat = type === "us" ? usCat : kidsCat;
    const setLoading = type === "us" ? setLoadingUs : setLoadingKids;
    const setIdeas   = type === "us" ? setUsIdeas   : setKidsIdeas;
    const setErr     = type === "us" ? setUsErr     : setKidsErr;
    setLoading(true); setErr("");
    try {
      const ideas = await fetchIdeas(type, cat);
      setIdeas(Array.isArray(ideas) ? ideas : []);
    } catch {
      setErr("Couldn't generate ideas — try again.");
    }
    setLoading(false);
  };

  const saveCheckin = () => {
    if (!intentVal.trim()) return;
    const entry = {
      date:   new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }),
      us:     usVal,
      kids:   kidsVal,
      home:   homeVal,
      intent: intentVal.trim(),
    };
    const next = { ...state, checkins: [entry, ...state.checkins], ciDone: true, intent: intentVal.trim() };
    setState(next); LS.set(next);
  };

  const reset = () => {
    setStep(0);
    setUsVal(""); setKidsVal(""); setHomeVal(""); setIntentVal("");
    setUsCat(""); setKidsCat("");
    setUsIdeas([]); setKidsIdeas([]);
    const next = { ...state, ciDone: false, intent: "" };
    setState(next); LS.set(next);
  };

  // ── Done state ──
  if (state.ciDone) {
    return (
      <div>
        <div style={{ textAlign: "center", padding: "36px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>✦</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 500, marginBottom: 8 }}>Check-in logged.</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 22px" }}>
            You've done the scan. Let it work in the background. Come back Friday to close the loop.
          </p>
          <div style={{
            background: C.warm, borderLeft: `3px solid ${C.accent}`,
            padding: "14px 16px", borderRadius: "0 3px 3px 0",
            margin: "0 auto 22px", maxWidth: 420, textAlign: "left",
          }}>
            <MonoLabel>This week's commitment</MonoLabel>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{state.intent}</div>
          </div>
          <Btn variant="ghost" onClick={reset}>Start a new check-in</Btn>
        </div>

        {state.checkins.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.soft}`, paddingTop: 24 }}>
            <MonoLabel>Past check-ins</MonoLabel>
            {state.checkins.slice(0, 5).map((e, i) => (
              <div key={i} style={{ padding: "13px 0", borderBottom: i < 4 ? `1px solid ${C.warm}` : "none" }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{e.date}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>{e.intent}</div>
                {e.us   && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}><Tag type="us"   />{e.us.substring(0,80)}{e.us.length>80?"…":""}</div>}
                {e.kids && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}><Tag type="kids" />{e.kids.substring(0,80)}{e.kids.length>80?"…":""}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Progress dots ──
  const Dots = () => (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 26 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", transition: "background 0.2s",
          background: i < step ? C.accent : i === step ? C.accent + "77" : C.soft,
        }} />
      ))}
      <span style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginLeft: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>
        Step {step + 1} of 4
      </span>
    </div>
  );

  // ── Generate button ──
  const GenBtn = ({ type, loading }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
      <button
        onClick={() => generate(type)}
        disabled={loading}
        style={{
          padding: "7px 14px", background: C.warm, border: `1px solid ${C.soft}`,
          borderRadius: 3, fontSize: 12, cursor: loading ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "sans-serif", opacity: loading ? 0.6 : 1,
        }}
      >
        ✦ {loading ? "Generating..." : "Generate ideas"}
      </button>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 500, marginBottom: 6 }}>
        Weekly <em style={{ fontStyle: "italic", color: C.accent }}>Check-in</em>
      </h2>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>
        Monday, end of your morning block. Three lenses. One commitment. Not a to-do list — a scan for where intentional investment is missing.
      </p>
      <Dots />

      {/* Step 0 — Partnership */}
      {step === 0 && (
        <div>
          <Card bar={C.accent}>
            <MonoLabel>Partnership · Us</MonoLabel>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>What would make your husband feel like a co-creator this week — not just a co-habitant?</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>Pick a category, generate ideas, then write what you'll actually do.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {["Experience","Conversation","Future planning","Home project","Small gesture"].map(c => (
                <Pill key={c} label={c} active={usCat === c} colorKey="us" onClick={() => setUsCat(usCat === c ? "" : c)} />
              ))}
            </div>
            <GenBtn type="us" loading={loadingUs} />
            <IdeasBox ideas={usIdeas} loading={loadingUs} error={usErr} onUse={v => setUsVal(v)} />
            <Textarea value={usVal} onChange={setUsVal} placeholder="What will you actually do this week..." />
          </Card>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => setStep(1)}>Next →</Btn>
          </div>
        </div>
      )}

      {/* Step 1 — Kids */}
      {step === 1 && (
        <div>
          <Card bar={C.green}>
            <MonoLabel>Kids · Memory-making</MonoLabel>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>What's one thing you could initiate with the boys this week that they'll actually remember?</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>12 is the last reliable on-ramp. Pick a type, generate ideas, write the specific thing.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {["One-on-one","Both together","Outing","At home","Conversation"].map(c => (
                <Pill key={c} label={c} active={kidsCat === c} colorKey="kids" onClick={() => setKidsCat(kidsCat === c ? "" : c)} />
              ))}
            </div>
            <GenBtn type="kids" loading={loadingKids} />
            <IdeasBox ideas={kidsIdeas} loading={loadingKids} error={kidsErr} onUse={v => setKidsVal(v)} />
            <Textarea value={kidsVal} onChange={setKidsVal} placeholder="What will you actually do this week..." />
          </Card>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Btn variant="ghost" onClick={() => setStep(0)}>← Back</Btn>
            <Btn onClick={() => setStep(2)}>Next →</Btn>
          </div>
        </div>
      )}

      {/* Step 2 — Home */}
      {step === 2 && (
        <div>
          <Card bar={C.blue}>
            <MonoLabel>Home · Invisible Pile</MonoLabel>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>What's been silently waiting — something you've ignored because it doesn't create friction for you?</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>You don't have to solve it this week. Just name it.</p>
            <Textarea value={homeVal} onChange={setHomeVal} placeholder="e.g. The closet pile. The wall that needs a frame. The thing your husband mentioned once..." />
          </Card>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>← Back</Btn>
            <Btn onClick={() => setStep(3)}>Next →</Btn>
          </div>
        </div>
      )}

      {/* Step 3 — Commitment */}
      {step === 3 && (
        <div>
          <Card>
            <MonoLabel>This week's single commitment</MonoLabel>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>If you do only one intentional thing this week — not functional, not reactive — what is it?</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>One thing. Specific. Doable.</p>
            <input
              value={intentVal}
              onChange={e => setIntentVal(e.target.value)}
              placeholder="e.g. Take one of the boys on a solo errand and actually ask him things..."
              style={{
                width: "100%", background: C.warm, border: `1px solid ${C.soft}`,
                borderRadius: 3, padding: "11px 14px", fontFamily: "sans-serif",
                fontSize: 14, color: C.ink,
              }}
            />
          </Card>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Btn variant="ghost" onClick={() => setStep(2)}>← Back</Btn>
            <Btn onClick={saveCheckin} disabled={!intentVal.trim()}>Save check-in ✓</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Initiative Bank Panel ────────────────────────────────────────
function BankPanel({ state, setState }) {
  const [input,  setInput]  = useState("");
  const [cat,    setCat]    = useState("us");
  const [filter, setFilter] = useState("all");

  const mutate = (items) => { const n = { ...state, items }; setState(n); LS.set(n); };

  const add = () => {
    if (!input.trim()) return;
    mutate([{ id: Date.now(), text: input.trim(), cat, done: false }, ...state.items]);
    setInput("");
  };

  const quickAdd = (c, text) => mutate([{ id: Date.now(), text, cat: c, done: false }, ...state.items]);
  const toggle   = (id) => mutate(state.items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const del      = (id) => mutate(state.items.filter(i => i.id !== id));

  const prompts = [
    { cat: "us",   text: "Plan a dinner out, just the two of us" },
    { cat: "kids", text: "Take one boy on a solo outing" },
    { cat: "home", text: "Tackle the hidden pile in the closet" },
    { cat: "kids", text: "Watch something they want to show me" },
    { cat: "us",   text: "Ask him what he's been thinking about lately" },
    { cat: "home", text: "Pick one wall or corner to actually finish" },
    { cat: "kids", text: "Cook something together on a weekend" },
    { cat: "us",   text: "Plan something for us to look forward to" },
  ];

  const catLabel = { us: "Partnership", kids: "Kids", home: "Home" };

  let visible = state.items;
  if (filter === "done") visible = visible.filter(i => i.done);
  else if (filter !== "all") visible = visible.filter(i => i.cat === filter && !i.done);
  else visible = visible.filter(i => !i.done);

  return (
    <div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 500, marginBottom: 6 }}>
        Initiative <em style={{ fontStyle: "italic", color: C.accent }}>Bank</em>
      </h2>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>
        Ideas stored so you're never starting from zero. Pull from here when you need something to initiate.
      </p>

      {/* Add form */}
      <div style={{ background: C.card, border: `1px solid ${C.soft}`, borderRadius: 3, padding: "20px 22px", marginBottom: 22 }}>
        <MonoLabel>Add an idea</MonoLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="e.g. Take the boys to that place they mentioned..."
            style={{ background: C.warm, border: `1px solid ${C.soft}`, borderRadius: 3, padding: "11px 14px", fontFamily: "sans-serif", fontSize: 14, color: C.ink }}
          />
          <Btn onClick={add}>Add</Btn>
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
          {["us","kids","home"].map(c => (
            <Pill key={c} label={catLabel[c]} active={cat === c} colorKey={c} onClick={() => setCat(c)} />
          ))}
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ marginBottom: 22 }}>
        <MonoLabel>Quick prompts — tap to add</MonoLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {prompts.map((p, i) => (
            <button key={i} onClick={() => quickAdd(p.cat, p.text)} style={{
              padding: "10px 14px", background: C.warm, border: `1px solid ${C.soft}`,
              borderRadius: 3, fontSize: 13, cursor: "pointer", textAlign: "left",
              fontFamily: "sans-serif", color: C.ink, lineHeight: 1.3,
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>
                {catLabel[p.cat]}
              </span>
              {p.text}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ borderTop: `1px solid ${C.soft}`, paddingTop: 20, marginBottom: 14, display: "flex", gap: 7, flexWrap: "wrap" }}>
        {[["all","All"],["us","Partnership"],["kids","Kids"],["home","Home"],["done","Done ✓"]].map(([f, l]) => (
          <Pill key={f} label={l} active={filter === f} colorKey="bank" onClick={() => setFilter(f)} />
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 20px", color: C.muted, fontSize: 14 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>◦</div>
          {state.items.length ? "Nothing in this category yet." : "Your bank is empty. Add ideas above or tap a prompt."}
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.soft}`, borderRadius: 3, padding: "6px 22px" }}>
          {visible.map((it, i) => (
            <div key={it.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "13px 0", borderBottom: i < visible.length - 1 ? `1px solid ${C.warm}` : "none",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3, textDecoration: it.done ? "line-through" : "none", color: it.done ? C.muted : C.ink }}>{it.text}</div>
                <Tag type={it.cat} />
              </div>
              <button onClick={() => toggle(it.id)} style={{
                width: 22, height: 22, borderRadius: "50%",
                border: `1.5px solid ${it.done ? C.green : C.soft}`,
                background: it.done ? C.green : "none",
                color: it.done ? "white" : "transparent",
                cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>✓</button>
              <button onClick={() => del(it.id)} style={{ background: "none", border: "none", color: C.soft, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 3px", flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Friday Signal Panel ──────────────────────────────────────────
function ReflectPanel({ state, setState }) {
  const [usVal,    setUsVal]    = useState("");
  const [kidsVal,  setKidsVal]  = useState("");
  const [carryVal, setCarryVal] = useState("");
  const [meter,    setMeter]    = useState(0);
  const [saved,    setSaved]    = useState(false);

  const save = () => {
    if (!usVal.trim() && !kidsVal.trim()) return;
    const entry = {
      date:   new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }),
      us:     usVal, kids: kidsVal, carry: carryVal, rating: meter,
    };
    const next = { ...state, reflections: [entry, ...state.reflections] };
    setState(next); LS.set(next);
    setUsVal(""); setKidsVal(""); setCarryVal(""); setMeter(0);
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const meterLabels = ["","Mostly absent","Somewhat there","Mixed","Pretty present","Genuinely present"];
  const stars = n => n ? "●".repeat(n) + "○".repeat(5 - n) : "—";

  return (
    <div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 500, marginBottom: 6 }}>
        Friday <em style={{ fontStyle: "italic", color: C.accent }}>Signal</em>
      </h2>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 22, maxWidth: 480 }}>
        Two minutes. Close the loop on the week before the weekend absorbs it.
      </p>

      <div style={{ background: C.warm, borderLeft: `3px solid ${C.accent}`, padding: "14px 16px", borderRadius: "0 3px 3px 0", marginBottom: 22 }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: C.accent, marginBottom: 7 }}>The only question that matters</div>
        <p style={{ fontSize: 17, fontStyle: "italic", fontFamily: "Georgia, serif", fontWeight: 500, lineHeight: 1.4 }}>
          What did I do this week that was intentional — not just functional?
        </p>
      </div>

      <Card><MonoLabel>For partnership</MonoLabel><Textarea value={usVal} onChange={setUsVal} placeholder="What did you initiate with your husband? Nothing is a valid answer — it's still data." /></Card>
      <Card><MonoLabel>For the boys</MonoLabel><Textarea value={kidsVal} onChange={setKidsVal} placeholder="Did you create any kind of experience or memory with the twins? Even small counts." /></Card>

      <Card>
        <MonoLabel>How present were you? (Not productive — present.)</MonoLabel>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} onClick={() => setMeter(n)} style={{
              width: 30, height: 30, borderRadius: "50%",
              border: `1.5px solid ${n <= meter ? C.accent : C.soft}`,
              background: n <= meter ? C.accent : C.card,
              color: n <= meter ? "white" : C.muted,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontFamily: "monospace", transition: "all 0.15s",
            }}>{n}</div>
          ))}
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{meter ? meterLabels[meter] : "tap to rate"}</span>
        </div>
      </Card>

      <Card><MonoLabel>One thing to carry into next week</MonoLabel><Textarea value={carryVal} onChange={setCarryVal} placeholder="What do you want to be more intentional about next week?" /></Card>

      <Btn fullWidth onClick={save} variant={saved ? "green" : "primary"} sx={{ padding: 13 }}>
        {saved ? "Logged ✓" : "Log this week ✓"}
      </Btn>

      {state.reflections.length > 0 && (
        <div style={{ marginTop: 32, borderTop: `1px solid ${C.soft}`, paddingTop: 24 }}>
          <MonoLabel>Signal history</MonoLabel>
          {state.reflections.slice(0, 8).map((r, i) => (
            <div key={i} style={{ padding: "13px 0", borderBottom: i < Math.min(state.reflections.length, 8) - 1 ? `1px solid ${C.warm}` : "none" }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
                {r.date} · <span style={{ letterSpacing: 2 }}>{stars(r.rating)}</span>
              </div>
              {r.us   && <div style={{ fontSize: 13, marginBottom: 4 }}><Tag type="us"   />{r.us.substring(0,100)}{r.us.length>100?"…":""}</div>}
              {r.kids && <div style={{ fontSize: 13, marginBottom: 4 }}><Tag type="kids" />{r.kids.substring(0,100)}{r.kids.length>100?"…":""}</div>}
              {r.carry && <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontStyle: "italic" }}>→ {r.carry.substring(0,100)}{r.carry.length>100?"…":""}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────
export default function HomeOS() {
  const [tab,   setTab]   = useState("checkin");
  const [state, setState] = useState(() => LS.get() || defaultState);

  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const wk   = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  const days  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months= ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const tabs = [
    { id: "checkin", label: "Weekly Check-in" },
    { id: "bank",    label: "Initiative Bank"  },
    { id: "reflect", label: "Friday Signal"    },
  ];

  return (
    <div style={{ fontFamily: "sans-serif", background: C.paper, minHeight: "100vh", color: C.ink, fontSize: 15, lineHeight: 1.5 }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 20px 100px" }}>

        {/* Header */}
        <div style={{ padding: "36px 0 22px", borderBottom: `1px solid ${C.soft}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 500, letterSpacing: -0.5 }}>
                Home <em style={{ fontStyle: "italic", color: C.accent }}>OS</em>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Your domestic operating system</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>Week {wk}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{days[now.getDay()]} {months[now.getMonth()]} {now.getDate()}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.soft}`, marginBottom: 32, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "14px 16px", fontSize: 13, fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? C.ink : C.muted, cursor: "pointer",
              border: "none", background: "none",
              borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
              marginBottom: -1, whiteSpace: "nowrap", fontFamily: "sans-serif", transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Panels */}
        {tab === "checkin" && <CheckinPanel state={state} setState={setState} />}
        {tab === "bank"    && <BankPanel    state={state} setState={setState} />}
        {tab === "reflect" && <ReflectPanel state={state} setState={setState} />}

      </div>
    </div>
  );
}
