import { useState, useEffect, useRef } from "react";
import {
  auth,
  setTokens,
  clearTokens,
  isLoggedIn,
  wallet,
  budgets,
  transactions as txApi,
  formatNaira,
  savings,
  scholarship as scholarshipApi,
  studentFinance,
  notifications as notifApi,
  reports,
} from "./api.js";

/*
 * NoorPay - Shari'ah-Compliant Digital Financial Platform
 * Final Year Project - Abdurkabir Mardhiyyah
 * Department of Computer Science, 2024/2025
 *
 * Design Notes:
 * - Color palette: Islamic green (#1B6B3A), amber accent (#D4820A),
 *   light blue (#2563EB), white/grey background
 * - Font: System fonts (no external dependency)
 * - Style: Clean, flat, Bootstrap-inspired - realistic student project
 * - All modules from FYP concept document included
 */

// ── Color tokens ──────────────────────────────────────────────────
const C = {
  green:    "#01140c",  // Deeper, richer Islamic green (primary)
  greenL:   "#19683b",  // Vivid mid green
  greenXL:  "#01180f",  // Bright accent green (highlights, success glows)
  greenPale:"#E8F5EE",  // Very light green bg
  greenDeep:"#01130b",  // Near-black green for gradient depth
  amber:    "#B8860B",  // Rich gold (primary accent)
  amberL:   "#F0B429",  // Bright gold highlight
  amberXL:  "#FFD666",  // Shiny gold shimmer
  amberPale:"#FEF3C7",  // Light amber bg
  blue:     "#1D4ED8",  // Deeper data/info blue
  blueL:    "#3B82F6",
  bluePale: "#EFF6FF",
  red:      "#B91C1C",  // Danger, deeper
  redL:     "#EF4444",
  redPale:  "#FEF2F2",
  purple:   "#6D28D9",  // Secondary, deeper
  purpleL:  "#8B5CF6",
  purplePale:"#F5F3FF",
  white:    "#FFFFFF",
  grey50:   "#F9FAFB",
  grey100:  "#F3F4F6",
  grey200:  "#E5E7EB",
  grey300:  "#D1D5DB",
  grey500:  "#6B7280",
  grey700:  "#374151",
  grey900:  "#111827",
  text:     "#1F2937",
  textSub:  "#6B7280",

  // Gradients — use as backgroundImage for a shiny, premium finish
  gradGreen:  "linear-gradient(135deg, #0F5132 0%, #1B8A4C 55%, #34D399 100%)",
  gradGold:   "linear-gradient(135deg, #B8860B 0%, #D4A017 50%, #FFD666 100%)",
  gradDark:   "linear-gradient(160deg, #0A3D26 0%, #0F5132 60%, #1B8A4C 100%)",
  gradCard:   "linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)",
  glowGreen:  "0 8px 24px rgba(15,81,50,0.25)",
  glowGold:   "0 6px 18px rgba(184,134,11,0.30)",
};

// Convenience pale-background aliases used by a couple of legacy call sites.
C.amberBgSoft = "#FEF3C7";
C.greenBgSoft = "#E8F5EE";

// ── Global styles ─────────────────────────────────────────────────
const GS = () => (
  <style>{`
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { background: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .fade { animation: fadeIn 0.25s ease both; }
    button, input, select, textarea { font-family: inherit; }
    input:focus, select:focus, textarea:focus { outline: 2px solid #1B6B3A; outline-offset: 1px; }
  `}</style>
);

// ── Small reusable components ─────────────────────────────────────
const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: C.gradCard, borderRadius: 10, padding: 16,
    border: `1px solid ${C.grey200}`, boxShadow: "0 2px 10px rgba(17,24,39,0.06)",
    ...style
  }}>{children}</div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", icon, full, style = {}, disabled }) => {
  const pad = size === "sm" ? "6px 12px" : size === "lg" ? "13px 24px" : "9px 18px";
  const fs  = size === "sm" ? 12 : 14;
  const bgMap = {
    primary: C.gradGreen, secondary: C.grey700, danger: C.red,
    amber: C.gradGold, blue: C.blue, outline: "transparent", ghost: C.grey100,
  };
  const colMap = {
    primary: C.white, secondary: C.white, danger: C.white,
    amber: C.white, blue: C.white, outline: C.green, ghost: C.grey700,
  };
  const glowMap = { primary: C.glowGreen, amber: C.glowGold };
  const isGradient = variant === "primary" || variant === "amber";
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: pad,
      [isGradient ? "backgroundImage" : "background"]: bgMap[variant],
      color: colMap[variant],
      border: variant === "outline" ? `1.5px solid ${C.green}` : "none",
      borderRadius: 8, fontSize: fs, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", gap: 6,
      width: full ? "100%" : "auto", justifyContent: full ? "center" : "flex-start",
      opacity: disabled ? 0.5 : 1,
      boxShadow: disabled ? "none" : (glowMap[variant] || "none"),
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      ...style
    }}>
      {icon && <span>{icon}</span>}{children}
    </button>
  );
};

const Badge = ({ children, color = C.green }) => (
  <span style={{
    background: color + "18", color, fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 99, border: `1px solid ${color}30`,
    display: "inline-block",
  }}>{children}</span>
);

const Progress = ({ pct, color = C.green, h = 8 }) => (
  <div style={{ background: C.grey200, borderRadius: 99, height: h, overflow: "hidden" }}>
    <div style={{
      height: "100%", width: `${Math.min(pct, 100)}%`,
      background: color, borderRadius: 99, transition: "width 0.6s ease",
    }} />
  </div>
);

const Inp = ({ label, type = "text", value, onChange, placeholder, note }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.grey700, marginBottom: 4 }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.grey300}`, borderRadius: 6, fontSize: 14, color: C.text, background: C.white }} />
    {note && <p style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{note}</p>}
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.grey700, marginBottom: 4 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.grey300}`, borderRadius: 6, fontSize: 14, color: C.text, background: C.white }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const SectionHeader = ({ title, sub, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSub, marginTop: 1 }}>{sub}</div>}
    </div>
    {action && <button onClick={onAction} style={{ background: "none", border: "none", color: C.green, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{action}</button>}
  </div>
);

const Stat = ({ label, value, color = C.green, sub }) => (
  <div style={{ background: C.white, border: `1px solid ${C.grey200}`, borderRadius: 8, padding: "12px 14px" }}>
    <div style={{ fontSize: 12, color: C.textSub, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{sub}</div>}
  </div>
);

const ListItem = ({ icon, title, sub, right, rightSub, rightColor = C.text, onClick, borderLeft }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
    borderBottom: `1px solid ${C.grey100}`, cursor: onClick ? "pointer" : "default",
    borderLeft: borderLeft ? `3px solid ${borderLeft}` : undefined,
    background: C.white,
  }}>
    {icon && <div style={{ width: 38, height: 38, borderRadius: 8, background: C.grey100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSub }}>{sub}</div>}
    </div>
    {(right || rightSub) && (
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {right && <div style={{ fontSize: 13, fontWeight: 600, color: rightColor }}>{right}</div>}
        {rightSub && <div style={{ fontSize: 11, color: C.textSub }}>{rightSub}</div>}
      </div>
    )}
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", zIndex: 1, background: C.white, width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "12px 12px 0 0", padding: "0 0 32px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: C.grey300, borderRadius: 99, margin: "12px auto" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 16px 12px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: C.grey100, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 16, color: C.grey700 }}>✕</button>
        </div>
        <div style={{ padding: "0 16px" }}>{children}</div>
      </div>
    </div>
  );
};

const Toast = ({ msg, type = "success", onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  const col = type === "success" ? C.green : type === "error" ? C.red : C.amber;
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: C.white, border: `1px solid ${col}`, borderRadius: 8, padding: "10px 16px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 8, minWidth: 220 }}>
      <span style={{ color: col, fontSize: 16 }}>{type === "success" ? "✓" : type === "error" ? "✗" : "!"}</span>
      <span style={{ fontSize: 13, color: C.text }}>{msg}</span>
    </div>
  );
};

// Top page header bar (green)
const PageHeader = ({ title, sub, onBack, children }) => (
  <div style={{ background: C.green, padding: "48px 16px 20px", color: C.white }}>
    {onBack && (
      <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "5px 10px", color: C.white, fontSize: 13, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
        ← Back
      </button>
    )}
    <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 2 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, opacity: 0.8 }}>{sub}</div>}
    {children}
  </div>
);

// Simple bar chart using divs
const BarChart = ({ data, h = 100 }) => {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: h, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 9, color: C.textSub, fontWeight: 600 }}>₦{(d.v / 1000).toFixed(0)}k</div>
          <div style={{
            width: "100%", height: `${(d.v / max) * (h - 28)}px`,
            background: d.highlight ? C.amber : C.green, borderRadius: "4px 4px 0 0",
            transition: "height 0.5s ease", minHeight: 4,
          }} />
          <div style={{ fontSize: 9, color: d.highlight ? C.amber : C.textSub, fontWeight: d.highlight ? 700 : 400 }}>{d.l}</div>
        </div>
      ))}
    </div>
  );
};

// Simple donut using SVG
const Donut = ({ slices, size = 120 }) => {
  const total = slices.reduce((s, x) => s + x.v, 0);
  const r = 44, cx = 60, circ = 2 * Math.PI * r;
  let off = 0;
  const segs = slices.map(s => {
    const dash = (s.v / total) * circ;
    const seg = { ...s, dash, gap: circ - dash, off };
    off += dash; return seg;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {segs.map((s, i) => (
        <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.c} strokeWidth="16"
          strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.off}
          style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }} />
      ))}
      <circle cx={cx} cy={cx} r="30" fill={C.white} />
      <text x={cx} y={cx - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.text}>₦{(total / 1000).toFixed(0)}k</text>
      <text x={cx} y={cx + 10} textAnchor="middle" fontSize="9" fill={C.textSub}>total</text>
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════
// SCREENS
// ════════════════════════════════════════════════════════════════

// ── Landing Page (real responsive marketing page — desktop/tablet/mobile) ──
const LandingStyles = () => (
  <style>{`
    .np-land { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${C.text}; }
    .np-land-nav { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; }
    .np-land-navlinks { display: flex; gap: 32px; align-items: center; }
    .np-land-hero { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; padding: 40px 24px 80px; }
    .np-land-features { max-width: 1180px; margin: 0 auto; padding: 60px 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .np-land-steps { max-width: 1180px; margin: 0 auto; padding: 60px 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .np-land-trust { display: flex; flex-wrap: wrap; gap: 12px; }
    .np-land-footer-grid { max-width: 1180px; margin: 0 auto; padding: 48px 24px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; }
    .np-land-phone { width: 100%; max-width: 320px; margin: 0 auto; }

    @media (max-width: 900px) {
      .np-land-hero { grid-template-columns: 1fr; padding-bottom: 48px; text-align: center; }
      .np-land-features { grid-template-columns: repeat(2, 1fr); }
      .np-land-steps { grid-template-columns: 1fr; }
      .np-land-footer-grid { grid-template-columns: 1fr 1fr; }
      .np-land-navlinks-desktop { display: none !important; }
      .np-land-phone { margin-top: 24px; }
    }
    @media (max-width: 560px) {
      .np-land-features { grid-template-columns: 1fr; }
      .np-land-footer-grid { grid-template-columns: 1fr; }
      .np-land-hero h1 { font-size: 34px !important; }
    }
  `}</style>
);

const LandingFeature = ({ icon, title, desc, color }) => (
  <div style={{ background: C.white, borderRadius: 14, padding: 24, border: `1px solid ${C.grey200}`, boxShadow: "0 2px 10px rgba(17,24,39,0.05)", transition: "transform 0.2s ease" }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: C.text }}>{title}</div>
    <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.6 }}>{desc}</div>
  </div>
);

const LandingPage = ({ onGetStarted, onLogin }) => {
  const features = [
    { icon: "💰", title: "Digital Wallet", desc: "Send, receive, and manage your money instantly — zero fees on NoorPay-to-NoorPay transfers.", color: C.green },
    { icon: "🕌", title: "Zakat Calculator", desc: "Automatic Nisab and 2.5% Zakat calculation on cash, gold, and business assets, with full payment history.", color: C.amber },
    { icon: "🤝", title: "Qard Hasan Loans", desc: "Interest-free benevolent loans with transparent, equal installment schedules — no hidden charges, ever.", color: C.blue },
    { icon: "📊", title: "Smart Budgeting", desc: "Category budgets, spending alerts, and personalised insights to help you stay in control.", color: C.purple },
    { icon: "🎯", title: "Savings Goals", desc: "Fixed, flexible, and goal-based savings for tuition, Hajj, Umrah, business, and more.", color: C.greenL },
    { icon: "📖", title: "Learning Hub", desc: "Bite-sized Islamic finance literacy — articles, courses, and FAQs, built into the app.", color: C.amberL },
  ];

  const steps = [
    { n: "01", title: "Create your account", desc: "Sign up in minutes with just your email and phone number — no paperwork, no branch visits." },
    { n: "02", title: "Fund your wallet", desc: "Deposit into your NoorPay wallet and get instant access to every feature." },
    { n: "03", title: "Bank with confidence", desc: "Send money, save for goals, pay Zakat, and track spending — all fully Shari'ah-compliant." },
  ];

  return (
    <div className="np-land" style={{ background: C.grey50, minHeight: "100vh" }}>
      <LandingStyles />

      {/* Nav */}
      <div className="np-land-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>🕌</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.green, letterSpacing: -0.5 }}>NoorPay</span>
        </div>
        <div className="np-land-navlinks np-land-navlinks-desktop">
          <span style={{ fontSize: 14, fontWeight: 600, color: C.grey700, cursor: "pointer" }}>Features</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.grey700, cursor: "pointer" }}>Islamic Finance</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.grey700, cursor: "pointer" }}>How it works</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" size="sm" onClick={onLogin}>Sign In</Btn>
          <Btn variant="primary" size="sm" onClick={onGetStarted}>Get Started</Btn>
        </div>
      </div>

      {/* Hero */}
      <div className="np-land-hero">
        <div>
          <Badge color={C.amber}>🌙 100% Shari'ah-Compliant</Badge>
          <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15, margin: "16px 0", letterSpacing: -1, color: C.text }}>
            Digital banking that honors your <span style={{ backgroundImage: C.gradGreen, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>values</span>.
          </h1>
          <p style={{ fontSize: 17, color: C.textSub, lineHeight: 1.7, marginBottom: 28, maxWidth: 480 }}>
            NoorPay is a Shari'ah-compliant digital financial platform — wallet, savings, budgeting,
            Zakat, and Qard Hasan, built with no Riba, no gambling, and no hidden fees.
          </p>
          <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
            <Btn variant="primary" size="lg" icon="🚀" onClick={onGetStarted}>Get Started Free</Btn>
            <Btn variant="outline" size="lg" onClick={onLogin}>Sign In</Btn>
          </div>
          <div className="np-land-trust">
            <Badge color={C.green}>✅ Zero-Interest Loans</Badge>
            <Badge color={C.amber}>✅ 2.5% Zakat, Automated</Badge>
            <Badge color={C.blue}>✅ Fee-Free Transfers</Badge>
          </div>
        </div>
        {/* Phone mockup */}
        <div className="np-land-phone">
          <div style={{ backgroundImage: C.gradGreen, borderRadius: 28, padding: 20, boxShadow: C.glowGreen }}>
            <div style={{ background: C.white, borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>Available Balance</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 10 }}>₦487,250.00</div>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 16 }}>✅ Shari'ah-Compliant Account</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, backgroundImage: C.gradGreen, borderRadius: 8, padding: "10px 0", textAlign: "center", color: C.white, fontSize: 12, fontWeight: 700 }}>💸 Send</div>
                <div style={{ flex: 1, background: C.grey100, borderRadius: 8, padding: "10px 0", textAlign: "center", color: C.grey700, fontSize: 12, fontWeight: 700 }}>📥 Receive</div>
              </div>
              {[["🕌", "Zakat Payment", "-₦25,000"], ["🤝", "Qard Hasan", "+₦50,000"], ["💰", "Deposit", "+₦100,000"]].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < 2 ? `1px solid ${C.grey100}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{r[0]}</span>
                    <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>{r[1]}</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: r[2].startsWith("+") ? C.green : C.red }}>{r[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, letterSpacing: 1, textTransform: "uppercase" }}>Everything you need</div>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: C.text, marginTop: 6 }}>One app, fully compliant</h2>
      </div>
      <div className="np-land-features">
        {features.map((f, i) => <LandingFeature key={i} {...f} />)}
      </div>

      {/* How it works */}
      <div style={{ background: C.greenPale }}>
        <div style={{ textAlign: "center", paddingTop: 56 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: C.text }}>How it works</h2>
        </div>
        <div className="np-land-steps">
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundImage: C.gradGreen, color: C.white, fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: C.glowGreen }}>{s.n}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: C.text }}>{s.title}</div>
              <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", paddingBottom: 56 }}>
          <Btn variant="primary" size="lg" icon="🚀" onClick={onGetStarted}>Create Your Free Account</Btn>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: C.grey900 }}>
        <div className="np-land-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>🕌</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.white }}>NoorPay</span>
            </div>
            <p style={{ fontSize: 13, color: C.grey500, lineHeight: 1.6, maxWidth: 280 }}>
              A Shari'ah-compliant digital financial platform, built as a final-year Computer Science
              project at Fountain University, Osogbo.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 12 }}>Product</div>
            {["Wallet", "Savings", "Budgeting", "Zakat"].map((l, i) => (
              <div key={i} style={{ fontSize: 13, color: C.grey500, marginBottom: 8 }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 12 }}>Islamic Finance</div>
            {["Qard Hasan", "Sadaqah", "Learning Hub", "AI Advisor"].map((l, i) => (
              <div key={i} style={{ fontSize: 13, color: C.grey500, marginBottom: 8 }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 12 }}>Legal</div>
            {["Privacy Policy", "Terms of Service", "Shari'ah Compliance"].map((l, i) => (
              <div key={i} style={{ fontSize: 13, color: C.grey500, marginBottom: 8 }}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.1)`, padding: "20px 24px", textAlign: "center", fontSize: 12, color: C.grey500 }}>
          © {new Date().getFullYear()} NoorPay. All rights reserved. · "وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا" — Al-Baqarah 2:275
        </div>
      </div>
    </div>
  );
};

// ── Splash ────────────────────────────────────────────────────────
const Splash = ({ onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, []);
  return (
    <div style={{ minHeight: "100vh", background: C.green, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 72, height: 72, background: "rgba(255,255,255,0.15)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20 }}>🕌</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.white, letterSpacing: -1, marginBottom: 6 }}>NoorPay</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 40 }}>Shari'ah-Compliant Digital Finance</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic", textAlign: "center" }}>
        "وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا"<br />Al-Baqarah 2:275
      </div>
    </div>
  );
};

// ── Login ─────────────────────────────────────────────────────────
const Login = ({ onLogin, onReg }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!email || !pass) { setErr("Please fill in all fields."); return; }
    setLoading(true); setErr("");
    try {
      await onLogin(email, pass);
    } catch (e) {
      setErr(e.detail || Object.values(e)[0] || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight: "100vh", background: C.grey100 }}>
      <div style={{ background: C.green, padding: "56px 24px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🕌</div>
        {/* <div style={{ fontSize: 26, fontWeight: 800, color: "red" }}>
  TEST APP
</div> */}
         <div style={{ fontSize: 26, fontWeight: 800, color: C.white, letterSpacing: -0.5 }}>NoorPay</div> 
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Halal Finance · For Everyone</div>
      </div>
      <div style={{ padding: 20 }}>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 18 }}>Sign in to your NoorPay account</div>
          <Inp label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Inp label="Password" type="password" value={pass} onChange={setPass} placeholder="Enter your password" />
          {err && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{err}</div>}
          <div style={{ textAlign: "right", marginBottom: 14 }}>
            <button style={{ background: "none", border: "none", color: C.green, fontSize: 13, cursor: "pointer" }}>Forgot password?</button>
          </div>
          <Btn full variant="primary" onClick={go} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Btn>
        </Card>
        <div style={{ textAlign: "center", fontSize: 13, color: C.textSub }}>
          Don't have an account?{" "}
          <button onClick={onReg} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Create account</button>
        </div>
      </div>
    </div>
  );
};

// ── Register ──────────────────────────────────────────────────────
const Register = ({ onDone, onLogin }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", userType: "student", pass: "", pin: "" });
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const refs = useRef([]);
  const handleOtp = (i, v) => {
    const a = [...otp]; a[i] = v.slice(-1); setOtp(a);
    if (v && i < 4) refs.current[i + 1]?.focus();
  };

  const submitStep1 = async () => {
    setError(""); setSuccess("");
    if (!form.name || !form.email || !form.phone) {
      setError("Please complete the details first.");
      return;
    }
    setLoading(true);
    try {
      await auth.registerStep1({ full_name: form.name, email: form.email, phone: form.phone, user_type: form.userType });
      setSuccess("OTP sent. Enter the code below.");
      setStep(2);
    } catch (e) {
      setError(e.detail || Object.values(e)[0] || "Unable to send OTP.");
    } finally { setLoading(false); }
  };

  const submitStep2 = async () => {
    const code = otp.join("");
    setError(""); setSuccess("");
    if (code.length < 5) { setError("Enter the full 5-digit code."); return; }
    setLoading(true);
    try {
      await auth.verifyOTP({ email: form.email, code, purpose: "registration" });
      setSuccess("Verification succeeded. Set your password and PIN.");
      setStep(3);
    } catch (e) {
      setError(e.detail || Object.values(e)[0] || "Invalid OTP.");
    } finally { setLoading(false); }
  };

  const submitStep3 = async () => {
    setError(""); setSuccess("");
    if (!form.pass || form.pin.length < 4) { setError("Choose a password and a 4-digit PIN."); return; }
    setLoading(true);
    try {
      const data = await auth.completeRegister({ email: form.email, password: form.pass, pin: form.pin });
      onDone(data.user);
    } catch (e) {
      setError(e.detail || Object.values(e)[0] || "Registration failed.");
    } finally { setLoading(false); }
  };

  const resendCode = async () => {
    setError(""); setSuccess("");
    setLoading(true);
    try { await auth.resendOTP(form.email); setSuccess("OTP resent."); } catch (e) { setError(e.detail || Object.values(e)[0] || "Could not resend."); }
    finally { setLoading(false); }
  };

  if (step === 1) return (
    <div style={{ minHeight: "100vh", background: C.grey100 }}>
      <PageHeader title="Create Account" sub="Step 1 of 3 — Personal Information" />
      <div style={{ padding: 16 }}>
        <Card>
          <Inp label="Full name" value={form.name} onChange={v => set("name", v)} placeholder="Abdurkabir Mardhiyyah" />
          <Inp label="Email address" type="email" value={form.email} onChange={v => set("email", v)} placeholder="you@example.com" />
          <Inp label="Phone number" type="tel" value={form.phone} onChange={v => set("phone", v)} placeholder="080 0000 0000" />
          <Select label="I am a..." value={form.userType} onChange={v => set("userType", v)} options={[
            { value: "student", label: "Student" },
            { value: "professional", label: "Working Professional" },
            { value: "entrepreneur", label: "Entrepreneur / Business Owner" },
            { value: "family", label: "Family / Individual" },
            { value: "ngo", label: "NGO / Islamic Organization" },
          ]} />
          {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: C.green, marginBottom: 10 }}>{success}</div>}
          <Btn full variant="primary" onClick={submitStep1} disabled={loading}>{loading ? "Sending OTP..." : "Continue →"}</Btn>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={onLogin} style={{ background: "none", border: "none", color: C.green, fontSize: 13, cursor: "pointer" }}>Already have an account?</button>
          </div>
        </Card>
      </div>
    </div>
  );
  if (step === 2) return (
    <div style={{ minHeight: "100vh", background: C.grey100 }}>
      <PageHeader title="Verify Phone" sub="Step 2 of 3 — OTP Verification" />
      <div style={{ padding: 16 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Check your phone</div>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 24 }}>Enter the 5-digit code sent to {form.phone || "your number"}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
            {otp.map((v, i) => (
              <input key={i} ref={el => refs.current[i] = el} value={v} onChange={e => handleOtp(i, e.target.value)}
                style={{ width: 48, height: 52, textAlign: "center", fontSize: 20, fontWeight: 700, border: `2px solid ${v ? C.green : C.grey300}`, borderRadius: 8, background: C.white, color: C.green }} />
            ))}
          </div>
          {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: C.green, marginBottom: 10 }}>{success}</div>}
          <Btn full variant="primary" onClick={submitStep2} disabled={loading || otp.join("").length < 5}>{loading ? "Verifying..." : "Verify Code"}</Btn>
          <button onClick={resendCode} style={{ background: "none", border: "none", color: C.green, fontSize: 13, marginTop: 12, cursor: "pointer" }}>Resend code</button>
        </Card>
      </div>
    </div>
  );
  if (step === 3) return (
    <div style={{ minHeight: "100vh", background: C.grey100 }}>
      <PageHeader title="Secure Account" sub="Step 3 of 3 — Password & PIN" />
      <div style={{ padding: 16 }}>
        <Card>
          <Inp label="Create password" type="password" value={form.pass} onChange={v => set("pass", v)} placeholder="At least 8 characters" note="Use uppercase, numbers & special characters" />
          <Inp label="Transaction PIN (4 digits)" type="password" value={form.pin} onChange={v => set("pin", v.slice(0, 4))} placeholder="••••" note="You'll use this to authorise all transactions" />
          {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: C.green, marginBottom: 10 }}>{success}</div>}
          <div style={{ background: C.greenPale, border: `1px solid ${C.green}30`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: C.grey700 }}>
            ✅ By registering, you confirm this platform operates on <strong>Shari'ah-compliant</strong> principles. No interest (Riba) is charged on any service.
          </div>
          <Btn full variant="primary" onClick={submitStep3} disabled={loading || !form.pass || form.pin.length < 4}>{loading ? "Creating account..." : "Create My Account"}</Btn>
        </Card>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: C.grey100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>Account Created!</div>
        <div style={{ fontSize: 14, color: C.textSub, marginBottom: 24, lineHeight: 1.6 }}>
          Assalamu alaykum, <strong>{form.name || "friend"}</strong>!<br />Your NoorPay account is ready.
        </div>
        <Btn full variant="primary" onClick={onDone}>Go to Dashboard →</Btn>
      </div>
    </div>
  );
};

// ── Home / Dashboard ──────────────────────────────────────────────
const Home = ({ nav, user = null }) => {
  const [balVis, setBalVis] = useState(true);
  const [balance, setBalance] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const spending = [
    { l: "Jan", v: 42000 }, { l: "Feb", v: 58000 }, { l: "Mar", v: 35000 },
    { l: "Apr", v: 71000 }, { l: "May", v: 48000 }, { l: "Jun", v: 63000, highlight: true },
  ];
  const [homeReceiveOpen, setHomeReceiveOpen] = useState(false);
  useEffect(() => {
    let active = true;
    wallet.get().then((data) => { if (active) setBalance(data.balance); }).catch(() => { if (active) setBalance(null); });
    txApi.getAll().then((data) => {
      if (active) setRecentTxns(Array.isArray(data) ? data.slice(0, 5) : []);
    }).catch(() => { if (active) setRecentTxns([]); });
    return () => { active = false; };
  }, []);
  const quickActions = [
    { icon: "💸", label: "Send",       to: "send"         },
    { icon: "📥", label: "Receive",    to: "RECEIVE"      },
    { icon: "💳", label: "Cards",      to: "cards"        },
    { icon: "📱", label: "Airtime",    to: "airtime"      },
    { icon: "⭐", label: "Zakat",      to: "zakat"        },
    { icon: "📦", label: "Data",       to: "airtime"      },
    { icon: "🎯", label: "Goals",      to: "savings"      },
    { icon: "🤝", label: "Qard",       to: "qard"         },
    { icon: "🤖", label: "AI Advisor", to: "ai"           },
    { icon: "🎁", label: "Rewards",    to: "rewards"      },
    { icon: "🎓", label: "Scholar.",   to: "scholarship"  },
    { icon: "📊", label: "Reports",    to: "reports"      },
  ];
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ backgroundImage: C.gradGreen, padding: "48px 16px 70px", position: "relative", boxShadow: C.glowGreen }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "radial-gradient(circle at 85% -10%, rgba(255,214,102,0.18), transparent 55%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 2 }}>Assalamu alaykum 🌙</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{user?.full_name || "NoorPay User"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => nav("notifications")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", position: "relative" }}>
              🔔<span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, background: C.amber, borderRadius: "50%" }} />
            </button>
            <button onClick={() => nav("me")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer" }}>👤</button>
          </div>
        </div>
      </div>

      {/* Balance card floating */}
      <div style={{ margin: "-50px 16px 0", position: "relative", zIndex: 2 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.textSub }}>Available Balance</span>
            <button onClick={() => setBalVis(!balVis)} style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontSize: 16 }}>{balVis ? "👁" : "🙈"}</button>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 2 }}>
            {balVis ? (balance !== null ? `₦${Number(balance).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Loading...") : "₦ ••••••"}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>Acct: {user?.account_number || "0123456789"} · <span style={{ color: C.green, fontWeight: 600 }}>✅ Shari'ah-Compliant</span></div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn variant="primary" size="sm" icon="💸" onClick={() => nav("send")} style={{ flex: 1, justifyContent: "center" }}>Send</Btn>
            <Btn variant="outline" size="sm" icon="📥" onClick={() => nav("receive")} style={{ flex: 1, justifyContent: "center" }}>Receive</Btn>
            <Btn variant="ghost" size="sm" icon="📊" onClick={() => nav("transactions")} style={{ flex: 1, justifyContent: "center" }}>History</Btn>
          </div>
        </Card>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {/* Quick Actions */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {quickActions.map((a, i) => (
              <button key={i} onClick={() => a.to === "RECEIVE" ? setHomeReceiveOpen(true) : nav(a.to)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: C.grey100, border: "none", borderRadius: 8, padding: "10px 4px", cursor: "pointer" }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <span style={{ fontSize: 10, color: C.grey700, fontWeight: 500, textAlign: "center", lineHeight: 1.2 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Spending Chart */}
        <Card style={{ marginBottom: 14 }}>
          <SectionHeader title="Monthly Spending" sub="June 2025" action="See report" onAction={() => nav("reports")} />
          <BarChart data={spending} />
        </Card>

        {/* Savings Goals preview */}
        <Card style={{ marginBottom: 14 }}>
          <SectionHeader title="Savings Goals" sub="3 active goals" action="Manage" onAction={() => nav("savings")} />
          {[
            { name: "Hajj Fund", saved: 380000, target: 1200000, icon: "🕋" },
            { name: "Tuition Fees", saved: 85000, target: 200000, icon: "🎓" },
            { name: "Emergency Fund", saved: 212000, target: 500000, icon: "🛡️" },
          ].map((g, i) => {
            const pct = Math.round((g.saved / g.target) * 100);
            return (
              <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{g.icon} {g.name}</span>
                  <span style={{ fontSize: 12, color: C.textSub }}>₦{g.saved.toLocaleString()} / ₦{g.target.toLocaleString()}</span>
                </div>
                <Progress pct={pct} color={i === 0 ? C.green : i === 1 ? C.blue : C.amber} />
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{pct}% complete</div>
              </div>
            );
          })}
        </Card>

        {/* Recent Transactions */}
        <Card style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "12px 14px" }}>
            <SectionHeader title="Recent Transactions" action="View all" onAction={() => nav("transactions")} />
          </div>
          {recentTxns.length === 0 ? (
            <div style={{ padding: "0 14px 14px", fontSize: 12, color: C.textSub }}>No recent transactions yet.</div>
          ) : recentTxns.map((tx, i) => {
            const isIncoming = tx.type === "credit" || tx.type === "income";
            const icon = tx.type === "transfer" ? "💸" : tx.type === "airtime" ? "📱" : tx.type === "data" ? "📦" : tx.type === "zakat" ? "⭐" : tx.type === "qard" ? "🤝" : "💰";
            const title = tx.description || "Transaction";
            const sub = tx.recipient_name || tx.bank_name || new Date(tx.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
            const amt = `${isIncoming ? "+" : "-"}${formatNaira(tx.amount)}`;
            return <ListItem key={tx.id || i} icon={icon} title={title} sub={sub} right={amt} rightColor={isIncoming ? C.green : C.red} />;
          })}
        </Card>
      </div>
      <ReceiveModal open={homeReceiveOpen} onClose={() => setHomeReceiveOpen(false)} />
    </div>
  );
};

// ── Finance / Budget page ─────────────────────────────────────────
const Finance = ({ nav }) => {
  const [tab, setTab] = useState("budget");
  const [summary, setSummary] = useState(null);
  const [budgetRows, setBudgetRows] = useState([]);
  const [savingsSummary, setSavingsSummary] = useState(null);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    Promise.all([
      budgets.getSummary(month, year),
      budgets.getAll(month, year),
      savings.getSummary(),
      savings.getAll(),
    ])
      .then(([summaryData, rows, savingsData, goals]) => {
        setSummary(summaryData);
        setBudgetRows(Array.isArray(rows) ? rows : []);
        setSavingsSummary(savingsData || null);
        setSavingsGoals(Array.isArray(goals) ? goals : []);
      })
      .catch(() => {
        setSummary(null);
        setBudgetRows([]);
        setSavingsSummary(null);
        setSavingsGoals([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const colorFor = (category = "") => {
    const c = category.toLowerCase();
    if (c.includes("food") || c.includes("dining")) return C.amber;
    if (c.includes("transport")) return C.blue;
    if (c.includes("housing") || c.includes("rent")) return C.green;
    if (c.includes("education")) return C.purple;
    if (c.includes("health") || c.includes("utility")) return C.red;
    return C.grey500;
  };

  const expenses = budgetRows.map((b) => ({ label: b.category || "Other", v: Number(b.spent || 0), c: colorFor(b.category) }));
  const budgetsData = budgetRows.map((b) => ({ name: b.category || "Other", budgeted: Number(b.monthly_limit || 0), spent: Number(b.spent || 0), c: colorFor(b.category) }));
  const goalTypeLabel = (type = "") => ({
    hajj: "Hajj Target",
    emergency: "Emergency",
    education: "Education",
    laptop: "Personal",
    business: "Business",
    marriage: "Marriage",
    house: "Housing",
    car: "Vehicle",
    custom: "Custom Goal",
  }[type] || "Goal");
  const goalIcon = (type = "") => ({ hajj: "🕋", emergency: "🛡️", education: "🎓", laptop: "💻", business: "💼", marriage: "💍", house: "🏠", car: "🚗", custom: "🎯" }[type] || "🎯");

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="Finance Hub" sub="Budget · Expenses · Islamic Finance" />
      <div style={{ background: C.white, display: "flex", borderBottom: `1px solid ${C.grey200}` }}>
        {[["budget", "Budget"], ["savings", "Savings"], ["islamic", "Islamic"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "12px 0", background: "none", border: "none",
            borderBottom: `2px solid ${tab === k ? C.green : "transparent"}`,
            color: tab === k ? C.green : C.textSub, fontWeight: tab === k ? 700 : 500,
            fontSize: 13, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {tab === "budget" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Stat label="Income"  value={loading ? "..." : formatNaira(summary?.total_income || 0)} color={C.green} />
            <Stat label="Spent"   value={loading ? "..." : formatNaira(summary?.total_spent || 0)} color={C.red}   />
            <Stat label="Balance" value={loading ? "..." : formatNaira(summary?.net_savings || 0)} color={C.blue}  />
          </div>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Expense Breakdown</div>
            {expenses.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textSub }}>No category spending data yet.</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Donut slices={expenses.map(e => ({ v: e.v, c: e.c }))} />
                <div style={{ flex: 1 }}>
                  {expenses.map((e, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: e.c }} />
                        <span style={{ fontSize: 11, color: C.text }}>{e.label}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{formatNaira(e.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Budget Performance</div>
            {budgetsData.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textSub }}>No budgets created yet.</div>
            ) : budgetsData.map((b, i) => {
              const pct = b.budgeted ? Math.round((b.spent / b.budgeted) * 100) : 0;
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: C.text }}>{b.name}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: b.spent > b.budgeted ? C.red : C.text }}>{formatNaira(b.spent)}</span>
                      <span style={{ fontSize: 11, color: C.textSub }}> / {formatNaira(b.budgeted)}</span>
                      {b.spent > b.budgeted && <Badge color={C.red} style={{ marginLeft: 4 }}>Over</Badge>}
                    </div>
                  </div>
                  <Progress pct={pct} color={b.spent > b.budgeted ? C.red : b.c} />
                </div>
              );
            })}
            <Btn variant="primary" size="sm" icon="+" full style={{ marginTop: 8 }}>Add New Budget Category</Btn>
          </Card>
        </>}

        {tab === "savings" && <>
          <Card style={{ marginBottom: 14, background: C.greenPale, border: `1px solid ${C.green}40` }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 2 }}>Total Savings</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.green }}>{loading ? "..." : formatNaira(savingsSummary?.total_saved || 0)}</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{loading ? "Loading" : `Across ${savingsGoals.length} goals`}</div>
          </Card>
          {loading ? (
            <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>Loading your savings goals…</div>
          ) : savingsGoals.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>No savings goals yet. Start one to build good habits.</div>
          ) : savingsGoals.map((g, i) => {
            const pct = Math.round((Number(g.saved_amount || 0) / Math.max(Number(g.target_amount || 0), 1)) * 100);
            const color = i % 2 === 0 ? C.green : i % 3 === 1 ? C.blue : C.amber;
            return (
              <Card key={g.id || i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{goalIcon(g.goal_type)} {g.title}</div>
                    <Badge color={color}>{goalTypeLabel(g.goal_type)}</Badge>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color }}>{formatNaira(g.saved_amount || 0)}</div>
                    <div style={{ fontSize: 11, color: C.textSub }}>of {formatNaira(g.target_amount || 0)}</div>
                  </div>
                </div>
                <Progress pct={pct} color={color} h={10} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: C.textSub }}>{g.deadline ? `Due: ${new Date(g.deadline).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}` : "No deadline"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}% done</span>
                </div>
              </Card>
            );
          })}
          <Btn variant="primary" icon="🎯" full>Create New Savings Goal</Btn>
        </>}

        {tab === "islamic" && <>
          <div style={{ background: C.green, borderRadius: 8, padding: 16, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", fontStyle: "italic", marginBottom: 6 }}>
              "وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا"
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              "Allah has permitted trade and forbidden interest" — Al-Baqarah 2:275
            </div>
          </div>
          {[
            { name: "Mudarabah Investment", desc: "Profit-sharing partnership account", badge: "12–18% p.a.", icon: "📈", c: C.green  },
            { name: "Musharakah Fund",      desc: "Joint venture investment pool",     badge: "10–15% p.a.", icon: "🤝", c: C.blue   },
            { name: "Murabahah Finance",    desc: "Cost-plus Shari'ah financing",      badge: "Fixed markup", icon: "🏦", c: C.amber  },
            { name: "Waqf Endowment",       desc: "Perpetual charitable endowment",    badge: "Community",    icon: "🕌", c: C.purple },
          ].map((p, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 28 }}>{p.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{p.desc}</div>
                </div>
                <Badge color={p.c}>{p.badge}</Badge>
              </div>
            </Card>
          ))}
          <div style={{ background: C.greenPale, border: `1px solid ${C.green}30`, borderRadius: 8, padding: 12, fontSize: 12, color: C.grey700 }}>
            <strong style={{ color: C.green }}>✅ Halal Compliance Checker</strong><br />
            All products on NoorPay are reviewed against AAOIFI Shari'ah Standards to ensure zero Riba, Gharar, and Maysir.
          </div>
        </>}
      </div>
    </div>
  );
};

// ── Qard Hasan Module ─────────────────────────────────────────────
const QardHasan = ({ nav }) => {
  const [tab, setTab]   = useState("overview");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ purpose: "education", amount: "", months: "12", detail: "" });
  const [toast, setToast] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const myLoans = [
    { name: "Fatimah Bello", purpose: "Small Business", amount: 50000, repaid: 35000, status: "Repaying" },
    { name: "Musa Ibrahim",  purpose: "Medical Aid",    amount: 80000, repaid: 80000, status: "Completed" },
  ];
  const community = [
    { name: "Ahmad K.",  purpose: "School Fees",   amount: 30000, trust: "High",   verified: true  },
    { name: "Aisha Y.",  purpose: "Business Seed", amount: 75000, trust: "Medium", verified: true  },
    { name: "Ibrahim S.",purpose: "Medical",       amount: 50000, trust: "High",   verified: false },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Qard Hasan" sub="Interest-Free Community Finance">
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          {[{ l: "₦12.4M", sub: "Total issued" }, { l: "248", sub: "Beneficiaries" }, { l: "0%", sub: "Interest rate" }].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.white }}>{s.l}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </PageHeader>
      <div style={{ background: C.white, display: "flex", borderBottom: `1px solid ${C.grey200}` }}>
        {[["overview", "Overview"], ["myloans", "My Loans"], ["community", "Community P2P"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? C.green : "transparent"}`, color: tab === k ? C.green : C.textSub, fontWeight: tab === k ? 700 : 500, fontSize: 12, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {tab === "overview" && <>
          <Card style={{ marginBottom: 14, borderLeft: `4px solid ${C.green}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>What is Qard Hasan?</div>
            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, marginBottom: 12 }}>
              Qard Hasan (قرض حسن) is a benevolent, interest-free loan given for the sake of Allah. The borrower repays only the exact principal — no interest, no hidden fees, ever.
            </div>
            <div style={{ background: C.greenPale, borderRadius: 6, padding: 10, fontSize: 12, color: C.grey700, marginBottom: 12 }}>
              <strong>Quranic basis:</strong> "Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?" — Al-Baqarah 2:245
            </div>
            <Btn variant="primary" full icon="📋" onClick={() => setModal(true)}>Apply for Qard Hasan Loan</Btn>
          </Card>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Eligible Purposes</div>
            {["Education & tuition fees", "Medical emergencies", "Small business startup", "Housing support", "Agricultural needs", "Community welfare"].map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < 5 ? `1px solid ${C.grey100}` : "none" }}>
                <span style={{ color: C.green }}>✓</span>
                <span style={{ fontSize: 13, color: C.text }}>{p}</span>
              </div>
            ))}
          </Card>
        </>}
        {tab === "myloans" && <>
          {myLoans.map((l, i) => {
            const pct = Math.round((l.repaid / l.amount) * 100);
            return (
              <Card key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{l.purpose}</div>
                  </div>
                  <Badge color={l.status === "Completed" ? C.green : C.amber}>{l.status}</Badge>
                </div>
                <Progress pct={pct} color={l.status === "Completed" ? C.green : C.amber} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: C.textSub }}>₦{l.repaid.toLocaleString()} repaid</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>of ₦{l.amount.toLocaleString()}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: C.green, fontWeight: 600 }}>Interest charged: ₦0.00 (0.0000%)</div>
              </Card>
            );
          })}
          {myLoans.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.textSub }}>No active loans.</div>}
        </>}
        {tab === "community" && <>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14 }}>Community P2P Qard Hasan pool — help a fellow Muslim brother or sister.</div>
          {community.map((c, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name} {c.verified ? "✅" : ""}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{c.purpose}</div>
                </div>
                <Badge color={c.trust === "High" ? C.green : C.amber}>Trust: {c.trust}</Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>₦{c.amount.toLocaleString()}</span>
                <Btn variant="primary" size="sm" onClick={() => setToast({ msg: "Contribution recorded. JazakAllahu Khayran!", type: "success" })}>Contribute</Btn>
              </div>
            </Card>
          ))}
        </>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Apply for Qard Hasan">
        <Select label="Loan purpose" value={form.purpose} onChange={v => set("purpose", v)} options={[
          { value: "education", label: "Education / Tuition" },
          { value: "medical",   label: "Medical Emergency" },
          { value: "business",  label: "Small Business" },
          { value: "housing",   label: "Housing Support" },
          { value: "agriculture",label: "Agriculture" },
          { value: "other",     label: "Other" },
        ]} />
        <Inp label="Loan amount (₦)" type="number" value={form.amount} onChange={v => set("amount", v)} placeholder="e.g. 50000" />
        <Select label="Repayment period" value={form.months} onChange={v => set("months", v)} options={[
          { value: "3", label: "3 months" }, { value: "6", label: "6 months" },
          { value: "12", label: "12 months" }, { value: "24", label: "24 months" },
        ]} />
        <Inp label="Brief description" value={form.detail} onChange={v => set("detail", v)} placeholder="Why do you need this loan?" />
        <div style={{ background: C.greenPale, borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 12, color: C.grey700 }}>
          ⚠️ Qard Hasan carries <strong>0% interest</strong>. You repay only what you borrow. Applications are reviewed within 2–5 business days.
        </div>
        <Btn full variant="primary" onClick={() => { setModal(false); setToast({ msg: "Application submitted. You'll be notified within 48 hours.", type: "success" }); }}>Submit Application</Btn>
      </Modal>
    </div>
  );
};

// ── Scholarship & Grant Tracker ───────────────────────────────────
const Scholarship = ({ nav }) => {
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", organization: "", amount: "", deadline: "", status: "not_applied", progress: "0", notes: "", link: "" });

  const resetForm = () => setForm({ name: "", organization: "", amount: "", deadline: "", status: "not_applied", progress: "0", notes: "", link: "" });
  const loadScholarships = () => {
    setLoading(true);
    scholarshipApi.getAll()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScholarships();
  }, []);

  const statusColor = { applied: C.blue, in_review: C.amber, not_applied: C.grey500, awarded: C.green, rejected: C.red };
  const statusLabel = (value = "") => ({ applied: "Applied", in_review: "In Review", not_applied: "Not Applied", awarded: "Awarded", rejected: "Rejected" }[value] || value);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setToast({ msg: "Please enter a scholarship name.", type: "error" });
      return;
    }
    try {
      const payload = {
        name: form.name,
        organization: form.organization,
        amount: form.amount,
        deadline: form.deadline || null,
        status: form.status,
        progress: Number(form.progress || 0),
        notes: form.notes,
        link: form.link,
      };
      const created = await scholarshipApi.create(payload);
      setRows((prev) => [created, ...prev]);
      setModal(false);
      resetForm();
      setToast({ msg: "Scholarship added to tracker.", type: "success" });
    } catch (e) {
      setToast({ msg: e?.detail || "Unable to save scholarship.", type: "error" });
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Scholarship & Grants" sub="Track your applications & deadlines" onBack={() => nav("home")}>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {[{ l: String(rows.length), sub: "Tracked" }, { l: String(rows.filter((s) => s.status === "applied").length), sub: "Applied" }, { l: "Live", sub: "Backend sync" }].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 14px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.white }}>{s.l}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </PageHeader>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>My Scholarships</div>
          <Btn variant="primary" size="sm" icon="+" onClick={() => setModal(true)}>Add New</Btn>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>Loading scholarships…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>No scholarship entries yet.</div>
        ) : rows.map((s, i) => (
          <Card key={s.id || i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{s.organization ? "🎓" : "📄"}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{s.organization || "No organization added"}</div>
                </div>
              </div>
              <Badge color={statusColor[s.status] || C.grey500}>{statusLabel(s.status)}</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>📅 {s.deadline ? new Date(s.deadline).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" }) : "No deadline"}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>{s.amount || "Amount not set"}</div>
            {Number(s.progress || 0) > 0 && <>
              <Progress pct={Number(s.progress || 0)} color={Number(s.progress || 0) >= 80 ? C.green : C.amber} />
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>Application {s.progress}% complete</div>
            </>}
            {s.status === "not_applied" && (
              <Btn variant="outline" size="sm" style={{ marginTop: 8 }} onClick={() => setToast({ msg: "Scholarship is ready for application.", type: "success" })}>Start Application</Btn>
            )}
          </Card>
        ))}
        <Card style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📋 Required Documents Checklist</div>
          {["Admission letter / Student ID", "Academic transcripts", "WAEC / NECO results", "Birth certificate", "Guarantor letter", "Bank statement (last 3 months)", "Letter of recommendation"].map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 6 ? `1px solid ${C.grey100}` : "none" }}>
              <input type="checkbox" style={{ accentColor: C.green }} />
              <span style={{ fontSize: 13, color: C.text }}>{d}</span>
            </div>
          ))}
        </Card>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add Scholarship / Grant">
        <Inp label="Scholarship name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. CBN Education Fund" />
        <Inp label="Organization" value={form.organization} onChange={(v) => setForm((f) => ({ ...f, organization: v }))} placeholder="e.g. MTN Foundation" />
        <Inp label="Amount offered" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} placeholder="e.g. ₦200,000" />
        <Inp label="Application deadline" type="date" value={form.deadline} onChange={(v) => setForm((f) => ({ ...f, deadline: v }))} placeholder="" />
        <Inp label="Progress (%)" type="number" value={form.progress} onChange={(v) => setForm((f) => ({ ...f, progress: v }))} placeholder="0" />
        <Inp label="Notes" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Optional note" />
        <Select label="Current status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={[
          { value: "not_applied", label: "Not Applied Yet" },
          { value: "applied", label: "Applied" },
          { value: "in_review", label: "Under Review" },
          { value: "awarded", label: "Awarded" },
        ]} />
        <Btn full variant="primary" onClick={handleCreate}>Add to Tracker</Btn>
      </Modal>
    </div>
  );
};

// ── Student Finance Module ────────────────────────────────────────
const StudentFinance = ({ nav }) => {
  const [summary, setSummary] = useState(null);
  const [expenseRows, setExpenseRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    Promise.all([
      studentFinance.getSummary(month, year),
      studentFinance.getExpenses(month, year),
    ])
      .then(([summaryData, expenseData]) => {
        setSummary(summaryData || null);
        setExpenseRows(Array.isArray(expenseData) ? expenseData : []);
      })
      .catch(() => {
        setSummary(null);
        setExpenseRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryLabel = (category = "") => ({
    tuition: "Tuition Fees",
    hostel: "Hostel / Accommodation",
    food: "Food & Feeding",
    textbooks: "Textbooks & Materials",
    internet: "Internet & Data",
    research: "Research & FYP",
    certification: "Certification Exams",
    transport: "Transport",
    laptop: "Laptop / Tech",
    other: "Other",
  }[category] || "Other");
  const iconFor = (category = "") => ({ tuition: "🎓", hostel: "🏠", food: "🍱", textbooks: "📚", internet: "📶", research: "🔬", certification: "📜", transport: "🚌", laptop: "💻", other: "🧾" }[category] || "🧾");
  const colorFor = (category = "") => ({ tuition: C.blue, hostel: C.green, food: C.amber, textbooks: C.purple, internet: C.blue, research: C.red, certification: C.amber, transport: C.green, laptop: C.purple, other: C.grey500 }[category] || C.grey500);
  const usedPct = summary?.allowance ? Math.round((Number(summary.total_spent || 0) / Math.max(Number(summary.allowance || 1), 1)) * 100) : 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="Student Finance" sub="Manage your academic expenses" onBack={() => nav("home")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          {[
            { l: loading ? "..." : formatNaira(summary?.total_spent || 0), sub: "Total spent", c: C.white },
            { l: loading ? "..." : formatNaira(summary?.remaining || 0), sub: "Remaining", c: "#86efac" },
            { l: loading ? "..." : `${usedPct}%`, sub: "Budget used", c: "#fde68a" },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.l}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </PageHeader>
      <div style={{ padding: 16 }}>
        <Card style={{ marginBottom: 14, borderLeft: `4px solid ${C.blue}` }}>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 2 }}>Monthly Allowance</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{loading ? "..." : formatNaira(summary?.allowance || 0)}</div>
          <Progress pct={usedPct || 0} color={C.blue} h={6} />
          <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{loading ? "Loading" : `${formatNaira(summary?.remaining || 0)} remaining this month`}</div>
        </Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Academic Expense Tracker</div>
        {loading ? (
          <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>Loading expense tracker…</div>
        ) : expenseRows.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>No expenses logged for this month yet.</div>
        ) : expenseRows.map((e, i) => {
          const pct = Number(e.budget || 0) ? Math.round((Number(e.amount || 0) / Number(e.budget || 1)) * 100) : 0;
          const remaining = Number(e.budget || 0) - Number(e.amount || 0);
          return (
            <Card key={e.id || i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{iconFor(e.category)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{categoryLabel(e.category)}</span>
                </div>
                <span style={{ fontSize: 12, color: Number(e.amount || 0) > Number(e.budget || 0) ? C.red : C.textSub }}>{formatNaira(e.amount || 0)} / {formatNaira(e.budget || 0)}</span>
              </div>
              <Progress pct={pct || 0} color={Number(e.amount || 0) > Number(e.budget || 0) ? C.red : colorFor(e.category)} />
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{pct}% used · {formatNaira(remaining)} remaining</div>
            </Card>
          );
        })}
        <Btn variant="primary" icon="+" full style={{ marginTop: 4 }}>Log New Expense</Btn>
      </div>
    </div>
  );
};

// ── Community & Crowdfunding ──────────────────────────────────────
const Community = ({ nav }) => {
  const [tab, setTab] = useState("campaigns");
  const [toast, setToast] = useState(null);
  const campaigns = [
    { title: "Medical Fund — Mallam Usman",    org: "Community Support",    raised: 180000, goal: 300000,   emoji: "🏥", urgent: true  },
    { title: "Masjid Renovation — Ibadan",     org: "Muslim Community",     raised: 450000, goal: 800000,   emoji: "🕌", urgent: false },
    { title: "Back to School — 30 Students",   org: "Education Fund NG",    raised: 95000,  goal: 150000,   emoji: "🎒", urgent: true  },
    { title: "Clean Water — Kano Village",     org: "Water for All",        raised: 280000, goal: 500000,   emoji: "💧", urgent: false },
    { title: "Disaster Relief — Borno Flood",  org: "Rahma Foundation",     raised: 1200000,goal: 2000000,  emoji: "🆘", urgent: true  },
  ];
  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Community Impact" sub="Crowdfunding · Emergency Fund · Waqf" />
      <div style={{ background: C.white, display: "flex", borderBottom: `1px solid ${C.grey200}` }}>
        {[["campaigns", "Campaigns"], ["waqf", "Waqf"], ["forum", "Forum"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? C.green : "transparent"}`, color: tab === k ? C.green : C.textSub, fontWeight: tab === k ? 700 : 500, fontSize: 13, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {tab === "campaigns" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Stat label="Total Raised"    value="₦2.2M"  color={C.green} />
            <Stat label="Campaigns Active" value="5"      color={C.blue}  />
            <Stat label="Donors"           value="1,847"  color={C.amber} />
            <Stat label="Lives Helped"     value="342+"   color={C.purple}/>
          </div>
          {campaigns.map((c, i) => {
            const pct = Math.round((c.raised / c.goal) * 100);
            return (
              <Card key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, flex: 1 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{c.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{c.org}</div>
                    </div>
                  </div>
                  {c.urgent && <Badge color={C.red}>Urgent</Badge>}
                </div>
                <Progress pct={pct} color={C.green} />
                <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0 10px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>₦{c.raised.toLocaleString()} raised</span>
                  <span style={{ fontSize: 12, color: C.textSub }}>{pct}% of ₦{(c.goal / 1000).toFixed(0)}k</span>
                </div>
                <Btn variant="primary" size="sm" full onClick={() => setToast({ msg: "Donation recorded. Baarakallahu feek!", type: "success" })}>Donate Now</Btn>
              </Card>
            );
          })}
        </>}
        {tab === "waqf" && <>
          <Card style={{ marginBottom: 14, borderLeft: `4px solid ${C.purple}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>What is Waqf?</div>
            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, marginBottom: 10 }}>
              Waqf is a perpetual Islamic endowment. You donate an asset or money once, and the benefits continue forever — even after your death.
            </div>
            <div style={{ fontSize: 12, color: C.grey700, background: C.purplePale, borderRadius: 6, padding: 10 }}>
              "When a person dies, their deeds come to an end except for three: Sadaqah Jariyah (ongoing charity)..." — Hadith (Muslim)
            </div>
          </Card>
          {[
            { name: "Masjid Construction Fund", target: "₦5M",    raised: "₦2.1M", icon: "🕌" },
            { name: "Quran Printing Waqf",       target: "₦1M",    raised: "₦780k", icon: "📖" },
            { name: "Islamic School Endowment",  target: "₦10M",   raised: "₦3.4M", icon: "🎓" },
            { name: "Orphan Welfare Waqf",       target: "₦3M",    raised: "₦1.1M", icon: "🌙" },
          ].map((w, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{w.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: C.textSub }}>Raised {w.raised} of {w.target}</div>
                  </div>
                </div>
                <Btn variant="primary" size="sm" onClick={() => setToast({ msg: "Waqf contribution recorded. JazakAllahu Khayran!", type: "success" })}>Contribute</Btn>
              </div>
            </Card>
          ))}
        </>}
        {tab === "forum" && <>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14 }}>Community discussions on Islamic finance & personal finance.</div>
          {[
            { title: "Tips for saving as a student 🎓",          replies: 24, views: 312, hot: true  },
            { title: "Is crypto halal? Scholarly opinions",       replies: 41, views: 890, hot: true  },
            { title: "How I paid off my Qard Hasan in 6 months", replies: 8,  views: 156, hot: false },
            { title: "Best halal investment options in Nigeria",   replies: 19, views: 440, hot: false },
            { title: "Budgeting tips for Ramadan 🌙",             replies: 33, views: 567, hot: true  },
          ].map((f, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1, lineHeight: 1.4 }}>{f.title}</div>
                {f.hot && <Badge color={C.red}>Hot 🔥</Badge>}
              </div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 6 }}>💬 {f.replies} replies · 👁 {f.views} views</div>
            </Card>
          ))}
          <Btn variant="primary" icon="✍️" full>Start a Discussion</Btn>
        </>}
      </div>
    </div>
  );
};

// ── Financial Literacy Centre ─────────────────────────────────────
const LearningHub = ({ nav }) => {
  const [tab, setTab] = useState("articles");
  const articles = [
    { title: "Understanding Mudarabah: How profit-sharing works", tag: "Islamic Finance", emoji: "📈", time: "5 min" },
    { title: "How to calculate your Zakat correctly",             tag: "Zakat",          emoji: "⭐", time: "7 min" },
    { title: "Why Riba (interest) is forbidden in Islam",         tag: "Education",      emoji: "📖", time: "6 min" },
    { title: "Budgeting 101 for Nigerian students",               tag: "Budgeting",      emoji: "💡", time: "4 min" },
    { title: "How to avoid debt as a young Muslim",               tag: "Debt Management",emoji: "🛡️", time: "8 min" },
    { title: "Halal investing — where to start in 2025",         tag: "Investing",      emoji: "💼", time: "9 min" },
  ];
  const courses = [
    { title: "Islamic Finance Fundamentals",  lessons: 12, progress: 60, c: C.green },
    { title: "Smart Budgeting for Students",  lessons: 8,  progress: 25, c: C.blue  },
    { title: "Halal Wealth Building",         lessons: 15, progress: 0,  c: C.amber },
    { title: "Avoiding Financial Fraud",      lessons: 6,  progress: 100,c: C.purple},
  ];
  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="Financial Literacy" sub="Articles · Courses · FAQs" />
      <div style={{ background: C.white, display: "flex", borderBottom: `1px solid ${C.grey200}` }}>
        {[["articles", "Articles"], ["courses", "Courses"], ["faq", "FAQs"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? C.green : "transparent"}`, color: tab === k ? C.green : C.textSub, fontWeight: tab === k ? 700 : 500, fontSize: 13, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {tab === "articles" && articles.map((a, i) => (
          <Card key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{a.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.4, marginBottom: 6 }}>{a.title}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge color={C.green}>{a.tag}</Badge>
                  <span style={{ fontSize: 11, color: C.textSub }}>{a.time} read</span>
                </div>
              </div>
              <span style={{ color: C.textSub, fontSize: 16 }}>›</span>
            </div>
          </Card>
        ))}
        {tab === "courses" && courses.map((c, i) => (
          <Card key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
              <Badge color={c.c}>{c.lessons} lessons</Badge>
            </div>
            <Progress pct={c.progress} color={c.c} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>{c.progress}% complete</span>
              <button style={{ background: "none", border: "none", color: c.c, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{c.progress === 0 ? "Start →" : c.progress === 100 ? "Review ✓" : "Continue →"}</button>
            </div>
          </Card>
        ))}
        {tab === "faq" && (
          <Card>
            {["Is profit-sharing (Mudarabah) truly halal?", "How do I calculate my Nisab for Zakat?", "Can I use a conventional credit card?", "What is Gharar and why is it forbidden?", "Is cryptocurrency permissible in Islam?", "How is Murabahah different from a normal loan?", "What counts as Sadaqah Jariyah?"].map((q, i, arr) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.grey100}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 13, color: C.text, flex: 1, lineHeight: 1.4 }}>{q}</span>
                <span style={{ color: C.green, fontSize: 14, marginLeft: 8 }}>›</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

// ── Zakat Module ──────────────────────────────────────────────────
const ZakatModule = ({ nav }) => {
  const [wealth, setWealth] = useState("487250");
  const [gold, setGold] = useState("0");
  const [liabilities, setLiabilities] = useState("0");
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const calculate = () => {
    const nisab = 85 * 50000; // 85g gold × ₦50,000/g
    const zakatable = Math.max(0, Number(wealth) + Number(gold) * 50000 - Number(liabilities));
    const due = zakatable >= nisab ? zakatable * 0.025 : 0;
    setResult({ nisab, zakatable, due, eligible: zakatable >= nisab });
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Zakat" sub="Calculate & pay your annual obligation" onBack={() => nav("home")} />
      <div style={{ padding: 16 }}>
        <div style={{ background: C.green, borderRadius: 8, padding: 14, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontStyle: "italic" }}>"Take from their wealth a charity by which you purify them..."</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>At-Tawbah 9:103</div>
        </div>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>⭐ Zakat Calculator</div>
          <Inp label="Cash savings & wallet balance (₦)" type="number" value={wealth} onChange={setWealth} placeholder="0" />
          <Inp label="Gold in grams (optional)" type="number" value={gold} onChange={setGold} placeholder="0" />
          <Inp label="Debts & liabilities (₦)" type="number" value={liabilities} onChange={setLiabilities} placeholder="0" />
          <div style={{ background: C.grey100, borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: C.textSub }}>Current Nisab (85g gold)</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>₦4,250,000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: C.textSub }}>Zakat rate</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>2.5%</span>
            </div>
          </div>
          <Btn full variant="primary" icon="🧮" onClick={calculate}>Calculate Zakat</Btn>
        </Card>

        {result && (
          <Card style={{ marginBottom: 14, borderLeft: `4px solid ${result.eligible ? C.green : C.amber}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Result</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.textSub }}>Zakatable wealth</span>
              <span style={{ fontWeight: 600 }}>₦{result.zakatable.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.textSub }}>Nisab threshold</span>
              <span style={{ fontWeight: 600 }}>₦{result.nisab.toLocaleString()}</span>
            </div>
            <div style={{ height: 1, background: C.grey200, margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: result.eligible ? C.green : C.amber }}>Zakat Due</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: result.eligible ? C.green : C.amber }}>
                {result.eligible ? `₦${result.due.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Not eligible"}
              </span>
            </div>
            {!result.eligible && <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10 }}>Your wealth is below the Nisab threshold. No Zakat is due this year.</div>}
            {result.eligible && <Btn full variant="primary" style={{ marginTop: 10 }} onClick={() => setToast({ msg: `₦${result.due.toFixed(2)} Zakat paid. JazakAllahu Khayran!`, type: "success" })}>Pay Zakat Now</Btn>}
          </Card>
        )}

        {/* Distribution */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>8 Quranic Categories (At-Tawbah 9:60)</div>
          {[["Al-Fuqarā' (The Poor)", 30], ["Al-Masākīn (The Needy)", 25], ["Fī Sabīlillāh", 20], ["Ibn Al-Sabīl (Wayfarer)", 10], ["Al-Ghārimīn (In Debt)", 8], ["Al-Mu'allafah (New Muslims)", 4], ["Al-Riqāb (Freeing Slaves)", 2], ["Al-'Āmilīn (Administrators)", 1]].map(([c, pct], i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: C.text }}>{c}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>{pct}%</span>
              </div>
              <Progress pct={pct} color={C.green} h={6} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};


// ── Onboarding slides ────────────────────────────────────────────
const Onboard = ({ onDone }) => {
  const [s, setS] = useState(0);
  const slides = [
    { e: "💰", t: "Riba-Free Finance",   b: "Every transaction on NoorPay is 100% Shari'ah-compliant. Zero interest, zero compromise on your deen." },
    { e: "📊", t: "Smart Budgeting",     b: "Track every naira, set halal budgets, monitor expenses by category, and stay financially disciplined." },
    { e: "🤝", t: "Community Finance",   b: "Pay Zakat, donate Sadaqah, request Qard Hasan loans, track scholarships — all from one platform." },
    { e: "🕌", t: "Islamic First",       b: "Built around Mudarabah, Musharakah, Murabahah, and Waqf. The only fintech app that never breaks Shari'ah." },
  ];
  const sl = slides[s];
  return (
    <div style={{ minHeight: "100vh", background: C.grey100, display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.green, height: 280, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 80 }}>{sl.e}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <div key={i} style={{ height: 4, width: i === s ? 24 : 8, borderRadius: 99, background: i === s ? C.amber : "rgba(255,255,255,0.3)", transition: "width .3s" }} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: "28px 24px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.green, marginBottom: 10 }}>{sl.t}</h2>
        <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, marginBottom: 28 }}>{sl.b}</p>
        <Btn full variant="primary" onClick={() => s < slides.length - 1 ? setS(s + 1) : onDone()}>
          {s < slides.length - 1 ? "Next →" : "Get Started 🕌"}
        </Btn>
        {s > 0 && <Btn full variant="ghost" style={{ marginTop: 10 }} onClick={() => setS(s - 1)}>← Back</Btn>}
        <button onClick={onDone} style={{ display: "block", width: "100%", marginTop: 14, background: "none", border: "none", color: C.textSub, fontSize: 13, cursor: "pointer" }}>Skip for now</button>
      </div>
    </div>
  );
};


// ── Receive Modal (QR code) ───────────────────────────────────────
const ReceiveModal = ({ open, onClose }) => {
  const [toast, setToast] = useState(null);
  return (
    <Modal open={open} onClose={onClose} title="Receive Money">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div style={{ textAlign: "center" }}>
        {/* QR code SVG */}
        <div style={{ background: C.grey100, borderRadius: 12, padding: 20, display: "inline-block", marginBottom: 14 }}>
          <svg width="150" height="150" viewBox="0 0 100 100">
            <rect width="100" height="100" fill={C.white} />
            {/* Corner squares */}
            {[[5, 5], [65, 5], [5, 65]].map(([x, y], i) => (
              <g key={i}>
                <rect x={x} y={y} width="30" height="30" fill="none" stroke={C.green} strokeWidth="4" rx="2" />
                <rect x={x + 7} y={y + 7} width="16" height="16" fill={C.green} rx="1" />
              </g>
            ))}
            {/* Data dots */}
            {[40,45,50,55,60,65,70].map((x,i) =>
              [40,45,50,55,60,65,70].map((y,j) =>
                (i + j) % 2 === 0 && x < 70 && y < 70 &&
                !(x < 38 && y < 38) && !(x > 57 && y < 38) && !(x < 38 && y > 57)
                  ? <rect key={`${i}${j}`} x={x} y={y} width="4" height="4" fill={C.green} rx="0.5" />
                  : null
              )
            )}
            {/* NoorPay text */}
            <text x="50" y="96" textAnchor="middle" fontSize="7" fontWeight="700" fill={C.green}>NoorPay</text>
          </svg>
        </div>
        <p style={{ fontSize: 12, color: C.textSub, marginBottom: 14 }}>Scan QR code to pay · Or share account details below</p>
        <Card style={{ marginBottom: 14, background: C.greenPale, border: `1px solid ${C.green}30` }}>
          <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>NoorPay Account Number</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.green, letterSpacing: 2 }}>0123456789</span>
            <button onClick={() => setToast({ msg: "Account number copied!", type: "success" })}
              style={{ background: C.green + "18", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: C.green }}>Copy</button>
          </div>
          <div style={{ fontSize: 13, color: C.text, marginTop: 4, fontWeight: 600 }}>Abdurkabir Mardhiyyah · NoorPay</div>
        </Card>
        <Btn full variant="primary" icon="📤">Share Payment Link</Btn>
      </div>
    </Modal>
  );
};


// ── Rewards Screen ───────────────────────────────────────────────
const RewardsScreen = ({ nav }) => {
  const [tab, setTab]   = useState("overview");
  const [toast, setToast] = useState(null);

  const tiers = [
    { name: "Bronze",   pts: 0,     max: 1000,  icon: "🥉", color: "#CD7F32" },
    { name: "Silver",   pts: 1000,  max: 5000,  icon: "🥈", color: C.grey500 },
    { name: "Gold",     pts: 5000,  max: 15000, icon: "🥇", color: C.amber   },
    { name: "Platinum", pts: 15000, max: 50000, icon: "💎", color: C.green   },
  ];
  const current = { pts: 4850, tier: "Silver", next: "Gold", toNext: 150 };
  const curTier = tiers[1];
  const pct = Math.round(((current.pts - curTier.pts) / (curTier.max - curTier.pts)) * 100);

  const history = [
    { desc: "Send money — Ahmad Musa",        pts: "+50",  date: "Today",  icon: "💸" },
    { desc: "Zakat payment bonus",             pts: "+200", date: "Mon",    icon: "⭐" },
    { desc: "Referral — Ibrahim Saleh",        pts: "+500", date: "Fri",    icon: "👥" },
    { desc: "Monthly loyalty bonus",           pts: "+100", date: "1 Jun",  icon: "🎁" },
    { desc: "Data bundle purchase",            pts: "+25",  date: "30 May", icon: "📶" },
    { desc: "Redeemed — ₦500 Airtime",        pts: "-200", date: "28 May", icon: "📱" },
    { desc: "Completed Islamic Finance course",pts: "+100", date: "27 May", icon: "🎓" },
    { desc: "Scholarship goal met",            pts: "+150", date: "25 May", icon: "🏆" },
  ];

  const redeemItems = [
    { title: "₦500 Airtime",        pts: 500,  icon: "📱", cat: "Airtime"  },
    { title: "₦1,000 Cashback",     pts: 1000, icon: "💵", cat: "Cashback" },
    { title: "Free Bank Transfer",   pts: 200,  icon: "🏦", cat: "Transfer" },
    { title: "Zakat Donation",       pts: 800,  icon: "⭐", cat: "Charity"  },
    { title: "₦2,000 Data Bundle",  pts: 1500, icon: "📶", cat: "Data"     },
    { title: "Priority Support",     pts: 300,  icon: "🎯", cat: "Service"  },
    { title: "₦200 Sadaqah Donate", pts: 200,  icon: "🌙", cat: "Charity"  },
    { title: "Scholarship Boost",    pts: 400,  icon: "🎓", cat: "Education"},
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <div style={{ background: C.green, padding: "48px 16px 24px" }}>
        <button onClick={() => nav("home")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "5px 10px", color: C.white, fontSize: 13, cursor: "pointer", marginBottom: 14 }}>← Back</button>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>YOUR REWARDS</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.white, marginBottom: 4 }}>
          {current.pts.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 500 }}>points</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>{curTier.icon}</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{current.tier} Member</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>· {current.toNext} pts to {current.next}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 99, height: 6 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: C.amber, borderRadius: 99, transition: "width 1s ease" }} />
        </div>
      </div>

      {/* Tier cards */}
      <div style={{ display: "flex", gap: 8, padding: "14px 14px 0", overflowX: "auto" }}>
        {tiers.map((t, i) => (
          <div key={i} style={{ flex: "0 0 auto", background: current.tier === t.name ? t.color + "15" : C.white, border: `2px solid ${current.tier === t.name ? t.color : C.grey200}`, borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 78 }}>
            <div style={{ fontSize: 22 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: current.tier === t.name ? t.color : C.textSub, marginTop: 3 }}>{t.name}</div>
            <div style={{ fontSize: 9, color: C.textSub }}>{t.pts.toLocaleString()}+ pts</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: C.white, display: "flex", borderBottom: `1px solid ${C.grey200}`, marginTop: 14 }}>
        {[["overview", "Overview"], ["redeem", "Redeem"], ["history", "History"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === k ? C.green : "transparent"}`, color: tab === k ? C.green : C.textSub, fontWeight: tab === k ? 700 : 500, fontSize: 13, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: 14 }}>
        {tab === "overview" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { l: "Points Earned",    v: "5,050", color: C.amber },
              { l: "Redeemed",         v: "200",   color: C.green },
              { l: "Referrals",        v: "3",     color: C.blue  },
              { l: "Day Streak 🔥",   v: "12",    color: C.red   },
            ].map((s, i) => <Stat key={i} label={s.l} value={s.v} color={s.color} />)}
          </div>

          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>How to earn points</div>
            {[
              { ic: "💸", l: "Send money",             v: "10 pts / ₦1,000"  },
              { ic: "⭐", l: "Pay Zakat",              v: "200 pts bonus"     },
              { ic: "👥", l: "Refer a friend",         v: "500 pts/referral"  },
              { ic: "🎓", l: "Complete a course",      v: "100 pts/course"    },
              { ic: "🏆", l: "Meet savings goal",      v: "150 pts/goal"      },
              { ic: "🎓", l: "Track scholarship",      v: "50 pts added"      },
            ].map((e, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.grey100}` : "none" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{e.ic}</span>
                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{e.l}</span>
                <Badge color={C.amber}>{e.v}</Badge>
              </div>
            ))}
          </Card>

          <Card style={{ background: C.greenPale, border: `1px solid ${C.green}30` }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>👥 Refer & Earn</div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12 }}>Share your referral code and earn 500 points for every friend who joins NoorPay.</div>
            <div style={{ background: C.white, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: C.green, letterSpacing: 3 }}>AMAPA-7823</span>
              <button onClick={() => setToast({ msg: "Referral code copied!", type: "success" })} style={{ background: C.green + "18", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: C.green }}>Copy</button>
            </div>
            <Btn full variant="primary" icon="📤">Share Referral Code</Btn>
          </Card>
        </>}

        {tab === "redeem" && <>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14 }}>You have <strong style={{ color: C.green }}>4,850 points</strong> available to redeem.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {redeemItems.map((r, i) => (
              <Card key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>{r.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r.title}</div>
                <Badge color={C.amber} style={{ marginBottom: 10 }}>{r.pts} pts</Badge>
                <Btn full variant={current.pts >= r.pts ? "primary" : "ghost"} size="sm"
                  onClick={() => {
                    if (current.pts >= r.pts) setToast({ msg: `${r.title} redeemed! 🎉`, type: "success" });
                    else setToast({ msg: "Not enough points yet.", type: "error" });
                  }}>
                  {current.pts >= r.pts ? "Redeem" : "Need more"}
                </Btn>
              </Card>
            ))}
          </div>
        </>}

        {tab === "history" && (
          <Card style={{ overflow: "hidden", padding: 0 }}>
            {history.map((h, i) => (
              <ListItem key={i} icon={h.icon} title={h.desc} sub={h.date}
                right={h.pts} rightColor={h.pts.startsWith("+") ? C.green : C.red} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};


// ── AI Advisor Screen ────────────────────────────────────────────
const AIAdvisor = ({ nav }) => {
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    text: "Assalamu alaykum! 🌙\n\nI'm your NoorPay AI Financial Advisor — powered by Claude, constrained by Shari\'ah.\n\nI specialise in Islamic finance, Zakat calculations, halal investing, and Nigerian personal finance.\n\nHow can I help you today?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const SYSTEM = "You are NoorPay\'s Shari\'ah-compliant AI Financial Advisor for Nigerian Muslim users. " +
    "Specialise in: Islamic finance (Mudarabah, Musharakah, Murabahah, Zakat, Sadaqah, Qard Hasan, Waqf), " +
    "Nigerian personal finance, budgeting, saving, scholarships, student finance, and halal investing. " +
    "STRICT RULES: 1) All advice must be Riba-free 2) Open with Islamic greetings warmly " +
    "3) Keep responses concise — max 4 sentences or 4 bullet points " +
    "4) Currency is Nigerian Naira (₦) unless specified " +
    "5) Never recommend interest-bearing products under any circumstances " +
    "6) Cite relevant Quranic verse or hadith where appropriate " +
    "7) For Zakat: Nisab is 85g gold = ₦4,250,000; rate is always 2.5%";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env?.VITE_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 450,
          system: SYSTEM,
          messages: [...msgs.map(m => ({ role: m.role, content: m.text })), { role: "user", content: msg }],
        }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: "assistant", text: data.content?.[0]?.text || "I couldn\'t process that. Please try again." }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", text: "Connection error. Please check your internet and try again, in sha Allah." }]);
    }
    setLoading(false);
  };

  const prompts = [
    "How do I calculate my Zakat?",
    "What is Mudarabah?",
    "Help me build a halal budget",
    "Explain Qard Hasan loans",
    "Is cryptocurrency halal?",
    "Best halal savings strategy?",
    "How do I track my scholarship?",
    "How to plan student expenses?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.grey100 }}>
      {/* Header */}
      <div style={{ background: C.green, padding: "48px 16px 16px", flexShrink: 0 }}>
        <button onClick={() => nav("home")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "5px 10px", color: C.white, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← Back</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>AI Financial Advisor</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Powered by Claude · Shari\'ah-Compliant</div>
          </div>
          <div style={{ fontSize: 28 }}>🤖</div>
        </div>
      </div>

      {/* Suggested prompts */}
      {msgs.length === 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 14px", background: C.white, borderBottom: `1px solid ${C.grey200}`, flexShrink: 0 }}>
          {prompts.map((p, i) => (
            <button key={i} onClick={() => setInput(p)} style={{ padding: "6px 12px", borderRadius: 99, border: `1px solid ${C.green}40`, background: C.greenPale, color: C.green, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer" }}>{p}</button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 16px" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {m.role === "assistant" && (
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, alignSelf: "flex-end", fontSize: 15 }}>🕌</div>
            )}
            <div style={{
              maxWidth: "78%", padding: "11px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? C.green : C.white,
              color: m.role === "user" ? C.white : C.text,
              fontSize: 13, lineHeight: 1.65,
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              whiteSpace: "pre-wrap",
              border: m.role === "assistant" ? `1px solid ${C.grey200}` : "none",
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🕌</div>
            <div style={{ background: C.white, borderRadius: "16px 16px 16px 4px", padding: "14px 16px", border: `1px solid ${C.grey200}` }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.grey300, animation: `pulse 1.2s ease ${i * 0.25}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ background: C.white, borderTop: `1px solid ${C.grey200}`, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-end", flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about Zakat, halal investing, scholarships..."
          rows={1}
          style={{ flex: 1, border: `1.5px solid ${C.grey300}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", color: C.text, maxHeight: 90 }}
        />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ width: 40, height: 40, borderRadius: 10, background: input.trim() ? C.green : C.grey200, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", fontSize: 18 }}>
          ➤
        </button>
      </div>
    </div>
  );
};


// ── Security Settings ────────────────────────────────────────────
const SecurityScreen = ({ nav }) => {
  const [toast, setToast] = useState(null);
  const [bio, setBio]     = useState(true);
  const [pinAuth, setPinAuth] = useState(true);
  const [alerts, setAlerts]   = useState(true);
  const [locAlert, setLocAlert] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [pinModal, setPinModal] = useState(false);
  const [oldPin, setOldPin]     = useState("");
  const [newPin, setNewPin]     = useState("");
  const [newPin2, setNewPin2]   = useState("");

  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    auth.getSessions().then((data) => setSessions(Array.isArray(data) ? data : [])).catch(() => setSessions([]));
  }, []);

  const Toggle = ({ on, onToggle, label, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: `1px solid ${C.grey100}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSub }}>{sub}</div>}
      </div>
      <button onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 99, background: on ? C.green : C.grey300, border: "none", cursor: "pointer", position: "relative", transition: "background .2s" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.white, position: "absolute", top: 2, left: on ? 22 : 2, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Security Settings" sub="Keep your account safe" onBack={() => nav("me")} />
      <div style={{ padding: 14 }}>
        {/* Score */}
        <Card style={{ marginBottom: 14, borderLeft: `4px solid ${C.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Account Protection Score</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>88%</span>
          </div>
          <Progress pct={88} color={C.green} h={10} />
          <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>Very secure — biometric + PIN enabled</div>
        </Card>

        {/* Auth toggles */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Authentication</div>
        <Card style={{ padding: "0 14px", marginBottom: 14 }}>
          <Toggle on={bio} onToggle={() => setBio(!bio)} label="Biometric Login" sub="Fingerprint or Face ID" />
          <Toggle on={pinAuth} onToggle={() => setPinAuth(!pinAuth)} label="Transaction PIN" sub="4-digit PIN for all payments" />
          <Toggle on={autoLock} onToggle={() => setAutoLock(!autoLock)} label="Auto-Lock" sub="Lock after 5 min inactivity" />
          <div style={{ padding: "12px 0" }}>
            <Btn variant="outline" size="sm" onClick={() => setPinModal(true)}>Change Transaction PIN</Btn>
          </div>
        </Card>

        {/* Alert toggles */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Security Alerts</div>
        <Card style={{ padding: "0 14px", marginBottom: 14 }}>
          <Toggle on={alerts} onToggle={() => setAlerts(!alerts)} label="Transaction Alerts" sub="Notify on every debit/credit" />
          <Toggle on={locAlert} onToggle={() => setLocAlert(!locAlert)} label="New Location Alert" sub="Alert when login from new device" />
          <div style={{ padding: "12px 0" }}>
            <Btn variant="ghost" size="sm" onClick={() => setToast({ msg: "Test alert sent!", type: "success" })}>Send Test Alert</Btn>
          </div>
        </Card>

        {/* Sessions */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Active Sessions</div>
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {sessions.length === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: C.textSub }}>Loading sessions…</div>
          ) : sessions.map((s, i) => (
            <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < sessions.length - 1 ? `1px solid ${C.grey100}` : "none" }}>
              <span style={{ fontSize: 20 }}>{s.device?.includes("Windows") ? "💻" : "📱"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.device || "Unknown device"}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>{s.location || "Unknown"} · {s.last_seen ? new Date(s.last_seen).toLocaleString("en-NG") : "Now"}</div>
              </div>
              <Badge color={C.green}>Active</Badge>
            </div>
          ))}
        </Card>

        {/* Danger zone */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Danger Zone</div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {[
            { l: "Freeze Account",             sub: "Block all transactions temporarily", icon: "🔒" },
            { l: "Report Suspicious Activity", sub: "Alert our security team",            icon: "⚠️" },
            { l: "Delete Account",             sub: "Permanently remove your account",    icon: "🗑️" },
          ].map((item, i, arr) => (
            <button key={i} onClick={() => setToast({ msg: `${item.l} — please contact support@noorpay.ng`, type: "warn" })}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "none", border: "none", borderBottom: i < arr.length - 1 ? `1px solid ${C.grey100}` : "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>{item.l}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>{item.sub}</div>
              </div>
              <span style={{ color: C.textSub }}>›</span>
            </button>
          ))}
        </Card>
      </div>

      <Modal open={pinModal} onClose={() => setPinModal(false)} title="Change Transaction PIN">
        <Inp label="Current PIN" type="password" value={oldPin} onChange={setOldPin} placeholder="••••" note="Enter your existing 4-digit PIN" />
        <Inp label="New PIN" type="password" value={newPin} onChange={v => setNewPin(v.slice(0, 4))} placeholder="••••" />
        <Inp label="Confirm New PIN" type="password" value={newPin2} onChange={v => setNewPin2(v.slice(0, 4))} placeholder="••••" />
        <Btn full variant="primary" disabled={!oldPin || newPin.length < 4 || newPin !== newPin2}
          onClick={async () => {
            try {
              await auth.changePin({ current_pin: oldPin, new_pin: newPin, confirm_pin: newPin2 });
              setPinModal(false); setOldPin(""); setNewPin(""); setNewPin2("");
              setToast({ msg: "PIN changed successfully!", type: "success" });
            } catch (e) {
              setToast({ msg: e.detail || e.current_pin || e.confirm_pin || "Unable to change PIN", type: "error" });
            }
          }}>Change PIN</Btn>
        {newPin && newPin2 && newPin !== newPin2 && <p style={{ fontSize: 12, color: C.red, marginTop: 8 }}>PINs do not match</p>}
      </Modal>
    </div>
  );
};


// ── App Settings ─────────────────────────────────────────────────
const AppSettings = ({ nav }) => {
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode]       = useState(false);
  const [notifs, setNotifs]           = useState(true);
  const [budgetAlert, setBudgetAlert] = useState(true);
  const [zakatRemind, setZakatRemind] = useState(true);
  const [scholarAlert, setScholarAlert] = useState(true);
  const [lang, setLang]               = useState("English");
  const [currency, setCurrency]       = useState("NGN (₦)");

  const Toggle = ({ on, onToggle, label, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.grey100}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSub }}>{sub}</div>}
      </div>
      <button onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 99, background: on ? C.green : C.grey300, border: "none", cursor: "pointer", position: "relative" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.white, position: "absolute", top: 2, left: on ? 22 : 2, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="App Settings" sub="Customise your NoorPay experience" onBack={() => nav("me")} />
      <div style={{ padding: 14 }}>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Appearance</div>
        <Card style={{ padding: "0 14px", marginBottom: 14 }}>
          <Toggle on={darkMode} onToggle={() => { setDarkMode(!darkMode); setToast({ msg: "Dark mode coming soon!", type: "info" }); }} label="Dark Mode" sub="Switch to a dark theme" />
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Language</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["English", "Hausa", "Yoruba", "Arabic"].map(l => (
                <button key={l} onClick={() => { setLang(l); setToast({ msg: `Language set to ${l}`, type: "success" }); }}
                  style={{ padding: "6px 14px", borderRadius: 99, background: lang === l ? C.green : C.grey100, border: `1.5px solid ${lang === l ? C.green : C.grey200}`, color: lang === l ? C.white : C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Notifications</div>
        <Card style={{ padding: "0 14px", marginBottom: 14 }}>
          <Toggle on={notifs} onToggle={() => setNotifs(!notifs)} label="Push Notifications" sub="Allow NoorPay to send notifications" />
          <Toggle on={budgetAlert} onToggle={() => setBudgetAlert(!budgetAlert)} label="Budget Alerts" sub="Notify when spending exceeds budget" />
          <Toggle on={zakatRemind} onToggle={() => setZakatRemind(!zakatRemind)} label="Zakat Reminders" sub="Annual reminder to pay Zakat" />
          <Toggle on={scholarAlert} onToggle={() => setScholarAlert(!scholarAlert)} label="Scholarship Deadlines" sub="Alert 7 days before deadline" />
        </Card>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Currency</div>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["NGN (₦)", "USD ($)", "GBP (£)", "EUR (€)"].map(cur => (
              <button key={cur} onClick={() => { setCurrency(cur); setToast({ msg: `Currency set to ${cur}`, type: "success" }); }}
                style={{ padding: "7px 14px", borderRadius: 99, background: currency === cur ? C.green : C.grey100, border: `1.5px solid ${currency === cur ? C.green : C.grey200}`, color: currency === cur ? C.white : C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{cur}</button>
            ))}
          </div>
        </Card>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>About</div>
        <Card style={{ marginBottom: 14 }}>
          {[
            ["App Version",          "v1.0.0 (Build 401)"],
            ["Last Updated",         "July 2026"],
            ["Shari'ah Compliance",  "AAOIFI Standards"],
            ["FYP Session",          "2025/2026"],
            ["Developer",            "Abdurkabir Mardhiyyah"],
            ["Support",              "help@noorpay.ng"],
          ].map(([k, v], i, arr) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.grey100}` : "none" }}>
              <span style={{ fontSize: 13, color: C.textSub }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v}</span>
            </div>
          ))}
        </Card>

        <div style={{ background: C.greenPale, border: `1px solid ${C.green}30`, borderRadius: 8, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 4 }}>🕌 NoorPay </div>
          <div style={{ fontSize: 11, color: C.textSub }}>Final Year Project · Abdurkabir Mardhiyyah<br />Department of Mathematical and Computer Sciences · 2025/2026</div>
        </div>
      </div>
    </div>
  );
};


// ── Beneficiaries Screen ─────────────────────────────────────────
const BeneficiariesScreen = ({ nav }) => {
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [bens, setBens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", bank: "NoorPay", account: "" });
  useEffect(() => {
    let active = true;
    wallet.getBeneficiaries().then((data) => {
      if (active) setBens(Array.isArray(data) ? data : []);
    }).catch(() => { if (active) setBens([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const shown = bens.filter((b) => (b.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Beneficiaries" sub="Saved payment recipients" onBack={() => nav("home")} />
      <div style={{ padding: 14 }}>
        {/* Search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search beneficiaries..."
            style={{ flex: 1, padding: "9px 12px", border: `1px solid ${C.grey300}`, borderRadius: 8, fontSize: 14, color: C.text }} />
          <Btn variant="primary" icon="+" onClick={() => setModal(true)} size="sm">Add</Btn>
        </div>

        {/* Favourites */}
        {shown.filter((b) => b.is_favourite).length > 0 && <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Favourites ⭐</div>
          <Card style={{ overflow: "hidden", padding: 0, marginBottom: 14 }}>
            {shown.filter((b) => b.is_favourite).map((b, i, arr) => (
              <div key={b.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < arr.length - 1 ? `1px solid ${C.grey100}` : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{b.bank_name || "NoorPay"} · {b.account_number}</div>
                </div>
                <Btn variant="primary" size="sm" onClick={() => nav("send")}>Send</Btn>
              </div>
            ))}
          </Card>
        </>}

        {/* All */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>All Beneficiaries</div>
        <Card style={{ overflow: "hidden", padding: 0 }}>
          {loading ? (
            <div style={{ padding: 14, fontSize: 12, color: C.textSub }}>Loading beneficiaries…</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: C.textSub }}>No beneficiaries yet.</div>
          ) : shown.map((b, i, arr) => (
            <div key={b.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < arr.length - 1 ? `1px solid ${C.grey100}` : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.grey100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{b.name}</div>
                <div style={{ fontSize: 11, color: C.textSub }}>{b.bank_name || "NoorPay"} · {b.account_number}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={async () => {
                  try {
                    await wallet.toggleFavourite(b.id);
                    setBens(prev => prev.map((x) => x.id === b.id ? { ...x, is_favourite: !x.is_favourite } : x));
                    setToast({ msg: b.is_favourite ? "Removed from favourites" : "Added to favourites ⭐", type: "success" });
                  } catch {
                    setToast({ msg: "Unable to update favourite", type: "error" });
                  }
                }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>{b.is_favourite ? "⭐" : "☆"}</button>
                <Btn variant="primary" size="sm" onClick={() => nav("send")}>Send</Btn>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Beneficiary">
        <Inp label="Full name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ahmad Musa" />
        <Select label="Bank" value={form.bank} onChange={v => setForm(f => ({ ...f, bank: v }))} options={[
          { value: "NoorPay", label: "NoorPay" }, { value: "GTBank", label: "GTBank" },
          { value: "Access", label: "Access Bank" }, { value: "Zenith", label: "Zenith Bank" },
          { value: "First Bank", label: "First Bank" }, { value: "UBA", label: "UBA" },
        ]} />
        <Inp label="Account number" value={form.account} onChange={v => setForm(f => ({ ...f, account: v.slice(0, 10) }))} placeholder="10-digit account number" note="Must be exactly 10 digits" />
        <Btn full variant="primary" disabled={!form.name || form.account.length < 10}
          onClick={async () => {
            try {
              const created = await wallet.addBeneficiary({ name: form.name, account_number: form.account, bank_name: form.bank, bank_code: form.bank === "NoorPay" ? "000" : "001" });
              setBens(prev => [...prev, created]);
              setModal(false);
              setForm({ name: "", bank: "NoorPay", account: "" });
              setToast({ msg: `${form.name} added!`, type: "success" });
            } catch (e) {
              setToast({ msg: e.detail || "Unable to add beneficiary", type: "error" });
            }
          }}>
          Save Beneficiary
        </Btn>
      </Modal>
    </div>
  );
};

// ── Send Money ────────────────────────────────────────────────────
const SendMoney = ({ nav }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ recipient: "", amount: "", note: "", pin: ["", "", "", ""] });
  const [toast, setToast] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [reference, setReference] = useState("");
  const pinRefs = useRef([]);
  useEffect(() => {
    wallet.getBeneficiaries().then((data) => setBeneficiaries(Array.isArray(data) ? data : [])).catch(() => setBeneficiaries([]));
  }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handlePin = (i, v) => {
    const a = [...form.pin]; a[i] = v.slice(-1); set("pin", a);
    if (v && i < 3) pinRefs.current[i + 1]?.focus();
  };
  const submitTransfer = async () => {
    try {
      const data = await txApi.sendInternal({ recipient_account: form.recipient, amount: form.amount, pin: form.pin.join(""), note: form.note });
      setReference(data.reference || "");
      setStep(3);
      setToast({ msg: "Transfer successful!", type: "success" });
    } catch (e) {
      setToast({ msg: e.detail || "Transfer failed", type: "error" });
    }
  };
  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Send Money" sub={`Step ${step} of 3`} onBack={() => step > 1 ? setStep(step - 1) : nav("home")} />
      <div style={{ padding: 16 }}>
        {step === 1 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Who are you sending to?</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.grey700, marginBottom: 8 }}>Recent beneficiaries</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {beneficiaries.slice(0, 3).map((b, i) => (
                  <button key={b.id || i} onClick={() => set("recipient", b.account_number)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: form.recipient === b.account_number ? C.greenPale : C.grey100, border: `1.5px solid ${form.recipient === b.account_number ? C.green : C.grey200}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", flexShrink: 0 }}>
                    <span style={{ fontSize: 22 }}>👤</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Inp label="Recipient account number" value={form.recipient} onChange={v => set("recipient", v)} placeholder="10-digit account number" note="Enter the NoorPay account number of the recipient" />
            <Inp label="Amount (₦)" type="number" value={form.amount} onChange={v => set("amount", v)} placeholder="0.00" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {["5000", "10000", "25000", "50000"].map(a => (
                <button key={a} onClick={() => set("amount", a)} style={{ padding: "6px 12px", background: form.amount === a ? C.greenPale : C.grey100, border: `1px solid ${form.amount === a ? C.green : C.grey200}`, borderRadius: 99, fontSize: 12, cursor: "pointer" }}>₦{Number(a).toLocaleString()}</button>
              ))}
            </div>
            <Inp label="Note (optional)" value={form.note} onChange={v => set("note", v)} placeholder="What is this for?" />
            <Btn full variant="primary" disabled={!form.recipient || !form.amount} onClick={() => setStep(2)}>Continue →</Btn>
          </Card>
        )}
        {step === 2 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Confirm Transfer</div>
            <div style={{ background: C.grey100, borderRadius: 8, padding: 14, marginBottom: 16 }}>
              {[["To", form.recipient], ["Amount", `₦${Number(form.amount).toLocaleString()}`], ["Fee", "₦0 (Free — Shari'ah compliant)"], ["Note", form.note || "—"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 3 ? 8 : 0 }}>
                  <span style={{ fontSize: 13, color: C.textSub }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? C.green : C.text }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.textSub, marginBottom: 12 }}>Enter your 4-digit transaction PIN</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {form.pin.map((v, i) => (
                  <input key={i} ref={el => pinRefs.current[i] = el} type="password" value={v} onChange={e => handlePin(i, e.target.value)}
                    style={{ width: 52, height: 52, textAlign: "center", fontSize: 22, fontWeight: 800, border: `2px solid ${v ? C.green : C.grey300}`, borderRadius: 8, color: C.green }} />
                ))}
              </div>
            </div>
            <Btn full variant="primary" disabled={form.pin.join("").length < 4} onClick={submitTransfer}>Authorise Transfer</Btn>
          </Card>
        )}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>Transfer Successful!</div>
            <div style={{ fontSize: 14, color: C.textSub, marginBottom: 4 }}>₦{Number(form.amount).toLocaleString()} sent to</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.green, marginBottom: 4 }}>{form.recipient}</div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 24 }}>Reference: {reference || "AMP0000000000"}</div>
            <Btn full variant="primary" onClick={() => nav("home")}>Back to Home</Btn>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Notifications ─────────────────────────────────────────────────
const Notifications = ({ nav }) => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [rows, countData] = await Promise.all([notifApi.getAll(), notifApi.getUnreadCount()]);
      setItems(Array.isArray(rows) ? rows : []);
      setUnreadCount(Number(countData?.unread_count || 0));
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notifApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setToast({ msg: "All notifications marked as read.", type: "success" });
    } catch {
      setToast({ msg: "Unable to update notifications.", type: "error" });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notifApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      setToast({ msg: "Could not mark notification as read.", type: "error" });
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Notifications" sub={loading ? "Loading…" : `${unreadCount} unread`} onBack={() => nav("home")} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={handleMarkAllRead} style={{ background: "none", border: "none", color: C.green, fontSize: 13, cursor: "pointer" }}>Mark all read</button>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>Loading notifications…</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textSub, padding: 8 }}>You do not have notifications yet.</div>
        ) : items.map((n, i) => (
          <Card key={n.id || i} style={{ marginBottom: 8, background: n.is_read ? C.white : C.greenPale, borderLeft: `3px solid ${n.is_read ? C.grey200 : C.green}` }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{n.type === "budget" ? "📊" : n.type === "zakat" ? "⭐" : n.type === "scholarship" ? "🎓" : n.type === "reward" ? "🎁" : "🔔"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: C.text }}>{n.title}</span>
                  {!n.is_read && <button onClick={() => handleMarkRead(n.id)} style={{ background: "none", border: "none", color: C.green, fontSize: 11, cursor: "pointer" }}>Mark read</button>}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ fontSize: 10, color: C.textSub, marginTop: 4 }}>{new Date(n.created_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ── Reports & Analytics ───────────────────────────────────────────
const Reports = ({ nav }) => {
  const [period, setPeriod] = useState("monthly");
  const monthly = [{ l: "Jan", v: 42000 }, { l: "Feb", v: 58000 }, { l: "Mar", v: 35000 }, { l: "Apr", v: 71000 }, { l: "May", v: 48000 }, { l: "Jun", v: 63000, highlight: true }];
  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="Reports & Analytics" sub="Financial overview & insights" onBack={() => nav("home")} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["monthly", "quarterly", "annual"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "8px 0", background: period === p ? C.green : C.white, color: period === p ? C.white : C.textSub, border: `1px solid ${period === p ? C.green : C.grey200}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{p}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <Stat label="Total Income"   value="₦350,000" color={C.green} sub="+12% vs last month" />
          <Stat label="Total Expenses" value="₦113,000" color={C.red}   sub="-5% vs last month"  />
          <Stat label="Net Savings"    value="₦237,000" color={C.blue}  sub="67.7% savings rate"  />
          <Stat label="Zakat Paid"     value="₦8,000"   color={C.amber} sub="This month"           />
        </div>
        <Card style={{ marginBottom: 14 }}>
          <SectionHeader title="Monthly Spending Trend" />
          <BarChart data={monthly} h={120} />
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <SectionHeader title="Halal Finance Score" />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.green }}>88</div>
              <div style={{ fontSize: 11, color: C.textSub }}>out of 100</div>
            </div>
            <div style={{ flex: 1 }}>
              <Progress pct={88} color={C.green} h={12} />
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>Excellent! Your finances align well with Islamic principles.</div>
              {[["Riba-free transactions", 100], ["Zakat compliance", 85], ["Savings rate", 68], ["Charitable giving", 90]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: C.textSub }}>{k}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: v >= 80 ? C.green : C.amber }}>{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn variant="primary" icon="📄" full>Export PDF</Btn>
          <Btn variant="outline" icon="📊" full>Export Excel</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Profile / Me ──────────────────────────────────────────────────
const Profile = ({ nav, user, onLogout }) => {
  const groups = [
    { title: "My Account", items: [
      { icon: "👤", label: "Personal Information",      to: "home"           },
      { icon: "🔐", label: "Security Settings",         to: "security"       },
      { icon: "💳", label: "Virtual Cards",             to: "cards"          },
      { icon: "🎁", label: "Rewards & Points",          to: "rewards"        },
      { icon: "👥", label: "Beneficiaries",             to: "beneficiaries"  },
    ]},
    { title: "Finance", items: [
      { icon: "📊", label: "Financial Reports",         to: "reports"        },
      { icon: "🤖", label: "AI Financial Advisor",      to: "ai"             },
      { icon: "⭐", label: "Zakat & Sadaqah",           to: "zakat"          },
      { icon: "🤝", label: "Qard Hasan Loans",          to: "qard"           },
      { icon: "🎓", label: "Scholarship Tracker",       to: "scholarship"    },
      { icon: "📚", label: "Student Finance",           to: "student"        },
    ]},
    { title: "Settings & Support", items: [
      { icon: "⚙️", label: "App Settings",             to: "settings"       },
      { icon: "🔔", label: "Notifications",             to: "notifications"  },
      { icon: "📖", label: "Financial Literacy",        to: "learn"          },
      { icon: "🤝", label: "Community & Campaigns",     to: "community"      },
      { icon: "❓", label: "Help & Support",            to: "home"           },
    ]},
  ];
  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background: C.green, padding: "48px 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{user?.full_name || "NoorPay User"}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{user?.email || "Loading..."}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Account: {user?.account_number || "Not assigned"}</div>
            <div style={{ marginTop: 4 }}><Badge color="#86efac">{user?.is_verified ? "✅ Verified" : "Awaiting verification"}</Badge></div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "14px 14px 0" }}>
        <Stat label="Reward Points" value="4,850" color={C.amber} />
        <Stat label="Transactions"  value="142"   color={C.green} />
        <Stat label="Goals Met"     value="7"     color={C.blue}  />
      </div>
      <div style={{ padding: 14 }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, paddingLeft: 2 }}>{g.title}</div>
            <Card style={{ overflow: "hidden", padding: 0 }}>
              {g.items.map((item, ii) => (
                <button key={ii} onClick={() => nav(item.to)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "none", border: "none", borderBottom: ii < g.items.length - 1 ? `1px solid ${C.grey100}` : "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>{item.label}</span>
                  <span style={{ color: C.textSub, fontSize: 14 }}>›</span>
                </button>
              ))}
            </Card>
          </div>
        ))}
        <button onClick={onLogout} style={{ width: "100%", padding: "12px", background: C.redPale, border: `1px solid ${C.red}30`, borderRadius: 8, color: C.red, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          🚪 Sign Out
        </button>
        <div style={{ textAlign: "center", fontSize: 10, color: C.textSub, marginTop: 14 }}>
          NoorPay v1.0 — Final Year Project 2024/2025<br />
          <span style={{ color: C.green }}>Shari'ah-Compliant Digital Finance Platform</span>
        </div>
      </div>
    </div>
  );
};

// ── Transactions ──────────────────────────────────────────────────
const Transactions = ({ nav }) => {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    txApi.getAll().then((data) => {
      if (active) setItems(Array.isArray(data) ? data : []);
    }).catch(() => { if (active) setItems([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filters = ["all", "income", "transfer", "bills", "zakat", "student"];
  const shown = filter === "all" ? items : items.filter((t) => (t.category || "").toLowerCase() === filter || (t.type || "").toLowerCase() === filter);
  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="Transactions" sub="Full payment history" />
      <div style={{ background: C.white, display: "flex", gap: 8, overflowX: "auto", padding: "12px 14px", borderBottom: `1px solid ${C.grey200}` }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", background: filter === f ? C.green : C.grey100, color: filter === f ? C.white : C.grey700, border: "none", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>
      <div style={{ padding: "10px 14px 0" }}>
        <Card style={{ overflow: "hidden", padding: 0 }}>
          {loading ? (
            <div style={{ padding: 14, fontSize: 12, color: C.textSub }}>Loading transactions…</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: C.textSub }}>No transactions found for this filter.</div>
          ) : shown.map((tx, i) => {
            const isIncoming = tx.type === "credit" || tx.type === "income";
            const icon = tx.type === "transfer" ? "💸" : tx.type === "airtime" ? "📱" : tx.type === "data" ? "📦" : tx.type === "zakat" ? "⭐" : tx.type === "qard" ? "🤝" : "💰";
            const title = tx.description || "Transaction";
            const sub = tx.recipient_name || tx.bank_name || new Date(tx.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
            const right = `${isIncoming ? "+" : "-"}${formatNaira(tx.amount)}`;
            return <ListItem key={tx.id || i} icon={icon} title={title} sub={sub} right={right} rightColor={isIncoming ? C.green : C.red} />;
          })}
        </Card>
      </div>
    </div>
  );
};

// ── Airtime & Data (Bills) ────────────────────────────────────────
const AirtimeData = ({ nav }) => {
  const [mode, setMode] = useState("airtime");
  const [net, setNet] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [bundle, setBundle] = useState("");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const nets = [{ k: "mtn", l: "MTN", c: "#FFCB05" }, { k: "airtel", l: "Airtel", c: "#E40000" }, { k: "glo", l: "Glo", c: "#006600" }, { k: "9mobile", l: "9mobile", c: "#008000" }];
  const bundles = [{ l: "1GB · 30 days", p: "500" }, { l: "2GB · 30 days", p: "1000" }, { l: "5GB · 30 days", p: "2000" }, { l: "10GB · 30 days", p: "3500" }];
  if (done) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{mode === "airtime" ? "Airtime Delivered!" : "Data Activated!"}</div>
        <div style={{ fontSize: 14, color: C.textSub, marginBottom: 24 }}>Successfully sent to {phone}</div>
        <Btn full variant="primary" onClick={() => { setDone(false); setPhone(""); setAmount(""); setBundle(""); }}>Buy Again</Btn>
        <Btn full variant="ghost" style={{ marginTop: 10 }} onClick={() => nav("home")}>Back to Home</Btn>
      </div>
    </div>
  );
  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Airtime & Data" sub="Buy airtime and data bundles" onBack={() => nav("home")} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", background: C.grey100, borderRadius: 8, padding: 4, marginBottom: 16 }}>
          {[["airtime", "📱 Airtime"], ["data", "📶 Data"]].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ flex: 1, padding: "8px 0", background: mode === k ? C.white : "none", border: "none", borderRadius: 6, fontWeight: mode === k ? 700 : 500, color: mode === k ? C.green : C.textSub, fontSize: 13, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Select Network</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {nets.map(n => (
              <button key={n.k} onClick={() => setNet(n.k)} style={{ flex: 1, padding: "10px 0", background: net === n.k ? n.c + "18" : C.grey100, border: `2px solid ${net === n.k ? n.c : C.grey200}`, borderRadius: 8, fontWeight: 700, fontSize: 12, color: C.text, cursor: "pointer" }}>{n.l}</button>
            ))}
          </div>
          <Inp label="Phone number" type="tel" value={phone} onChange={setPhone} placeholder="080 0000 0000" />
          <Inp label="Transaction PIN" type="password" value={pin} onChange={v => setPin(v.slice(0, 4))} placeholder="••••" note="Enter your 4-digit transaction PIN" />
          {mode === "airtime" ? <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {["100", "200", "500", "1000", "2000"].map(a => (
                <button key={a} onClick={() => setAmount(a)} style={{ padding: "7px 14px", background: amount === a ? C.greenPale : C.grey100, border: `1px solid ${amount === a ? C.green : C.grey200}`, borderRadius: 99, fontSize: 12, cursor: "pointer" }}>₦{a}</button>
              ))}
            </div>
            <Inp label="Or enter custom amount" type="number" value={amount} onChange={setAmount} placeholder="₦" />
          </> : <>
            {bundles.map((b, i) => (
              <button key={i} onClick={() => { setBundle(b.l); setAmount(b.p); }} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "12px 14px", marginBottom: 8, background: bundle === b.l ? C.greenPale : C.grey100, border: `1.5px solid ${bundle === b.l ? C.green : C.grey200}`, borderRadius: 8, cursor: "pointer" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{b.l}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.green }}>₦{Number(b.p).toLocaleString()}</span>
              </button>
            ))}
          </>}
          <Btn full variant="primary" disabled={!phone || !amount || pin.length < 4 || submitting} style={{ marginTop: 4 }} onClick={async () => {
            setSubmitting(true);
            try {
              if (mode === "airtime") {
                await txApi.buyAirtime({ phone, amount, network: net, pin });
              } else {
                await txApi.buyData({ phone, amount, network: net, pin, bundle_name: bundle || "Data bundle" });
              }
              setDone(true);
              setToast({ msg: `${mode === "airtime" ? "Airtime" : "Data"} delivered to ${phone}`, type: "success" });
            } catch (e) {
              setToast({ msg: e.detail || "Purchase failed", type: "error" });
            } finally {
              setSubmitting(false);
            }
          }}>
            {submitting ? "Processing..." : `Pay ₦${Number(amount || 0).toLocaleString()}`}
          </Btn>
        </Card>
      </div>
    </div>
  );
};

// ── Virtual Cards ─────────────────────────────────────────────────
const Cards = ({ nav }) => {
  const [vis, setVis] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [toast, setToast] = useState(null);
  return (
    <div style={{ paddingBottom: 80 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <PageHeader title="Virtual Cards" sub="Manage your online payment cards" onBack={() => nav("home")} />
      <div style={{ padding: 16 }}>
        {/* Card visual */}
        <div style={{ background: frozen ? C.grey500 : `linear-gradient(135deg, ${C.green} 0%, #0F4A28 100%)`, borderRadius: 16, padding: 22, marginBottom: 16, position: "relative", minHeight: 190 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>NoorPay Virtual</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D4B483" }}>Naira Card</div>
            </div>
            <div style={{ fontSize: 28 }}>💳</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white, letterSpacing: 3, marginBottom: 20, fontFamily: "monospace" }}>
            {vis ? "5412 1234 5678 3456" : "5412 •••• •••• 3456"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>CARDHOLDER</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>ABDURKABIR MARDHIYYAH</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>EXPIRES</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>09/27</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>CVV</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>{vis ? "742" : "•••"}</div>
            </div>
          </div>
          {frozen && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32 }}>🔒</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Card Frozen</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <Stat label="Balance"  value="₦87,000"  color={C.green} />
          <Stat label="Spent"    value="₦13,000"  color={C.red}   />
          <Stat label="Limit"    value="₦200,000" color={C.blue}  />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { icon: vis ? "🙈" : "👁", label: vis ? "Hide" : "Reveal", fn: () => setVis(!vis) },
            { icon: frozen ? "🔓" : "🔒", label: frozen ? "Unfreeze" : "Freeze", fn: () => setFrozen(!frozen) },
            { icon: "📋", label: "Copy No.", fn: () => setToast({ msg: "Card number copied!", type: "success" }) },
            { icon: "⚙️", label: "Settings", fn: () => setToast({ msg: "Card settings coming soon", type: "info" }) },
          ].map((a, i) => (
            <button key={i} onClick={a.fn} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: C.white, border: `1px solid ${C.grey200}`, borderRadius: 10, padding: "10px 4px", cursor: "pointer" }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{ fontSize: 10, color: C.grey700 }}>{a.label}</span>
            </button>
          ))}
        </div>
        <Card style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 14 }}>Card Transactions</div>
          {[
            { icon: "🛒", title: "Online Purchase",     sub: "Jumia Nigeria",  amt: "-₦8,500", col: C.red   },
            { icon: "📦", title: "Subscription",        sub: "Canva Pro",      amt: "-₦4,500", col: C.red   },
            { icon: "💰", title: "Card Top-up",         sub: "From Wallet",    amt: "+₦50,000",col: C.green },
          ].map((tx, i) => <ListItem key={i} icon={tx.icon} title={tx.title} sub={tx.sub} right={tx.amt} rightColor={tx.col} />)}
        </Card>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [authScreen, setAuthScreen] = useState("landing");
  const [page, setPage]   = useState("home");
  const [navAct, setNavAct] = useState("home");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      setAuthLoading(false);
      return;
    }
    auth.getProfile()
      .then((profile) => {
        setUser(profile);
        setAuthScreen("app");
      })
      .catch(() => {
        clearTokens();
        setAuthScreen("login");
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogin = async (email, password) => {
    const data = await auth.login(email, password);
    setUser(data.user);
    setAuthScreen("app");
  };

  const handleLogout = async () => {
    try { await auth.logout(); } catch (err) { /* ignore */ }
    clearTokens();
    setUser(null);
    setPage("home");
    setNavAct("home");
    setAuthScreen("login");
  };

  const handleRegisterSuccess = (profile) => {
    setUser(profile);
    setAuthScreen("app");
  };

  const nav = (p) => {
    setPage(p);
    const main = ["home", "finance", "transactions", "learn", "community", "me"];
    if (main.includes(p)) setNavAct(p);
  };

  const navItems = [
    { key: "home",         icon: "🏠", label: "Home"      },
    { key: "finance",      icon: "💰", label: "Finance"   },
    { key: "transactions", icon: "🔄", label: "History"   },
    { key: "community",    icon: "🤝", label: "Community" },
    { key: "me",           icon: "👤", label: "Me"        },
  ];





  if (authLoading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.text }}>Loading NoorPay...</div>;

  if (authScreen === "landing")
  return <LandingPage onGetStarted={() => setAuthScreen("splash")} onLogin={() => setAuthScreen("login")} />;

if (authScreen === "splash")
  return <><GS /><Splash onDone={() => setAuthScreen("onboard")} /></>;

if (authScreen === "onboard")
  return <><GS /><Onboard onDone={() => setAuthScreen("login")} /></>;

if (authScreen === "login")
  return <><GS /><Login onLogin={handleLogin} onReg={() => setAuthScreen("register")} /></>;

if (authScreen === "register")
  return <><GS /><Register onDone={handleRegisterSuccess} onLogin={() => setAuthScreen("login")} /></>;


  // if (auth === "landing")  return <LandingPage onGetStarted={() => setAuth("splash")} onLogin={() => setAuth("login")} />;
  // if (auth === "splash")   return <><GS/><Splash   onDone={() => setAuth("onboard")} /></>;
  // if (auth === "onboard")  return <><GS/><Onboard  onDone={() => setAuth("login")} /></>;
  // if (auth === "login")    return <><GS/><Login    onLogin={() => setAuth("app")} onReg={() => setAuth("register")} /></>;
  // if (auth === "register") return <><GS/><Register onDone={() => setAuth("app")} onLogin={() => setAuth("login")} /></>;

  // Full-screen pages (no bottom nav)
  // const [receiveOpen, setReceiveOpen] = useState(false);
  if (authScreen !== "app") return null;
  const fullPages = {
    send: SendMoney, airtime: AirtimeData, scholarship: Scholarship,
    student: StudentFinance, qard: QardHasan, zakat: ZakatModule,
    notifications: Notifications, reports: Reports, cards: Cards,
    rewards: RewardsScreen, ai: AIAdvisor, security: SecurityScreen,
    settings: AppSettings, beneficiaries: BeneficiariesScreen,
  };
  if (fullPages[page]) {
    const Page = fullPages[page];
    return <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.grey100 }}><GS/><Page nav={nav} /></div>;
  }

  const mainPages = { home: Home, finance: Finance, transactions: Transactions, community: Community, learn: LearningHub, me: Profile };
  const Page = mainPages[page] || Home;

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.grey100, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <GS />
      <div style={{ height: "100vh", overflowY: "auto", paddingBottom: 68 }}>
        <Page nav={nav} user={user} onLogout={handleLogout} />
      </div>
      <ReceiveModal open={receiveOpen} onClose={() => setReceiveOpen(false)} />

      {/* Bottom Navigation */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.white, borderTop: `1px solid ${C.grey200}`, display: "flex", zIndex: 100, boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}>
        {navItems.map(item => {
          const active = navAct === item.key;
          return (
            <button key={item.key} onClick={() => nav(item.key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 4px 10px", background: "none", border: "none", cursor: "pointer", borderTop: `2px solid ${active ? C.green : "transparent"}` }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.green : C.textSub }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
