# Konfigurace a možné úpravy

Tento dokument popisuje, jak aplikaci konfigurovat a kde upravovat nejčastější interní nastavení. Cílem je, aby nový zaměstnanec dokázal najít konkrétní místo v kódu a bezpečně provést malou změnu.

## Proměnné prostředí

Aplikace čte konfiguraci z `process.env`. To znamená, že proměnné musí být před spuštěním dostupné v prostředí procesu.

Základní proměnné:

| Proměnná | Povinná | Příklad | Popis |
| --- | --- | --- | --- |
| `NODE_ENV` | ne | `production` | Režim běhu aplikace. |
| `HOST` | ne | `127.0.0.1` | IP adresa, na které Express poslouchá. |
| `PORT` | ne | `3000` | Port aplikace. |
| `ENTRA_CLIENT_ID` | ano pro e-mail | `00000000-0000-0000-0000-000000000000` | Client ID Microsoft Entra aplikace. |
| `ENTRA_CLIENT_SECRET` | ano pro e-mail | tajná hodnota | Client secret Microsoft Entra aplikace. |
| `ENTRA_TENANT_ID` | ano pro e-mail | `00000000-0000-0000-0000-000000000000` | Tenant ID Microsoft Entra. |

Vzor je v souboru `.env.example`.

## Vzor `.env`

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000

ENTRA_CLIENT_ID=00000000-0000-0000-0000-000000000000
ENTRA_CLIENT_SECRET=sem-patri-client-secret
ENTRA_TENANT_ID=00000000-0000-0000-0000-000000000000
```

Doporučená práva na serveru:

```bash
sudo chown appuser:appuser /var/www/pdf-template-editor/.env
sudo chmod 600 /var/www/pdf-template-editor/.env
```

## Důležité: `.env` se automaticky nenačítá

Aktuální aplikace nepoužívá balíček `dotenv`. Pokud tedy vytvoříte soubor `.env`, Node.js ho sám od sebe nenačte.

Možnosti jsou tři:

### Varianta A: použít systemd `EnvironmentFile`

Doporučené pro produkční server. Viz `deploy/systemd/pdf-template-editor.service`.

```ini
EnvironmentFile=/var/www/pdf-template-editor/.env
```

### Varianta B: načíst `.env` ručně před lokálním spuštěním

```bash
set -a
source .env
set +a
npm start
```

### Varianta C: přidat `dotenv` do projektu

Tato varianta je vhodná pro pohodlnější lokální vývoj.

Instalace:

```bash
npm install dotenv
```

Úprava v `server.js` na úplný začátek souboru:

Původně:

```js
import express from "express";
```

Nově:

```js
import "dotenv/config";
import express from "express";
```

Po této úpravě se bude `.env` načítat automaticky při startu aplikace.

## Změna sloupce pro e-mail příjemce

Aktuálně frontend posílá serveru pevně nastavený sloupec `col_9`.

Soubor:

```text
public/app.js
```

Najděte:

```js
form.append("recipientColumnKey", "col_9");
```

Změňte například na:

```js
form.append("recipientColumnKey", "col_7");
```

Tím se e-mailová adresa začne brát ze sloupce `col_7`.

Server má zároveň vlastní výchozí hodnotu pro případ, že frontend žádný sloupec nepošle.

Soubor:

```text
src/routes/api.js
```

Najděte:

```js
const recipientColumnKey = String(req.body.recipientColumnKey ?? "col_9").trim();
```

Změňte například na:

```js
const recipientColumnKey = String(req.body.recipientColumnKey ?? "col_7").trim();
```

Doporučení pro interní provoz: změnit obě místa, aby frontend i server používaly stejný výchozí sloupec.

## Jak zjistit správné číslo sloupce

Po nahrání datového souboru se zobrazí náhled tabulky. Aplikace pracuje s technickými názvy sloupců podle pořadí:

```text
první sloupec  = col_0
druhý sloupec  = col_1
třetí sloupec  = col_2
...
desátý sloupec = col_9
```

Pokud je e-mail v desátém sloupci tabulky, použijte `col_9`. Pokud je v osmém sloupci, použijte `col_7`.

## Volitelná úprava: přidat výběr e-mailového sloupce do UI

Pevné nastavení `col_9` je jednoduché, ale pro běžné zaměstnance může být praktičtější rozbalovací seznam.

Základní princip:

1. Do `public/index.html` přidat input nebo select pro sloupec příjemce.
2. V `public/app.js` získat hodnotu z tohoto prvku.
3. Místo pevného `col_9` poslat vybranou hodnotu.

Příklad změny ve `public/index.html` uvnitř e-mailového modalu:

```html
<label for="recipientColumnKey">Sloupec s e-mailem:</label>
<input type="text" id="recipientColumnKey" value="col_9">
```

V `public/app.js` nahoře mezi DOM prvky přidat:

```js
const recipientColumnKeyInput = document.getElementById("recipientColumnKey");
```

A původní řádek:

```js
form.append("recipientColumnKey", "col_9");
```

nahradit:

```js
form.append("recipientColumnKey", recipientColumnKeyInput.value.trim() || "col_9");
```

## Změna výchozí adresy odesílatele

Soubor:

```text
public/index.html
```

Najděte input:

```html
<input type="text" id="senderEmail" value="lenka.stiborova@knihovnauk.cz">
```

Změňte hodnotu `value` na novou výchozí adresu.

Pozor: účet musí být povolený pro odesílání přes Microsoft Graph a aplikace musí mít odpovídající oprávnění.

## Změna výchozího předmětu e-mailu

Soubor:

```text
public/index.html
```

Najděte:

```html
<input type="text" id="emailSubject" value="Faktura za MVS">
```

Příklad změny:

```html
<input type="text" id="emailSubject" value="Faktura {{col_0}}">
```

Předmět podporuje placeholdery, protože server při odesílání používá stejnou náhradu `{{col_X}}` jako PDF šablona.

## Změna výchozího textu e-mailu

Soubor:

```text
public/index.html
```

Najděte textarea:

```html
<textarea id="emailBody" rows="10">Dobrý den,

v příloze vám zasíláme fakturu.

S pozdravem
Knihovna Ústeckého kraje</textarea>
```

Text lze upravit běžně. Může obsahovat placeholdery, například:

```text
Dobrý den,

v příloze vám zasíláme fakturu č. {{col_0}}.

S pozdravem
Knihovna Ústeckého kraje
```

## Změna výchozího názvu PDF souborů v ZIP

Soubor:

```text
public/index.html
```

Najděte:

```html
<input
  type="text"
  id="fileNamePattern"
  value="Faktura č {{col_0}}"
  placeholder="Např. Faktura č {{col_0}}"
>
```

Příklad:

```html
value="Faktura {{col_0}} - {{col_3}}"
```

Server název souboru čistí od znaků, které nejsou vhodné pro názvy souborů.

## Změna portu a hostu

Soubor:

```text
server.js
```

Aktuální chování:

```js
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
```

Pro běh za Nginx ponechte:

```env
HOST=127.0.0.1
PORT=3000
```

Pro přímé testování v lokální síti lze použít:

```env
HOST=0.0.0.0
PORT=3000
```

Na produkčním serveru se přímé vystavení přes `0.0.0.0` nedoporučuje.

## Změna upload limitu

Server používá dvě omezení:

### Limit JSON požadavků

Soubor:

```text
server.js
```

```js
app.use(express.json({ limit: "10mb" }));
```

### Limit uploadovaného souboru přes multer

Soubor:

```text
src/routes/api.js
```

```js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});
```

Hodnota `20 * 1024 * 1024` znamená 20 MB.

Pokud limit zvýšíte v aplikaci, zkontrolujte i Nginx:

```nginx
client_max_body_size 50m;
```

## Změna fontů

Serverové PDF fonty jsou v:

```text
src/lib/assets/fonts/
```

Frontendový canvas používá fonty z:

```text
public/fonts/
```

Pokud změníte font jen na jednom místě, může se stát, že náhled v canvasu nebude přesně odpovídat vygenerovanému PDF. Proto je potřeba držet serverový a frontendový font ve shodě.

## Změna výchozí velikosti canvasu

Soubor:

```text
public/app.js
```

Funkce:

```js
function getCanvasSize(orientation) {
  if (orientation === "landscape") {
    return { width: 842, height: 595 };
  }

  return { width: 595, height: 842 };
}
```

Tyto hodnoty odpovídají A4 v PDF bodech zaokrouhlených pro canvas. Neměňte je, pokud aplikace má dál generovat A4.

## Změna podporovaných prvků šablony

Soubor:

```text
src/lib/template-schema.js
```

Podporované typy jsou:

```js
export const SUPPORTED_ELEMENT_TYPES = ["text", "rect", "line", "image"];
```

Přidání nového typu prvku vyžaduje úpravu nejméně v těchto částech:

- `src/lib/template-schema.js`,
- `src/lib/template-validator.js`,
- `src/lib/pdf-renderer.js`,
- `public/app.js`,
- `public/index.html`,
- případně `public/styles.css`.

## Změna bezpečnostního omezení v Nginx

Vzorová konfigurace je v:

```text
deploy/nginx/pdf-template-editor.conf
```

Možné interní úpravy:

- změnit doménu v `server_name`,
- změnit limit uploadu `client_max_body_size`,
- omezit přístup jen na interní IP rozsahy pomocí `allow` a `deny`,
- přidat HTTPS certifikát,
- upravit timeouty pro pomalejší generování velkého ZIPu.
