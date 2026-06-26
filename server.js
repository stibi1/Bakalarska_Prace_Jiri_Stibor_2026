// ------------------------------------------------------------
// SERVER APLIKACE
// ------------------------------------------------------------
// Tento soubor spouští hlavní Express server aplikace.
// Server zpřístupňuje frontend z adresáře public a API endpointy
// z modulu src/routes/api.js pod cestou /api.
//
// V produkci by tento server měl běžet jen na interní adrese
// například 127.0.0.1 a před ním by měla být reverse proxy,
// typicky Nginx.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// Express je webový server/framework pro Node.js.
import express from "express";

// Modul path slouží k bezpečnému skládání cest k souborům a složkám.
import path from "path";

// V ES modulech není automaticky dostupné __dirname a __filename.
// Proto se získávají přes fileURLToPath a import.meta.url.
import { fileURLToPath } from "url";

// API router obsahuje všechny serverové endpointy aplikace.
// Připojuje se níže pod cestu /api.
import apiRouter from "./src/routes/api.js";

// ------------------------------------------------------------
// CESTY
// ------------------------------------------------------------

// Absolutní cesta k tomuto souboru server.js.
const __filename = fileURLToPath(import.meta.url);

// Absolutní cesta ke složce, ve které se nachází server.js.
// Používá se hlavně pro správné nalezení složky public.
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------
// APLIKACE
// ------------------------------------------------------------

// Vytvoření instance Express aplikace.
const app = express();

// Povolení zpracování JSON request body.
// Limit 10 MB je důležitý hlavně kvůli přenosu šablon, metadat,
// případně dalších dat mezi frontendem a backendem.
app.use(express.json({ limit: "10mb" }));

// Zpřístupnění statických souborů frontendu.
// Díky tomu prohlížeč najde index.html, app.js, styles.css a fonty.
app.use(express.static(path.join(__dirname, "public")));

// Připojení API routeru.
// Všechny endpointy definované v src/routes/api.js budou dostupné
// pod adresou /api, například /api/read-data nebo /api/render-pdf.
app.use("/api", apiRouter);

// ------------------------------------------------------------
// NASTAVENÍ PROXY
// ------------------------------------------------------------

// Express bude důvěřovat první reverse proxy před aplikací.
// To je vhodné při nasazení za Nginxem, protože aplikace může správně
// pracovat s hlavičkami typu X-Forwarded-For a X-Forwarded-Proto.
app.set("trust proxy", 1);

// ------------------------------------------------------------
// START SERVERU
// ------------------------------------------------------------

// Port, na kterém aplikace poběží.
// Pokud není nastavená proměnná prostředí PORT, použije se 3000.
const PORT = process.env.PORT || 3000;

// Host, na kterém bude server poslouchat.
// Pro lokální vývoj i bezpečné produkční nasazení za Nginxem je vhodné
// používat 127.0.0.1. Tím se zabrání přímému přístupu zvenčí na Node server.
const HOST = process.env.HOST || "127.0.0.1";

// Spuštění serveru.
// Po úspěšném startu se do konzole vypíše adresa, na které aplikace běží.
app.listen(PORT, HOST, () => {
  console.log(`Server běží na http://${HOST}:${PORT}`);
});