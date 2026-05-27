// import React, { useState } from 'react'; 
// import { predictChurn } from '../services/api'; 
// import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'; 
 
// const COLORS = ['#00C49F', '#FF8042']; 

// export default function Dashboard() { 
//   const [formData, setFormData] = useState({ 
//     tenure: 1, 
//     monthlycharges: 50.0, 
//     contract: 0, // 0: Month-to-month, 1: One year, 2: Two year 
//   }); 
 
//   const [prediction, setPrediction] = useState(null); 
 
//   const handleChange = (e) => { 
//     const { name, value } = e.target; 
//     setFormData({ ...formData, [name]: name === 'contract' ? 
// parseInt(value) : parseFloat(value) }); 
//   }; 
 
//   const handleSubmit = async (e) => { 
//     e.preventDefault(); 
//     const result = await predictChurn(formData); 
//     setPrediction(result); 
//   }; 
 
//   return ( 
//     <div> 
//       <h2>Customer Churn Predictor</h2> 
//       <form onSubmit={handleSubmit}> 
//         <label>Tenure (months): 
//           <input type="number" name="tenure" value={formData.tenure} 
// onChange={handleChange} /> 
//         </label> 
//         <br /> 
//         <label>Monthly Charges: 
//           <input type="number" step="0.01" name="monthlycharges" 
// value={formData.monthlycharges} onChange={handleChange} /> 
//         </label> 
//         <br /> 
//         <label>Contract Type: 
//           <select name="contract" value={formData.contract} 
// onChange={handleChange}> 
//             <option value={0}>Month-to-month</option> 
//             <option value={1}>One year</option> 
//             <option value={2}>Two year</option> 
//           </select>
//            </label> 
//         <br /> 
//         <button type="submit">Predict</button> 
//       </form> 
 
//       {prediction && ( 
//         <PieChart width={400} height={300}> 
//           <Pie 
//             data={[ 
//               { name: 'No Churn', value: 1 - prediction.prediction }, 
//               { name: 'Churn', value: prediction.prediction }, 
//             ]} 
//             dataKey="value" 
//             nameKey="name" 
//             cx="50%" 
//             cy="50%" 
//             outerRadius={80} 
//             fill="#8884d8" 
//             label 
//           > 
//             {COLORS.map((color, index) => ( 
//               <Cell key={`cell-${index}`} fill={color} /> 
//             ))} 
//           </Pie> 
//           <Tooltip /> 
//           <Legend /> 
//         </PieChart> 
//       )} 
//     </div> 
//   ); 
// } 

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  getCurrentWeather,
  getEodPrices,
  getCorrelations,
  runAnalysis,
} from "../services/api";

// ─── Paleta y tokens ─────────────────────────────────────────
const C = {
  bg:       "#0a0e1a",
  panel:    "#0f1629",
  border:   "#1e2d4a",
  accent:   "#00d4ff",
  accent2:  "#ff6b35",
  accent3:  "#00ff88",
  text:     "#e2eaf8",
  muted:    "#4a6080",
  warn:     "#ffcc00",
};

const SYMBOL_COLORS = ["#00d4ff","#ff6b35","#00ff88","#ffcc00","#c084fc","#f472b6"];

// ─── Utilidades ───────────────────────────────────────────────
const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("es-GT", { month: "short", day: "numeric" });
};

// ─── Sub-componentes ─────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:"2rem" }}>
      <div style={{
        width:32, height:32, borderRadius:"50%",
        border:`3px solid ${C.border}`,
        borderTopColor: C.accent,
        animation:"spin 0.8s linear infinite",
      }}/>
    </div>
  );
}

function Card({ title, accent = C.accent, children, style = {} }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "1.5rem",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>
      {/* borde superior de color */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg, ${accent}, transparent)`,
      }}/>
      {title && (
        <p style={{
          margin:"0 0 1rem 0", fontSize:11, fontFamily:"'Space Mono', monospace",
          letterSpacing:"0.12em", textTransform:"uppercase", color: C.muted,
        }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function Tag({ children, color = C.accent }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 8px", borderRadius:4,
      background:`${color}18`, color, fontSize:11,
      fontFamily:"'Space Mono', monospace", letterSpacing:"0.06em",
    }}>
      {children}
    </span>
  );
}

function Input({ label, value, onChange, placeholder, style = {} }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, ...style }}>
      {label && <label style={{ fontSize:11, color:C.muted, fontFamily:"'Space Mono', monospace", letterSpacing:"0.1em" }}>{label}</label>}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          background:"#0a0e1a", border:`1px solid ${C.border}`, borderRadius:6,
          padding:"0.5rem 0.75rem", color:C.text, fontSize:13,
          outline:"none", fontFamily:"'Space Mono', monospace",
          transition:"border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e  => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

function Btn({ children, onClick, loading, color = C.accent, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        background: loading || disabled ? C.border : `${color}22`,
        border:`1px solid ${loading || disabled ? C.border : color}`,
        color: loading || disabled ? C.muted : color,
        borderRadius:6, padding:"0.55rem 1.2rem",
        fontSize:12, fontFamily:"'Space Mono', monospace",
        letterSpacing:"0.08em", cursor: loading || disabled ? "not-allowed":"pointer",
        transition:"all 0.2s", whiteSpace:"nowrap",
      }}
      onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = `${color}33`; }}
      onMouseLeave={e => { if (!loading && !disabled) e.currentTarget.style.background = `${color}22`; }}
    >
      {loading ? "···" : children}
    </button>
  );
}

// ─── Sección 1: Clima actual ──────────────────────────────────

function WeatherSection() {
  const [city, setCity]       = useState("Guatemala City");
  const [country, setCountry] = useState("GT");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await getCurrentWeather(city, country)); }
    catch { setError("No se pudo obtener el clima. Verifica la ciudad."); }
    finally { setLoading(false); }
  }, [city, country]);

  return (
    <Card title="Clima actual" accent={C.accent}>
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        <Input label="Ciudad" value={city} onChange={e=>setCity(e.target.value)} placeholder="Guatemala City" style={{flex:2}}/>
        <Input label="País" value={country} onChange={e=>setCountry(e.target.value)} placeholder="GT" style={{flex:1, minWidth:60}}/>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <Btn onClick={load} loading={loading}>Consultar</Btn>
        </div>
      </div>
      {error && <p style={{ color:"#ff6b6b", fontSize:12, margin:0 }}>{error}</p>}
      {loading && <Spinner/>}
      {data && !loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px,1fr))", gap:"1rem", marginTop:"0.5rem" }}>
          {[
            { label:"Temperatura",  value:`${fmt(data.temperature, 1)} °C`, color:C.accent },
            { label:"Sensación",    value:`${fmt(data.feels_like, 1)} °C`,  color:C.accent },
            { label:"Humedad",      value:`${data.humidity} %`,             color:C.accent3 },
            { label:"Viento",       value:`${fmt(data.wind_speed)} m/s`,    color:C.accent2 },
            { label:"Condición",    value:data.description,                 color:C.warn },
            { label:"País",         value:`${data.city}, ${data.country}`,  color:C.muted },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background:C.bg, borderRadius:8, padding:"0.75rem" }}>
              <p style={{ margin:"0 0 4px 0", fontSize:10, color:C.muted, fontFamily:"'Space Mono', monospace", letterSpacing:"0.1em" }}>{label.toUpperCase()}</p>
              <p style={{ margin:0, fontSize:15, color, fontWeight:600, fontFamily:"'Space Mono', monospace" }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Sección 2: Precios EOD ───────────────────────────────────

function MarketSection() {
  const [symbolsInput, setSymbolsInput] = useState("AAPL,AMZN");
  const [limit, setLimit]               = useState("10");
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const syms = symbolsInput.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
      const res  = await getEodPrices(syms, Number(limit));
      setData(res.data || []);
    } catch { setError("Error al obtener precios. Verifica los símbolos."); }
    finally { setLoading(false); }
  }, [symbolsInput, limit]);

  // Prepara datos para recharts: agrupa por fecha
  const chartData = (() => {
    const byDate = {};
    data.forEach(row => {
      const d = fmtDate(row.date);
      if (!byDate[d]) byDate[d] = { date: d };
      byDate[d][row.symbol] = row.close_price;
    });
    return Object.values(byDate).slice(0, 30);
  })();

  const symbols = [...new Set(data.map(r => r.symbol))];

  return (
    <Card title="Precios EOD por símbolo" accent={C.accent2}>
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        <Input label="Símbolos (separados por coma)" value={symbolsInput} onChange={e=>setSymbolsInput(e.target.value)} placeholder="AAPL,AMZN,MSFT" style={{flex:3}}/>
        <Input label="Registros" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="10" style={{flex:1, minWidth:70}}/>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <Btn onClick={load} loading={loading} color={C.accent2}>Buscar</Btn>
        </div>
      </div>
      {error && <p style={{ color:"#ff6b6b", fontSize:12, margin:0 }}>{error}</p>}
      {loading && <Spinner/>}
      {chartData.length > 0 && !loading && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top:4, right:8, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:11 }} axisLine={{ stroke:C.border }}/>
              <YAxis tick={{ fill:C.muted, fontSize:11 }} axisLine={{ stroke:C.border }} width={60}/>
              <Tooltip
                contentStyle={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }}
                labelStyle={{ color:C.text }}
              />
              <Legend wrapperStyle={{ fontSize:11, color:C.muted }}/>
              {symbols.map((sym, i) => (
                <Line key={sym} type="monotone" dataKey={sym}
                  stroke={SYMBOL_COLORS[i % SYMBOL_COLORS.length]}
                  dot={false} strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {/* Tabla resumen */}
          <div style={{ overflowX:"auto", marginTop:"1rem" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>{["Símbolo","Fecha","Open","Close","High","Low","Volumen"].map(h=>(
                  <th key={h} style={{ padding:"6px 8px", textAlign:"left", color:C.muted,
                    fontFamily:"'Space Mono', monospace", fontSize:10, letterSpacing:"0.08em",
                    borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {data.slice(0,20).map((row, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}22` }}>
                    <td style={{ padding:"6px 8px" }}><Tag color={SYMBOL_COLORS[symbols.indexOf(row.symbol) % SYMBOL_COLORS.length]}>{row.symbol}</Tag></td>
                    <td style={{ padding:"6px 8px", color:C.muted, fontFamily:"'Space Mono', monospace" }}>{fmtDate(row.date)}</td>
                    {[row.open_price, row.close_price, row.high_price, row.low_price].map((v,j)=>(
                      <td key={j} style={{ padding:"6px 8px", color:C.text, fontFamily:"'Space Mono', monospace" }}>${fmt(v)}</td>
                    ))}
                    <td style={{ padding:"6px 8px", color:C.muted, fontFamily:"'Space Mono', monospace" }}>{row.volume ? Number(row.volume).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Sección 3: Correlaciones ─────────────────────────────────

function CorrelationsSection() {
  const [cityFilter,   setCityFilter]   = useState("");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await getCorrelations(cityFilter, symbolFilter, 50)); }
    catch { setError("Error al obtener correlaciones."); }
    finally { setLoading(false); }
  }, [cityFilter, symbolFilter]);

  return (
    <Card title="Correlaciones clima-mercado" accent={C.accent3}>
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        <Input label="Filtrar ciudad" value={cityFilter} onChange={e=>setCityFilter(e.target.value)} placeholder="Guatemala" style={{flex:1}}/>
        <Input label="Filtrar símbolo" value={symbolFilter} onChange={e=>setSymbolFilter(e.target.value)} placeholder="AAPL" style={{flex:1}}/>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <Btn onClick={load} loading={loading} color={C.accent3}>Cargar</Btn>
        </div>
      </div>
      {error && <p style={{ color:"#ff6b6b", fontSize:12, margin:0 }}>{error}</p>}
      {loading && <Spinner/>}
      {data.length > 0 && !loading && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>{["Ciudad","Símbolo","Temperatura (°C)","Precio cierre","Fecha"].map(h=>(
                <th key={h} style={{ padding:"6px 8px", textAlign:"left", color:C.muted,
                  fontFamily:"'Space Mono', monospace", fontSize:10, letterSpacing:"0.08em",
                  borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${C.border}22`,
                  background: i % 2 === 0 ? "transparent" : `${C.border}22` }}>
                  <td style={{ padding:"6px 8px", color:C.text, fontFamily:"'Space Mono', monospace" }}>{row.city}</td>
                  <td style={{ padding:"6px 8px" }}><Tag color={C.accent3}>{row.symbol}</Tag></td>
                  <td style={{ padding:"6px 8px", color:C.accent, fontFamily:"'Space Mono', monospace" }}>{fmt(row.temperature, 1)} °C</td>
                  <td style={{ padding:"6px 8px", color:C.accent2, fontFamily:"'Space Mono', monospace" }}>${fmt(row.close_price)}</td>
                  <td style={{ padding:"6px 8px", color:C.muted, fontFamily:"'Space Mono', monospace" }}>{fmtDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin:"0.75rem 0 0", fontSize:11, color:C.muted, fontFamily:"'Space Mono', monospace" }}>
            {data.length} registro{data.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
      {data.length === 0 && !loading && !error && (
        <p style={{ color:C.muted, fontSize:12, fontFamily:"'Space Mono', monospace", margin:0 }}>
          Presiona "Cargar" para ver las correlaciones guardadas.
        </p>
      )}
    </Card>
  );
}

// ─── Sección 4: Análisis completo ────────────────────────────

function AnalysisSection() {
  const [city,    setCity]    = useState("Guatemala City");
  const [symbols, setSymbols] = useState("AAPL,AMZN");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const run = useCallback(async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const syms = symbols.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
      setResult(await runAnalysis(city, syms));
    } catch (e) {
      setError(e?.response?.data?.detail || "Error al ejecutar el análisis.");
    } finally { setLoading(false); }
  }, [city, symbols]);

  return (
    <Card title="Análisis completo" accent={C.warn}>
      <p style={{ margin:"0 0 1rem 0", fontSize:12, color:C.muted, fontFamily:"'Space Mono', monospace" }}>
        Obtiene clima + precios, guarda en MongoDB y devuelve estadísticas.
      </p>
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        <Input label="Ciudad" value={city} onChange={e=>setCity(e.target.value)} placeholder="Guatemala City" style={{flex:2}}/>
        <Input label="Símbolos" value={symbols} onChange={e=>setSymbols(e.target.value)} placeholder="AAPL,AMZN" style={{flex:2}}/>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <Btn onClick={run} loading={loading} color={C.warn}>Ejecutar</Btn>
        </div>
      </div>
      {error  && <p style={{ color:"#ff6b6b", fontSize:12, margin:0 }}>{error}</p>}
      {loading && <Spinner/>}
      {result && !loading && (
        <div style={{ marginTop:"0.5rem" }}>
          {/* Mensaje */}
          <div style={{ background:`${C.warn}12`, border:`1px solid ${C.warn}33`, borderRadius:8,
            padding:"0.75rem 1rem", marginBottom:"1rem" }}>
            <p style={{ margin:0, fontSize:12, color:C.warn, fontFamily:"'Space Mono', monospace" }}>{result.message}</p>
          </div>
          {/* Stats por símbolo */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:"0.75rem" }}>
            {(result.symbols || []).map((s, i) => (
              <div key={s.symbol} style={{ background:C.bg, borderRadius:8, padding:"0.75rem",
                borderLeft:`3px solid ${SYMBOL_COLORS[i % SYMBOL_COLORS.length]}` }}>
                <p style={{ margin:"0 0 8px 0", fontFamily:"'Space Mono', monospace", fontSize:13,
                  color:SYMBOL_COLORS[i % SYMBOL_COLORS.length], fontWeight:700 }}>{s.symbol}</p>
                {[
                  ["Promedio",  `$${fmt(s.avg_price)}`],
                  ["Mínimo",    `$${fmt(s.min_price)}`],
                  ["Máximo",    `$${fmt(s.max_price)}`],
                  ["Registros", s.data_points],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:10, color:C.muted, fontFamily:"'Space Mono', monospace" }}>{l}</span>
                    <span style={{ fontSize:11, color:C.text, fontFamily:"'Space Mono', monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Dashboard principal ──────────────────────────────────────

export default function Dashboard() {
  return (
    <div style={{
      minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'DM Sans', sans-serif", padding:"2rem",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #2a3a50; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1e2d4a; border-radius:3px; }
        body { margin:0; background:#0a0e1a; }
      `}</style>

      {/* Header */}
      <header style={{ marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:"0.75rem", flexWrap:"wrap" }}>
          <h1 style={{
            margin:0, fontSize:"clamp(1.4rem,3vw,2rem)",
            fontFamily:"'Space Mono', monospace", fontWeight:700,
            background:`linear-gradient(135deg, ${C.accent}, ${C.accent3})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            letterSpacing:"-0.02em",
          }}>
            CLIMA & MERCADOS
          </h1>
          <Tag color={C.accent}>dashboard</Tag>
        </div>
        <p style={{ margin:"0.4rem 0 0", fontSize:13, color:C.muted, fontFamily:"'Space Mono', monospace" }}>
          Análisis de temperatura vs. precios de mercado
        </p>
      </header>

      {/* Grid de secciones */}
      <div style={{ display:"grid", gap:"1.5rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,480px),1fr))", gap:"1.5rem" }}>
          <WeatherSection/>
          <AnalysisSection/>
        </div>
        <MarketSection/>
        <CorrelationsSection/>
      </div>
    </div>
  );
}
