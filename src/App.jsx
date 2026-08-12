import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════════════════════════════
   TRADINGVIEW ECONOMIC CALENDAR WIDGET
   ═══════════════════════════════════════════════════════════════ */
const TradingViewCalendar = memo(function TradingViewCalendar() {
  const container = useRef();
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "en",
        "countryFilter": "us",
        "importanceFilter": "0,1",
        "width": "100%",
        "height": "100%"
      }`;
    container.current.appendChild(script);
  }, []);
  return (
    <div className="tradingview-widget-container" ref={container} style={{height:"100%"}}>
      <div className="tradingview-widget-container__widget" style={{height:"100%"}}></div>
      <div className="tradingview-widget-copyright" style={{fontSize:10,padding:"4px 14px",color:"#666"}}>
        <a href="https://www.tradingview.com/economic-calendar/" rel="noopener nofollow" target="_blank" style={{color:"#4da6ff",textDecoration:"none"}}>Economic Calendar</a>
        <span> by TradingView</span>
      </div>
    </div>
  );
});

const TradingViewNewsFeed = memo(function TradingViewNewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://www.mortgagenewsdaily.com/"));
        const html = await res.text();
        const items = [];

        // Parse "Around the Web" section from page HTML
        const atwMatch = html.match(/Around the Web[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
        if (atwMatch) {
          const listHtml = atwMatch[1];
          const liRegex = /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<\/li>/gi;
          let m;
          while ((m = liRegex.exec(listHtml)) !== null && items.length < 40) {
            const link = m[1];
            const title = m[2].replace(/<[^>]*>/g, "").trim();
            const rest = m[3].replace(/<[^>]*>/g, "").trim();
            // rest is usually "Source - Time"
            const parts = rest.split(" - ");
            const source = parts[0]?.trim() || "";
            const time = parts.slice(1).join(" - ").trim();
            if (title && title.length > 10) items.push({ title, link, source, time });
          }
        }

        // Fallback: also try parsing headline links if ATW section not found
        if (items.length === 0) {
          // Try RSS fallback
          try {
            const rssRes = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent("https://www.mortgagenewsdaily.com/rss/news"));
            const rssData = await rssRes.json();
            if (rssData.items) {
              rssData.items.slice(0, 25).forEach(item => {
                items.push({ title: item.title, link: item.link, source: item.author || "MND", time: new Date(item.pubDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
              });
            }
          } catch(e) {}
        }

        setArticles(items);
      } catch (e) {
        console.error("MND feed error:", e);
      }
      setLoading(false);
    }
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{height:"100%",overflow:"auto",background:T.sf}}>
      {loading ? (
        <div style={{padding:20,textAlign:"center",color:T.muted,fontSize:11}}>Loading mortgage news...</div>
      ) : articles.length === 0 ? (
        <div style={{padding:20,textAlign:"center",color:T.muted,fontSize:11}}>Unable to load news feed</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column"}}>
          {articles.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener noreferrer" style={{
              display:"block",padding:"9px 14px",borderBottom:`1px solid ${T.border}`,
              textDecoration:"none",transition:"background .1s",cursor:"pointer",
            }} onMouseEnter={e=>e.currentTarget.style.background=T.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{fontSize:11,color:T.text,lineHeight:1.4,fontWeight:500,marginBottom:2}}>{a.title}</div>
              <div style={{fontSize:9,color:T.muted}}>
                <span style={{color:T.accent,fontWeight:600}}>{a.source}</span>
                {a.time&&<><span style={{margin:"0 5px"}}>·</span><span>{a.time}</span></>}
              </div>
            </a>
          ))}
        </div>
      )}
      <div style={{padding:"6px 14px",fontSize:9,color:T.dark,borderTop:`1px solid ${T.border}`}}>
        <a href="https://www.mortgagenewsdaily.com/aroundtheweb" target="_blank" rel="noopener noreferrer" style={{color:T.hxTeal,textDecoration:"none"}}>Mortgage News Daily — Around the Web</a>
        <span> · Auto-refreshes every 5 min</span>
      </div>
    </div>
  );
});

function MarketWidgets() {
  return (
    <div style={{marginTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:T.card,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.muted}}>ECONOMIC CALENDAR</span>
          <span style={{fontSize:9,color:T.dark,letterSpacing:1}}>— U.S. HIGH IMPACT</span>
        </div>
        <div style={{height:450}}><TradingViewCalendar /></div>
      </div>
      <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:T.card,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.muted}}>MORTGAGE NEWS</span>
          <span style={{fontSize:9,color:T.dark,letterSpacing:1}}>— MORTGAGE NEWS DAILY</span>
        </div>
        <div style={{height:450}}><TradingViewNewsFeed /></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════════════ */
const T = {
  bg:"#0c1220",sf:"#111827",card:"#162032",border:"#1e2a3e",borderL:"#2a3a52",
  accent:"#f7941d",accentDim:"#f7941d22",blue:"#3b82f6",purple:"#8b5cf6",orange:"#f7941d",
  green:"#10b981",red:"#ef4444",amber:"#f59e0b",
  text:"#f8fafc",sub:"#cbd5e1",muted:"#64748b",dark:"#475569",
  mono:"'JetBrains Mono','SF Mono','Consolas',monospace",
  sans:"'Inter',-apple-system,sans-serif",
  hxNavy:"#0c1220",hxOrange:"#f7941d",hxTeal:"#0ea5e9",
};
const clr=v=>v>0?T.green:v<0?T.red:T.muted;

/* ═══════════════════════════════════════════════════════════════
   URL PARAMS — bookmarkable scenarios
   ═══════════════════════════════════════════════════════════════ */
function readParams() {
  const u = new URLSearchParams(window.location.search);
  const p = {};
  if (u.get("rate")) p.rate = +u.get("rate");
  if (u.get("fico")) p.fico = +u.get("fico");
  if (u.get("ltv")) p.ltv = +u.get("ltv");
  if (u.get("lock")) p.lock = u.get("lock");
  if (u.get("purpose")) p.purpose = u.get("purpose");
  if (u.get("dscr")) p.dscr = u.get("dscr");
  if (u.get("ppp")) p.ppp = u.get("ppp");
  if (u.get("loanAmount")) p.loanAmount = u.get("loanAmount");
  if (u.get("occupancy")) p.occupancy = u.get("occupancy");
  if (u.get("property")) p.propertyType = u.get("property");
  if (u.get("io")) p.interestOnly = u.get("io");
  if (u.get("selfEmp")) p.selfEmployed = u.get("selfEmp");
  if (u.get("lpc")) p.lpc = u.get("lpc");
  if (u.get("income")) p.incomeDoc = u.get("income");
  if (u.get("view")) p._view = u.get("view");
  return p;
}

function writeParams(params, view) {
  const u = new URLSearchParams();
  const defaults = { rate:7.25,fico:720,ltv:75,lock:"30",purpose:"Purchase",dscr:"1.00",ppp:"3 Year" };
  for (const [k,v] of Object.entries(params)) {
    if (k.startsWith("_") || v === "No" || v === defaults[k]) continue;
    const key = k === "propertyType" ? "property" : k === "interestOnly" ? "io" : k === "selfEmployed" ? "selfEmp" : k === "incomeDoc" ? "income" : k;
    u.set(key, v);
  }
  if (view !== "ranking") u.set("view", view);
  const qs = u.toString();
  const newUrl = window.location.pathname + (qs ? "?" + qs : "");
  window.history.replaceState(null, "", newUrl);
}

/* ═══════════════════════════════════════════════════════════════
   ENGINE
   ═══════════════════════════════════════════════════════════════ */
const CONFIGS = {
  consumer:{label:"PRIMEX CONSUMER",ltvs:[90,85,80,75,70,65,60,55,50],ficos:[660,680,700,720,740,760]},
  dscr:{label:"INVESTORX DSCR",ltvs:[80,75,70,65,60,55,50],ficos:[620,640,660,680,700,720,740,760]},
};

function matchBand(val,keys,type){if(type==="ltv"){for(const k of keys){const n=parseInt(k);if(!isNaN(n)&&val<=n)return k;}return keys[keys.length-1];}const sorted=[...keys].sort((a,b)=>parseInt(b.match(/\d+/)?.[0]||"0")-parseInt(a.match(/\d+/)?.[0]||"0"));for(const k of sorted){const nums=k.match(/\d+/g)?.map(Number)||[];if(k.includes(">=")&&val>=nums[0])return k;if(nums.length===1&&val>=nums[0]-19&&val<=nums[0]+10)return k;}return sorted[sorted.length-1];}

function findLlpa(llpas,terms,ltvB){for(const t of terms)for(const[n,v]of Object.entries(llpas))if(n.toLowerCase().includes(t.toLowerCase())){const val=v[ltvB];if(val!=null)return{name:n,value:val};}return{name:null,value:0};}

/* ═══════════════════════════════════════════════════════════════
   HX ELIGIBILITY ENGINE
   Checks HomeXpress-specific eligibility rules per the rate sheet
   Company Adjustments. Returns { eligible, maxLtv, warnings[], reason }
   ═══════════════════════════════════════════════════════════════ */
function checkHxEligibility(p, product) {
  const w = []; // warnings
  let maxLtv = product === "dscr" ? 80 : 90;
  const fico = parseInt(p.fico) || 720;
  const ltv = parseInt(p.ltv) || 75;
  const amt = parseInt(p.loanAmount) || 750000;
  const purpose = p.purpose || "Purchase";
  const isPurch = purpose === "Purchase";
  const isRT = purpose.includes("Rate") || purpose.includes("R/T");
  const isCO = purpose.includes("Cash");
  const dscr = parseFloat(p.dscr) || 1.0;
  const isIO = p.interestOnly === "Yes";
  const isFN = p.foreignNational === "Yes";
  const isSTR = p.str === "Yes";
  const isCondotel = p.propertyType === "Condotel";
  const isRural = p.rural === "Yes";
  const isHighRise = p.propertyType === "High-Rise Condo";
  const isCondo = p.propertyType === "Condo" || isHighRise;
  const units = parseInt(p.units) || 1;
  const hasPPP = p.ppp && p.ppp !== "None" && p.ppp !== "No Prepay";
  const pppYears = hasPPP ? parseInt(p.ppp) || 0 : 0;
  const hasLPC = p.lpc && parseFloat(p.lpc) > 0;
  const is2ndHome = p.occupancy === "Second Home" || p.occupancy === "2nd Home";
  const housing1x30 = p.housing1x30 === "Yes";

  if (product === "consumer") {
    // ═══ PRIMEX / PREMIERX ELIGIBILITY ═══

    // Hard disqualifiers
    if (fico < 660) return { eligible: false, maxLtv: 0, warnings: [], reason: "Min FICO 660" };
    if (amt < 100000) return { eligible: false, maxLtv: 0, warnings: [], reason: "Min loan $100k" };
    if (amt > 4000000) return { eligible: false, maxLtv: 0, warnings: [], reason: "Max loan $4.0MM" };
    if (p.occupancy === "Investment" || p.occupancy === "Non-Owner") return { eligible: false, maxLtv: 0, warnings: [], reason: "Investment not eligible" };
    if (isFN) return { eligible: false, maxLtv: 0, warnings: [], reason: "Foreign National not eligible" };
    if (isCondotel) return { eligible: false, maxLtv: 0, warnings: [], reason: "Condotel not eligible" };
    if (isSTR) return { eligible: false, maxLtv: 0, warnings: [], reason: "STR not eligible" };
    if (p.incomeDoc === "DSCR") return { eligible: false, maxLtv: 0, warnings: [], reason: "DSCR doc not eligible" };

    // Max LTV by purpose
    if (isRT || isCO) maxLtv = Math.min(maxLtv, 85);
    if (isCO) maxLtv = Math.min(maxLtv, 80);

    // I/O cap
    if (isIO) { maxLtv = Math.min(maxLtv, 85); if (units >= 2) return { eligible: false, maxLtv: 0, warnings: [], reason: "I/O: 2-4 Units not eligible" }; }

    // Full/Alt Doc Purchase LTV matrix
    if (isPurch) {
      if (amt <= 1500000) { if (fico < 680) maxLtv = Math.min(maxLtv, 80); else if (fico < 700) maxLtv = Math.min(maxLtv, 85); }
      if (amt > 1500000 && amt <= 2000000) { if (fico < 720) maxLtv = Math.min(maxLtv, 80); }
      if (amt > 2000000 && amt <= 3000000) { maxLtv = Math.min(maxLtv, 80); if (fico < 720) maxLtv = Math.min(maxLtv, 80); if (fico < 700) maxLtv = Math.min(maxLtv, 75); }
      if (amt > 2000000 && fico < 660) maxLtv = Math.min(maxLtv, 65);
      if (amt > 3000000) { if (fico >= 700) maxLtv = Math.min(maxLtv, 65); else return { eligible: false, maxLtv: 0, warnings: [], reason: ">$3MM: FICO ≥700 required" }; }
    }

    // R/T Refi LTV matrix
    if (isRT) {
      if (amt <= 1500000) { if (fico < 680) maxLtv = Math.min(maxLtv, 80); }
      if (amt > 1500000) maxLtv = Math.min(maxLtv, 80);
      if (amt > 2000000 && amt <= 3000000 && fico < 700) maxLtv = Math.min(maxLtv, 75);
      if (amt > 3000000) { if (fico >= 700) maxLtv = Math.min(maxLtv, 65); else return { eligible: false, maxLtv: 0, warnings: [], reason: ">$3MM R/T: FICO ≥700 required" }; }
    }

    // Cash-Out LTV matrix
    if (isCO) {
      if (amt <= 1500000 && fico < 680) maxLtv = Math.min(maxLtv, 75);
      if (amt > 1500000 && amt <= 2000000) { if (fico < 720) maxLtv = Math.min(maxLtv, 80); if (fico < 700) maxLtv = Math.min(maxLtv, 75); }
      if (amt > 2000000) { if (fico >= 720) maxLtv = Math.min(maxLtv, 80); else if (fico >= 700) maxLtv = Math.min(maxLtv, 75); else maxLtv = Math.min(maxLtv, 70); }
      if (amt > 3000000) { if (fico >= 700) maxLtv = Math.min(maxLtv, 60); else return { eligible: false, maxLtv: 0, warnings: [], reason: ">$3MM C/O: FICO ≥700 required" }; }
    }

    // 2nd Home restrictions
    if (is2ndHome) {
      if (isPurch && fico < 700) maxLtv = Math.min(maxLtv, 80);
      if (isPurch) maxLtv = Math.min(maxLtv, 85);
      if (isRT) maxLtv = Math.min(maxLtv, 80);
      if (isCO) maxLtv = Math.min(maxLtv, 75);
    }

    // Property restrictions
    if (isHighRise) maxLtv = Math.min(maxLtv, 80);
    if (isRural && isPurch) maxLtv = Math.min(maxLtv, 75);
    if (isRural && (isRT || isCO)) maxLtv = Math.min(maxLtv, 70);
    if (housing1x30) maxLtv = Math.min(maxLtv, 90);

    // Warnings
    if (ltv > 85) w.push("DTI capped at 45% when LTV > 85%");
    if (amt > 2000000) w.push("6 months reserves required");

  } else {
    // ═══ INVESTORX DSCR ELIGIBILITY ═══

    // FICO floors by DSCR
    const minFico = dscr >= 0.75 ? 620 : 640;
    if (fico < minFico) return { eligible: false, maxLtv: 0, warnings: [], reason: `Min FICO ${minFico} for DSCR ${dscr < 0.75 ? "<0.75" : "≥0.75"}` };

    // Loan amount limits
    const maxAmt = dscr < 0.75 ? 2000000 : 2500000;
    const minAmt = isCondotel ? 150000 : (dscr < 0.75 ? 200000 : 100000);
    if (amt < minAmt) return { eligible: false, maxLtv: 0, warnings: [], reason: `Min loan $${(minAmt/1000).toFixed(0)}k` };
    if (amt > maxAmt) return { eligible: false, maxLtv: 0, warnings: [], reason: `Max loan $${(maxAmt/1000000).toFixed(1)}MM` };
    if (amt > 2000000 && ltv > 70) maxLtv = Math.min(maxLtv, 70);

    // Occupancy — investment only
    if (p.occupancy !== "Investment" && p.occupancy !== "Non-Owner") return { eligible: false, maxLtv: 0, warnings: [], reason: "Investment property only" };

    // Income doc restrictions
    if (p.incomeDoc === "Bank Statement") return { eligible: false, maxLtv: 0, warnings: [], reason: "Bank Stmt not eligible for InvestorX" };

    // LPC requires PPP
    if (hasLPC && !hasPPP) return { eligible: false, maxLtv: 0, warnings: [], reason: "LPC requires prepay penalty" };

    // DSCR < 1.0 caps
    if (dscr < 1.0 && dscr >= 0.75) maxLtv = Math.min(maxLtv, 75);
    if (dscr < 0.75) {
      maxLtv = Math.min(maxLtv, 70);
      if (isRural) return { eligible: false, maxLtv: 0, warnings: [], reason: "Rural not eligible for DSCR <0.75" };
      w.push("DSCR <0.75: 0x30 housing only, 6 mo reserves");
    }

    // DSCR Purchase LTV matrix
    if (isPurch && !isSTR && !isCondotel) {
      if (amt <= 1500000) { if (fico < 700) maxLtv = Math.min(maxLtv, 75); if (fico < 680) maxLtv = Math.min(maxLtv, 70); if (fico < 660) maxLtv = Math.min(maxLtv, 70); }
      if (amt > 1500000 && amt <= 2000000) { maxLtv = Math.min(maxLtv, 75); if (fico < 680) maxLtv = Math.min(maxLtv, 65); if (fico < 660) maxLtv = Math.min(maxLtv, 60); }
      if (amt > 2000000) { maxLtv = Math.min(maxLtv, 70); if (fico < 680) maxLtv = Math.min(maxLtv, 65); w.push("≥$2MM: Min DSCR 1.0, Min FICO 660"); }
    }

    // DSCR R/T Refi LTV matrix
    if (isRT && !isSTR && !isCondotel) {
      if (amt <= 1500000) { if (fico < 700) maxLtv = Math.min(maxLtv, 75); if (fico < 680) maxLtv = Math.min(maxLtv, 70); if (fico < 660) maxLtv = Math.min(maxLtv, 70); }
      if (amt > 1500000 && amt <= 2000000) { maxLtv = Math.min(maxLtv, 75); if (fico < 680) maxLtv = Math.min(maxLtv, 65); if (fico < 660) maxLtv = Math.min(maxLtv, 60); }
      if (amt > 2000000) { maxLtv = Math.min(maxLtv, 70); if (fico < 680) maxLtv = Math.min(maxLtv, 65); }
    }

    // DSCR Cash-Out LTV matrix
    if (isCO && !isSTR && !isCondotel) {
      if (amt <= 1500000) { if (fico < 720) maxLtv = Math.min(maxLtv, 75); if (fico < 680) maxLtv = Math.min(maxLtv, 70); }
      if (amt > 1500000 && amt <= 2000000) { maxLtv = Math.min(maxLtv, 75); if (fico < 680) maxLtv = Math.min(maxLtv, 65); if (fico < 660) maxLtv = Math.min(maxLtv, 60); }
      if (amt > 2000000) { maxLtv = Math.min(maxLtv, 70); if (fico < 700) maxLtv = Math.min(maxLtv, 65); }
    }

    // No DSCR LTV matrix
    if (dscr < 0.75) {
      if (amt <= 1500000) { if (fico >= 720) maxLtv = Math.min(maxLtv, 70); else if (fico >= 700) maxLtv = Math.min(maxLtv, 65); else if (fico >= 680) maxLtv = Math.min(maxLtv, 60); else if (fico >= 660 && (isPurch || isRT)) maxLtv = Math.min(maxLtv, 55); else if (fico >= 660 && isCO) maxLtv = Math.min(maxLtv, 55); }
      if (amt > 1500000 && amt <= 2000000) { if (fico >= 700) maxLtv = Math.min(maxLtv, 60); else if (fico >= 680) maxLtv = Math.min(maxLtv, 55); else maxLtv = Math.min(maxLtv, 50); }
    }

    // STR LTV matrix
    if (isSTR) {
      maxLtv = Math.min(maxLtv, 75);
      if (fico < 620) return { eligible: false, maxLtv: 0, warnings: [], reason: "STR: Min FICO 620" };
      if (amt <= 1500000) { if (fico < 660) maxLtv = Math.min(maxLtv, 70); }
      if (amt > 1500000 && amt <= 2000000) { maxLtv = Math.min(maxLtv, 70); if (fico < 660) maxLtv = Math.min(maxLtv, 65); }
      if (amt > 2000000 && amt <= 2500000) { maxLtv = Math.min(maxLtv, 65); if (fico < 660) return { eligible: false, maxLtv: 0, warnings: [], reason: "STR >$2MM: FICO ≥660 required" }; }
    }

    // Foreign National
    if (isFN) {
      if (p.incomeDoc !== "DSCR") return { eligible: false, maxLtv: 0, warnings: [], reason: "FN: DSCR doc only" };
      if (isPurch) maxLtv = Math.min(maxLtv, 75);
      if (isRT || isCO) maxLtv = Math.min(maxLtv, 70);
      if (isCondotel) maxLtv = Math.min(maxLtv, 65);
      w.push("FN: Must vest in LLC/Corp");
    }

    // Condotel
    if (isCondotel) {
      if (amt > 1500000) return { eligible: false, maxLtv: 0, warnings: [], reason: "Condotel: Max $1.5MM" };
      if (isRT || isCO) maxLtv = Math.min(maxLtv, 65);
    }

    // Property caps
    if (isHighRise) maxLtv = Math.min(maxLtv, 80);
    if (isRural && isPurch) maxLtv = Math.min(maxLtv, 75);
    if (isRural && (isRT || isCO)) maxLtv = Math.min(maxLtv, 70);
    if (housing1x30) { maxLtv = Math.min(maxLtv, 75); if (fico < 700) return { eligible: false, maxLtv: 0, warnings: [], reason: "1x30 housing: FICO ≥700 required" }; }

    // Reserves warnings
    if (ltv > 65) w.push("3 months reserves required (LTV > 65%)");
    if (amt > 1500000) w.push("6 months reserves required (>$1.5MM)");
  }

  // Final LTV check
  if (ltv > maxLtv) {
    return { eligible: false, maxLtv, warnings: w, reason: `LTV ${ltv}% exceeds max ${maxLtv}%` };
  }

  return { eligible: true, maxLtv, warnings: w, reason: "" };
}

function calcNet(lender,p){
  const adjs=[];const r={lender:lender.name,rate:p.rate,base:null,adjustments:adjs,totalAdj:0,net:null,ok:true,reason:""};
  const rk=Object.keys(lender.rates).map(Number).sort((a,b)=>Math.abs(a-p.rate)-Math.abs(b-p.rate))[0];
  if(!rk||Math.abs(rk-p.rate)>0.2)return{...r,ok:false,reason:"Rate N/A"};
  r.base=lender.rates[rk]?.[p.lock];if(!r.base)return{...r,ok:false,reason:`No ${p.lock}-day`};
  const bands=Object.values(lender.llpas)[0]?Object.keys(Object.values(lender.llpas)[0]):[];
  const ltvB=matchBand(p.ltv,bands,"ltv");
  const ficoKeys=Object.keys(lender.llpas).filter(k=>/fico/i.test(k));
  const ficoB=matchBand(p.fico,ficoKeys,"fico");

  // 1. FICO / LTV (primary grid)
  if(ficoB&&lender.llpas[ficoB]){const v=lender.llpas[ficoB][ltvB];if(v==null)return{...r,ok:false,reason:`${ficoB}/${ltvB} N/A`};adjs.push({cat:"FICO/LTV",name:ficoB,value:v});}

  // 2. Purpose
  if(p.purpose!=="Purchase"){const{name,value}=findLlpa(lender.llpas,[p.purpose.includes("Cash")?"Cash":"Rate/Term"],ltvB);if(value)adjs.push({cat:"Purpose",name,value});}

  // 3. Income Doc
  if(p.incomeDoc&&p.incomeDoc!=="Bank Statement"&&p.incomeDoc!=="DSCR"){const{name,value}=findLlpa(lender.llpas,[p.incomeDoc,"Full Doc","Asset","Alt Doc"],ltvB);if(value)adjs.push({cat:"Income",name,value});}

  // 4. Interest Only (with DSCR-aware matching)
  if(p.interestOnly==="Yes"){
    const dv=parseFloat(p.dscr)||1;
    let ioTerms;
    if(p.incomeDoc==="Full Doc"||p.incomeDoc==="Alt Doc") ioTerms=["I/O Full","I/O Alt","Interest Only"];
    else if(dv>=1) ioTerms=["I/O & DSCR Ratio >=","I/O & DSCR >=","Interest Only"];
    else ioTerms=["I/O & DSCR Ratio <","I/O & DSCR <","Interest Only"];
    const{name,value}=findLlpa(lender.llpas,ioTerms,ltvB);if(value)adjs.push({cat:"I/O",name,value});
  }

  // 5. ARM
  if(p.arm==="Yes"){const{name,value}=findLlpa(lender.llpas,["ARM"],ltvB);if(value)adjs.push({cat:"ARM",name,value});}

  // 6. Self-Employed
  if(p.selfEmployed==="Yes"){const{name,value}=findLlpa(lender.llpas,["Self-Employed","Self Emp"],ltvB);if(value)adjs.push({cat:"Self-Emp",name,value});}

  // 7. Property Type — High-Rise Condo
  if(p.propertyType==="High-Rise Condo"){const{name,value}=findLlpa(lender.llpas,["High-Rise","High Rise","Condo"],ltvB);if(value)adjs.push({cat:"Property",name,value});}
  // 8. Property Type — Non-Warrantable Condo
  else if(p.propertyType==="Non-Warr Condo"){const{name,value}=findLlpa(lender.llpas,["Non-Warr","Non Warr","Condo"],ltvB);if(value)adjs.push({cat:"Property",name,value});}
  // 9. Property Type — Standard Condo
  else if(p.propertyType==="Condo"){const{name,value}=findLlpa(lender.llpas,["Condo"],ltvB);if(value&&!/high.rise|non.warr/i.test(name))adjs.push({cat:"Property",name,value});}
  // 10. Property Type — Condotel
  if(p.propertyType==="Condotel"){const{name,value}=findLlpa(lender.llpas,["Condotel"],ltvB);if(value)adjs.push({cat:"Condotel",name,value});}

  // 11. Units
  if(parseInt(p.units)>=2){const{name,value}=findLlpa(lender.llpas,["2-4 Units","2 Units"],ltvB);if(value)adjs.push({cat:"Units",name,value});}

  // 12. Occupancy — 2nd Home
  if(p.occupancy==="Second Home"||p.occupancy==="2nd Home"){const{name,value}=findLlpa(lender.llpas,["2nd Home","Second"],ltvB);if(value)adjs.push({cat:"Occupancy",name,value});}
  // 13. Occupancy — Investment
  if(p.occupancy==="Investment"||p.occupancy==="Non-Owner"){const{name,value}=findLlpa(lender.llpas,["Non-Owner","NOO","Investment"],ltvB);if(value)adjs.push({cat:"Occupancy",name,value});}

  // 14. DSCR Ratio
  if(p.dscr){const dv=parseFloat(p.dscr);let t=[];if(dv>=1.25)t=["DSCR 1.25","DSCR 1.2"];else if(dv>=1.0)t=["DSCR 1.00","DSCR 1.0"];else if(dv>=0.75)t=["DSCR 0.75","DSCR 0.7"];else t=["No DSCR","DSCR (<"];const{name,value}=findLlpa(lender.llpas,t,ltvB);if(value)adjs.push({cat:"DSCR",name,value});}

  // 15. Prepayment Penalty
  if(p.ppp&&p.ppp!=="None"&&p.ppp!=="No Prepay"){const{name,value}=findLlpa(lender.llpas,[p.ppp],ltvB);if(value)adjs.push({cat:"PPP",name,value});}
  if(p.ppp==="No Prepay"||p.ppp==="None"){const{name,value}=findLlpa(lender.llpas,["No Prepay","No PPP","None"],ltvB);if(value)adjs.push({cat:"PPP",name,value});}

  // 16. Loan Amount tiers
  if(p.loanAmount){
    const a=parseInt(p.loanAmount);let t=[];
    if(a>3500000)t=["$3.5mm","> $3.5","Loan Amt > $3.5"];
    else if(a>3000000)t=["$3.0mm","> $3.0","$3.0mm","Loan Amt > $3.0"];
    else if(a>2000000)t=["> $2.0","Loan Amt > $2.0","$2.0mm"];
    else if(a>1500000)t=["> $1.5","$1.5mm","Loan Amt > $1.5"];
    else if(a>=500000)t=["$500k","≥ $500","Loan Amt >= $500","Loan Amt >="];
    else if(a>=300000)t=["$300k","≥ $300","Loan Amt >= $300"];
    else if(a>=200000)t=["$200k","≥ $200"];
    else if(a>=150000)t=["$150k","≥ $150"];
    else t=["<$150","< $150","Loan Amt < $150"];
    const{name,value}=findLlpa(lender.llpas,t,ltvB);if(value)adjs.push({cat:"Loan Amt",name,value});
  }

  // 17. Impound Waiver
  if(p.impoundWaiver==="Yes"){const{name,value}=findLlpa(lender.llpas,["Impound","Waive"],ltvB);if(value)adjs.push({cat:"Impound",name,value});}

  // 18. Rural
  if(p.rural==="Yes"){const{name,value}=findLlpa(lender.llpas,["Rural"],ltvB);if(value)adjs.push({cat:"Rural",name,value});}

  // 19. Short Term Rental
  if(p.str==="Yes"){const{name,value}=findLlpa(lender.llpas,["Short Term","STR"],ltvB);if(value)adjs.push({cat:"STR",name,value});}

  // 20. Foreign National
  if(p.foreignNational==="Yes"){const{name,value}=findLlpa(lender.llpas,["Foreign"],ltvB);if(value)adjs.push({cat:"Foreign",name,value});}

  // 21. NPRA (Non-Permanent Resident Alien)
  if(p.npra==="Yes"){const{name,value}=findLlpa(lender.llpas,["NPRA","Non-Perm","Non Perm","Resident Alien"],ltvB);if(value)adjs.push({cat:"NPRA",name,value});}

  // 22. Housing 1x30
  if(p.housing1x30==="Yes"){const{name,value}=findLlpa(lender.llpas,["Housing 1x30","Housing","1x30"],ltvB);if(value)adjs.push({cat:"Housing",name,value});}

  // 23. TX Cash-Out
  if(p.txCashOut==="Yes"||( p.state==="TX"&&p.purpose==="Cash-Out")){const{name,value}=findLlpa(lender.llpas,["Texas","TX Cash","Texas Cash"],ltvB);if(value)adjs.push({cat:"TX Cash-Out",name,value});}

  // 24. DTI adjustment
  if(p.dti){
    const dtiVal=parseFloat(p.dti);
    if(!isNaN(dtiVal)&&dtiVal<=43){const{name,value}=findLlpa(lender.llpas,["DTI <= 43","DTI <=43","DTI"],ltvB);if(value)adjs.push({cat:"DTI",name,value});}
    if(!isNaN(dtiVal)&&dtiVal>45){const{name,value}=findLlpa(lender.llpas,["DTI >45","DTI > 45","<700 FICO","FICO & DTI"],ltvB);if(value)adjs.push({cat:"DTI Penalty",name,value});}
  } else {
    // Default DTI check even if not entered
    const dti=findLlpa(lender.llpas,["DTI <= 43%","DTI"],ltvB);if(dti.value)adjs.push({cat:"DTI",name:dti.name,value:dti.value});
  }

  // 25. 60-Day Lock extension
  if(p.lock==="60"){const{name,value}=findLlpa(lender.llpas,["60 Day","60 Lock","Lock Extension"],ltvB);if(value)adjs.push({cat:"Lock Ext",name,value});}

  // 26. LPC (Lender Paid Comp) — direct price deduction
  if(p.lpc){const lpcVal=parseFloat(p.lpc);if(!isNaN(lpcVal)&&lpcVal!==0)adjs.push({cat:"LPC",name:"Lender Paid Comp",value:-Math.abs(lpcVal)});}

  r.totalAdj=+(adjs.reduce((s,a)=>s+a.value,0)).toFixed(3);r.net=+(r.base+r.totalAdj).toFixed(3);return r;
}

/* ═══════════════════════════════════════════════════════════════
   BUYDOWN / RATE SENSITIVITY ANALYSIS
   ═══════════════════════════════════════════════════════════════ */
function calcBuydownAnalysis(lenders, params) {
  const allRates = [...new Set(Object.values(lenders).flatMap(l=>Object.keys(l.rates).map(Number)))].sort((a,b)=>a-b);
  const analysis = {};

  for (const [name, lender] of Object.entries(lenders)) {
    const rows = [];
    let prevNet = null;
    for (const rate of allRates) {
      const r = calcNet(lender, { ...params, rate });
      if (r.ok && r.net) {
        const delta = prevNet !== null ? +(r.net - prevNet).toFixed(3) : null;
        const ratio = delta !== null && rate > allRates[0] ? +(delta / 0.125).toFixed(3) : null;
        rows.push({ rate, base: r.base, totalAdj: r.totalAdj, net: r.net, delta, ratio, eligible: true });
        prevNet = r.net;
      } else {
        rows.push({ rate, base: null, totalAdj: null, net: null, delta: null, ratio: null, eligible: false, reason: r.reason });
        prevNet = null;
      }
    }
    analysis[name] = rows;
  }

  // Find optimal coupon (max price) per lender
  for (const [name, rows] of Object.entries(analysis)) {
    const eligible = rows.filter(r => r.eligible);
    if (eligible.length) {
      const maxRow = eligible.reduce((best, r) => r.net > best.net ? r : best, eligible[0]);
      maxRow.isOptimal = true;
    }
  }

  return { rates: allRates, analysis };
}

/* ═══════════════════════════════════════════════════════════════
   PAR RATE ANALYSIS
   For each FICO/LTV, find HX par rate (net ≈ 100), then compare
   HX net price at par vs every competitor at the same rate.
   ═══════════════════════════════════════════════════════════════ */
function calcParAnalysis(lenders, params, config, hxName) {
  const allRates = [...new Set(Object.values(lenders).flatMap(l=>Object.keys(l.rates).map(Number)))].sort((a,b)=>a-b);
  const hxLender = lenders[hxName];
  if (!hxLender) return null;

  const competitors = Object.entries(lenders).filter(([n])=>n!==hxName);
  const grid = {};

  for (const fico of config.ficos) {
    for (const ltv of config.ltvs) {
      const key = `${ltv}_${fico}`;

      // Find HX par rate: rate where net price is closest to 100.000
      let bestParRate = null, bestParNet = null, bestParDiff = Infinity;
      for (const rate of allRates) {
        const r = calcNet(hxLender, { ...params, rate, fico, ltv });
        if (r.ok && r.net !== null) {
          const diff = Math.abs(r.net - 100);
          if (diff < bestParDiff) {
            bestParDiff = diff;
            bestParRate = rate;
            bestParNet = r.net;
          }
        }
      }

      if (!bestParRate) {
        grid[key] = { fico, ltv, parRate: null, hxNet: null, competitors: {} };
        continue;
      }

      // At HX par rate, calculate every competitor's net price
      const compResults = {};
      for (const [compName, compLender] of competitors) {
        const cr = calcNet(compLender, { ...params, rate: bestParRate, fico, ltv });
        const diff = cr.ok && cr.net ? +(bestParNet - cr.net).toFixed(3) : null;
        compResults[compName] = {
          net: cr.ok ? cr.net : null,
          diff,  // positive = HX better, negative = competitor better
          eligible: cr.ok,
          reason: cr.reason,
        };
      }

      grid[key] = { fico, ltv, parRate: bestParRate, hxNet: bestParNet, competitors: compResults };
    }
  }

  return { grid, competitors: competitors.map(([n])=>n) };
}

/* ═══════════════════════════════════════════════════════════════
   PARSER
   ═══════════════════════════════════════════════════════════════ */
function parseFile(data){
  const wb=XLSX.read(data,{type:"array"});const lenders={};let prod="consumer";
  for(const name of wb.SheetNames){if(/instruct/i.test(name)){if(XLSX.utils.sheet_to_csv(wb.Sheets[name]).toLowerCase().includes("dscr"))prod="dscr";continue;}const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:""});const l={name,rates:{},llpas:{}};let sec=null,cols=[];for(const row of rows){const f=String(row[0]||"").trim();if(/base.*(rate|price)/i.test(f)){sec="r";continue;}if(/fico.*(adjust|pricing)/i.test(f)){sec="f";continue;}if(/loan level|other.*adjust|pricing adjust/i.test(f)&&!/fico/i.test(f)){sec="l";continue;}if(f==="Rate"||(sec!=="r"&&(/^(Adjustment|FICO\s*\/\s*LTV)$/i.test(f)||f==="FICO / LTV"||f==="FICO/LTV"))){if(sec!=="r")cols=row.slice(1).map(v=>String(v).trim()).filter(Boolean);continue;}if(sec==="r"&&f){const rate=parseFloat(f.replace("%",""));if(!isNaN(rate)&&rate>3){l.rates[rate]={};["15","30","45"].forEach((lk,i)=>{const v=parseFloat(row[i+1]);if(!isNaN(v)&&v>50)l.rates[rate][lk]=v;});}}if((sec==="f"||sec==="l")&&f&&cols.length){const vals={};cols.forEach((b,i)=>{const v=row[i+1];vals[b]=(v==="N/A"||v===""||v===undefined)?null:isNaN(parseFloat(v))?null:parseFloat(v);});l.llpas[f]=vals;if(/dscr/i.test(f))prod="dscr";}}if(Object.keys(l.rates).length)lenders[name]=l;}return{lenders,product:prod};
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════════ */
function exportPDF(results,matrix,buydown,config,params,lenders,view,hxN){
  const hx=results.find(r=>r.lender===hxN);const best=results[0];
  const gap=hx?.ok&&best?.ok?(hx.net-best.net).toFixed(3):"N/A";
  const ts=new Date().toLocaleString();
  const allCats=[...new Set(results.flatMap(r=>r.adjustments?.map(a=>a.cat)||[]))];
  const elig=checkHxEligibility(params,config===CONFIGS.dscr?"dscr":"consumer");

  // Narrative
  let narrative = "";
  if (hx?.ok && best?.ok) {
    const gapVal = hx.net - best.net;
    const biggestGap = allCats.map(c => {
      const hxA = hx.adjustments.filter(a=>a.cat===c).reduce((s,a)=>s+a.value,0);
      const bestA = best.adjustments.filter(a=>a.cat===c).reduce((s,a)=>s+a.value,0);
      return { cat: c, diff: +(hxA - bestA).toFixed(3) };
    }).sort((a,b) => a.diff - b.diff)[0];

    if (gapVal >= 0) narrative = `HX is #${hx.rank} with a net price of ${hx.net.toFixed(3)}, leading the comparison.`;
    else narrative = `HX nets ${hx.net.toFixed(3)} (Rank #${hx.rank}) vs ${best.lender} at ${best.net.toFixed(3)}. Gap of ${gapVal.toFixed(3)} driven primarily by ${biggestGap?.cat} (${biggestGap?.diff > 0 ? "+" : ""}${biggestGap?.diff?.toFixed(3)} differential). To match #1, HX needs ${Math.abs(gapVal).toFixed(3)} pts improvement.`;
  }

  let html = `<html><head><style>
    @page{margin:25px 30px;size:landscape;}
    body{font-family:'Inter',Arial,sans-serif;color:#1a1a1a;margin:0;padding:30px 40px;background:#fff;}
    h1{font-size:22px;color:#000;margin:0;letter-spacing:2px;text-transform:uppercase;font-weight:800;}
    h2{font-size:13px;color:#000;margin:28px 0 8px;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid #000;padding-bottom:4px;font-weight:700;}
    h3{font-size:11px;color:#444;margin:18px 0 6px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;}
    .sub{font-size:9px;color:#999;margin:3px 0 16px;letter-spacing:2px;text-transform:uppercase;}
    .narrative{background:#f0faf7;border-left:3px solid #00b894;padding:10px 14px;margin:14px 0;font-size:10px;line-height:1.7;color:#333;}
    .kpi-grid{display:flex;gap:10px;margin:14px 0;}
    .kpi{border:1px solid #e0e0e0;padding:10px 14px;min-width:110px;border-radius:2px;}
    .kpi-label{font-size:8px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600;}
    .kpi-value{font-size:20px;font-weight:800;margin-top:3px;font-family:'Consolas','SF Mono',monospace;}
    table{width:100%;border-collapse:collapse;font-size:9px;margin:6px 0;font-family:'Consolas','SF Mono',monospace;}
    th{background:#111;color:#fff;padding:6px 7px;text-align:center;font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;}
    td{padding:5px 7px;border-bottom:1px solid #eee;text-align:center;}
    tr:nth-child(even){background:#f8f9fa;}
    .hx{background:#e6fff7!important;font-weight:700;}
    .pos{color:#008855;font-weight:700;}.neg{color:#cc2244;font-weight:700;}
    .params{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:8px 0;font-size:9px;}
    .param b{color:#000;font-weight:700;}
    .footer{margin-top:24px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#bbb;display:flex;justify-content:space-between;letter-spacing:1px;}
    .page-break{page-break-before:always;}
    .par-cell-pos{background:#e6fff2;color:#006633;font-weight:700;}
    .par-cell-neg{background:#ffe6ea;color:#cc2244;font-weight:700;}
    .par-cell-neutral{color:#999;}
    .section-label{font-size:9px;color:#666;letter-spacing:1.5px;text-transform:uppercase;margin:10px 0 4px;font-weight:600;}
    .summary-grid{display:flex;gap:8px;margin:12px 0 20px;}
    .summary-box{flex:1;border:1px solid #e0e0e0;padding:8px 12px;border-radius:2px;text-align:center;}
    .summary-label{font-size:7px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600;}
    .summary-value{font-size:18px;font-weight:800;margin-top:2px;font-family:'Consolas',monospace;}
    .dual-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0;}
    .mini-table{font-size:8px;}
    .mini-table th{padding:4px 5px;font-size:7px;}
    .mini-table td{padding:3px 5px;}
  </style></head><body>`;

  html+=`<h1>PRICING COMPARISON REPORT</h1><div class="sub">${config.label} · ${ts}</div>`;

  // Eligibility
  if(!elig.eligible) html+=`<div class="narrative" style="border-left-color:#cc2244;background:#fff0f2"><strong>⛔ HX INELIGIBLE:</strong> ${elig.reason}${elig.maxLtv>0?" (Max LTV: "+elig.maxLtv+"%)":""}</div>`;
  else if(elig.warnings.length) html+=`<div class="narrative" style="border-left-color:#cc8800;background:#fff8e6"><strong>✓ HX ELIGIBLE</strong> — Max LTV: ${elig.maxLtv}%${elig.warnings.map(w=>" · ⚠ "+w).join("")}</div>`;
  else html+=`<div class="narrative"><strong>✓ HX ELIGIBLE</strong> — Max LTV: ${elig.maxLtv}%</div>`;

  // Deal Summary
  if(narrative) html+=`<div class="narrative"><strong>Deal Summary:</strong> ${narrative}</div>`;

  // Parameters
  html+=`<h2>SCENARIO PARAMETERS</h2><div class="params">`;
  const pl=[["Rate",params.rate+"%"],["FICO",params.fico],["LTV",params.ltv+"%"],["Lock",params.lock+" Day"],["Purpose",params.purpose],["Property",params.propertyType],["Occupancy",params.occupancy],["Units",params.units],["Income",params.incomeDoc],["Self-Emp",params.selfEmployed],["I/O",params.interestOnly],["Loan Amt","$"+parseInt(params.loanAmount||0).toLocaleString()]];
  if(params.dscr)pl.push(["DSCR",params.dscr],["PPP",params.ppp]);
  pl.forEach(([k,v])=>{html+=`<div class="param"><b>${k}:</b> ${v}</div>`;});
  html+=`</div>`;

  // KPIs
  html+=`<h2>KEY METRICS</h2><div class="kpi-grid">`;
  [["HX Net",hx?.ok?hx.net.toFixed(3):"N/A"],["Rank",hx?.rank?"#"+hx.rank:"N/A"],["Total LLPA",hx?.ok?(hx.totalAdj>=0?"+":"")+hx.totalAdj.toFixed(3):"—"],["Best Price",best?.net?.toFixed(3)||"—"],["Best Lender",best?.lender?.slice(0,22)||"—"],["Gap to #1",gap]].forEach(([l,v])=>{html+=`<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`;});
  html+=`</div>`;

  // Ranking
  html+=`<h2>LENDER RANKING</h2><table><thead><tr><th>#</th><th style="text-align:left">Lender</th><th>Base</th>`;
  allCats.forEach(c=>{html+=`<th>${c}</th>`;});
  html+=`<th>Total LLPA</th><th>Net Price</th><th>Gap</th></tr></thead><tbody>`;
  results.forEach((r,i)=>{
    const isHx=r.lender===hxN;const g=r.ok&&best?.ok?+(r.net-best.net).toFixed(3):null;
    html+=`<tr class="${isHx?"hx":""}"><td>${r.rank||"—"}</td><td style="text-align:left">${r.lender}</td><td>${r.ok?r.base?.toFixed(3):r.reason}</td>`;
    allCats.forEach(c=>{const v=r.adjustments?.filter(a=>a.cat===c).reduce((s,a)=>s+a.value,0)||0;html+=`<td class="${v>0?"pos":v<0?"neg":""}">${r.ok?(v!==0?(v>0?"+":"")+v.toFixed(3):"—"):""}	</td>`;});
    html+=`<td class="${r.totalAdj>=0?"pos":"neg"}" style="font-weight:700">${r.ok?(r.totalAdj>0?"+":"")+r.totalAdj.toFixed(3):""}</td>`;
    html+=`<td style="font-weight:700;font-size:12px">${r.ok?r.net.toFixed(3):"N/A"}</td>`;
    html+=`<td class="${g>0?"pos":g<0?"neg":""}">${g!==null?(g===0?"—":g.toFixed(3)):""}</td></tr>`;
  });
  html+=`</tbody></table>`;

  // Buydown Analysis
  if(buydown){
    html+=`<div class="page-break"></div><h2>RATE STACK / BUYDOWN ANALYSIS</h2>`;
    html+=`<p style="font-size:10px;color:#666;margin-bottom:8px;">Net price at each rate with scenario LLPAs applied. Delta = price change per rate step. Ratio = price sensitivity per 12.5bps. Highlighted = optimal coupon (max net price).</p>`;
    const lenderNames=Object.keys(buydown.analysis);
    html+=`<table><thead><tr><th>Rate</th>`;
    lenderNames.forEach(n=>{html+=`<th colspan="3">${n.slice(0,18)}</th>`;});
    html+=`</tr><tr><th></th>`;
    lenderNames.forEach(()=>{html+=`<th>Net</th><th>Δ</th><th>Ratio</th>`;});
    html+=`</tr></thead><tbody>`;
    buydown.rates.forEach(rate=>{
      html+=`<tr>`;
      html+=`<td style="font-weight:700">${rate.toFixed(3)}%</td>`;
      lenderNames.forEach(name=>{
        const row=buydown.analysis[name]?.find(r=>r.rate===rate);
        const bg=row?.isOptimal?"background:#e6fff7;font-weight:700":"";
        if(row?.eligible){
          html+=`<td style="${bg}">${row.net.toFixed(3)}</td>`;
          html+=`<td class="${row.delta>0?"pos":row.delta<0?"neg":""}">${row.delta!==null?(row.delta>0?"+":"")+row.delta.toFixed(3):"—"}</td>`;
          html+=`<td>${row.ratio!==null?row.ratio.toFixed(2)+"x":"—"}</td>`;
        }else{html+=`<td colspan="3" style="color:#999">N/A</td>`;}
      });
      html+=`</tr>`;
    });
    html+=`</tbody></table>`;
  }

  // Matrix
  if(view==="matrix"&&Object.keys(matrix).length){
    html+=`<div class="page-break"></div><h2>HX RANK MATRIX</h2><table><thead><tr><th>LTV\\FICO</th>`;
    config.ficos.forEach(f=>{html+=`<th>${f}</th>`;});
    html+=`</tr></thead><tbody>`;
    config.ltvs.forEach(ltv=>{html+=`<tr><td style="font-weight:700">${ltv}%</td>`;config.ficos.forEach(fico=>{const res=matrix[`${ltv}_${fico}`]||[];const h=res.find(r=>r.lender===hxN);const bg=h?.rank?(h.rank<=3?"#e6fff2":h.rank<=5?"#fff8e6":h.rank<=10?"#fff3e6":"#ffe6ea"):"#f5f5f5";html+=`<td style="background:${bg};font-weight:700">${h?.rank?"#"+h.rank:"N/A"}${h?.ok?"<br><span style='font-size:8px;color:#888'>"+h.net.toFixed(2)+"</span>":""}</td>`;});html+=`</tr>`;});
    html+=`</tbody></table>`;
  }


    html+=`<div class="footer"><span>HomeXpress Mortgage · Pricing Comparison Engine · Confidential</span><span>${ts}</span></div></body></html>`;
  const win=window.open("","_blank");win.document.write(html);win.document.close();setTimeout(()=>{win.print();},500);
}

function exportXLSX(results,params,best){
  const wb=XLSX.utils.book_new();const bv=best?.net||0;const cats=[...new Set(results.flatMap(r=>r.adjustments?.map(a=>a.cat)||[]))];
  const hdr=["Rank","Lender","Base"];cats.forEach(c=>hdr.push(c));hdr.push("Total LLPA","Net Price","Gap");const d=[hdr];
  results.forEach((r,i)=>{const row=[r.ok?i+1:"N/A",r.lender,r.base];cats.forEach(c=>{row.push(r.adjustments?.filter(a=>a.cat===c).reduce((s,a)=>s+a.value,0)||0);});row.push(r.totalAdj,r.net,r.ok?+(r.net-bv).toFixed(3):"N/A");d.push(row);});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(d),"Ranking");
  XLSX.writeFile(wb,`comparison_${params.rate}_${params.fico}_${params.ltv}.xlsx`);
}


/* ═══════════════════════════════════════════════════════════════
   PAR ANALYSIS — EXCLUSIVE PDF REPORT
   ═══════════════════════════════════════════════════════════════ */
function exportParPDF(parAnalysis, config, params, lenders, hxN) {
  if (!parAnalysis) return;
  const ts = new Date().toLocaleString();
  const competitors = parAnalysis.competitors;
  const allDiffs = []; const ficoWins = {}; const ltvWins = {}; const overallStats = {};
  config.ficos.forEach(f => { ficoWins[f] = { w:0,l:0,td:0,n:0 }; });
  config.ltvs.forEach(l => { ltvWins[l] = { w:0,l:0,td:0,n:0 }; });

  for (const cn of competitors) {
    const diffs = [];
    for (const ltv of config.ltvs) for (const fico of config.ficos) {
      const d = parAnalysis.grid[`${ltv}_${fico}`]?.competitors?.[cn]?.diff;
      if (d != null) { diffs.push(d); allDiffs.push({d,fico,ltv,cn});
        if(d>0){ficoWins[fico].w++;ltvWins[ltv].w++;}else if(d<0){ficoWins[fico].l++;ltvWins[ltv].l++;}
        ficoWins[fico].td+=d;ficoWins[fico].n++;ltvWins[ltv].td+=d;ltvWins[ltv].n++;
      }
    }
    const w=diffs.filter(d=>d>0).length,l=diffs.filter(d=>d<0).length;
    overallStats[cn]={w,l,t:diffs.filter(d=>d===0).length,avg:diffs.length?+(diffs.reduce((s,d)=>s+d,0)/diffs.length).toFixed(3):0,best:diffs.length?Math.max(...diffs):0,worst:diffs.length?Math.min(...diffs):0,wp:diffs.length?Math.round(w/diffs.length*100):0,n:diffs.length};
  }
  const fr=config.ficos.map(f=>({f,...ficoWins[f],avg:ficoWins[f].n?+(ficoWins[f].td/ficoWins[f].n).toFixed(3):0})).sort((a,b)=>b.avg-a.avg);
  const lr=config.ltvs.map(l=>({l,...ltvWins[l],avg:ltvWins[l].n?+(ltvWins[l].td/ltvWins[l].n).toFixed(3):0})).sort((a,b)=>b.avg-a.avg);
  const tw=Object.values(overallStats).reduce((s,c)=>s+c.w,0),tl=Object.values(overallStats).reduce((s,c)=>s+c.l,0),tn=Object.values(overallStats).reduce((s,c)=>s+c.n,0);
  const oa=allDiffs.length?+(allDiffs.reduce((s,d)=>s+d.d,0)/allDiffs.length).toFixed(3):0;
  const owp=tn?Math.round(tw/tn*100):0;
  const threat=Object.entries(overallStats).sort((a,b)=>a[1].avg-b[1].avg)[0];

  let h=`<html><head><style>
    @page{margin:25px 30px;size:landscape;}body{font-family:'Inter',Arial,sans-serif;color:#1a1a1a;margin:0;padding:30px 40px;}
    h1{font-size:24px;color:#000;margin:0;letter-spacing:3px;text-transform:uppercase;font-weight:800;}
    h2{font-size:14px;color:#000;margin:28px 0 8px;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid #000;padding-bottom:5px;font-weight:700;}
    h3{font-size:11px;color:#444;margin:16px 0 6px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;}
    .sub{font-size:9px;color:#999;margin:4px 0 20px;letter-spacing:2px;text-transform:uppercase;}
    .exec{background:#f7f7f7;border:1px solid #e0e0e0;border-left:4px solid #00b894;padding:14px 18px;margin:16px 0;font-size:11px;line-height:1.8;color:#333;border-radius:2px;}
    .exec strong{color:#000;}
    table{width:100%;border-collapse:collapse;font-size:9px;margin:6px 0;font-family:'Consolas',monospace;}
    th{background:#111;color:#fff;padding:6px 7px;text-align:center;font-size:8px;text-transform:uppercase;letter-spacing:1px;}
    td{padding:5px 7px;border-bottom:1px solid #eee;text-align:center;}tr:nth-child(even){background:#f8f9fa;}
    .pos{background:#e6fff2;color:#006633;font-weight:700;}.neg{background:#ffe6ea;color:#cc2244;font-weight:700;}.neutral{color:#999;}
    .kr{display:flex;gap:10px;margin:14px 0;}.k{border:1px solid #e0e0e0;padding:12px 16px;flex:1;border-radius:2px;text-align:center;}
    .kl{font-size:7px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:700;}.kv{font-size:24px;font-weight:800;margin-top:4px;font-family:'Consolas',monospace;}.ks{font-size:8px;color:#999;margin-top:2px;}
    .sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin:8px 0;}
    .sb{border:1px solid #e8e8e8;padding:8px 10px;border-radius:2px;text-align:center;}
    .sl{font-size:7px;letter-spacing:1.5px;color:#999;text-transform:uppercase;font-weight:600;}.sv{font-size:16px;font-weight:800;margin-top:2px;font-family:'Consolas',monospace;}
    .dual{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:8px 0;}.mini th{padding:4px 5px;font-size:7px;}.mini td{padding:3px 5px;font-size:8px;}
    .params{display:flex;gap:16px;margin:10px 0;font-size:9px;flex-wrap:wrap;}.param b{font-weight:700;}
    .footer{margin-top:24px;padding-top:8px;border-top:2px solid #000;font-size:8px;color:#999;display:flex;justify-content:space-between;letter-spacing:1px;text-transform:uppercase;}
    .page-break{page-break-before:always;}
  </style></head><body>`;

  // COVER
  h+=`<h1>Par Rate Comparative Analysis</h1><div class="sub">${config.label} · ${ts}</div>`;
  h+=`<div class="exec"><strong>Executive Summary:</strong> Across ${tn} scenario comparisons against ${competitors.length} competitor(s), HomeXpress wins <strong>${owp}%</strong> of matchups with an average price advantage of <strong>${oa>=0?"+":""}${oa}</strong> points. HX is strongest at <strong>FICO ${fr[0].f}</strong> (avg +${fr[0].avg}) and <strong>${lr[0].l}% LTV</strong> (avg +${lr[0].avg}).`;
  if(fr[fr.length-1].avg<0) h+=` Vulnerability at <strong>FICO ${fr[fr.length-1].f}</strong> (avg ${fr[fr.length-1].avg}) and <strong>${lr[lr.length-1].l}% LTV</strong> (avg ${lr[lr.length-1].avg}).`;
  if(threat) h+=` Primary threat: <strong>${threat[0]}</strong> (${threat[1].wp}% HX win rate).`;

  // Prescriptive recommendation
  const ficoLosses=fr.filter(f=>f.avg<0);
  if(ficoLosses.length){
    const worst=ficoLosses[ficoLosses.length-1];
    const improvementNeeded=Math.abs(worst.avg);
    const scenariosFlipped=worst.l;
    const newWins=tw+scenariosFlipped;
    const newWinPct=tn?Math.round(newWins/tn*100):0;
    h+=`</div><div class="exec" style="border-left-color:#cc8800"><strong>Recommendation:</strong> Improving the FICO ${worst.f} LLPA by approximately <strong>${improvementNeeded.toFixed(3)} pts</strong> across ${lr.filter(l=>l.avg<0).length>0?lr.filter(l=>l.avg<0).map(l=>l.l+"%").join(", "):"vulnerable"} LTV bands would flip up to <strong>${scenariosFlipped} scenarios</strong> from loss to win, increasing overall win rate from <strong>${owp}%</strong> to approximately <strong>${newWinPct}%</strong>.`;
  }
  h+=`</div>`;

  h+=`<div class="params">`;
  [["Purpose",params.purpose],["Lock",params.lock+" Day"],["Income",params.incomeDoc],["Occupancy",params.occupancy],["Property",params.propertyType],["Loan","$"+parseInt(params.loanAmount||0).toLocaleString()]].forEach(([k,v])=>{h+=`<div class="param"><b>${k}:</b> ${v}</div>`;});
  if(params.dscr)h+=`<div class="param"><b>DSCR:</b> ${params.dscr}</div><div class="param"><b>PPP:</b> ${params.ppp}</div>`;
  h+=`</div>`;

  // Overall KPIs
  h+=`<h2>Overall Performance</h2><div class="kr">`;
  [{l:"WIN RATE",v:owp+"%",c:owp>=50?"#006633":"#cc2244",s:tw+" of "+tn},{l:"AVG ADVANTAGE",v:(oa>=0?"+":"")+oa,c:oa>=0?"#006633":"#cc2244",s:"all competitors"},{l:"WINS",v:tw,c:"#006633",s:"vs "+tl+" losses"},{l:"STRONGEST FICO",v:fr[0].f,c:"#006633",s:"avg +"+fr[0].avg},{l:"WEAKEST FICO",v:fr[fr.length-1].f,c:fr[fr.length-1].avg<0?"#cc2244":"#666",s:"avg "+fr[fr.length-1].avg}].forEach(({l,v,c,s})=>{h+=`<div class="k"><div class="kl">${l}</div><div class="kv" style="color:${c}">${v}</div><div class="ks">${s}</div></div>`;});
  h+=`</div>`;

  // Scorecard
  h+=`<h3>Competitor Scorecard</h3><table><thead><tr><th style="text-align:left">Competitor</th><th>Win Rate</th><th>Wins</th><th>Losses</th><th>Avg Diff</th><th>Best</th><th>Worst</th><th>Scenarios</th></tr></thead><tbody>`;
  Object.entries(overallStats).sort((a,b)=>b[1].avg-a[1].avg).forEach(([n,s])=>{h+=`<tr><td style="text-align:left;font-weight:700">${n}</td><td class="${s.wp>=50?"pos":"neg"}">${s.wp}%</td><td class="pos">${s.w}</td><td class="neg">${s.l}</td><td class="${s.avg>=0?"pos":"neg"}">${s.avg>=0?"+":""}${s.avg}</td><td class="pos">+${s.best.toFixed(3)}</td><td class="neg">${s.worst.toFixed(3)}</td><td>${s.n}</td></tr>`;});
  h+=`</tbody></table>`;

  // PER-COMPETITOR PAGES
  for(const cn of competitors){
    const s=overallStats[cn];
    h+=`<div class="page-break"></div><h1 style="font-size:18px">HX vs ${cn}</h1><div class="sub">${config.label} · PAR RATE ANALYSIS</div>`;
    h+=`<div class="kr">`;
    [{l:"WIN RATE",v:s.wp+"%",c:s.wp>=50?"#006633":"#cc2244"},{l:"WINS",v:s.w,c:"#006633"},{l:"LOSSES",v:s.l,c:"#cc2244"},{l:"TIES",v:s.t,c:"#666"},{l:"AVG DIFF",v:(s.avg>=0?"+":"")+s.avg,c:s.avg>=0?"#006633":"#cc2244"},{l:"BEST",v:"+"+s.best.toFixed(3),c:"#006633"},{l:"WORST",v:s.worst.toFixed(3),c:"#cc2244"}].forEach(({l,v,c})=>{h+=`<div class="k"><div class="kl">${l}</div><div class="kv" style="color:${c}">${v}</div></div>`;});
    h+=`</div>`;

    // Differential matrix
    h+=`<h3>Net Price Differential — HX minus ${cn}</h3><table><thead><tr><th style="text-align:left">LTV\FICO</th>`;
    config.ficos.forEach(f=>{h+=`<th>${f}</th>`;});
    h+=`</tr></thead><tbody>`;
    config.ltvs.forEach(ltv=>{h+=`<tr><td style="font-weight:700;text-align:left;background:#f0f0f0">${ltv}%</td>`;config.ficos.forEach(fico=>{const c=parAnalysis.grid[`${ltv}_${fico}`]?.competitors?.[cn];const d=c?.diff;h+=d!=null?`<td class="${d>0?"pos":d<0?"neg":"neutral"}">${(d>0?"+":"")+d.toFixed(3)}</td>`:`<td class="neutral">N/A</td>`;});h+=`</tr>`;});
    h+=`</tbody></table>`;

    // Side by side
    h+=`<div class="dual"><div><h3>HX Par Rate</h3><table class="mini"><thead><tr><th style="text-align:left">LTV\FICO</th>`;
    config.ficos.forEach(f=>{h+=`<th>${f}</th>`;});
    h+=`</tr></thead><tbody>`;
    config.ltvs.forEach(ltv=>{h+=`<tr><td style="font-weight:700;text-align:left">${ltv}%</td>`;config.ficos.forEach(fico=>{const d=parAnalysis.grid[`${ltv}_${fico}`];h+=`<td>${d?.parRate?d.parRate.toFixed(3)+"%":"—"}</td>`;});h+=`</tr>`;});
    h+=`</tbody></table></div>`;

    h+=`<div><h3>Net Price @ HX Par</h3><table class="mini"><thead><tr><th style="text-align:left">LTV\FICO</th>`;
    config.ficos.forEach(f=>{h+=`<th colspan="2">${f}</th>`;});
    h+=`</tr><tr><th></th>`;config.ficos.forEach(()=>{h+=`<th style="background:#006633;font-size:6px;padding:2px">HX</th><th style="background:#cc2244;font-size:6px;padding:2px">${cn.slice(0,6)}</th>`;});
    h+=`</tr></thead><tbody>`;
    config.ltvs.forEach(ltv=>{h+=`<tr><td style="font-weight:700;text-align:left">${ltv}%</td>`;config.ficos.forEach(fico=>{const d=parAnalysis.grid[`${ltv}_${fico}`];const c=d?.competitors?.[cn];const hB=c?.diff>0,cB=c?.diff<0;h+=`<td style="${hB?"background:#e6fff2;font-weight:700":""}">${d?.hxNet?d.hxNet.toFixed(2):"—"}</td><td style="${cB?"background:#ffe6ea;font-weight:700":""}">${c?.net?c.net.toFixed(2):"—"}</td>`;});h+=`</tr>`;});
    h+=`</tbody></table></div></div>`;
  }

  h+=`<div class="footer"><span>HomeXpress Mortgage · Par Rate Comparative Analysis · Confidential</span><span>${ts}</span></div></body></html>`;
  const w=window.open("","_blank");w.document.write(h);w.document.close();setTimeout(()=>{w.print();},500);
}


/* ═══════════════════════════════════════════════════════════════
   QUICK ENTRY — Parse pasted rate stack text
   ═══════════════════════════════════════════════════════════════ */
function parseQuickEntry(text, existingLender) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  const rates = {};
  for (const line of lines) {
    const parts = line.split(/\t|\s{2,}|,/).map(s => s.trim().replace("%",""));
    if (parts.length >= 2) {
      const rate = parseFloat(parts[0]);
      if (!isNaN(rate) && rate > 3 && rate < 15) {
        const prices = {};
        if (parts[1] && !isNaN(parseFloat(parts[1])) && parseFloat(parts[1]) > 50) prices["15"] = parseFloat(parts[1]);
        if (parts[2] && !isNaN(parseFloat(parts[2])) && parseFloat(parts[2]) > 50) prices["30"] = parseFloat(parts[2]);
        if (parts[3] && !isNaN(parseFloat(parts[3])) && parseFloat(parts[3]) > 50) prices["45"] = parseFloat(parts[3]);
        // If only one price column, use it for all locks
        if (Object.keys(prices).length === 1) { const v = Object.values(prices)[0]; prices["15"] = v; prices["30"] = v; prices["45"] = v; }
        if (Object.keys(prices).length) rates[rate] = prices;
      }
    }
  }
  if (existingLender) {
    return { ...existingLender, rates: { ...existingLender.rates, ...rates } };
  }
  return { name: "Quick Entry", rates, llpas: {} };
}

/* ═══════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════ */
export default function App(){
  const urlP=readParams();
  const[programs,setPrograms]=useState({});  // { "PrimeX Consumer": {lenders, product, file}, "InvestorX DSCR": {...} }
  const[activeProgram,setActiveProgram]=useState(null);
  const[product,setProduct]=useState("consumer");
  const[view,setView]=useState(urlP._view||"ranking");
  const[file,setFile]=useState("");

  // Derived: active lenders from selected program
  const lenders = activeProgram && programs[activeProgram] ? programs[activeProgram].lenders : null;
  const setLenders = (fn) => {
    if (!activeProgram) return;
    setPrograms(prev => {
      const current = prev[activeProgram];
      if (!current) return prev;
      const newLenders = typeof fn === "function" ? fn(current.lenders) : fn;
      return { ...prev, [activeProgram]: { ...current, lenders: newLenders } };
    });
  };
  const[showBuydown,setShowBuydown]=useState(false);
  const[showPar,setShowPar]=useState(false);
  const[showQueue,setShowQueue]=useState(false);
  const[showWhatIf,setShowWhatIf]=useState(false);
  const[wifLlpa,setWifLlpa]=useState("");
  const[wifAdj,setWifAdj]=useState("0.250");
  const[wifLtv,setWifLtv]=useState("all");
  const[queue,setQueue]=useState([]);
  const[showQuickEntry,setShowQuickEntry]=useState(false);
  const[quickText,setQuickText]=useState("");
  const[quickTarget,setQuickTarget]=useState("__new__");
  const[quickNewName,setQuickNewName]=useState("");
  const[params,setParams]=useState({
    rate:urlP.rate||7.25,fico:urlP.fico||720,ltv:urlP.ltv||75,lock:urlP.lock||"30",
    purpose:urlP.purpose||"Purchase",loanAmount:urlP.loanAmount||"750000",
    propertyType:urlP.propertyType||"Single Family",occupancy:urlP.occupancy||"Primary",
    units:"1",incomeDoc:urlP.incomeDoc||"Bank Statement",
    selfEmployed:urlP.selfEmployed||"No",interestOnly:urlP.interestOnly||"No",
    dscr:urlP.dscr||"1.00",ppp:urlP.ppp||"3 Year",
    lpc:"",impoundWaiver:"No",housing1x30:"No",rural:"No",foreignNational:"No",str:"No",
    npra:"No",nonWarrCondo:"No",txCashOut:"No",arm:"No",dti:"",state:"CA",
  });

  const config=CONFIGS[activeProgram&&programs[activeProgram]?programs[activeProgram].product:product]||CONFIGS.consumer;
  const set=(k,v)=>{setParams(p=>{const next={...p,[k]:v};return next;});};
  const[dragging,setDragging]=useState(false);

  // Sync URL
  useEffect(()=>{if(lenders)writeParams(params,view);},[params,view,lenders]);

  const processFile=useCallback(f=>{if(!f)return;setFile(f.name);const rd=new FileReader();rd.onload=ev=>{
    const{lenders:l,product:p}=parseFile(new Uint8Array(ev.target.result));
    const progName=f.name.replace(/\.xlsx?$/i,"").replace(/competitor_template_?/i,"").replace(/_/g," ").trim()||CONFIGS[p]?.label||"Program";
    // Auto-name from file or detected product
    const displayName = progName.length > 2 ? progName : CONFIGS[p]?.label || progName;
    setPrograms(prev=>({...prev,[displayName]:{lenders:l,product:p,file:f.name}}));
    setActiveProgram(displayName);
    setProduct(p);
    // Set program-appropriate defaults
    if(p==="dscr") setParams(pr=>({...pr,occupancy:"Investment",incomeDoc:"DSCR"}));
    else setParams(pr=>({...pr,occupancy:pr.occupancy==="Investment"?"Primary":pr.occupancy,incomeDoc:pr.incomeDoc==="DSCR"?"Bank Statement":pr.incomeDoc}));
  };rd.readAsArrayBuffer(f);},[]);
  const onUpload=useCallback(e=>{processFile(e.target.files[0]);},[processFile]);
  const onDrop=useCallback(e=>{e.preventDefault();e.stopPropagation();setDragging(false);const f=e.dataTransfer?.files?.[0];if(f&&/\.xlsx?$/i.test(f.name))processFile(f);},[processFile]);
  const onDragOver=useCallback(e=>{e.preventDefault();e.stopPropagation();setDragging(true);},[]);
  const onDragLeave=useCallback(e=>{e.preventDefault();e.stopPropagation();setDragging(false);},[]);
  const rates=useMemo(()=>lenders?[...new Set(Object.values(lenders).flatMap(l=>Object.keys(l.rates).map(Number)))].sort((a,b)=>a-b):[],[lenders]);
  const results=useMemo(()=>{if(!lenders)return[];const a=Object.values(lenders).map(l=>calcNet(l,params));const o=a.filter(r=>r.ok).sort((a,b)=>b.net-a.net);o.forEach((r,i)=>r.rank=i+1);return[...o,...a.filter(r=>!r.ok)];},[lenders,params]);
  const hxElig=useMemo(()=>checkHxEligibility(params,activeProgram&&programs[activeProgram]?programs[activeProgram].product:product),[params,product,activeProgram,programs]);
  const matrix=useMemo(()=>{if(!lenders||view!=="matrix")return{};const m={};for(const ltv of config.ltvs)for(const fico of config.ficos){const p={...params,fico,ltv};const a=Object.values(lenders).map(l=>calcNet(l,p));const o=a.filter(r=>r.ok).sort((a,b)=>b.net-a.net);o.forEach((r,i)=>r.rank=i+1);m[`${ltv}_${fico}`]=[...o,...a.filter(r=>!r.ok)];}return m;},[lenders,params,view,config]);
  const buydown=useMemo(()=>lenders?calcBuydownAnalysis(lenders,params):null,[lenders,params]);

  const names=lenders?Object.keys(lenders):[];
  const hxN=names.find(n=>/hx|homex/i.test(n))||names[0];
  const hx=results.find(r=>r.lender===hxN);const best=results[0];

  const parAnalysis=useMemo(()=>lenders?calcParAnalysis(lenders,params,config,hxN):null,[lenders,params,config,hxN]);

  const Sel=({l,v,fn,opts,w})=>(<div style={{minWidth:w||100}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>{l}</div><select value={v} onChange={e=>fn(e.target.value)} style={{width:"100%",padding:"6px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,fontFamily:T.sans,outline:"none"}}>{opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select></div>);
  const Tog=({l,v,fn})=>(<div style={{minWidth:75}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>{l}</div><button onClick={()=>fn(v==="Yes"?"No":"Yes")} style={{width:"100%",padding:"6px 8px",background:v==="Yes"?T.accentDim:T.sf,color:v==="Yes"?T.accent:T.muted,border:`1px solid ${v==="Yes"?T.accent+"44":T.border}`,borderRadius:2,fontSize:11,cursor:"pointer",fontWeight:600,fontFamily:T.sans}}>{v==="Yes"?"● YES":"○ NO"}</button></div>);
  const Inp=({l,v,fn,w,ph})=>(<div style={{minWidth:w||100}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>{l}</div><input value={v} onChange={e=>fn(e.target.value)} placeholder={ph} style={{width:"100%",padding:"6px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,fontFamily:T.mono,outline:"none",boxSizing:"border-box"}}/></div>);

  const getA=(r,cat)=>r.adjustments?.filter(a=>a.cat===cat).reduce((s,a)=>s+a.value,0)||0;

  return(
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:T.sans}}>
      {/* HEADER */}
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",gap:2}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:22,background:i===0?T.accent:i===1?T.hxTeal:"#1e3a5f",borderRadius:1}}/>)}</div>
          <div><div style={{fontSize:15,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase"}}><span style={{color:T.accent}}>HomeXpress</span> <span style={{color:T.sub}}>Pricing Engine</span></div><div style={{fontSize:10,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginTop:1}}>{Object.keys(programs).length?`${Object.keys(programs).length} PROGRAM${Object.keys(programs).length>1?"S":""} · ${names.length} LENDERS`:"AWAITING TEMPLATE"}</div></div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {lenders&&<span style={{border:`1px solid ${T.accent}44`,color:T.accent,padding:"3px 12px",borderRadius:2,fontSize:10,fontWeight:600,letterSpacing:1.5}}>{config.label}</span>}
          <button onClick={()=>setShowQuickEntry(!showQuickEntry)} style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,padding:"7px 14px",borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1}}>QUICK ENTRY</button>
          <label style={{background:T.accent,color:T.bg,padding:"7px 20px",borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{file?"✓ LOADED":"UPLOAD"}<input type="file" accept=".xlsx,.xls" onChange={onUpload} style={{display:"none"}}/></label>
        </div>
      </div>

      <div style={{maxWidth:1500,margin:"0 auto",padding:"20px 28px"}}>

        {/* PROGRAM SELECTOR BAR */}
        {Object.keys(programs).length>0&&(
          <div style={{display:"flex",gap:4,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",fontWeight:700,marginRight:8}}>PROGRAMS</span>
            {Object.entries(programs).map(([name,prog])=>{
              const isActive=name===activeProgram;
              const pConfig=CONFIGS[prog.product]||CONFIGS.consumer;
              const lenderCount=Object.keys(prog.lenders).length;
              return(
                <button key={name} onClick={()=>{
                  setActiveProgram(name);setProduct(prog.product);
                  // Reset program-specific params to valid defaults
                  if(prog.product==="dscr"){
                    setParams(p=>({...p,occupancy:"Investment",incomeDoc:"DSCR",dscr:p.dscr||"1.00",ppp:p.ppp||"3 Year"}));
                  } else {
                    setParams(p=>({...p,occupancy:p.occupancy==="Investment"||p.occupancy==="Non-Owner"?"Primary":p.occupancy,incomeDoc:p.incomeDoc==="DSCR"?"Bank Statement":p.incomeDoc}));
                  }
                }} style={{padding:"6px 14px",background:isActive?T.accent:T.card,color:isActive?T.bg:T.sub,border:`1px solid ${isActive?T.accent:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:isActive?700:500,letterSpacing:0.5,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:6,height:6,borderRadius:1,background:prog.product==="dscr"?T.hxTeal:prog.product==="consumer"?T.accent:T.purple,opacity:isActive?1:0.5}}/>
                  {name}
                  <span style={{fontSize:8,color:isActive?T.bg:T.dark,opacity:0.7}}>({lenderCount})</span>
                </button>
              );
            })}
            <button onClick={()=>document.getElementById("file-input-header")?.click()} style={{padding:"6px 14px",background:"transparent",color:T.muted,border:`1px dashed ${T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:600,letterSpacing:0.5}}>+ ADD PROGRAM</button>
            <input id="file-input-header" type="file" accept=".xlsx,.xls" onChange={onUpload} style={{display:"none"}}/>
            {Object.keys(programs).length>1&&activeProgram&&(
              <button onClick={()=>{setPrograms(prev=>{const next={...prev};delete next[activeProgram];return next;});setActiveProgram(Object.keys(programs).filter(k=>k!==activeProgram)[0]||null);}} style={{marginLeft:"auto",padding:"6px 12px",background:"transparent",color:T.red,border:`1px solid ${T.red}33`,borderRadius:2,cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:1}}>REMOVE {activeProgram.toUpperCase()}</button>
            )}
          </div>
        )}

        {/* QUICK ENTRY MODAL */}
        {showQuickEntry&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowQuickEntry(false)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:2,padding:24,width:640,maxHeight:"80vh",overflow:"auto"}}>
              <div style={{fontSize:14,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>QUICK ENTRY — RATE STACK</div>
              <div style={{fontSize:10,color:T.muted,marginBottom:14,lineHeight:1.6}}>Paste a rate/price table from a competitor's rate sheet. Select which lender to apply it to, or create a new one.</div>

              {/* Target Lender Selector */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4,fontWeight:600}}>TARGET LENDER</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {names.map(n=>(
                    <button key={n} onClick={()=>setQuickTarget(n)} style={{padding:"6px 14px",background:quickTarget===n?T.accent+"22":"transparent",color:quickTarget===n?T.accent:T.muted,border:`1px solid ${quickTarget===n?T.accent+"66":T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:600,letterSpacing:0.5}}>{n}</button>
                  ))}
                  <button onClick={()=>setQuickTarget("__new__")} style={{padding:"6px 14px",background:quickTarget==="__new__"?T.green+"22":"transparent",color:quickTarget==="__new__"?T.green:T.muted,border:`1px solid ${quickTarget==="__new__"?T.green+"66":T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:0.5}}>+ NEW LENDER</button>
                </div>
              </div>

              {quickTarget==="__new__"&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4,fontWeight:600}}>LENDER NAME</div>
                  <input value={quickNewName} onChange={e=>setQuickNewName(e.target.value)} placeholder="Enter competitor name" style={{width:"100%",padding:"7px 10px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,fontFamily:T.sans,outline:"none",boxSizing:"border-box"}}/>
                </div>
              )}

              <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4,fontWeight:600}}>PASTE RATE / PRICE DATA</div>
              <textarea value={quickText} onChange={e=>setQuickText(e.target.value)} placeholder={"6.125\t97.438\t97.438\t97.313\n6.250\t97.938\t97.938\t97.813\n6.375\t98.313\t98.313\t98.188\n6.500\t98.688\t98.688\t98.563"} style={{width:"100%",height:200,background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,padding:12,fontFamily:T.mono,fontSize:11,boxSizing:"border-box",resize:"vertical",outline:"none"}}/>

              {quickText&&(()=>{const p=parseQuickEntry(quickText);const n=Object.keys(p.rates).length;return <div style={{marginTop:8,marginBottom:4,fontSize:11,color:n>0?T.green:T.red,fontWeight:600}}>{n>0?`✓ ${n} rates parsed`:`✗ No valid rates detected`}{quickTarget&&quickTarget!=="__new__"?` — will update ${quickTarget}`:""}</div>;})()}

              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button onClick={()=>{
                  if(!quickText.trim())return;
                  const parsed=parseQuickEntry(quickText);
                  if(!Object.keys(parsed.rates).length)return;

                  if(quickTarget==="__new__"){
                    const name=quickNewName.trim()||("Competitor_"+Date.now().toString(36).slice(-4));
                    parsed.name=name;
                    setLenders(prev=>({...(prev||{}),[name]:parsed}));
                  } else if(quickTarget&&lenders?.[quickTarget]){
                    // Merge into existing lender — overwrite rates, keep LLPAs
                    setLenders(prev=>({...prev,[quickTarget]:{...prev[quickTarget],rates:{...prev[quickTarget].rates,...parsed.rates}}}));
                  }
                  setShowQuickEntry(false);setQuickText("");setQuickTarget(names[0]||"__new__");setQuickNewName("");
                }} style={{flex:1,padding:"10px 16px",background:T.accent,color:T.bg,border:"none",borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:1}}>
                  {quickTarget==="__new__"?"ADD NEW LENDER":`UPDATE ${(quickTarget||"").toUpperCase()}`}
                </button>
                <button onClick={()=>setShowQuickEntry(false)} style={{padding:"10px 16px",background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:1}}>CANCEL</button>
              </div>

              {quickTarget&&quickTarget!=="__new__"&&lenders?.[quickTarget]&&(
                <div style={{marginTop:12,padding:10,background:T.sf,borderRadius:2,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:6}}>CURRENT {quickTarget} RATES ({Object.keys(lenders[quickTarget].rates).length})</div>
                  <div style={{fontSize:10,color:T.sub,fontFamily:T.mono,maxHeight:80,overflow:"auto",lineHeight:1.6}}>
                    {Object.entries(lenders[quickTarget].rates).sort(([a],[b])=>a-b).slice(0,8).map(([rate,prices])=>`${(+rate).toFixed(3)}%: ${prices["30"]?.toFixed(3)||"—"}`).join(" · ")}
                    {Object.keys(lenders[quickTarget].rates).length>8&&" ..."}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {!lenders?(
          <>
          <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} style={{textAlign:"center",padding:"80px 20px",border:`2px dashed ${dragging?T.accent:T.border}`,borderRadius:2,marginTop:Object.keys(programs).length?0:40,background:dragging?T.accentDim:"transparent",transition:"all .2s",cursor:"pointer"}} onClick={()=>document.getElementById("file-input").click()}>
            <input id="file-input" type="file" accept=".xlsx,.xls" onChange={onUpload} style={{display:"none"}}/>
            <div style={{width:60,height:60,border:`2px solid ${dragging?T.accent:T.border}`,borderRadius:2,margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}><span style={{fontSize:24,color:T.accent}}>{dragging?"↓":"↑"}</span></div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{dragging?"DROP FILE HERE":"HOMEXPRESS PRICING ENGINE"}</div>
            <div style={{fontSize:12,color:T.muted,maxWidth:400,margin:"0 auto",lineHeight:1.8}}>{dragging?"Release to upload template":"Drag & drop a competitor template (.xlsx) or click to upload"}</div>
          </div>
          <MarketWidgets />
          </>
        ):(
          <>
            {/* PARAMETERS */}
            <div style={{border:`1px solid ${T.border}`,borderRadius:2,marginBottom:14,overflow:"hidden"}}>
              {[
                {label:"LOAN",color:T.accent,fields:<><Sel l="Rate" v={params.rate} fn={v=>set("rate",+v)} opts={rates.map(r=>({v:r,l:r.toFixed(3)+"%"}))}/><Sel l="FICO" v={params.fico} fn={v=>set("fico",+v)} opts={config.ficos}/><Sel l="LTV" v={params.ltv} fn={v=>set("ltv",+v)} opts={config.ltvs.map(l=>({v:l,l:l+"%"}))}/><Inp l="Loan Amt" v={params.loanAmount} fn={v=>set("loanAmount",v)} ph="750000" w={110}/><Sel l="Lock" v={params.lock} fn={v=>set("lock",v)} opts={[{v:"15",l:"15 DAY"},{v:"30",l:"30 DAY"},{v:"45",l:"45 DAY"},{v:"60",l:"60 DAY"}]} w={75}/><Sel l="Purpose" v={params.purpose} fn={v=>set("purpose",v)} opts={["Purchase","Rate/Term Refi","Cash-Out"]}/><Inp l="LPC" v={params.lpc} fn={v=>set("lpc",v)} ph="0.000" w={70}/></>},
                {label:"PROPERTY",color:T.green,fields:<><Sel l="Type" v={params.propertyType} fn={v=>set("propertyType",v)} opts={product==="dscr"?["Single Family","Condo","High-Rise Condo","Non-Warr Condo","PUD","2-4 Units","Condotel"]:["Single Family","Condo","High-Rise Condo","Non-Warr Condo","PUD","2-4 Units"]}/><Sel l="Occupancy" v={params.occupancy} fn={v=>set("occupancy",v)} opts={product==="dscr"?["Investment","Non-Owner"]:["Primary","Second Home","Investment"]}/><Sel l="Units" v={params.units} fn={v=>set("units",v)} opts={["1","2","3-4"]} w={55}/><Tog l="Rural" v={params.rural} fn={v=>set("rural",v)}/>{product==="dscr"&&<Tog l="STR" v={params.str} fn={v=>set("str",v)}/>}<Tog l="1x30 Hsg" v={params.housing1x30} fn={v=>set("housing1x30",v)}/></>},
                {label:"BORROWER",color:T.orange,fields:<><Sel l="Income Doc" v={params.incomeDoc} fn={v=>set("incomeDoc",v)} opts={product==="dscr"?["DSCR","Full Doc","Alt Doc","Asset Xpress"]:["Bank Statement","Full Doc","Alt Doc","Asset Xpress"]}/><Tog l="Self Emp" v={params.selfEmployed} fn={v=>set("selfEmployed",v)}/><Tog l="I/O" v={params.interestOnly} fn={v=>set("interestOnly",v)}/><Tog l="Impound Wvr" v={params.impoundWaiver} fn={v=>set("impoundWaiver",v)}/><Tog l="ARM" v={params.arm} fn={v=>set("arm",v)}/><Tog l="NPRA" v={params.npra} fn={v=>set("npra",v)}/>{product==="dscr"&&<Tog l="Foreign Natl" v={params.foreignNational} fn={v=>set("foreignNational",v)}/>}<Inp l="DTI" v={params.dti} fn={v=>set("dti",v)} ph="43" w={55}/></>},
                ...(product==="dscr"?[{label:"DSCR",color:T.purple,fields:<><Sel l="DSCR Ratio" v={params.dscr} fn={v=>set("dscr",v)} opts={["1.25","1.00","0.85","0.75","No DSCR"]}/><Sel l="Prepay Penalty" v={params.ppp} fn={v=>set("ppp",v)} opts={["5 Year","4 Year","3 Year","2 Year","1 Year","No Prepay","None"]}/></>}]:[]),
                {label:"OTHER",color:T.blue,fields:<>{params.purpose==="Cash-Out"&&params.state==="TX"&&<Tog l="TX Cash-Out" v={params.txCashOut} fn={v=>set("txCashOut",v)}/>}{params.purpose!=="Cash-Out"&&params.state==="TX"&&<span style={{fontSize:9,color:T.dark,padding:"6px 0"}}>TX C/O: select Cash-Out purpose</span>}<Sel l="State" v={params.state} fn={v=>set("state",v)} opts={["AK","AL","AR","AZ","CA","CO","CT","DC","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","ME","MD","MI","MN","MO","MS","MT","NC","NE","NH","NJ","NM","NV","OH","OK","OR","PA","RI","SC","TN","TX","UT","VA","WA","WI","WV","WY"]} w={65}/></>},
              ].map(({label,color,fields},i)=>(
                <div key={i} style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                  <div style={{width:70,paddingBottom:5}}><span style={{fontSize:9,fontWeight:700,letterSpacing:2,color,borderLeft:`2px solid ${color}`,paddingLeft:8}}>{label}</span></div>
                  {fields}
                </div>
              ))}
            </div>

            {/* TABS + EXPORTS */}
            <div style={{display:"flex",gap:2,marginBottom:14,alignItems:"center"}}>
              {[["ranking","RANKING"],["decomp","WATERFALL"],["matrix","MATRIX"]].map(([k,l])=>(
                <button key={k} onClick={()=>setView(k)} style={{padding:"8px 20px",background:view===k?T.accent:T.bg,color:view===k?T.bg:T.muted,border:`1px solid ${view===k?T.accent:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>{l}</button>
              ))}
              <button onClick={()=>{setShowBuydown(!showBuydown);setShowPar(false);}} style={{padding:"8px 20px",background:showBuydown?T.blue:T.bg,color:showBuydown?T.bg:T.muted,border:`1px solid ${showBuydown?T.blue:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>BUYDOWN</button>
              <button onClick={()=>{setShowPar(!showPar);setShowBuydown(false);setShowQueue(false);}} style={{padding:"8px 20px",background:showPar?T.hxTeal:T.bg,color:showPar?T.bg:T.muted,border:`1px solid ${showPar?T.hxTeal:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>PAR ANALYSIS</button>
              <button onClick={()=>{setShowQueue(!showQueue);setShowBuydown(false);setShowPar(false);setShowWhatIf(false);}} style={{padding:"8px 20px",background:showQueue?T.accent:T.bg,color:showQueue?T.bg:T.muted,border:`1px solid ${showQueue?T.accent:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>QUEUE</button>
              <button onClick={()=>{setShowWhatIf(!showWhatIf);setShowBuydown(false);setShowPar(false);setShowQueue(false);}} style={{padding:"8px 20px",background:showWhatIf?T.green:T.bg,color:showWhatIf?T.bg:T.muted,border:`1px solid ${showWhatIf?T.green:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>WHAT-IF</button>
              <div style={{flex:1}}/>
              {showPar&&!showWhatIf&&parAnalysis&&<button onClick={()=>exportParPDF(parAnalysis,config,params,lenders,hxN)} style={{padding:"8px 16px",background:T.hxTeal+"22",color:T.hxTeal,border:"1px solid #a78bfa44",borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>⬇ PAR REPORT PDF</button>}
              <button onClick={()=>exportPDF(results,matrix,buydown,config,params,lenders,view,hxN)} style={{padding:"8px 16px",background:"transparent",color:T.accent,border:`1px solid ${T.accent}44`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>⬇ PDF REPORT</button>
              <button onClick={()=>exportXLSX(results,params,best)} style={{padding:"8px 16px",background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>⬇ XLSX</button>
            </div>

            {/* HX ELIGIBILITY BANNER */}
            {hxElig&&!hxElig.eligible&&(
              <div style={{padding:"10px 16px",background:`${T.red}12`,border:`1px solid ${T.red}33`,borderLeft:`3px solid ${T.red}`,borderRadius:2,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><span style={{fontSize:11,fontWeight:700,color:T.red,letterSpacing:1}}>HX INELIGIBLE</span><span style={{fontSize:11,color:T.sub,marginLeft:10}}>{hxElig.reason}</span>{hxElig.maxLtv>0&&<span style={{fontSize:10,color:T.muted,marginLeft:10}}>Max LTV: {hxElig.maxLtv}%</span>}</div>
              </div>
            )}
            {hxElig&&hxElig.eligible&&hxElig.warnings.length>0&&(
              <div style={{padding:"8px 16px",background:`${T.amber}10`,border:`1px solid ${T.amber}33`,borderLeft:`3px solid ${T.amber}`,borderRadius:2,marginBottom:10,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:10,fontWeight:700,color:T.amber,letterSpacing:1}}>ELIGIBLE</span>
                <span style={{fontSize:10,color:T.amber,fontWeight:600}}>Max LTV: {hxElig.maxLtv}%</span>
                {hxElig.warnings.map((w,i)=><span key={i} style={{fontSize:9,color:T.sub,borderLeft:`1px solid ${T.border}`,paddingLeft:10}}>⚠ {w}</span>)}
              </div>
            )}
            {hxElig&&hxElig.eligible&&hxElig.warnings.length===0&&(
              <div style={{padding:"8px 16px",background:`${T.green}08`,border:`1px solid ${T.green}22`,borderLeft:`3px solid ${T.green}`,borderRadius:2,marginBottom:10,display:"flex",gap:16,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:T.green,letterSpacing:1}}>HX ELIGIBLE</span>
                <span style={{fontSize:10,color:T.green,fontWeight:600}}>Max LTV: {hxElig.maxLtv}%</span>
              </div>
            )}

            {/* KPIs */}
            {view!=="matrix"&&!showBuydown&&!showPar&&!showWhatIf&&!showWhatIf&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:14}}>
                {[{l:"HX NET PRICE",v:hx?.ok?hx.net.toFixed(3):"N/A",c:T.accent},{l:"RANK",v:hx?.rank?`#${hx.rank}`:"N/A",c:hx?.rank<=3?T.green:hx?.rank<=5?T.amber:T.red},{l:"ADJUSTMENTS",v:hx?.ok?hx.adjustments.length:"—",c:T.muted},{l:"TOTAL LLPA",v:hx?.ok?(hx.totalAdj>=0?"+":"")+hx.totalAdj.toFixed(3):"—",c:clr(hx?.totalAdj)},{l:"BEST PRICE",v:best?.net?.toFixed(3)||"—",c:T.green},{l:"GAP TO #1",v:hx?.ok&&best?.ok?(hx.net>=best.net?"—":(hx.net-best.net).toFixed(3)):"N/A",c:hx?.net>=best?.net?T.green:T.red}].map((k,i)=>(
                  <div key={i} style={{background:T.card,borderRadius:2,padding:"12px 14px",border:`1px solid ${T.border}`,borderTop:`2px solid ${k.c}22`}}>
                    <div style={{fontSize:9,color:T.muted,letterSpacing:2,fontWeight:600}}>{k.l}</div>
                    <div style={{fontSize:22,fontWeight:700,color:k.c,marginTop:4,fontFamily:T.mono}}>{k.v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* BUYDOWN ANALYSIS */}
            {showBuydown&&!showPar&&!showWhatIf&&buydown&&(
              <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"auto",marginBottom:14}}>
                <div style={{padding:"12px 16px",background:T.card,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><span style={{fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Rate Stack / Buydown Analysis</span><span style={{fontSize:10,color:T.muted,marginLeft:12}}>Net price at each rate with all scenario LLPAs applied</span></div>
                  <div style={{display:"flex",gap:12,fontSize:10,color:T.muted}}>
                    <span><span style={{display:"inline-block",width:8,height:8,background:T.green,borderRadius:1,marginRight:4}}/>Optimal Coupon</span>
                    <span>Δ = Price change per step</span>
                    <span>Ratio = Sensitivity per 12.5bps</span>
                  </div>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:T.card}}><th style={{padding:"8px 10px",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>RATE</th>
                    {names.map(n=><th key={n} colSpan={3} style={{padding:"8px 10px",color:n===hxN?T.accent:T.sub,fontSize:9,letterSpacing:1,borderBottom:`1px solid ${T.border}`,borderLeft:`1px solid ${T.border}`}}>{n.slice(0,18)}</th>)}</tr>
                    <tr style={{background:T.sf}}><th style={{padding:"4px 10px",borderBottom:`1px solid ${T.border}`}}></th>
                    {names.map(n=><>{["NET","Δ","RATIO"].map(h=><th key={n+h} style={{padding:"4px 8px",color:T.dark,fontSize:8,letterSpacing:1,borderBottom:`1px solid ${T.border}`,borderLeft:h==="NET"?`1px solid ${T.border}`:"none"}}>{h}</th>)}</>)}</tr>
                  </thead>
                  <tbody>{buydown.rates.map(rate=>{
                    const isActive=rate===params.rate;
                    return(<tr key={rate} style={{background:isActive?`${T.accent}08`:"transparent",borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"6px 10px",fontWeight:700,fontFamily:T.mono,fontSize:12,color:isActive?T.accent:T.sub}}>{rate.toFixed(3)}%</td>
                      {names.map(name=>{const row=buydown.analysis[name]?.find(r=>r.rate===rate);const isHx=name===hxN;
                        return row?.eligible?(<>
                          <td key={name+"n"} style={{padding:"6px 8px",textAlign:"center",fontFamily:T.mono,fontSize:12,fontWeight:row.isOptimal?700:400,color:row.isOptimal?T.green:isHx?T.accent:T.text,background:row.isOptimal?`${T.green}10`:"transparent",borderLeft:`1px solid ${T.border}`}}>{row.net.toFixed(3)}</td>
                          <td key={name+"d"} style={{padding:"6px 8px",textAlign:"center",fontFamily:T.mono,fontSize:11,color:clr(row.delta),fontWeight:row.delta?600:400}}>{row.delta!==null?(row.delta>0?"+":"")+row.delta.toFixed(3):"—"}</td>
                          <td key={name+"r"} style={{padding:"6px 8px",textAlign:"center",fontFamily:T.mono,fontSize:11,color:T.muted}}>{row.ratio!==null?row.ratio.toFixed(2)+"x":"—"}</td>
                        </>):(<td key={name+"na"} colSpan={3} style={{padding:"6px 8px",textAlign:"center",color:T.dark,borderLeft:`1px solid ${T.border}`,fontSize:10}}>{row?.reason||"N/A"}</td>);
                      })}
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            )}

            {/* RANKING */}
            {view==="ranking"&&!showBuydown&&!showPar&&!showWhatIf&&(
              <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:T.card}}>
                    {["#","LENDER","BASE","FICO/LTV","PURPOSE","OTHER","TOTAL LLPA","NET PRICE","GAP"].map(h=>(
                      <th key={h} style={{padding:"10px 10px",textAlign:h==="LENDER"?"left":"center",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,fontWeight:600}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{results.map((r,i)=>{const isHx=r.lender===hxN;const gap=r.ok&&best?.ok?+(r.net-best.net).toFixed(3):null;const other=r.ok?+(r.totalAdj-getA(r,"FICO/LTV")-getA(r,"Purpose")).toFixed(3):0;
                    return(<tr key={i} style={{background:isHx?`${T.accent}08`:i%2?T.card+"80":"transparent",borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:r.rank===1?T.green:r.rank<=3?T.amber:T.muted,fontSize:14,fontFamily:T.mono}}>{r.rank||"—"}</td>
                      <td style={{padding:"8px 10px",fontWeight:isHx?700:400,color:isHx?T.accent:T.text,fontSize:12,borderLeft:isHx?`2px solid ${T.accent}`:"2px solid transparent"}}>{r.lender}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontFamily:T.mono,fontSize:12}}>{r.ok?r.base?.toFixed(3):<span style={{color:T.muted,fontSize:10}}>{r.reason}</span>}</td>
                      {[getA(r,"FICO/LTV"),getA(r,"Purpose"),other].map((v,j)=>(<td key={j} style={{padding:"8px 10px",textAlign:"center",color:r.ok?clr(v):T.muted,fontWeight:v?600:400,fontFamily:T.mono,fontSize:11}}>{r.ok?(v===0?"0.000":(v>0?"+":"")+v.toFixed(3)):""}</td>))}
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:r.ok?clr(r.totalAdj):T.muted,fontFamily:T.mono,fontSize:12}}>{r.ok?(r.totalAdj>0?"+":"")+r.totalAdj.toFixed(3):""}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,fontSize:15,fontFamily:T.mono}}>{r.ok?r.net.toFixed(3):"N/A"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:600,color:gap===0||gap===null?T.muted:gap>0?T.green:T.red,fontFamily:T.mono,fontSize:12}}>{gap!==null?(gap===0?"—":gap.toFixed(3)):""}</td>
                    </tr>);})}</tbody>
                </table>
              </div>
            )}

            {/* WATERFALL */}
            {view==="decomp"&&!showBuydown&&!showPar&&!showWhatIf&&(
              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(names.length,4)},1fr)`,gap:10}}>
                {names.map(name=>{const r=results.find(x=>x.lender===name);const isHx=name===hxN;return(
                  <div key={name} style={{background:T.card,borderRadius:2,border:`1px solid ${isHx?T.accent+"44":T.border}`,padding:16,borderTop:isHx?`2px solid ${T.accent}`:`2px solid ${T.border}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:isHx?T.accent:T.text,marginBottom:12,letterSpacing:0.5}}>{isHx?"◆ ":""}{name}</div>
                    {r?.ok?(<div style={{display:"flex",flexDirection:"column",gap:5}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}><span style={{color:T.muted,fontSize:10,letterSpacing:1}}>BASE PRICE</span><span style={{fontFamily:T.mono,fontWeight:700}}>{r.base.toFixed(3)}</span></div>
                      {r.adjustments.map((a,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:T.muted}}>{a.cat}</span><span style={{fontFamily:T.mono,fontWeight:600,color:clr(a.value)}}>{(a.value>0?"+":"")+a.value.toFixed(3)}</span></div>))}
                      {!r.adjustments.length&&<div style={{fontSize:10,color:T.muted,textAlign:"center",padding:8}}>No adjustments</div>}
                      <div style={{borderTop:`1px solid ${T.border}`,marginTop:6,paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:T.muted,fontWeight:700,letterSpacing:1}}>TOTAL LLPA</span><span style={{fontFamily:T.mono,fontWeight:700,color:clr(r.totalAdj)}}>{(r.totalAdj>0?"+":"")+r.totalAdj.toFixed(3)}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:`1px solid ${T.accent}22`}}><span style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:1}}>NET</span><span style={{fontSize:22,fontWeight:800,fontFamily:T.mono}}>{r.net.toFixed(3)}</span></div>
                      {r.rank&&<div style={{textAlign:"center",marginTop:8}}><span style={{border:`1px solid ${r.rank===1?T.green:r.rank<=3?T.amber:T.red}44`,color:r.rank===1?T.green:r.rank<=3?T.amber:T.red,padding:"2px 12px",borderRadius:2,fontSize:10,fontWeight:700,letterSpacing:1}}>RANK #{r.rank}</span></div>}
                    </div>):<div style={{color:T.muted,fontSize:11,textAlign:"center",padding:20}}>{r?.reason||"N/A"}</div>}
                  </div>
                );})}
              </div>
            )}

            {/* MATRIX */}
            {view==="matrix"&&!showBuydown&&!showPar&&!showWhatIf&&(
              <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:T.card}}><th style={{padding:"10px 12px",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,fontWeight:600,textAlign:"left"}}>LTV \ FICO</th>{config.ficos.map(f=><th key={f} style={{padding:"10px 12px",textAlign:"center",color:T.muted,fontSize:9,borderBottom:`1px solid ${T.border}`,fontWeight:600,letterSpacing:1}}>{f}</th>)}</tr></thead>
                  <tbody>{config.ltvs.map(ltv=>(<tr key={ltv} style={{borderBottom:`1px solid ${T.border}`}}><td style={{padding:"10px 12px",fontWeight:700,color:T.muted,fontFamily:T.mono,letterSpacing:1}}>{ltv}%</td>{config.ficos.map(fico=>{const res=matrix[`${ltv}_${fico}`]||[];const h=res.find(r=>r.lender===hxN);const rk=h?.rank;const gap=h?.ok&&res[0]?.ok?+(h.net-res[0].net).toFixed(3):null;const bg=rk?(rk===1?`${T.green}15`:rk<=3?`${T.green}0a`:rk<=5?`${T.amber}0a`:rk<=10?`${T.orange}08`:`${T.red}08`):"transparent";const tc=rk?(rk===1?T.green:rk<=3?T.amber:rk<=5?T.amber:rk<=10?T.orange:T.red):T.muted;return(<td key={fico} style={{padding:"8px 10px",textAlign:"center",background:bg,cursor:"pointer"}} onClick={()=>{setParams(p=>({...p,fico,ltv}));setView("ranking");}}><div style={{fontWeight:800,fontSize:15,color:tc,fontFamily:T.mono}}>{rk?`#${rk}`:"N/A"}</div>{h?.ok&&<div style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>{h.net.toFixed(2)}</div>}{gap!==null&&gap<0&&<div style={{fontSize:8,color:T.red,fontFamily:T.mono}}>{gap.toFixed(3)}</div>}</td>);})}</tr>))}</tbody>
                </table>
                <div style={{padding:"8px 14px",fontSize:9,color:T.muted,background:T.card,letterSpacing:1,textTransform:"uppercase"}}>Click cell to drill into scenario · All parameters apply</div>
              </div>
            )}

            {/* WHAT-IF SIMULATOR */}
            {showWhatIf&&lenders&&(()=>{
              // Get all HX LLPA names
              const hxLender=lenders[hxN];
              const llpaNames=hxLender?Object.keys(hxLender.llpas):[];
              const adjVal=parseFloat(wifAdj)||0;

              // Build modified HX lender
              let modLenders=lenders;
              if(hxLender&&wifLlpa&&adjVal!==0){
                const modLlpas={...hxLender.llpas};
                if(modLlpas[wifLlpa]){
                  const modRow={...modLlpas[wifLlpa]};
                  if(wifLtv==="all"){Object.keys(modRow).forEach(k=>{if(modRow[k]!==null&&typeof modRow[k]==="number")modRow[k]=+(modRow[k]+adjVal).toFixed(3);});}
                  else{if(modRow[wifLtv]!==null&&typeof modRow[wifLtv]==="number")modRow[wifLtv]=+(modRow[wifLtv]+adjVal).toFixed(3);}
                  modLlpas[wifLlpa]=modRow;
                }
                modLenders={...lenders,[hxN]:{...hxLender,llpas:modLlpas}};
              }

              // Compute before/after
              const before=results;
              const afterAll=Object.values(modLenders).map(l=>calcNet(l,params));
              const afterOk=afterAll.filter(r=>r.ok).sort((a,b)=>b.net-a.net);
              afterOk.forEach((r,i)=>r.rank=i+1);
              const after=[...afterOk,...afterAll.filter(r=>!r.ok)];

              const bHx=before.find(r=>r.lender===hxN);
              const aHx=after.find(r=>r.lender===hxN);
              const bBest=before[0];
              const aBest=after[0];
              const netDelta=bHx?.ok&&aHx?.ok?+(aHx.net-bHx.net).toFixed(3):0;
              const rankDelta=bHx?.rank&&aHx?.rank?bHx.rank-aHx.rank:0;
              const bands=hxLender&&Object.values(hxLender.llpas)[0]?Object.keys(Object.values(hxLender.llpas)[0]):[];

              return(
                <div style={{marginBottom:14}}>
                  <div style={{padding:"14px 16px",background:T.card,border:`1px solid ${T.border}`,borderRadius:2,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <span style={{fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>WHAT-IF SIMULATOR</span>
                      <button onClick={()=>{setWifLlpa("");setWifAdj("0.250");setWifLtv("all");}} style={{padding:"4px 12px",background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:2,cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:1}}>RESET</button>
                    </div>

                    {/* Controls */}
                    <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:200}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>ADJUST LLPA</div>
                        <select value={wifLlpa} onChange={e=>setWifLlpa(e.target.value)} style={{width:"100%",padding:"7px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:11,fontFamily:T.sans,outline:"none"}}>
                          <option value="">— Select LLPA —</option>
                          {llpaNames.map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div style={{width:90}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>CHANGE (PTS)</div>
                        <input value={wifAdj} onChange={e=>setWifAdj(e.target.value)} style={{width:"100%",padding:"7px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,fontFamily:T.mono,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{width:90}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>LTV BAND</div>
                        <select value={wifLtv} onChange={e=>setWifLtv(e.target.value)} style={{width:"100%",padding:"7px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:11,fontFamily:T.sans,outline:"none"}}>
                          <option value="all">All Bands</option>
                          {bands.map(b=><option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {wifLlpa&&adjVal!==0?(
                    <>
                      {/* Before / After Cards */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:2,padding:16,borderTop:`2px solid ${T.muted}`}}>
                          <div style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700,marginBottom:12}}>CURRENT</div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:T.sub,fontSize:11}}>HX Net Price</span><span style={{fontFamily:T.mono,fontSize:16,fontWeight:700}}>{bHx?.ok?bHx.net.toFixed(3):"N/A"}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:T.sub,fontSize:11}}>Rank</span><span style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:bHx?.rank<=3?T.green:T.amber}}>#{bHx?.rank||"—"}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.sub,fontSize:11}}>Gap to #1</span><span style={{fontFamily:T.mono,fontSize:13,fontWeight:600,color:T.red}}>{bHx?.ok&&bBest?.ok?bHx.net>=bBest.net?"—":(bHx.net-bBest.net).toFixed(3):"—"}</span></div>
                        </div>
                        <div style={{background:T.card,border:`1px solid ${T.green}33`,borderRadius:2,padding:16,borderTop:`2px solid ${T.green}`}}>
                          <div style={{fontSize:10,color:T.green,letterSpacing:2,fontWeight:700,marginBottom:12}}>PROPOSED</div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:T.sub,fontSize:11}}>HX Net Price</span><span style={{fontFamily:T.mono,fontSize:16,fontWeight:700}}>{aHx?.ok?aHx.net.toFixed(3):"N/A"}<span style={{fontSize:11,color:netDelta>0?T.green:netDelta<0?T.red:T.muted,marginLeft:6}}>{netDelta>0?"+":""}{netDelta.toFixed(3)}</span></span></div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:T.sub,fontSize:11}}>Rank</span><span style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:aHx?.rank<=3?T.green:T.amber}}>#{aHx?.rank||"—"}{rankDelta!==0&&<span style={{fontSize:11,color:rankDelta>0?T.green:T.red,marginLeft:6}}>{rankDelta>0?"↑":"↓"}{Math.abs(rankDelta)}</span>}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.sub,fontSize:11}}>Gap to #1</span><span style={{fontFamily:T.mono,fontSize:13,fontWeight:600,color:aHx?.net>=aBest?.net?T.green:T.red}}>{aHx?.ok&&aBest?.ok?aHx.net>=aBest.net?"— (#1)":(aHx.net-aBest.net).toFixed(3):"—"}</span></div>
                        </div>
                      </div>

                      {/* Ranking Comparison Table */}
                      <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"hidden"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                          <thead><tr style={{background:T.card}}>
                            {["RANK","LENDER","CURRENT NET","PROPOSED NET","Δ PRICE","Δ RANK"].map(h=>(
                              <th key={h} style={{padding:"8px 10px",textAlign:h==="LENDER"?"left":"center",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,fontWeight:600}}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>{after.filter(r=>r.ok).map((ar,i)=>{
                            const br=before.find(x=>x.lender===ar.lender);
                            const isHx=ar.lender===hxN;
                            const priceDelta=br?.ok?+(ar.net-br.net).toFixed(3):0;
                            const rDelta=br?.rank&&ar.rank?br.rank-ar.rank:0;
                            return(
                              <tr key={i} style={{background:isHx?`${T.green}08`:i%2?T.card+"80":"transparent",borderBottom:`1px solid ${T.border}`}}>
                                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,fontSize:14,fontFamily:T.mono,color:ar.rank===1?T.green:ar.rank<=3?T.amber:T.muted}}>{ar.rank}</td>
                                <td style={{padding:"7px 10px",fontWeight:isHx?700:400,color:isHx?T.accent:T.text,fontSize:11,borderLeft:isHx?`2px solid ${T.accent}`:"2px solid transparent"}}>{isHx?"◆ ":""}{ar.lender}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:T.mono,fontSize:12,color:T.sub}}>{br?.ok?br.net.toFixed(3):"—"}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:T.mono,fontSize:12,fontWeight:isHx?700:400}}>{ar.net.toFixed(3)}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:T.mono,fontSize:11,fontWeight:600,color:priceDelta>0?T.green:priceDelta<0?T.red:T.muted}}>{priceDelta!==0?(priceDelta>0?"+":"")+priceDelta.toFixed(3):"—"}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:rDelta>0?T.green:rDelta<0?T.red:T.muted,fontSize:12}}>{rDelta>0?"↑"+rDelta:rDelta<0?"↓"+Math.abs(rDelta):"—"}</td>
                              </tr>
                            );
                          })}</tbody>
                        </table>
                      </div>
                    </>
                  ):(
                    <div style={{textAlign:"center",padding:30,color:T.muted,fontSize:11}}>Select an LLPA and enter an adjustment to see the impact.</div>
                  )}
                </div>
              );
            })()}

            <div style={{marginTop:16,fontSize:9,color:T.dark,textAlign:"center",letterSpacing:2,textTransform:"uppercase"}}>{names.join(" · ")}</div>

            {/* PAR RATE ANALYSIS */}
            {showPar&&!showWhatIf&&parAnalysis&&(
              <div style={{marginBottom:14}}>
                <div style={{padding:"12px 16px",background:T.card,border:`1px solid ${T.border}`,borderRadius:2,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <span style={{fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Par Rate Comparative Analysis</span>
                    <div style={{fontSize:10,color:T.muted,marginTop:2}}>At each FICO/LTV, finds HX par rate (net ≈ 100), then compares HX net price vs competitors at that same rate. Green = HX better priced. Red = competitor better priced.</div>
                  </div>
                </div>

                {parAnalysis.competitors.map(compName=>(
                  <div key={compName} style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:T.accent,marginBottom:6,textTransform:"uppercase",borderLeft:`2px solid ${T.accent}`,paddingLeft:8}}>HX vs {compName}</div>

                    {/* Par Rate Matrix */}
                    <div style={{marginBottom:8,fontSize:10,color:T.muted,letterSpacing:1}}>HX PAR RATE</div>
                    <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"auto",marginBottom:10}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{background:T.card}}>
                          <th style={{padding:"8px 10px",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>LTV \ FICO</th>
                          {config.ficos.map(f=><th key={f} style={{padding:"8px 10px",textAlign:"center",color:T.muted,fontSize:9,borderBottom:`1px solid ${T.border}`,letterSpacing:1}}>{f}</th>)}
                        </tr></thead>
                        <tbody>{config.ltvs.map(ltv=>(
                          <tr key={ltv} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"6px 10px",fontWeight:700,color:T.muted,fontFamily:T.mono}}>{ltv}%</td>
                            {config.ficos.map(fico=>{
                              const d=parAnalysis.grid[`${ltv}_${fico}`];
                              return <td key={fico} style={{padding:"6px 10px",textAlign:"center",fontFamily:T.mono,fontSize:11,color:d?.parRate?T.sub:T.dark}}>{d?.parRate?d.parRate.toFixed(3)+"%":"N/A"}</td>;
                            })}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>

                    {/* Price Differential Matrix */}
                    <div style={{marginBottom:8,fontSize:10,color:T.muted,letterSpacing:1}}>NET PRICE DIFFERENTIAL (HX − {compName.toUpperCase()})</div>
                    <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"auto",marginBottom:10}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{background:T.card}}>
                          <th style={{padding:"8px 10px",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>LTV \ FICO</th>
                          {config.ficos.map(f=><th key={f} style={{padding:"8px 10px",textAlign:"center",color:T.muted,fontSize:9,borderBottom:`1px solid ${T.border}`,letterSpacing:1}}>{f}</th>)}
                        </tr></thead>
                        <tbody>{config.ltvs.map(ltv=>(
                          <tr key={ltv} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"6px 10px",fontWeight:700,color:T.muted,fontFamily:T.mono}}>{ltv}%</td>
                            {config.ficos.map(fico=>{
                              const d=parAnalysis.grid[`${ltv}_${fico}`];
                              const comp=d?.competitors?.[compName];
                              const diff=comp?.diff;
                              const bg=diff!=null?(diff>0?`${T.green}15`:diff<0?`${T.red}12`:"transparent"):"transparent";
                              const tc=diff!=null?(diff>0?T.green:diff<0?T.red:T.muted):T.dark;
                              return <td key={fico} style={{padding:"6px 10px",textAlign:"center",fontFamily:T.mono,fontSize:12,fontWeight:diff?700:400,color:tc,background:bg}}>
                                {diff!=null?(diff>0?"+":"")+diff.toFixed(3):"N/A"}
                              </td>;
                            })}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>

                    {/* Side-by-side: HX Net vs Competitor Net */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[{label:`HX NET PRICE @ PAR`,fn:(d)=>d?.hxNet},{label:`${compName.toUpperCase()} NET PRICE @ HX PAR`,fn:(d)=>d?.competitors?.[compName]?.net}].map(({label,fn},mi)=>(
                        <div key={mi}>
                          <div style={{marginBottom:6,fontSize:10,color:T.muted,letterSpacing:1}}>{label}</div>
                          <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"auto"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                              <thead><tr style={{background:T.card}}>
                                <th style={{padding:"6px 8px",color:T.muted,fontSize:9,letterSpacing:1,borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>LTV\FICO</th>
                                {config.ficos.map(f=><th key={f} style={{padding:"6px 8px",textAlign:"center",color:T.muted,fontSize:9,borderBottom:`1px solid ${T.border}`}}>{f}</th>)}
                              </tr></thead>
                              <tbody>{config.ltvs.map(ltv=>(
                                <tr key={ltv} style={{borderBottom:`1px solid ${T.border}`}}>
                                  <td style={{padding:"5px 8px",fontWeight:700,color:T.muted,fontFamily:T.mono,fontSize:10}}>{ltv}%</td>
                                  {config.ficos.map(fico=>{
                                    const d=parAnalysis.grid[`${ltv}_${fico}`];
                                    const val=fn(d);
                                    return <td key={fico} style={{padding:"5px 8px",textAlign:"center",fontFamily:T.mono,fontSize:11,color:val?T.sub:T.dark}}>{val?val.toFixed(3):"N/A"}</td>;
                                  })}
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary stats */}
                    {(()=>{
                      const diffs=config.ltvs.flatMap(ltv=>config.ficos.map(fico=>parAnalysis.grid[`${ltv}_${fico}`]?.competitors?.[compName]?.diff)).filter(d=>d!=null);
                      const wins=diffs.filter(d=>d>0).length;const losses=diffs.filter(d=>d<0).length;const ties=diffs.filter(d=>d===0).length;
                      const avgDiff=diffs.length?+(diffs.reduce((s,d)=>s+d,0)/diffs.length).toFixed(3):0;
                      return(
                        <div style={{display:"flex",gap:8,marginTop:10,marginBottom:20}}>
                          {[{l:"HX WINS",v:wins,c:T.green},{l:"HX LOSSES",v:losses,c:T.red},{l:"TIES",v:ties,c:T.muted},{l:"AVG DIFFERENTIAL",v:(avgDiff>0?"+":"")+avgDiff.toFixed(3),c:clr(avgDiff)},{l:"SCENARIOS",v:diffs.length,c:T.sub}].map((k,i)=>(
                            <div key={i} style={{flex:1,background:T.card,borderRadius:2,padding:"8px 12px",border:`1px solid ${T.border}`,borderTop:`2px solid ${k.c}22`}}>
                              <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,fontWeight:600}}>{k.l}</div>
                              <div style={{fontSize:18,fontWeight:700,color:k.c,fontFamily:T.mono,marginTop:2}}>{k.v}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            <MarketWidgets />
          </>
        )}
      </div>
    </div>
  );
}
