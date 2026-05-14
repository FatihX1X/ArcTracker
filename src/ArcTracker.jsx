import { useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── NETWORK ──────────────────────────────────────────────────────────────────
const ARCSCAN      = "https://testnet.arcscan.app";
const ARCSCAN_V2   = `${ARCSCAN}/api/v2`;
const ARCSCAN_LEG  = `${ARCSCAN}/api`;

// All requests go through our own Vercel serverless proxy
// → bypasses CORS (browser ↔ /api/proxy ↔ testnet.arcscan.app)
const PROXY = "/api/proxy";
const via   = (url) => `${PROXY}?target=${encodeURIComponent(url)}`;

// Arc Testnet decimal rules
// Native coin (balance, tx.value, fee)  → 18 decimals
// ERC-20 USDC / EURC token transfers    →  6 decimals
const NATIVE_DEC = 18;
const TOKEN_DEC  = 6;
const NATIVE_SYM = "USDC";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  neon:"#00ffe0", blue:"#3b82f6", purple:"#a855f7",
  amber:"#f59e0b", red:"#ef4444", green:"#10b981", bg:"#060b14",
};
const PIE_COLS = [C.neon,C.blue,C.purple,C.amber,C.red,C.green,"#f43f5e","#06b6d4"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:${C.bg};font-family:'JetBrains Mono',monospace;color:#e2e8f0;overflow-x:hidden}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0c1422}
::-webkit-scrollbar-thumb{background:rgba(0,255,224,.28);border-radius:3px}
/* bg */
.bg{position:fixed;inset:0;z-index:0;pointer-events:none;background:${C.bg}}
.grid{position:absolute;inset:0;
  background-image:linear-gradient(rgba(0,255,224,.04) 1px,transparent 1px),
  linear-gradient(90deg,rgba(0,255,224,.04) 1px,transparent 1px);
  background-size:40px 40px}
.ga{position:absolute;border-radius:50%}
.g1{width:600px;height:600px;top:-100px;left:-100px;
  background:radial-gradient(circle,rgba(0,255,224,.07),transparent 70%);
  animation:gf 12s ease-in-out infinite alternate}
.g2{width:500px;height:500px;bottom:0;right:-50px;
  background:radial-gradient(circle,rgba(59,130,246,.06),transparent 70%);
  animation:gf 15s ease-in-out infinite alternate-reverse}
.g3{width:350px;height:350px;top:50%;left:40%;
  background:radial-gradient(circle,rgba(168,85,247,.05),transparent 70%);
  animation:gf 9s ease-in-out infinite}
@keyframes gf{from{transform:translateY(0) scale(1)}to{transform:translateY(-28px) scale(1.08)}}
/* layout */
.card{background:rgba(255,255,255,.03);border:1px solid rgba(0,255,224,.11);
  border-radius:16px;backdrop-filter:blur(12px);transition:border-color .3s,transform .2s}
.card:hover{border-color:rgba(0,255,224,.24);transform:translateY(-1px)}
.sc{background:linear-gradient(135deg,rgba(0,255,224,.038),rgba(6,11,20,.92));
  border:1px solid rgba(0,255,224,.13);border-radius:14px;padding:20px;
  position:relative;overflow:hidden;transition:all .28s}
.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(0,255,224,.48),transparent)}
.sc:hover{border-color:rgba(0,255,224,.32);box-shadow:0 0 36px rgba(0,255,224,.06);transform:translateY(-2px)}
/* btn */
.btn{background:linear-gradient(135deg,rgba(0,255,224,.1),rgba(59,130,246,.07));
  border:1px solid rgba(0,255,224,.32);color:${C.neon};border-radius:10px;
  padding:11px 22px;font-family:'JetBrains Mono',monospace;font-size:13px;
  font-weight:600;letter-spacing:1px;cursor:pointer;transition:all .22s;text-transform:uppercase}
.btn:hover{background:linear-gradient(135deg,rgba(0,255,224,.19),rgba(59,130,246,.11));
  box-shadow:0 0 18px rgba(0,255,224,.2);transform:translateY(-1px)}
.btn:disabled{opacity:.36;cursor:not-allowed;transform:none}
/* input */
.inp{background:rgba(255,255,255,.04);border:1.5px solid rgba(0,255,224,.17);
  color:#e2e8f0;border-radius:12px;padding:15px 20px;
  font-family:'JetBrains Mono',monospace;font-size:14px;width:100%;outline:none;transition:all .28s}
.inp:focus{border-color:rgba(0,255,224,.58);
  box-shadow:0 0 0 3px rgba(0,255,224,.07),0 0 18px rgba(0,255,224,.08)}
.inp::placeholder{color:rgba(255,255,255,.2)}
/* table */
.txr{transition:background .12s}.txr:hover{background:rgba(0,255,224,.022)}
.badge{padding:3px 9px;border-radius:6px;font-size:10px;font-weight:600;
  letter-spacing:.5px;text-transform:uppercase}
/* skeleton */
.sk{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);
  background-size:800px 100%;animation:skm 1.4s infinite;border-radius:7px}
@keyframes skm{0%{background-position:-800px 0}100%{background-position:800px 0}}
/* copy */
.cp{background:none;border:none;cursor:pointer;color:rgba(0,255,224,.42);
  padding:2px 5px;border-radius:4px;font-size:11px;transition:all .14s}
.cp:hover{color:${C.neon};background:rgba(0,255,224,.08)}
/* animations */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pls{0%,100%{opacity:.7}50%{opacity:1;box-shadow:0 0 12px ${C.neon}}}
.f1{animation:up .42s ease forwards}
.f2{animation:up .42s .07s ease forwards;opacity:0}
.f3{animation:up .42s .14s ease forwards;opacity:0}
.f4{animation:up .42s .20s ease forwards;opacity:0}
/* section title */
.st{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;
  color:#fff;display:flex;align-items:center;gap:10px}
.st::before{content:'';width:3px;height:17px;flex-shrink:0;
  background:linear-gradient(to bottom,${C.neon},${C.blue});border-radius:2px}
/* tooltip */
.tip{background:rgba(4,9,18,.97)!important;border:1px solid rgba(0,255,224,.16)!important;
  border-radius:10px!important;padding:10px 14px;
  font-family:'JetBrains Mono',monospace!important;font-size:12px!important}
/* src badge */
.sbadge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;
  border-radius:20px;font-size:10px;letter-spacing:1px;text-transform:uppercase}
/* debug */
.dbg{padding:13px 16px;background:rgba(0,0,0,.45);
  border:1px solid rgba(255,255,255,.07);border-radius:10px;
  font-size:11px;line-height:1.9;overflow-x:auto}
/* responsive */
@media(max-width:640px){
  .sc{padding:14px}.inp{font-size:12px;padding:12px 15px}
  .twocol{grid-template-columns:1fr!important}
}
@media print{
  .bg,.noprint{display:none!important}
  body{background:#fff;color:#000}
  .card,.sc{border:1px solid #ddd!important}
}
`;

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
function fromRaw(raw, dec) {
  if (!raw && raw !== 0) return 0;
  try { return Number(BigInt(String(raw).split(".")[0])) / 10 ** dec; }
  catch { return Number(raw) / 10 ** dec; }
}
function shortNum(n) {
  if (!n || isNaN(n)) return "0";
  if (n >= 1e9) return (n/1e9).toFixed(2)+"B";
  if (n >= 1e6) return (n/1e6).toFixed(2)+"M";
  if (n >= 1e3) return (n/1e3).toFixed(2)+"K";
  return n.toFixed(4);
}
const fmtN = (raw, dp=6) => fromRaw(raw, NATIVE_DEC).toFixed(dp);
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
function ago(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now()-new Date(ts).getTime())/1000);
  if (s<60) return `${s}s ago`;
  if (s<3600) return `${Math.floor(s/60)}m ago`;
  if (s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
const trunc=(s="",a=6,b=4)=>s?`${s.slice(0,a)}…${s.slice(-b)}`:"—";
const truncH=(h="")=>h?`${h.slice(0,10)}…${h.slice(-6)}`:"—";
const cap=(s)=>s?s[0].toUpperCase()+s.slice(1):"";
function cp(t){try{navigator.clipboard.writeText(t)}catch{
  const el=Object.assign(document.createElement("textarea"),{value:t});
  document.body.appendChild(el);el.select();document.execCommand("copy");
  document.body.removeChild(el);}}

// ─── PROXY-BASED API LAYER ────────────────────────────────────────────────────
async function proxyGet(url) {
  const res = await fetch(via(url), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(()=>"");
    throw new Error(`HTTP ${res.status} — ${body.slice(0,120)}`);
  }
  return res.json();
}

async function v2Pages(path, key="items", maxPages=6) {
  let all=[], next=null;
  for (let p=0; p<maxPages; p++) {
    let url = `${ARCSCAN_V2}${path}?limit=50`;
    if (next) url += "&"+new URLSearchParams(next).toString();
    const data = await proxyGet(url);
    const batch = data[key] ?? [];
    all = all.concat(batch);
    if (!data.next_page_params || !batch.length) break;
    next = data.next_page_params;
  }
  return all;
}

async function legacyGet(params) {
  const url = new URL(ARCSCAN_LEG);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const data = await proxyGet(url.toString());
  const EMPTY = ["No transactions found","No token transfers found","No records found"];
  if (data.status==="0" && !EMPTY.includes(data.message))
    throw new Error(data.message||"API error");
  return Array.isArray(data.result) ? data.result : [];
}

function normLegacyTx(tx) {
  let fee="0";
  try { fee=String(BigInt(tx.gasUsed??"0")*BigInt(tx.gasPrice??"0")); } catch {}
  return {
    hash:      tx.hash,
    timestamp: tx.timeStamp ? new Date(Number(tx.timeStamp)*1000).toISOString() : null,
    from:      {hash:tx.from},
    to:        tx.to ? {hash:tx.to} : null,
    value:     tx.value??"0",
    fee:       {value:fee},
    status:    tx.isError==="0"?"ok":"error",
    tx_types:  !tx.to ? ["contract_creation"]
               : (tx.input&&tx.input!=="0x") ? ["contract_call"]
               : ["coin_transfer"],
    method:    tx.functionName ? tx.functionName.split("(")[0] : null,
  };
}

// ─── MASTER FETCH ─────────────────────────────────────────────────────────────
async function fetchAll(address, onPhase) {
  const log = [];
  let info=null, txs=[], tokenTxs=[], source="";

  // 1) Address info
  onPhase("Fetching wallet info…");
  try {
    info = await proxyGet(`${ARCSCAN_V2}/addresses/${address}`);
    log.push(`✓ v2 address info  (balance raw: ${info.coin_balance})`);
    source = "v2";
  } catch(e) {
    log.push(`✗ v2 address: ${e.message}`);
    try {
      const bal = await legacyGet({module:"account",action:"balance",address,tag:"latest"});
      info = {coin_balance:String(bal??"0"),_legacy:true};
      log.push(`✓ legacy balance: ${bal}`);
      source = "legacy";
    } catch(e2) {
      log.push(`✗ legacy balance: ${e2.message}`);
      info = {coin_balance:"0"};
    }
  }

  // 2) Transactions
  onPhase("Fetching transactions…”);
  let gotV2 = false;
  try {
    txs = await v2Pages(`/addresses/${address}/transactions`);
    log.push(`✓ v2 txs: ${txs.length}`);
    gotV2 = true;
    if (source!=="legacy") source="v2";
  } catch(e) { log.push(`✗ v2 txs: ${e.message}`); }

  if (!gotV2) {
    onPhase("Fetching transactions (legacy)…”);
    try {
      const raw = await legacyGet({
        module:"account",action:"txlist",address,
        startblock:"0",endblock:"99999999",page:"1",offset:"200",sort:"desc",
      });
      txs = raw.map(normLegacyTx);
      log.push(`✓ legacy txs: ${txs.length}`);
      source = "legacy";
    } catch(e2) { log.push(`✗ legacy txs: ${e2.message}`); }
  }

  // 3) Token transfers
  onPhase("Fetching token transfers…”);
  try {
    tokenTxs = await v2Pages(`/addresses/${address}/token-transfers`);
    log.push(`✓ v2 token txs: ${tokenTxs.length}`);
  } catch(e) {
    log.push(`✗ v2 token txs: ${e.message}`);
    try {
      tokenTxs = await legacyGet({module:"account",action:"tokentx",address,page:"1",offset:"200",sort:"desc"});
      log.push(`✓ legacy token txs: ${tokenTxs.length}`);
    } catch(e2) { log.push(`✗ legacy token txs: ${e2.message}`); }
  }

  return {info,txs,tokenTxs,source,log};
}

// ─── DATA PROCESSOR ───────────────────────────────────────────────────────────
function process(address, info, txs, tokenTxs) {
  const me     = address.toLowerCase();
  const sorted = [...txs].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

  const daySet = new Set(sorted.filter(t=>t.timestamp).map(t=>new Date(t.timestamp).toDateString()));

  let feeSum=0;
  sorted.forEach(tx=>{ feeSum += fromRaw(tx.fee?.value??"0", NATIVE_DEC); });

  let volSum=0;
  sorted.forEach(tx=>{ volSum += fromRaw(tx.value??"0", NATIVE_DEC); });
  tokenTxs.forEach(tt=>{
    try {
      const dec = Number(tt.token?.decimals ?? tt.tokenDecimal ?? TOKEN_DEC);
      const raw = tt.total?.value ?? tt.value ?? "0";
      volSum += fromRaw(raw, dec);
    } catch {}
  });

  const contracts = new Set();
  sorted.forEach(tx=>{
    const to = tx.to?.hash?.toLowerCase();
    if (!to) return;
    const t = tx.tx_types??[];
    if (t.includes("contract_call")||t.includes("contract_creation")) contracts.add(to);
  });

  // daily activity
  const dMap={};
  sorted.forEach(tx=>{
    if (!tx.timestamp) return;
    const d = new Date(tx.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"});
    dMap[d] = (dMap[d]||0)+1;
  });
  const dailyActivity = Object.entries(dMap).slice(-30).map(([date,count])=>({date,count}));

  // monthly volume
  const mMap={};
  const addM=(ts,val)=>{
    const d = typeof ts==="number" ? new Date(ts*1000) : new Date(ts);
    if (isNaN(d)) return;
    const m = d.toLocaleDateString("en-US",{month:"short",year:"2-digit"});
    mMap[m] = (mMap[m]||0)+val;
  };
  sorted.forEach(tx=>addM(tx.timestamp, fromRaw(tx.value??"0",NATIVE_DEC)));
  tokenTxs.forEach(tt=>{
    const ts=tt.timestamp??tt.timeStamp; if(!ts) return;
    const dec=Number(tt.token?.decimals??tt.tokenDecimal??TOKEN_DEC);
    addM(ts, fromRaw(tt.total?.value??tt.value??"0",dec));
  });
  const monthlyVolume = Object.entries(mMap).slice(-12).map(([month,volume])=>({month,volume:+volume.toFixed(4)}));

  // tx types
  const tMap={};
  txs.forEach(tx=>{
    let label="Transfer";
    const t=tx.tx_types??[];
    if (t.includes("contract_creation"))           label="Deploy";
    else if (tx.method==="approve")                label="Approve";
    else if (t.includes("token_transfer"))         label="Token Tx";
    else if (t.includes("contract_call")&&tx.method) label=cap(tx.method);
    else if (t.includes("contract_call"))          label="Contract Call";
    tMap[label]=(tMap[label]||0)+1;
  });
  const txTypes = Object.entries(tMap).map(([name,value])=>({name,value}));

  // fees over time
  const gMap={};
  sorted.forEach(tx=>{
    if (!tx.timestamp) return;
    const d=new Date(tx.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"});
    gMap[d]=(gMap[d]||0)+fromRaw(tx.fee?.value??"0",NATIVE_DEC);
  });
  const feesOverTime=Object.entries(gMap).slice(-20).map(([date,fee])=>({date,fee:+fee.toFixed(8)}));

  const sent     = txs.filter(tx=>tx.from?.hash?.toLowerCase()===me).length;
  const received = txs.filter(tx=>tx.to?.hash?.toLowerCase()===me).length;
  const balance  = fromRaw(info?.coin_balance??"0", NATIVE_DEC).toFixed(6);

  return {
    totalTxs:txs.length, activeDays:daySet.size,
    totalVol:shortNum(volSum), totalFee:feeSum.toFixed(8),
    firstTx:sorted[0]?.timestamp??null,
    lastTx:sorted[sorted.length-1]?.timestamp??null,
    balance, contractsCount:contracts.size, sent, received,
    dailyActivity, monthlyVolume, txTypes, feesOverTime,
    recentTxs:txs.slice(0,30),
  };
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function CopyBtn({text}) {
  const [ok,setOk]=useState(false);
  return <button className="cp" onClick={()=>{cp(text);setOk(true);setTimeout(()=>setOk(false),1500)}}>{ok?"✓":"⧉"}</button>;
}

function Spinner({text}) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:"48px 0"}}>
      <div style={{width:44,height:44,border:"2px solid rgba(0,255,224,.1)",borderTop:`2px solid ${C.neon}`,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      {text&&<p style={{color:"rgba(0,255,224,.5)",fontSize:12,letterSpacing:2}}>{text}</p>}
    </div>
  );
}

function SkelCard() {
  return <div className="sc"><div className="sk" style={{height:10,width:"55%",marginBottom:12}}/><div className="sk" style={{height:25,width:"72%",marginBottom:10}}/><div className="sk" style={{height:9,width:"38%"}}/></div>;
}

function StatCard({icon,label,value,sub,color=C.neon,delay="0s"}) {
  return (
    <div className="sc f1" style={{animationDelay:delay}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:13}}>
        <span style={{fontSize:20}}>{icon}</span>
        <div style={{width:7,height:7,borderRadius:"50%",background:color,boxShadow:`0 0 7px ${color}`}}/>
      </div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:"#fff",marginBottom:6,lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,.36)",letterSpacing:1,textTransform:"uppercase"}}>{label}</div>
      {sub&&<div style={{fontSize:11,color,marginTop:7,opacity:.66}}>{sub}</div>}
    </div>
  );
}

const AX={fill:"rgba(255,255,255,.25)",fontSize:10,fontFamily:"'JetBrains Mono'"};
const CM={top:5,right:8,left:-20,bottom:5};

function CTip({active,payload,label}) {
  if (!active||!payload?.length) return null;
  return (
    <div className="tip">
      <p style={{color:"rgba(255,255,255,.36)",fontSize:10,marginBottom:5}}>{label}</p>
      {payload.map((p,i)=>( 
        <p key={i} style={{color:p.color||C.neon,fontSize:12,fontWeight:600}}>
          {p.name}: <span style={{color:"#fff"}}>{typeof p.value==="number"?p.value.toLocaleString(undefined,{maximumFractionDigits:6}):p.value}</span>
        </p>
      ))}
    </div>
  );
}

const NoData=({msg="No data"})=>( 
  <p style={{textAlign:"center",padding:"34px 0",color:"rgba(255,255,255,.2)",fontSize:13}}>{msg}</p>
);

// Charts
function DailyChart({data}) {
  if (!data?.length) return <NoData msg="No activity data"/>;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={CM}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
        <XAxis dataKey="date" tick={AX} tickLine={false}/>
        <YAxis tick={AX} tickLine={false} axisLine={false} allowDecimals={false}/>
        <Tooltip content={<CTip/>}/>
        <Bar dataKey="count" name="Transactions" fill={C.neon} radius={[4,4,0,0]} fillOpacity={.82}
          background={{fill:"rgba(255,255,255,.012)",radius:[4,4,0,0]}}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
function MonthlyChart({data}) {
  if (!data?.length) return <NoData msg="No volume data"/>;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={CM}>
        <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={C.blue} stopOpacity={.32}/>
          <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
        </linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
        <XAxis dataKey="month" tick={AX} tickLine={false}/>
        <YAxis tick={AX} tickLine={false} axisLine={false}/>
        <Tooltip content={<CTip/>}/>
        <Area type="monotone" dataKey="volume" name={`${NATIVE_SYM} Vol`}
          stroke={C.blue} strokeWidth={2} fill="url(#vg)" dot={{fill:C.blue,r:3,strokeWidth:0}}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}
function TxPie({data}) {
  if (!data?.length) return <NoData msg="No type data"/>;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
          paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
          {data.map((_,i)=><Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}
        </Pie>
        <Tooltip content={<CTip/>}/>
        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={9}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

// The file was truncated in the user message. The rest of the component needs to be sent in the next message(s). For now, pushing what we have.