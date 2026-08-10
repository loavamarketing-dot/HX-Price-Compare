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
  const container = useRef();
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "displayMode": "regular",
        "feedMode": "all_symbols",
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "en",
        "width": "100%",
        "height": "100%"
      }`;
    container.current.appendChild(script);
  }, []);
  return (
    <div className="tradingview-widget-container" ref={container} style={{height:"100%"}}>
      <div className="tradingview-widget-container__widget" style={{height:"100%"}}></div>
      <div className="tradingview-widget-copyright" style={{fontSize:10,padding:"4px 14px",color:"#666"}}>
        <a href="https://www.tradingview.com/news/top-providers/tradingview/" rel="noopener nofollow" target="_blank" style={{color:"#4da6ff",textDecoration:"none"}}>Top stories</a>
        <span> by TradingView</span>
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
          <span style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:T.muted}}>MARKET NEWS</span>
          <span style={{fontSize:9,color:T.dark,letterSpacing:1}}>— TOP STORIES</span>
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
  bg:"#000",sf:"#0a0a0a",card:"#111",border:"#1a1a1a",borderL:"#222",
  accent:"#00d4aa",accentDim:"#00d4aa22",blue:"#4da6ff",purple:"#a78bfa",orange:"#ff8c42",
  green:"#00e68a",red:"#ff4d6a",amber:"#ffd166",
  text:"#fff",sub:"#b3b3b3",muted:"#666",dark:"#444",
  mono:"'JetBrains Mono','SF Mono','Consolas',monospace",
  sans:"'Inter',-apple-system,sans-serif",
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

function calcNet(lender,p){
  const adjs=[];const r={lender:lender.name,rate:p.rate,base:null,adjustments:adjs,totalAdj:0,net:null,ok:true,reason:""};
  const rk=Object.keys(lender.rates).map(Number).sort((a,b)=>Math.abs(a-p.rate)-Math.abs(b-p.rate))[0];
  if(!rk||Math.abs(rk-p.rate)>0.2)return{...r,ok:false,reason:"Rate N/A"};
  r.base=lender.rates[rk]?.[p.lock];if(!r.base)return{...r,ok:false,reason:`No ${p.lock}-day`};
  const bands=Object.values(lender.llpas)[0]?Object.keys(Object.values(lender.llpas)[0]):[];
  const ltvB=matchBand(p.ltv,bands,"ltv");const ficoKeys=Object.keys(lender.llpas).filter(k=>/fico/i.test(k));
  const ficoB=matchBand(p.fico,ficoKeys,"fico");
  if(ficoB&&lender.llpas[ficoB]){const v=lender.llpas[ficoB][ltvB];if(v==null)return{...r,ok:false,reason:`${ficoB}/${ltvB} N/A`};adjs.push({cat:"FICO/LTV",name:ficoB,value:v});}
  if(p.purpose!=="Purchase"){const{name,value}=findLlpa(lender.llpas,[p.purpose.includes("Cash")?"Cash":"Rate/Term"],ltvB);if(value)adjs.push({cat:"Purpose",name,value});}
  if(p.incomeDoc&&p.incomeDoc!=="Bank Statement"){const{name,value}=findLlpa(lender.llpas,[p.incomeDoc,"Full Doc","Asset"],ltvB);if(value)adjs.push({cat:"Income",name,value});}
  if(p.propertyType==="Condo"){const{name,value}=findLlpa(lender.llpas,["Condo","High-Rise"],ltvB);if(value)adjs.push({cat:"Property",name,value});}
  if(parseInt(p.units)>=2){const{name,value}=findLlpa(lender.llpas,["2-4 Units","2 Units"],ltvB);if(value)adjs.push({cat:"Units",name,value});}
  if(p.occupancy==="Second Home"||p.occupancy==="2nd Home"){const{name,value}=findLlpa(lender.llpas,["2nd Home","Second"],ltvB);if(value)adjs.push({cat:"Occupancy",name,value});}
  if(p.occupancy==="Investment"||p.occupancy==="Non-Owner"){const{name,value}=findLlpa(lender.llpas,["Non-Owner","NOO"],ltvB);if(value)adjs.push({cat:"Occupancy",name,value});}
  if(p.interestOnly==="Yes"){const dv=parseFloat(p.dscr)||1;const{name,value}=findLlpa(lender.llpas,dv>=1?["I/O & DSCR Ratio >=","I/O & DSCR >=","Interest Only"]:["I/O & DSCR Ratio <","I/O & DSCR <","Interest Only"],ltvB);if(value)adjs.push({cat:"I/O",name,value});}
  if(p.selfEmployed==="Yes"){const{name,value}=findLlpa(lender.llpas,["Self-Employed","Self Emp"],ltvB);if(value)adjs.push({cat:"Self-Emp",name,value});}
  if(p.dscr){const dv=parseFloat(p.dscr);let t=[];if(dv>=1.25)t=["DSCR 1.25","DSCR 1.2"];else if(dv>=1.0)t=["DSCR 1.00","DSCR 1.0"];else if(dv>=0.75)t=["DSCR 0.75","DSCR 0.7"];else t=["No DSCR","DSCR (<"];const{name,value}=findLlpa(lender.llpas,t,ltvB);if(value)adjs.push({cat:"DSCR",name,value});}
  if(p.ppp&&p.ppp!=="None"){const{name,value}=findLlpa(lender.llpas,[p.ppp],ltvB);if(value)adjs.push({cat:"PPP",name,value});}
  if(p.loanAmount){const a=parseInt(p.loanAmount);let t=[];if(a>=500000)t=["$500k","≥ $500"];else if(a>=300000)t=["$300k","≥ $300"];else if(a>=150000)t=["$150k","≥ $150"];else t=["<$150","< $150"];const{name,value}=findLlpa(lender.llpas,t,ltvB);if(value)adjs.push({cat:"Loan Amt",name,value});}
  if(p.impoundWaiver==="Yes"){const{name,value}=findLlpa(lender.llpas,["Impound","Waive"],ltvB);if(value)adjs.push({cat:"Impound",name,value});}
  if(p.rural==="Yes"){const{name,value}=findLlpa(lender.llpas,["Rural"],ltvB);if(value)adjs.push({cat:"Rural",name,value});}
  if(p.str==="Yes"){const{name,value}=findLlpa(lender.llpas,["Short Term","STR"],ltvB);if(value)adjs.push({cat:"STR",name,value});}
  if(p.foreignNational==="Yes"){const{name,value}=findLlpa(lender.llpas,["Foreign"],ltvB);if(value)adjs.push({cat:"Foreign",name,value});}
  const dti=findLlpa(lender.llpas,["DTI <= 43%","DTI"],ltvB);if(dti.value)adjs.push({cat:"DTI",name:dti.name,value:dti.value});
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
   PARSER
   ═══════════════════════════════════════════════════════════════ */
function parseFile(data){
  const wb=XLSX.read(data,{type:"array"});const lenders={};let prod="consumer";
  for(const name of wb.SheetNames){if(/instruct/i.test(name)){if(XLSX.utils.sheet_to_csv(wb.Sheets[name]).toLowerCase().includes("dscr"))prod="dscr";continue;}const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:""});const l={name,rates:{},llpas:{}};let sec=null,cols=[];for(const row of rows){const f=String(row[0]||"").trim();if(/base.*(rate|price)/i.test(f)){sec="r";continue;}if(/fico.*adjust|fico.*ltv/i.test(f)){sec="f";continue;}if(/loan level|other.*adjust|pricing adjust/i.test(f)&&!/fico/i.test(f)){sec="l";continue;}if(/^(Rate|FICO.*|Adjustment)$/i.test(f)||f==="FICO / LTV"){if(sec!=="r")cols=row.slice(1).map(v=>String(v).trim()).filter(Boolean);continue;}if(sec==="r"&&f){const rate=parseFloat(f.replace("%",""));if(!isNaN(rate)&&rate>3){l.rates[rate]={};["15","30","45"].forEach((lk,i)=>{const v=parseFloat(row[i+1]);if(!isNaN(v)&&v>50)l.rates[rate][lk]=v;});}}if((sec==="f"||sec==="l")&&f&&cols.length){const vals={};cols.forEach((b,i)=>{const v=row[i+1];vals[b]=(v==="N/A"||v===""||v===undefined)?null:isNaN(parseFloat(v))?null:parseFloat(v);});l.llpas[f]=vals;if(/dscr/i.test(f))prod="dscr";}}if(Object.keys(l.rates).length)lenders[name]=l;}return{lenders,product:prod};
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════════ */
function exportPDF(results,matrix,buydown,config,params,lenders,view,hxN){
  const hx=results.find(r=>r.lender===hxN);const best=results[0];
  const gap=hx?.ok&&best?.ok?(hx.net-best.net).toFixed(3):"N/A";
  const ts=new Date().toLocaleString();
  const allCats=[...new Set(results.flatMap(r=>r.adjustments?.map(a=>a.cat)||[]))];

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
    @page{margin:30px 40px;size:landscape;}body{font-family:Arial,sans-serif;color:#222;margin:0;padding:40px;}
    h1{font-size:20px;color:#000;margin:0;letter-spacing:1px;}h2{font-size:14px;color:#333;margin:24px 0 6px;border-bottom:2px solid #000;padding-bottom:3px;letter-spacing:0.5px;}
    .sub{font-size:10px;color:#888;margin:2px 0 16px;letter-spacing:1px;text-transform:uppercase;}
    .narrative{background:#f8f8f8;border-left:3px solid #00b894;padding:10px 14px;margin:12px 0;font-size:11px;line-height:1.6;}
    .kpi-grid{display:flex;gap:10px;margin:12px 0;}.kpi{border:1px solid #ddd;padding:8px 12px;min-width:100px;}.kpi-label{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;}.kpi-value{font-size:18px;font-weight:700;margin-top:2px;}
    table{width:100%;border-collapse:collapse;font-size:10px;margin:6px 0;}th{background:#111;color:#fff;padding:5px 6px;text-align:center;font-size:8px;text-transform:uppercase;letter-spacing:0.5px;}td{padding:4px 6px;border-bottom:1px solid #eee;text-align:center;}
    tr:nth-child(even){background:#f9f9f9;}.hx{background:#e6fff7!important;font-weight:700;}.pos{color:#008855;font-weight:600;}.neg{color:#cc2244;font-weight:600;}
    .params{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:8px 0;font-size:9px;}.param b{color:#000;}
    .footer{margin-top:20px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#aaa;display:flex;justify-content:space-between;}
    .page-break{page-break-before:always;}
  </style></head><body>`;

  html+=`<h1>PRICING COMPARISON REPORT</h1><div class="sub">${config.label} · ${ts}</div>`;

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
   APP
   ═══════════════════════════════════════════════════════════════ */
export default function App(){
  const urlP=readParams();
  const[lenders,setLenders]=useState(null);
  const[product,setProduct]=useState("consumer");
  const[view,setView]=useState(urlP._view||"ranking");
  const[file,setFile]=useState("");
  const[showBuydown,setShowBuydown]=useState(false);
  const[params,setParams]=useState({
    rate:urlP.rate||7.25,fico:urlP.fico||720,ltv:urlP.ltv||75,lock:urlP.lock||"30",
    purpose:urlP.purpose||"Purchase",loanAmount:urlP.loanAmount||"750000",
    propertyType:urlP.propertyType||"Single Family",occupancy:urlP.occupancy||"Primary",
    units:"1",incomeDoc:urlP.incomeDoc||"Bank Statement",
    selfEmployed:urlP.selfEmployed||"No",interestOnly:urlP.interestOnly||"No",
    dscr:urlP.dscr||"1.00",ppp:urlP.ppp||"3 Year",
    impoundWaiver:"No",housing1x30:"No",rural:"No",foreignNational:"No",str:"No",
  });

  const config=CONFIGS[product];
  const set=(k,v)=>{setParams(p=>{const next={...p,[k]:v};return next;});};
  const[dragging,setDragging]=useState(false);

  // Sync URL
  useEffect(()=>{if(lenders)writeParams(params,view);},[params,view,lenders]);

  const processFile=useCallback(f=>{if(!f)return;setFile(f.name);const rd=new FileReader();rd.onload=ev=>{const{lenders:l,product:p}=parseFile(new Uint8Array(ev.target.result));setLenders(l);setProduct(p);};rd.readAsArrayBuffer(f);},[]);
  const onUpload=useCallback(e=>{processFile(e.target.files[0]);},[processFile]);
  const onDrop=useCallback(e=>{e.preventDefault();e.stopPropagation();setDragging(false);const f=e.dataTransfer?.files?.[0];if(f&&/\.xlsx?$/i.test(f.name))processFile(f);},[processFile]);
  const onDragOver=useCallback(e=>{e.preventDefault();e.stopPropagation();setDragging(true);},[]);
  const onDragLeave=useCallback(e=>{e.preventDefault();e.stopPropagation();setDragging(false);},[]);
  const rates=useMemo(()=>lenders?[...new Set(Object.values(lenders).flatMap(l=>Object.keys(l.rates).map(Number)))].sort((a,b)=>a-b):[],[lenders]);
  const results=useMemo(()=>{if(!lenders)return[];const a=Object.values(lenders).map(l=>calcNet(l,params));const o=a.filter(r=>r.ok).sort((a,b)=>b.net-a.net);o.forEach((r,i)=>r.rank=i+1);return[...o,...a.filter(r=>!r.ok)];},[lenders,params]);
  const matrix=useMemo(()=>{if(!lenders||view!=="matrix")return{};const m={};for(const ltv of config.ltvs)for(const fico of config.ficos){const p={...params,fico,ltv};const a=Object.values(lenders).map(l=>calcNet(l,p));const o=a.filter(r=>r.ok).sort((a,b)=>b.net-a.net);o.forEach((r,i)=>r.rank=i+1);m[`${ltv}_${fico}`]=[...o,...a.filter(r=>!r.ok)];}return m;},[lenders,params,view,config]);
  const buydown=useMemo(()=>lenders?calcBuydownAnalysis(lenders,params):null,[lenders,params]);

  const names=lenders?Object.keys(lenders):[];
  const hxN=names.find(n=>/hx|homex/i.test(n))||names[0];
  const hx=results.find(r=>r.lender===hxN);const best=results[0];

  const Sel=({l,v,fn,opts,w})=>(<div style={{minWidth:w||100}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>{l}</div><select value={v} onChange={e=>fn(e.target.value)} style={{width:"100%",padding:"6px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,fontFamily:T.sans,outline:"none"}}>{opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select></div>);
  const Tog=({l,v,fn})=>(<div style={{minWidth:75}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>{l}</div><button onClick={()=>fn(v==="Yes"?"No":"Yes")} style={{width:"100%",padding:"6px 8px",background:v==="Yes"?T.accentDim:T.sf,color:v==="Yes"?T.accent:T.muted,border:`1px solid ${v==="Yes"?T.accent+"44":T.border}`,borderRadius:2,fontSize:11,cursor:"pointer",fontWeight:600,fontFamily:T.sans}}>{v==="Yes"?"● YES":"○ NO"}</button></div>);
  const Inp=({l,v,fn,w,ph})=>(<div style={{minWidth:w||100}}><div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:3,fontWeight:600}}>{l}</div><input value={v} onChange={e=>fn(e.target.value)} placeholder={ph} style={{width:"100%",padding:"6px 8px",background:T.sf,color:T.text,border:`1px solid ${T.border}`,borderRadius:2,fontSize:12,fontFamily:T.mono,outline:"none",boxSizing:"border-box"}}/></div>);

  const getA=(r,cat)=>r.adjustments?.filter(a=>a.cat===cat).reduce((s,a)=>s+a.value,0)||0;

  return(
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:T.sans}}>
      {/* HEADER */}
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",gap:2}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:20,background:T.accent,opacity:1-i*0.3,borderRadius:1}}/>)}</div>
          <div><div style={{fontSize:15,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Pricing Engine</div><div style={{fontSize:10,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginTop:1}}>{lenders?`${names.length} LENDERS · ${config.label}`:"AWAITING TEMPLATE"}</div></div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {lenders&&<span style={{border:`1px solid ${T.accent}44`,color:T.accent,padding:"3px 12px",borderRadius:2,fontSize:10,fontWeight:600,letterSpacing:1.5}}>{config.label}</span>}
          <label style={{background:T.accent,color:T.bg,padding:"7px 20px",borderRadius:2,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{file?"✓ LOADED":"UPLOAD"}<input type="file" accept=".xlsx,.xls" onChange={onUpload} style={{display:"none"}}/></label>
        </div>
      </div>

      <div style={{maxWidth:1500,margin:"0 auto",padding:"20px 28px"}}>
        {!lenders?(
          <>
          <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} style={{textAlign:"center",padding:"80px 20px",border:`2px dashed ${dragging?T.accent:T.border}`,borderRadius:2,marginTop:40,background:dragging?T.accentDim:"transparent",transition:"all .2s",cursor:"pointer"}} onClick={()=>document.getElementById("file-input").click()}>
            <input id="file-input" type="file" accept=".xlsx,.xls" onChange={onUpload} style={{display:"none"}}/>
            <div style={{width:60,height:60,border:`2px solid ${dragging?T.accent:T.border}`,borderRadius:2,margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}><span style={{fontSize:24,color:T.accent}}>{dragging?"↓":"↑"}</span></div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{dragging?"DROP FILE HERE":"INITIALIZE SYSTEM"}</div>
            <div style={{fontSize:12,color:T.muted,maxWidth:400,margin:"0 auto",lineHeight:1.8}}>{dragging?"Release to upload template":"Drag & drop a competitor template (.xlsx) here, or click to browse"}</div>
          </div>
          <MarketWidgets />
          </>
        ):(
          <>
            {/* PARAMETERS */}
            <div style={{border:`1px solid ${T.border}`,borderRadius:2,marginBottom:14,overflow:"hidden"}}>
              {[
                {label:"LOAN",color:T.accent,fields:<><Sel l="Rate" v={params.rate} fn={v=>set("rate",+v)} opts={rates.map(r=>({v:r,l:r.toFixed(3)+"%"}))}/><Sel l="FICO" v={params.fico} fn={v=>set("fico",+v)} opts={config.ficos}/><Sel l="LTV" v={params.ltv} fn={v=>set("ltv",+v)} opts={config.ltvs.map(l=>({v:l,l:l+"%"}))}/><Inp l="Loan Amount" v={params.loanAmount} fn={v=>set("loanAmount",v)} ph="750000" w={115}/><Sel l="Lock" v={params.lock} fn={v=>set("lock",v)} opts={[{v:"15",l:"15 DAY"},{v:"30",l:"30 DAY"},{v:"45",l:"45 DAY"}]} w={80}/><Sel l="Purpose" v={params.purpose} fn={v=>set("purpose",v)} opts={["Purchase","Rate/Term Refi","Cash-Out"]}/></>},
                {label:"PROPERTY",color:T.green,fields:<><Sel l="Type" v={params.propertyType} fn={v=>set("propertyType",v)} opts={["Single Family","Condo","PUD","2-4 Units"]}/><Sel l="Occupancy" v={params.occupancy} fn={v=>set("occupancy",v)} opts={product==="dscr"?["Investment","Non-Owner"]:["Primary","Second Home","Investment"]}/><Sel l="Units" v={params.units} fn={v=>set("units",v)} opts={["1","2","3-4"]} w={60}/><Tog l="Rural" v={params.rural} fn={v=>set("rural",v)}/>{product==="dscr"&&<Tog l="STR" v={params.str} fn={v=>set("str",v)}/>}</>},
                {label:"BORROWER",color:T.orange,fields:<><Sel l="Income Doc" v={params.incomeDoc} fn={v=>set("incomeDoc",v)} opts={product==="dscr"?["DSCR","Full Doc","Alt Doc","Asset Xpress","Bank Statement"]:["Bank Statement","Full Doc","Asset Xpress"]}/><Tog l="Self Emp" v={params.selfEmployed} fn={v=>set("selfEmployed",v)}/><Tog l="I/O" v={params.interestOnly} fn={v=>set("interestOnly",v)}/><Tog l="Impound" v={params.impoundWaiver} fn={v=>set("impoundWaiver",v)}/>{product==="dscr"&&<Tog l="Foreign" v={params.foreignNational} fn={v=>set("foreignNational",v)}/>}</>},
                ...(product==="dscr"?[{label:"DSCR",color:T.purple,fields:<><Sel l="DSCR Ratio" v={params.dscr} fn={v=>set("dscr",v)} opts={["1.25","1.00","0.85","0.75","No DSCR"]}/><Sel l="Prepay Penalty" v={params.ppp} fn={v=>set("ppp",v)} opts={["5 Year","4 Year","3 Year","2 Year","1 Year","No Prepay","None"]}/></>}]:[]),
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
              <button onClick={()=>setShowBuydown(!showBuydown)} style={{padding:"8px 20px",background:showBuydown?T.blue:T.bg,color:showBuydown?T.bg:T.muted,border:`1px solid ${showBuydown?T.blue:T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>BUYDOWN</button>
              <div style={{flex:1}}/>
              <button onClick={()=>exportPDF(results,matrix,buydown,config,params,lenders,view,hxN)} style={{padding:"8px 16px",background:"transparent",color:T.accent,border:`1px solid ${T.accent}44`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>⬇ PDF REPORT</button>
              <button onClick={()=>exportXLSX(results,params,best)} style={{padding:"8px 16px",background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:2,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5}}>⬇ XLSX</button>
            </div>

            {/* KPIs */}
            {view!=="matrix"&&!showBuydown&&(
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
            {showBuydown&&buydown&&(
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
            {view==="ranking"&&!showBuydown&&(
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
            {view==="decomp"&&!showBuydown&&(
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
            {view==="matrix"&&!showBuydown&&(
              <div style={{border:`1px solid ${T.border}`,borderRadius:2,overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:T.card}}><th style={{padding:"10px 12px",color:T.muted,fontSize:9,letterSpacing:1.5,borderBottom:`1px solid ${T.border}`,fontWeight:600,textAlign:"left"}}>LTV \ FICO</th>{config.ficos.map(f=><th key={f} style={{padding:"10px 12px",textAlign:"center",color:T.muted,fontSize:9,borderBottom:`1px solid ${T.border}`,fontWeight:600,letterSpacing:1}}>{f}</th>)}</tr></thead>
                  <tbody>{config.ltvs.map(ltv=>(<tr key={ltv} style={{borderBottom:`1px solid ${T.border}`}}><td style={{padding:"10px 12px",fontWeight:700,color:T.muted,fontFamily:T.mono,letterSpacing:1}}>{ltv}%</td>{config.ficos.map(fico=>{const res=matrix[`${ltv}_${fico}`]||[];const h=res.find(r=>r.lender===hxN);const rk=h?.rank;const gap=h?.ok&&res[0]?.ok?+(h.net-res[0].net).toFixed(3):null;const bg=rk?(rk===1?`${T.green}15`:rk<=3?`${T.green}0a`:rk<=5?`${T.amber}0a`:rk<=10?`${T.orange}08`:`${T.red}08`):"transparent";const tc=rk?(rk===1?T.green:rk<=3?T.amber:rk<=5?T.amber:rk<=10?T.orange:T.red):T.muted;return(<td key={fico} style={{padding:"8px 10px",textAlign:"center",background:bg,cursor:"pointer"}} onClick={()=>{setParams(p=>({...p,fico,ltv}));setView("ranking");}}><div style={{fontWeight:800,fontSize:15,color:tc,fontFamily:T.mono}}>{rk?`#${rk}`:"N/A"}</div>{h?.ok&&<div style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>{h.net.toFixed(2)}</div>}{gap!==null&&gap<0&&<div style={{fontSize:8,color:T.red,fontFamily:T.mono}}>{gap.toFixed(3)}</div>}</td>);})}</tr>))}</tbody>
                </table>
                <div style={{padding:"8px 14px",fontSize:9,color:T.muted,background:T.card,letterSpacing:1,textTransform:"uppercase"}}>Click cell to drill into scenario · All parameters apply</div>
              </div>
            )}

            <div style={{marginTop:16,fontSize:9,color:T.dark,textAlign:"center",letterSpacing:2,textTransform:"uppercase"}}>{names.join(" · ")}</div>

            <MarketWidgets />
          </>
        )}
      </div>
    </div>
  );
}
