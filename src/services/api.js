// export async function predictChurn(data) { 
//     let uri = import.meta.env.VITE_API_URL + "/predict" 
//     const response = await fetch(uri, { 
//         method: 'POST', 
//         headers: { 
//         'Content-Type': 'application/json', 
//         }, 
//         body: JSON.stringify(data), 
//     }); 

//     if (!response.ok) { 
//         throw new Error('Error al obtener predicción'); 
//     } 

//     return await response.json(); 
// } 

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Weather ─────────────────────────────────────────────────

export const getCurrentWeather = (city, country = "GT") =>
  api.get("/weather/current", { params: { city, country } }).then((r) => r.data);

export const getWeatherForecast = (city, country = "GT", days = 5) =>
  api.get("/weather/forecast", { params: { city, country, days } }).then((r) => r.data);

// ─── Market ──────────────────────────────────────────────────

export const getEodPrices = (symbols, limit = 10) =>
  api
    .get("/market/eod", {
      params: { symbols: Array.isArray(symbols) ? symbols.join(",") : symbols, limit },
    })
    .then((r) => r.data);

export const searchTickers = (query) =>
  api.get("/market/search", { params: { query } }).then((r) => r.data);

// ─── Data / DB ───────────────────────────────────────────────

export const getCorrelations = (city = "", symbol = "", limit = 50) =>
  api.get("/data/correlations", { params: { city, symbol, limit } }).then((r) => r.data);

// ─── Analysis ────────────────────────────────────────────────

export const runAnalysis = (city, symbols) =>
  api.post("/analysis", { city, symbols }).then((r) => r.data);