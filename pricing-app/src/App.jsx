import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════ */
const CONFIGS = {
  consumer: { label: "PrimeX Consumer", ltvs: [90,85,80,75,70,65,60,55,50], ficos: [660,680,700,720,740,760] },
  dscr: { label: "InvestorX DSCR", ltvs: [80,75,70,65,60,55,50], ficos: [620,640,660,680,700,720,740,760] },
};

/* ═══════════════════════════════════════════════════════════════
   PRICING ENGINE
   ═══════════════════════════════════════════════════════════════ */
function matchBand(val, keys, type) {
  if (type === "ltv") { for (const k of keys) { const n = parseInt(k); if (!isNaN(n) && val <= n) return k; } return keys[keys.length - 1]; }
  const sorted = [...keys].sort((a, b) => parseInt(b.match(/\d+/)?.[0]||"0") - parseInt(a.match(/\d+/)?.[0]||"0"));
  for (const k of sorted) { const nums = k.match(/\d+/g)?.map(Number)||[]; if (k.includes(">=") && val >= nums[0]) return k; if (nums.length === 1 && val >= nums[0] - 19 && val <= nums[0] + 10) return k; }
  return sorted[sorted.length - 1];
}

function findLlpa(llpas, searchTerms, ltvBand) {
  for (const term of searchTerms) {
    for (const [name, vals] of Object.entries(llpas)) {
      if (name.toLowerCase().includes(term.toLowerCase())) {
        const v = vals[ltvBand];
        if (v !== null && v !== undefined) return { name, value: v };
      }
    }
  }
  return { name: null, value: 0 };
}

function calcNet(lender, params) {
  const { rate, fico, ltv, lock = "30", purpose, loanAmount, propertyType, occupancy, units, incomeDoc, selfEmployed, interestOnly, dscr, ppp, impoundWaiver, housing1x30, rural, foreignNational, condotel, str } = params;
  const adjs = [];
  const r = { lender: lender.name, rate, base: null, adjustments: adjs, totalAdj: 0, net: null, ok: true, reason: "" };

  // Base price
  const rk = Object.keys(lender.rates).map(Number).sort((a, b) => Math.abs(a - rate) - Math.abs(b - rate))[0];
  if (!rk || Math.abs(rk - rate) > 0.2) return { ...r, ok: false, reason: "Rate N/A" };
  r.base = lender.rates[rk]?.[lock];
  if (!r.base) return { ...r, ok: false, reason: `No ${lock}-day` };

  const bands = Object.values(lender.llpas)[0] ? Object.keys(Object.values(lender.llpas)[0]) : [];
  const ltvB = matchBand(ltv, bands, "ltv");
  const ficoKeys = Object.keys(lender.llpas).filter(k => /fico/i.test(k));
  const ficoB = matchBand(fico, ficoKeys, "fico");

  // FICO/LTV
  if (ficoB && lender.llpas[ficoB]) {
    const v = lender.llpas[ficoB][ltvB];
    if (v === null || v === undefined) return { ...r, ok: false, reason: `${ficoB}/${ltvB} N/A` };
    adjs.push({ category: "FICO/LTV", name: ficoB, value: v });
  }

  // Purpose
  if (purpose && purpose !== "Purchase") {
    const { name, value } = findLlpa(lender.llpas, [purpose.includes("Cash") ? "Cash" : "Rate/Term"], ltvB);
    if (value !== 0) adjs.push({ category: "Purpose", name: name || purpose, value });
  }

  // Income Doc
  if (incomeDoc && incomeDoc !== "Bank Statement") {
    const { name, value } = findLlpa(lender.llpas, [incomeDoc, "Full Doc", "Full/Alt", "Asset"], ltvB);
    if (value !== 0) adjs.push({ category: "Income Doc", name: name || incomeDoc, value });
  }

  // Property Type
  if (propertyType === "Condo") {
    const { name, value } = findLlpa(lender.llpas, ["High-Rise Condo", "Condo"], ltvB);
    if (value !== 0) adjs.push({ category: "Property", name: name || "Condo", value });
  }
  if (condotel === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Condotel"], ltvB);
    if (value !== 0) adjs.push({ category: "Property", name: name || "Condotel", value });
  }

  // Units
  if (units && parseInt(units) >= 2) {
    const { name, value } = findLlpa(lender.llpas, ["2-4 Units", "2 Units", "3-4 Units"], ltvB);
    if (value !== 0) adjs.push({ category: "Units", name: name || units, value });
  }

  // Occupancy
  if (occupancy === "Second Home" || occupancy === "2nd Home") {
    const { name, value } = findLlpa(lender.llpas, ["2nd Home", "Second Home"], ltvB);
    if (value !== 0) adjs.push({ category: "Occupancy", name: name || "2nd Home", value });
  }
  if (occupancy === "Non-Owner" || occupancy === "Investment") {
    const { name, value } = findLlpa(lender.llpas, ["Non-Owner", "Non - Owner", "NOO"], ltvB);
    if (value !== 0) adjs.push({ category: "Occupancy", name: name || "Non-Owner", value });
  }

  // Interest Only
  if (interestOnly === "Yes") {
    const dscrVal = parseFloat(dscr) || 1.0;
    let ioTerms = ["Interest Only"];
    if (dscrVal >= 1.0) ioTerms = ["I/O & DSCR Ratio >=1", "I/O & DSCR >=", "Interest Only"];
    else ioTerms = ["I/O & DSCR Ratio <1", "I/O & DSCR <", "Interest Only"];
    const { name, value } = findLlpa(lender.llpas, ioTerms, ltvB);
    if (value !== 0) adjs.push({ category: "Interest Only", name: name || "I/O", value });
  }

  // Self-Employed
  if (selfEmployed === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Self-Employed", "Self Employed"], ltvB);
    if (value !== 0) adjs.push({ category: "Self-Employed", name: name || "Self-Employed", value });
  }

  // DSCR Ratio
  if (dscr) {
    const dv = parseFloat(dscr);
    let terms = [];
    if (dv >= 1.25) terms = ["DSCR 1.25", "DSCR 1.2"];
    else if (dv >= 1.0) terms = ["DSCR 1.00", "DSCR 1.0"];
    else if (dv >= 0.75) terms = ["DSCR 0.75", "DSCR 0.7"];
    else terms = ["No DSCR", "DSCR (<"];
    const { name, value } = findLlpa(lender.llpas, terms, ltvB);
    if (value !== 0) adjs.push({ category: "DSCR", name: name || `DSCR ${dscr}`, value });
  }

  // Prepayment Penalty
  if (ppp && ppp !== "None") {
    const { name, value } = findLlpa(lender.llpas, [ppp, ppp.replace("Year", "Yr")], ltvB);
    if (value !== 0) adjs.push({ category: "PPP", name: name || ppp, value });
  }

  // Loan Amount adjustments
  if (loanAmount) {
    const amt = parseInt(loanAmount);
    let terms = [];
    if (amt >= 3000000) terms = ["> $3.00mm", ">= $3.0", "> $3"];
    else if (amt >= 1500000) terms = ["> $1.5mm", ">= $1.5", "$500k", "≥ $500k"];
    else if (amt >= 500000) terms = ["$500k", "≥ $500k ≤ $1.5", ">= $500k"];
    else if (amt >= 300000) terms = ["$300k", "≥ $300k", ">= $300k"];
    else if (amt >= 150000) terms = ["$150k", "≥ $150k <$200", ">= $150k"];
    else terms = ["<$150k", "< $150k", "<$150"];
    const { name, value } = findLlpa(lender.llpas, terms, ltvB);
    if (value !== 0) adjs.push({ category: "Loan Amount", name: name || `$${(amt/1000).toFixed(0)}k`, value });
  }

  // Impound Waiver
  if (impoundWaiver === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Impound Waiver", "Impound", "Waive Impound", "Waive Escrow"], ltvB);
    if (value !== 0) adjs.push({ category: "Impound Waiver", name: name || "Impound Waiver", value });
  }

  // Housing 1x30
  if (housing1x30 === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Housing 1x30"], ltvB);
    if (value !== 0) adjs.push({ category: "Housing Event", name: name || "1x30", value });
  }

  // Rural
  if (rural === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Rural"], ltvB);
    if (value !== 0) adjs.push({ category: "Rural", name: name || "Rural", value });
  }

  // Foreign National
  if (foreignNational === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Foreign National", "Foreign Nat"], ltvB);
    if (value !== 0) adjs.push({ category: "Foreign National", name: name || "Foreign National", value });
  }

  // STR
  if (str === "Yes") {
    const { name, value } = findLlpa(lender.llpas, ["Short Term Rental", "STR"], ltvB);
    if (value !== 0) adjs.push({ category: "STR", name: name || "Short Term Rental", value });
  }

  // NPRA
  const npra = findLlpa(lender.llpas, ["NPRA"], ltvB);
  // DTI
  const dti = findLlpa(lender.llpas, ["DTI <= 43%", "DTI"], ltvB);
  if (dti.value !== 0) adjs.push({ category: "DTI", name: dti.name, value: dti.value });

  r.totalAdj = +(adjs.reduce((s, a) => s + a.value, 0)).toFixed(3);
  r.net = +(r.base + r.totalAdj).toFixed(3);
  return r;
}

/* ═══════════════════════════════════════════════════════════════
   PARSER
   ═══════════════════════════════════════════════════════════════ */
function parseFile(data) {
  const wb = XLSX.read(data, { type: "array" }); const lenders = {}; let prod = "consumer";
  for (const name of wb.SheetNames) {
    if (/instruct/i.test(name)) { if (XLSX.utils.sheet_to_csv(wb.Sheets[name]).toLowerCase().includes("dscr")) prod = "dscr"; continue; }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
    const l = { name, rates: {}, llpas: {} }; let sec = null, cols = [];
    for (const row of rows) {
      const f = String(row[0] || "").trim();
      if (/base.*(rate|price)/i.test(f)) { sec = "r"; continue; }
      if (/fico.*adjust|fico.*ltv/i.test(f)) { sec = "f"; continue; }
      if (/loan level|other.*adjust|pricing adjust/i.test(f) && !/fico/i.test(f)) { sec = "l"; continue; }
      if (/^(Rate|FICO|Adjustment)$/i.test(f)) { if (sec !== "r") cols = row.slice(1).map(v => String(v).trim()).filter(Boolean); continue; }
      if (sec === "r" && f) { const rate = parseFloat(f.replace("%", "")); if (!isNaN(rate) && rate > 3) { l.rates[rate] = {}; ["15","30","45"].forEach((lk, i) => { const v = parseFloat(row[i+1]); if (!isNaN(v) && v > 50) l.rates[rate][lk] = v; }); } }
      if ((sec === "f" || sec === "l") && f && cols.length) { const vals = {}; cols.forEach((b, i) => { const v = row[i+1]; vals[b] = (v === "N/A" || v === "" || v === undefined) ? null : isNaN(parseFloat(v)) ? null : parseFloat(v); }); l.llpas[f] = vals; if (/dscr/i.test(f)) prod = "dscr"; }
    }
    if (Object.keys(l.rates).length) lenders[name] = l;
  }
  return { lenders, product: prod };
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════════════ */
function doExport(results, matrix, config, params, lenders, mode) {
  const wb = XLSX.utils.book_new();
  if (mode === "single") {
    const best = results.filter(r => r.ok).sort((a, b) => b.net - a.net)[0]?.net || 0;
    const hdr = ["Rank","Lender","Base Price"]; const maxAdj = Math.max(...results.filter(r=>r.ok).map(r=>r.adjustments.length), 0);
    for (let i = 0; i < maxAdj; i++) hdr.push(`Adj ${i+1}`);
    hdr.push("Total LLPA", "Net Price", "Gap to #1");
    const d = [hdr];
    results.forEach((r, i) => {
      const row = [r.ok ? i+1 : "N/A", r.lender, r.base];
      for (let j = 0; j < maxAdj; j++) {
        const a = r.adjustments?.[j];
        row.push(a ? `${a.category}: ${a.value > 0 ? "+" : ""}${a.value.toFixed(3)}` : "");
      }
      row.push(r.totalAdj, r.net, r.ok ? +(r.net - best).toFixed(3) : "N/A");
      d.push(row);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), "Ranking");
    const info = Object.entries(params).filter(([k]) => !["adjustments"].includes(k)).map(([k, v]) => [k, String(v)]);
    info.unshift(["Parameter", "Value"]); info.push(["Generated", new Date().toLocaleString()]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), "Parameters");
  } else {
    const hxN = Object.keys(lenders).find(n => /hx|homex/i.test(n)) || Object.keys(lenders)[0];
    for (const name of Object.keys(lenders)) {
      const d = [["LTV\\FICO", ...config.ficos]];
      for (const ltv of config.ltvs) { const row = [ltv+"%"]; for (const fico of config.ficos) { const r = matrix[`${ltv}_${fico}`]?.find(x => x.lender === name); row.push(r?.ok ? r.net : "N/A"); } d.push(row); }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), name.slice(0,28));
    }
    for (const [sheet, fn] of [["HX Gap", (hx, b) => hx?.ok && b?.ok ? +((hx.net-b.net).toFixed(3)) : "N/A"], ["HX Rank", (hx) => hx?.rank || "N/A"]]) {
      const d = [["LTV\\FICO", ...config.ficos]];
      for (const ltv of config.ltvs) { const row = [ltv+"%"]; for (const fico of config.ficos) { const res = matrix[`${ltv}_${fico}`]||[]; const hx = res.find(x=>x.lender===hxN); row.push(fn(hx, res[0])); } d.push(row); }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), sheet);
    }
  }
  XLSX.writeFile(wb, `comparison_${params.rate}_${mode}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* ═══════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════ */
const C = { bg: "#0a0e1a", sf: "#111827", cd: "#1a2035", bd: "#1e293b", ac: "#3b82f6", gn: "#10b981", rd: "#ef4444", am: "#f59e0b", or: "#f97316", tx: "#f1f5f9", dm: "#94a3b8", mt: "#475569" };
const clr = v => v > 0 ? C.gn : v < 0 ? C.rd : C.mt;

export default function App() {
  const [lenders, setLenders] = useState(null);
  const [product, setProduct] = useState("consumer");
  const [view, setView] = useState("ranking");
  const [file, setFile] = useState("");
  const [params, setParams] = useState({
    rate: 7.25, fico: 720, ltv: 75, lock: "30",
    purpose: "Purchase", loanAmount: "750000", propertyType: "Single Family",
    occupancy: "Primary", units: "1", incomeDoc: "Bank Statement",
    selfEmployed: "No", interestOnly: "No", dscr: "1.00", ppp: "3 Year",
    impoundWaiver: "No", housing1x30: "No", rural: "No",
    foreignNational: "No", condotel: "No", str: "No",
  });

  const config = CONFIGS[product];
  const set = (k, v) => setParams(p => ({ ...p, [k]: typeof v === "string" && !isNaN(+v) && k !== "lock" && k !== "loanAmount" ? +v : v }));

  const onUpload = useCallback(e => {
    const f = e.target.files[0]; if (!f) return; setFile(f.name);
    const rd = new FileReader();
    rd.onload = ev => { const { lenders: l, product: p } = parseFile(new Uint8Array(ev.target.result)); setLenders(l); setProduct(p); };
    rd.readAsArrayBuffer(f);
  }, []);

  const rates = useMemo(() => lenders ? [...new Set(Object.values(lenders).flatMap(l => Object.keys(l.rates).map(Number)))].sort((a,b) => a-b) : [], [lenders]);

  const results = useMemo(() => {
    if (!lenders) return [];
    const a = Object.values(lenders).map(l => calcNet(l, params));
    const o = a.filter(r => r.ok).sort((a, b) => b.net - a.net);
    o.forEach((r, i) => r.rank = i + 1);
    return [...o, ...a.filter(r => !r.ok)];
  }, [lenders, params]);

  const matrix = useMemo(() => {
    if (!lenders || view !== "matrix") return {};
    const m = {};
    for (const ltv of config.ltvs) for (const fico of config.ficos) {
      const p = { ...params, fico, ltv };
      const a = Object.values(lenders).map(l => calcNet(l, p));
      const o = a.filter(r => r.ok).sort((a, b) => b.net - a.net);
      o.forEach((r, i) => r.rank = i + 1);
      m[`${ltv}_${fico}`] = [...o, ...a.filter(r => !r.ok)];
    }
    return m;
  }, [lenders, params, view, config]);

  const names = lenders ? Object.keys(lenders) : [];
  const hxN = names.find(n => /hx|homex/i.test(n)) || names[0];
  const hx = results.find(r => r.lender === hxN);
  const best = results[0];

  const Sel = ({ l, v, fn, opts, w }) => (
    <div style={{ minWidth: w || 110 }}>
      <div style={{ fontSize: 9, color: C.mt, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3, fontWeight: 700 }}>{l}</div>
      <select value={v} onChange={e => fn(e.target.value)} style={{ width: "100%", padding: "5px 6px", background: C.sf, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 5, fontSize: 12 }}>
        {opts.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
    </div>
  );

  const Toggle = ({ l, v, fn }) => (
    <div style={{ minWidth: 80 }}>
      <div style={{ fontSize: 9, color: C.mt, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3, fontWeight: 700 }}>{l}</div>
      <button onClick={() => fn(v === "Yes" ? "No" : "Yes")} style={{ width: "100%", padding: "5px 6px", background: v === "Yes" ? `${C.ac}22` : C.sf, color: v === "Yes" ? C.ac : C.dm, border: `1px solid ${v === "Yes" ? C.ac + "66" : C.bd}`, borderRadius: 5, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
        {v === "Yes" ? "✓ Yes" : "No"}
      </button>
    </div>
  );

  const Input = ({ l, v, fn, w, placeholder }) => (
    <div style={{ minWidth: w || 110 }}>
      <div style={{ fontSize: 9, color: C.mt, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3, fontWeight: 700 }}>{l}</div>
      <input value={v} onChange={e => fn(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "5px 6px", background: C.sf, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 5, fontSize: 12, boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.tx, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Nav */}
      <div style={{ background: C.sf, borderBottom: `1px solid ${C.bd}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${C.ac},#8b5cf6)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>P</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pricing Comparison Engine</div>
            <div style={{ fontSize: 11, color: C.dm }}>{lenders ? `${names.length} lenders · ${config.label}` : "Upload template"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lenders && <span style={{ background: `${product === "dscr" ? C.or : C.ac}22`, color: product === "dscr" ? C.or : C.ac, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{config.label}</span>}
          <label style={{ background: C.ac, color: "#fff", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{file || "Upload Template"}<input type="file" accept=".xlsx,.xls" onChange={onUpload} style={{ display: "none" }} /></label>
        </div>
      </div>

      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "16px 24px" }}>
        {!lenders ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: C.cd, borderRadius: 16, border: `2px dashed ${C.bd}`, marginTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: .6 }}>📊</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Upload Competitor Template</h2>
            <p style={{ color: C.dm, maxWidth: 400, margin: "0 auto", lineHeight: 1.6, fontSize: 13 }}>
              <code style={{ background: C.sf, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>competitor_template_consumer.xlsx</code> or <code style={{ background: C.sf, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>competitor_template_dscr.xlsx</code>
            </p>
          </div>
        ) : (
          <>
            {/* ═══ SEARCH PARAMETERS ═══ */}
            <div style={{ background: C.cd, borderRadius: 10, border: `1px solid ${C.bd}`, marginBottom: 12, overflow: "hidden" }}>
              {/* Row 1: Loan Info */}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.bd}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ fontSize: 11, color: C.ac, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 80, paddingBottom: 6 }}>Loan</div>
                <Sel l="Rate" v={params.rate} fn={v => set("rate", +v)} opts={rates.map(r => ({ v: r, l: r.toFixed(3) + "%" }))} />
                <Sel l="FICO" v={params.fico} fn={v => set("fico", +v)} opts={config.ficos} />
                <Sel l="LTV" v={params.ltv} fn={v => set("ltv", +v)} opts={config.ltvs.map(l => ({ v: l, l: l + "%" }))} />
                <Input l="Loan Amount" v={params.loanAmount} fn={v => set("loanAmount", v)} placeholder="750000" w={120} />
                <Sel l="Lock" v={params.lock} fn={v => set("lock", v)} opts={[{ v: "15", l: "15 Day" }, { v: "30", l: "30 Day" }, { v: "45", l: "45 Day" }]} w={90} />
                <Sel l="Purpose" v={params.purpose} fn={v => set("purpose", v)} opts={["Purchase", "Rate/Term Refi", "Cash-Out"]} />
              </div>

              {/* Row 2: Property */}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.bd}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ fontSize: 11, color: C.gn, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 80, paddingBottom: 6 }}>Property</div>
                <Sel l="Type" v={params.propertyType} fn={v => set("propertyType", v)} opts={["Single Family", "Condo", "PUD", "2-4 Units"]} />
                <Sel l="Occupancy" v={params.occupancy} fn={v => set("occupancy", v)} opts={product === "dscr" ? ["Investment", "Non-Owner"] : ["Primary", "Second Home", "Investment"]} />
                <Sel l="Units" v={params.units} fn={v => set("units", v)} opts={["1", "2", "3-4"]} w={70} />
                <Toggle l="Rural" v={params.rural} fn={v => set("rural", v)} />
                <Toggle l="Condotel" v={params.condotel} fn={v => set("condotel", v)} />
                {product === "dscr" && <Toggle l="STR" v={params.str} fn={v => set("str", v)} />}
              </div>

              {/* Row 3: Borrower */}
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.bd}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ fontSize: 11, color: C.or, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 80, paddingBottom: 6 }}>Borrower</div>
                <Sel l="Income Doc" v={params.incomeDoc} fn={v => set("incomeDoc", v)} opts={product === "dscr" ? ["DSCR", "Full Doc", "Alt Doc", "Asset Xpress", "Bank Statement"] : ["Bank Statement", "Full Doc", "Asset Xpress"]} />
                <Toggle l="Self Employed" v={params.selfEmployed} fn={v => set("selfEmployed", v)} />
                <Toggle l="Interest Only" v={params.interestOnly} fn={v => set("interestOnly", v)} />
                <Toggle l="Impound Waiver" v={params.impoundWaiver} fn={v => set("impoundWaiver", v)} />
                <Toggle l="Housing 1x30" v={params.housing1x30} fn={v => set("housing1x30", v)} />
                {product === "dscr" && <Toggle l="Foreign Natl" v={params.foreignNational} fn={v => set("foreignNational", v)} />}
              </div>

              {/* Row 4: DSCR-specific */}
              {product === "dscr" && (
                <div style={{ padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, width: 80, paddingBottom: 6 }}>DSCR</div>
                  <Sel l="DSCR Ratio" v={params.dscr} fn={v => set("dscr", v)} opts={["1.25+", "1.00", "0.85", "0.75", "No DSCR"].map(d => ({ v: d.replace("+", ""), l: d }))} />
                  <Sel l="Prepayment Penalty" v={params.ppp} fn={v => set("ppp", v)} opts={["5 Year", "4 Year", "3 Year", "2 Year", "1 Year", "No Prepay", "None"]} />
                </div>
              )}
            </div>

            {/* View Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[["ranking", "Ranking"], ["decomp", "LLPA Waterfall"], ["matrix", "Full Matrix"]].map(([k, l]) => (
                <button key={k} onClick={() => setView(k)} style={{ padding: "7px 16px", background: view === k ? C.ac : C.cd, color: view === k ? "#fff" : C.dm, border: `1px solid ${view === k ? C.ac : C.bd}`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{l}</button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => doExport(results, matrix, config, params, lenders, view === "matrix" ? "matrix" : "single")} style={{ padding: "7px 16px", background: `${C.gn}18`, color: C.gn, border: `1px solid ${C.gn}44`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⬇ Export .xlsx</button>
            </div>

            {/* KPIs */}
            {view !== "matrix" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 12 }}>
                {[
                  { l: "HX Net", v: hx?.ok ? hx.net.toFixed(3) : "N/A", c: C.or },
                  { l: "HX Rank", v: hx?.rank ? `#${hx.rank}` : "N/A", c: hx?.rank <= 3 ? C.gn : hx?.rank <= 5 ? C.am : C.rd },
                  { l: "Adjustments", v: hx?.ok ? `${hx.adjustments.length} applied` : "—", c: C.dm },
                  { l: "Total LLPA", v: hx?.ok ? (hx.totalAdj >= 0 ? "+" : "") + hx.totalAdj.toFixed(3) : "—", c: clr(hx?.totalAdj) },
                  { l: "Best Price", v: best?.net?.toFixed(3) || "—", c: C.gn },
                  { l: "Gap to #1", v: hx?.ok && best?.ok ? (hx.net >= best.net ? "—" : (hx.net - best.net).toFixed(3)) : "N/A", c: hx?.net >= best?.net ? C.gn : C.rd },
                ].map((k, i) => (
                  <div key={i} style={{ background: C.cd, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.bd}` }}>
                    <div style={{ fontSize: 9, color: C.mt, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{k.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: k.c, marginTop: 2 }}>{k.v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Ranking */}
            {view === "ranking" && (
              <div style={{ borderRadius: 10, border: `1px solid ${C.bd}`, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.cd }}>
                    {["#", "Lender", "Base Price", "FICO/LTV", "Purpose", "DSCR", "PPP", "Other Adj", "Total LLPA", "Net Price", "Gap"].map(h => (
                      <th key={h} style={{ padding: "8px 8px", textAlign: h === "Lender" ? "left" : "center", color: C.mt, fontSize: 9, textTransform: "uppercase", letterSpacing: .8, borderBottom: `1px solid ${C.bd}`, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{results.map((r, i) => {
                    const isHx = r.lender === hxN;
                    const gap = r.ok && best?.ok ? +(r.net - best.net).toFixed(3) : null;
                    const getAdj = cat => r.adjustments?.filter(a => a.category === cat).reduce((s, a) => s + a.value, 0) || 0;
                    const otherAdj = r.ok ? +(r.totalAdj - getAdj("FICO/LTV") - getAdj("Purpose") - getAdj("DSCR") - getAdj("PPP")).toFixed(3) : 0;
                    return (
                      <tr key={i} style={{ background: isHx ? `${C.or}10` : i % 2 ? `${C.sf}80` : "transparent", borderBottom: `1px solid ${C.bd}` }}>
                        <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: r.rank === 1 ? C.gn : r.rank <= 3 ? C.am : C.dm, fontSize: 13 }}>{r.rank || "—"}</td>
                        <td style={{ padding: "7px 8px", fontWeight: isHx ? 700 : 400, color: isHx ? C.or : C.tx, fontSize: 12 }}>{r.lender}</td>
                        <td style={{ padding: "7px 8px", textAlign: "center", fontFamily: "monospace", fontSize: 12 }}>{r.ok ? r.base?.toFixed(3) : <span style={{ color: C.mt, fontSize: 10 }}>{r.reason}</span>}</td>
                        {[getAdj("FICO/LTV"), getAdj("Purpose"), getAdj("DSCR"), getAdj("PPP"), otherAdj].map((v, j) => (
                          <td key={j} style={{ padding: "7px 8px", textAlign: "center", color: r.ok ? clr(v) : C.mt, fontWeight: v ? 600 : 400, fontFamily: "monospace", fontSize: 11 }}>{r.ok ? (v === 0 ? "0.000" : (v > 0 ? "+" : "") + v.toFixed(3)) : ""}</td>
                        ))}
                        <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: r.ok ? clr(r.totalAdj) : C.mt, fontFamily: "monospace", fontSize: 12 }}>{r.ok ? (r.totalAdj > 0 ? "+" : "") + r.totalAdj.toFixed(3) : ""}</td>
                        <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.ok ? r.net.toFixed(3) : "N/A"}</td>
                        <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 600, color: gap === 0 || gap === null ? C.mt : gap > 0 ? C.gn : C.rd, fontFamily: "monospace", fontSize: 12 }}>{gap !== null ? (gap === 0 ? "—" : gap.toFixed(3)) : ""}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}

            {/* LLPA Waterfall */}
            {view === "decomp" && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(names.length, 4)}, 1fr)`, gap: 10 }}>
                {names.map(name => {
                  const r = results.find(x => x.lender === name);
                  const isHx = name === hxN;
                  return (
                    <div key={name} style={{ background: C.cd, borderRadius: 10, border: `1px solid ${isHx ? C.or + "44" : C.bd}`, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isHx ? C.or : C.tx, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isHx ? "★ " : ""}{name}</div>
                      {r?.ok ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 4, borderBottom: `1px solid ${C.bd}` }}>
                            <span style={{ color: C.dm }}>Base Price</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.base.toFixed(3)}</span>
                          </div>
                          {r.adjustments.map((a, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: C.dm }}>{a.category}</span>
                              <span style={{ fontFamily: "monospace", fontWeight: 600, color: clr(a.value) }}>{(a.value > 0 ? "+" : "") + a.value.toFixed(3)}</span>
                            </div>
                          ))}
                          {r.adjustments.length === 0 && <div style={{ fontSize: 11, color: C.mt, textAlign: "center", padding: 4 }}>No adjustments</div>}
                          <div style={{ borderTop: `1px solid ${C.bd}`, marginTop: 4, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: C.dm, fontWeight: 700 }}>Total LLPA</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: clr(r.totalAdj) }}>{(r.totalAdj > 0 ? "+" : "") + r.totalAdj.toFixed(3)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.dm }}>NET</span>
                            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{r.net.toFixed(3)}</span>
                          </div>
                          {r.rank && <div style={{ textAlign: "center", marginTop: 6 }}><span style={{ background: `${r.rank === 1 ? C.gn : r.rank <= 3 ? C.am : C.rd}22`, color: r.rank === 1 ? C.gn : r.rank <= 3 ? C.am : C.rd, padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 600 }}>#{r.rank}</span></div>}
                        </div>
                      ) : <div style={{ color: C.mt, fontSize: 11, textAlign: "center", padding: 16 }}>{r?.reason || "N/A"}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Matrix */}
            {view === "matrix" && (
              <div style={{ borderRadius: 10, border: `1px solid ${C.bd}`, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.cd }}>
                    <th style={{ padding: "8px 10px", color: C.mt, fontSize: 9, textTransform: "uppercase", borderBottom: `1px solid ${C.bd}`, fontWeight: 700, textAlign: "left" }}>LTV\FICO</th>
                    {config.ficos.map(f => <th key={f} style={{ padding: "8px 10px", textAlign: "center", color: C.mt, fontSize: 9, borderBottom: `1px solid ${C.bd}`, fontWeight: 700 }}>{f}</th>)}
                  </tr></thead>
                  <tbody>{config.ltvs.map(ltv => (
                    <tr key={ltv} style={{ borderBottom: `1px solid ${C.bd}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: C.dm }}>{ltv}%</td>
                      {config.ficos.map(fico => {
                        const res = matrix[`${ltv}_${fico}`] || [];
                        const h = res.find(r => r.lender === hxN);
                        const rk = h?.rank;
                        const gap = h?.ok && res[0]?.ok ? +(h.net - res[0].net).toFixed(3) : null;
                        const bg = rk ? (rk === 1 ? `${C.gn}18` : rk <= 3 ? `${C.gn}0c` : rk <= 5 ? `${C.am}10` : rk <= 10 ? `${C.or}0c` : `${C.rd}0c`) : "transparent";
                        const tc = rk ? (rk === 1 ? C.gn : rk <= 3 ? C.am : rk <= 5 ? C.am : rk <= 10 ? C.or : C.rd) : C.mt;
                        return (
                          <td key={fico} style={{ padding: "6px 8px", textAlign: "center", background: bg, cursor: "pointer" }} onClick={() => { setParams(p => ({ ...p, fico, ltv })); setView("ranking"); }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: tc }}>{rk ? `#${rk}` : "N/A"}</div>
                            {h?.ok && <div style={{ fontSize: 9, color: C.dm, fontFamily: "monospace" }}>{h.net.toFixed(2)}</div>}
                            {gap !== null && gap < 0 && <div style={{ fontSize: 8, color: C.rd, fontFamily: "monospace" }}>{gap.toFixed(3)}</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{ padding: "6px 10px", fontSize: 10, color: C.mt, background: C.cd }}>Click any cell to drill into that scenario · All parameters above apply to every cell</div>
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 10, color: C.mt, textAlign: "center" }}>{names.join(" · ")}</div>
          </>
        )}
      </div>
    </div>
  );
}
