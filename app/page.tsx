"use client";

import { useState, useEffect } from "react";

interface Permission {
  label: string;
  description: string;
  severity: "info" | "warn" | "danger";
}

interface AnalysisResult {
  contractName: string;
  contractSymbol?: string;
  contractAddress: string;
  isVerified: boolean;
  compiler: string;
  aiSummary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  riskReasons: string[];
  permissions: Permission[];
  features: { label: string; detected: boolean }[];
  honeypot: {
    isHoneypot: boolean;
    reason?: string;
    buyTax?: number;
    sellTax?: number;
    transferTax?: number;
    holderCount?: number;
  } | null;
  market: {
    price?: string;
    marketCap?: string;
    volume24h?: string;
    priceChange?: string;
    fdv?: string;
    imageUrl?: string;
  } | null;
  deployer: {
    address: string;
    contractsDeployed: number;
  } | null;
  technicalDetails: {
    sourceCode: string;
    bytecodeSize: number;
    creationDate?: string;
    txCount?: number;
  };
}

const RISK_CONFIG = {
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)",  label: "LOW RISK"      },
  MEDIUM:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", label: "MEDIUM RISK"   },
  HIGH:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  label: "HIGH RISK"     },
  CRITICAL: { color: "#dc2626", bg: "rgba(220,38,38,0.1)",   border: "rgba(220,38,38,0.25)", label: "CRITICAL RISK" },
};

const SEV_CONFIG = {
  info:   { color: "#63b3ed", bg: "rgba(99,179,237,0.07)",  border: "rgba(99,179,237,0.18)",  icon: "ℹ" },
  warn:   { color: "#f59e0b", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)",  icon: "⚠" },
  danger: { color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)",   icon: "✕" },
};

function Skeleton({ w = "100%", h = 14, mb = 0 }: { w?: string; h?: number; mb?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4, marginBottom: mb,
      background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
    }} />
  );
}

function RiskMeter({ score, level }: { score: number; level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] || RISK_CONFIG.LOW;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 6, letterSpacing: "0.06em" }}>
        <span>RISK SCORE</span>
        <span style={{ color: cfg.color, fontWeight: 700 }}>{score}/100</span>
      </div>
      <div style={{ height: 5, borderRadius: 10, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 10, width: `${score}%`, background: `linear-gradient(90deg,${cfg.color}88,${cfg.color})`, transition: "width 1s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 8px ${cfg.color}66` }} />
      </div>
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 16, height: "0.5px", background: "rgba(255,255,255,0.15)" }} />
      {children}
      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ textAlign: "center", padding: "20px 0 28px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(34,211,238,0.6)", animation: "pulse 1.4s ease-in-out infinite" }}>SCANNING CONTRACT...</div>
      </div>
      <Card><Skeleton h={18} mb={10} /><Skeleton w="70%" h={12} /></Card>
      <Card><Skeleton h={14} mb={10} /><Skeleton h={5} mb={6} /><Skeleton w="40%" h={10} /></Card>
      <Card>{[1,2,3].map(i => <div key={i} style={{ marginBottom: 10 }}><Skeleton h={12} mb={4} /><Skeleton w="80%" h={10} /></div>)}</Card>
    </div>
  );
}

// ─── Honeypot banner ──────────────────────────────────────────────────────────
function HoneypotBanner({ honeypot }: { honeypot: AnalysisResult["honeypot"] }) {
  if (!honeypot) return null;
  if (!honeypot.isHoneypot) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: "rgba(34,197,94,0.07)", border: "0.5px solid rgba(34,197,94,0.2)", marginBottom: 4 }}>
        <span style={{ color: "#22c55e", fontSize: 14 }}>✓</span>
        <span style={{ fontSize: 12, color: "rgba(34,197,94,0.9)", fontWeight: 600 }}>Not a Honeypot</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>— Sell simulation passed</span>
        {honeypot.buyTax != null && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>Buy tax: {honeypot.buyTax}% · Sell tax: {honeypot.sellTax}%</span>}
      </div>
    );
  }
  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.35)", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>🚨</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#dc2626", letterSpacing: "0.06em" }}>HONEYPOT DETECTED</span>
      </div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
        {honeypot.reason || "Sell simulation failed — tokens cannot be sold once purchased. Do not buy."}
      </p>
    </div>
  );
}

// ─── Market data panel ────────────────────────────────────────────────────────
function MarketPanel({ market, symbol }: { market: AnalysisResult["market"]; symbol?: string }) {
  if (!market || !market.price) return null;
  const priceUp = market.priceChange ? parseFloat(market.priceChange) >= 0 : null;
  return (
    <Card>
      <SectionTitle>Market Data</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
        {[
          { label: "Price", value: market.price ? `$${market.price}` : "—", extra: market.priceChange ? (
            <span style={{ fontSize: 10, color: priceUp ? "#22c55e" : "#ef4444", marginLeft: 6 }}>{priceUp ? "▲" : "▼"} {Math.abs(parseFloat(market.priceChange!))}%</span>
          ) : null },
          { label: "Market Cap",  value: market.marketCap  || "—" },
          { label: "24h Volume",  value: market.volume24h  || "—" },
          { label: "FDV",         value: market.fdv        || "—" },
        ].map((item, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center" }}>
              {item.value}
              {item.extra}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Deployer panel ───────────────────────────────────────────────────────────
function DeployerPanel({ deployer, txCount, creationDate }: {
  deployer: AnalysisResult["deployer"];
  txCount?: number;
  creationDate?: string;
}) {
  if (!deployer && !txCount && !creationDate) return null;
  const isSerialDeployer = deployer && deployer.contractsDeployed > 5;
  return (
    <Card>
      <SectionTitle>On-Chain Info</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {creationDate && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Deployed</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{creationDate}</span>
          </div>
        )}
        {txCount != null && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Total transactions</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{txCount.toLocaleString()}</span>
          </div>
        )}
        {deployer && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>Deployer</span>
              <a href={`https://etherscan.io/address/${deployer.address}`} target="_blank" rel="noopener noreferrer"
                style={{ color: "rgba(99,179,237,0.8)", fontFamily: "monospace", fontSize: 11, textDecoration: "none" }}>
                {deployer.address.slice(0,8)}...{deployer.address.slice(-6)} ↗
              </a>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>Contracts by deployer</span>
              <span style={{ color: isSerialDeployer ? "#f59e0b" : "rgba(255,255,255,0.7)", fontFamily: "monospace", fontWeight: isSerialDeployer ? 700 : 400 }}>
                {deployer.contractsDeployed}
                {isSerialDeployer && <span style={{ fontSize: 10, marginLeft: 6 }}>⚠ research history</span>}
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Results dashboard ────────────────────────────────────────────────────────
function ResultsDashboard({ result }: { result: AnalysisResult }) {
  const [techOpen, setTechOpen] = useState(false);
  const risk = RISK_CONFIG[result.riskLevel] || RISK_CONFIG.LOW;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.4s ease" }}>

      {/* Honeypot banner — shown first if detected */}
      <HoneypotBanner honeypot={result.honeypot} />

      {/* Header card */}
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              {result.market?.imageUrl && (
                <img src={result.market.imageUrl} alt="" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} />
              )}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>
                {result.contractName}
                {result.contractSymbol && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginLeft: 8, fontWeight: 400 }}>{result.contractSymbol}</span>}
              </h2>
              {result.isVerified && (
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "0.5px solid rgba(34,197,94,0.25)", fontWeight: 700, letterSpacing: "0.06em" }}>✓ VERIFIED</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", wordBreak: "break-all" }}>
              {result.contractAddress}
            </div>
            {result.compiler && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>Compiled with {result.compiler}</div>
            )}
          </div>
          <div style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, background: risk.bg, border: `0.5px solid ${risk.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: risk.color, letterSpacing: "0.08em" }}>{risk.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: risk.color, lineHeight: 1.2 }}>{result.riskScore}</div>
            <div style={{ fontSize: 9, color: `${risk.color}99`, letterSpacing: "0.04em" }}>/100</div>
          </div>
        </div>
      </Card>

      {/* Market data */}
      <MarketPanel market={result.market} symbol={result.contractSymbol} />

      {/* AI Summary */}
      <Card>
        <SectionTitle>Plain English Summary</SectionTitle>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, margin: 0 }}>{result.aiSummary}</p>
      </Card>

      {/* Risk analysis */}
      <Card style={{ border: `0.5px solid ${risk.border}` }}>
        <SectionTitle>Risk Analysis</SectionTitle>
        <RiskMeter score={result.riskScore} level={result.riskLevel} />
        {result.riskReasons.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {result.riskReasons.map((reason, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: risk.color, fontSize: 12, marginTop: 1, flexShrink: 0 }}>◆</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Permissions */}
      {result.permissions.length > 0 && (
        <Card>
          <SectionTitle>Permissions & Owner Controls</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.permissions.map((perm, i) => {
              const sev = SEV_CONFIG[perm.severity];
              return (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: sev.bg, border: `0.5px solid ${sev.border}` }}>
                  <span style={{ color: sev.color, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{sev.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: sev.color, marginBottom: 2 }}>{perm.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{perm.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Features grid */}
      {result.features.length > 0 && (
        <Card>
          <SectionTitle>Detected Features</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
            {result.features.map((feat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: feat.detected ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)", border: feat.detected ? "0.5px solid rgba(34,197,94,0.2)" : "0.5px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 12, color: feat.detected ? "#22c55e" : "rgba(255,255,255,0.2)" }}>{feat.detected ? "✓" : "✕"}</span>
                <span style={{ fontSize: 11, color: feat.detected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>{feat.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* On-chain info */}
      <DeployerPanel
        deployer={result.deployer}
        txCount={result.technicalDetails.txCount}
        creationDate={result.technicalDetails.creationDate}
      />

      {/* Technical details collapsed */}
      <Card>
        <button onClick={() => setTechOpen(!techOpen)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Technical Details</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: techOpen ? "rotate(180deg)" : "none" }}>▾</span>
        </button>
        {techOpen && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {result.technicalDetails.bytecodeSize > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>Bytecode size</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>{result.technicalDetails.bytecodeSize.toLocaleString()} bytes</span>
              </div>
            )}
            {result.technicalDetails.sourceCode && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 8, letterSpacing: "0.06em" }}>SOURCE CODE (TRUNCATED)</div>
                <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, overflowX: "auto", maxHeight: 200, overflowY: "auto", fontFamily: "monospace", lineHeight: 1.6, border: "0.5px solid rgba(255,255,255,0.06)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {result.technicalDetails.sourceCode.slice(0, 1500)}
                  {result.technicalDetails.sourceCode.length > 1500 ? "\n\n... (truncated)" : ""}
                </pre>
              </div>
            )}
          </div>
        )}
      </Card>

      <div style={{ textAlign: "center", paddingTop: 4 }}>
        <a href={`https://etherscan.io/address/${result.contractAddress}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textDecoration: "none", letterSpacing: "0.06em", borderBottom: "0.5px solid rgba(255,255,255,0.1)", paddingBottom: 2 }}>
          View on Etherscan ↗
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<AnalysisResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [recent, setRecent]   = useState<string[]>([]);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("cc_recent") || "[]")); } catch {}
  }, []);

  function saveRecent(addr: string) {
    try {
      const existing = JSON.parse(localStorage.getItem("cc_recent") || "[]").filter((a: string) => a !== addr);
      const updated = [addr, ...existing].slice(0, 5);
      localStorage.setItem("cc_recent", JSON.stringify(updated));
      setRecent(updated);
    } catch {}
  }

  async function analyze(addr?: string) {
    const target = (addr ?? address).trim();
    if (!target) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      setError("Please enter a valid Ethereum contract address (0x... 42 characters)");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: target }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Analysis failed");
      setResult(data);
      saveRecent(target);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") analyze();
  }

  const showHero = !loading && !result;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#080c10;}
        ::selection{background:rgba(34,211,238,0.2);}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
        input::placeholder{color:rgba(255,255,255,0.18);}
        input:focus{outline:none!important;}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%,black 40%,transparent 100%)" }} />
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at top,rgba(34,211,238,0.07) 0%,transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", fontFamily: "'DM Sans',sans-serif", color: "#fff", maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 0 24px", borderBottom: "0.5px solid rgba(255,255,255,0.07)", marginBottom: result || loading ? 28 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,rgba(34,211,238,0.2),rgba(34,211,238,0.05))", border: "0.5px solid rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>◈</div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.08em" }}>CONTRACT CLEAR</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>SMART CONTRACT EXPLAINER</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "4px 12px", letterSpacing: "0.06em" }}>ETH MAINNET</div>
        </header>

        {/* Hero */}
        {showHero && (
          <div style={{ textAlign: "center", padding: "60px 0 48px", animation: "fadeUp 0.5s ease" }}>
            <div style={{ display: "inline-block", fontSize: 10, letterSpacing: "0.16em", fontWeight: 700, color: "rgba(34,211,238,0.6)", background: "rgba(34,211,238,0.06)", border: "0.5px solid rgba(34,211,238,0.15)", borderRadius: 20, padding: "4px 14px", marginBottom: 20 }}>
              POWERED BY AI + ETHERSCAN + HONEYPOT.IS
            </div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, lineHeight: 1.15, color: "#fff", marginBottom: 14, letterSpacing: "-0.01em" }}>
              Understand any smart<br />contract in seconds
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 40px" }}>
              Plain English explanation, risk score, honeypot detection,
              live market data, and permission breakdown — no coding required.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
              {[
                { label: "USDC",       addr: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
                { label: "Uniswap V2", addr: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f" },
                { label: "CryptoPunks",addr: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb" },
              ].map(ex => (
                <button key={ex.addr} onClick={() => { setAddress(ex.addr); analyze(ex.addr); }}
                  style={{ fontSize: 11, padding: "5px 14px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Try {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        <div style={{ marginBottom: result || loading ? 20 : 0 }}>
          {result || loading ? (
            <div style={{ display: "flex", gap: 10 }}>
              <input value={address} onChange={e => setAddress(e.target.value)} onKeyDown={handleKey} placeholder="Analyze another contract..."
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono',monospace" }} />
              <button onClick={() => analyze()} disabled={loading}
                style={{ background: "rgba(34,211,238,0.12)", border: "0.5px solid rgba(34,211,238,0.25)", borderRadius: 10, padding: "10px 20px", fontSize: 12, color: "rgba(34,211,238,0.9)", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
                Analyze
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "4px 4px 4px 16px" }}>
              <input value={address} onChange={e => setAddress(e.target.value)} onKeyDown={handleKey} placeholder="0x... paste a contract address"
                style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, color: "#fff", fontFamily: "'JetBrains Mono',monospace" }} />
              <button onClick={() => analyze()} disabled={loading}
                style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.04em", opacity: loading ? 0.6 : 1, fontFamily: "'Syne',sans-serif", boxShadow: "0 4px 20px rgba(6,182,212,0.25)" }}>
                Analyze
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 13, color: "rgba(239,68,68,0.9)" }}>
            {error}
          </div>
        )}

        {showHero && recent.length > 0 && (
          <div style={{ marginTop: 32, animation: "fadeUp 0.6s ease" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 10 }}>RECENT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recent.map(addr => (
                <button key={addr} onClick={() => { setAddress(addr); analyze(addr); }}
                  style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "9px 14px", fontSize: 12, color: "rgba(255,255,255,0.35)", cursor: "pointer", textAlign: "left", fontFamily: "'JetBrains Mono',monospace" }}>
                  {addr}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <div style={{ marginTop: 8 }}><LoadingSkeleton /></div>}
        {result && !loading && <div style={{ marginTop: 8 }}><ResultsDashboard result={result} /></div>}
      </div>
    </>
  );
}