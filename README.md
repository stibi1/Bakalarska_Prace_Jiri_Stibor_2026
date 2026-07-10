# PDF Template Editor

Interní webová aplikace pro tvorbu A4 PDF šablon a hromadné generování PDF dokumentů z tabulkových dat. Typické použití je tvorba faktur: uživatel nahraje data, v editoru připraví nebo načte šablonu, zkontroluje PDF náhled, stáhne jeden PDF soubor nebo ZIP archiv a podle potřeby odešle PDF dokumenty e-mailem přes Microsoft Graph.

Tato dokumentace je psaná jako interní provozní manuál pro nové zaměstnance. Neřeší pouze spuštění aplikace, ale také konfiguraci, nasazení, bezpečnost, provozní postupy, řešení problémů a možné úpravy.


## Obsah dokumentace

| Soubor | Účel |
| --- | --- |
| [`README.md`](README.md) | Základní přehled, rychlé spuštění a orientace v projektu. |
| [`docs/API.md`](docs/API.md) | Popis serverových API endpointů. |
| [`docs/TEMPLATE.md`](docs/TEMPLATE.md) | Popis JSON šablony, prvků, placeholderů a obrázků. |
| [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) | Proměnné prostředí, vzor `.env`, změna e-mailového sloupce a další možné úpravy. |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Nasazení na Linux server, systemd, Nginx a firewall. |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Běžná práce s aplikací, restart, logy, aktualizace a kontrolní seznamy. |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Nejčastější problémy a jejich řešení. |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Bezpečnostní pravidla pro interní provoz. |
| [`.env.example`](env.example) | Vzor konfiguračního souboru s proměnnými prostředí. |
| [`.gitignore`](gitignore) | Interní `.gitignore`, který chrání `.env`, výstupy a závislosti. |
| [`deploy/nginx/pdf-template-editor.conf`](deploy/nginx/pdf-template-editor.conf) | Vzor Nginx reverse proxy konfigurace. |
| [`deploy/systemd/pdf-template-editor.service`](deploy/systemd/pdf-template-editor.service) | Vzor systemd služby. |
| [`README_FULL.md`](README_FULL.md) | Jednosouborová verze dokumentace |

## Rychlá orientace pro nového zaměstnance

| Potřeba | Kam jít |
| --- | --- |
| Chci aplikaci spustit lokálně. | Tato stránka, sekce [Rychlé spuštění lokálně](#rychlé-spuštění-lokálně). |
| Chci vědět, co má být v `.env`. | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) a [`.env.example`](env.example). |
| Chci změnit sloupec, ze kterého se bere e-mail příjemce. | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md), část „Změna sloupce pro e-mail příjemce“. |
| Chci změnit výchozí text e-mailu nebo odesílatele. | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md). |
| Chci aplikaci nasadit na Linux server. | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). |
| Chci nastavit Nginx před Node aplikaci. | [`deploy/nginx/pdf-template-editor.conf`](deploy/nginx/pdf-template-editor.conf). |
| Chci nastavit automatické spouštění služby. | [`deploy/systemd/pdf-template-editor.service`](deploy/systemd/pdf-template-editor.service). |
| Něco nefunguje. | [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md). |
| Chci pochopit formát šablony. | [`docs/TEMPLATE.md`](docs/TEMPLATE.md). |
| Chci používat API přímo. | [`docs/API.md`](docs/API.md). |
| Chci zkontrolovat bezpečnost před nasazením. | [`docs/SECURITY.md`](docs/SECURITY.md). |

## Co aplikace umí

- vytvořit A4 šablonu v prohlížeči,
- přidávat do šablony texty, obdélníky, čáry a obrázky,
- upravovat pozici, velikost, barvu, velikost písma, tučný řez a zarovnání,
- uložit šablonu jako JSON a později ji znovu načíst,
- načíst data ze souborů CSV, JSON, XLSX a XLS,
- pracovat s technickými sloupci `col_0`, `col_1`, `col_2` atd.,
- používat placeholdery ve tvaru `{{col_0}}`,
- vygenerovat PDF náhled,
- stáhnout jeden PDF dokument,
- stáhnout ZIP archiv, kde jeden řádek dat vytvoří jeden PDF soubor,
- vložit obrázky do výsledného PDF,
- použít české fonty a české zalamování textu,
- odeslat vygenerované PDF přílohy e-mailem přes Microsoft Graph.

## Technologie

- Node.js `>=18`,
- Express,
- čistý frontend v HTML/CSS/JavaScriptu bez frameworku,
- `pdf-lib` pro tvorbu PDF,
- `@pdf-lib/fontkit` pro vložení českých fontů,
- `csv-parse` pro CSV,
- `xlsx` pro Excel soubory,
- `jszip` pro ZIP export,
- `hypher` a `hyphenation.cs` pro české dělení slov,
- Microsoft Graph klient pro e-mailové odesílání.

## Rychlé spuštění lokálně

```bash
npm install
npm start
```

Výchozí adresa:

```text
http://127.0.0.1:3000
```

Pokud je potřeba změnit host nebo port:

```bash
HOST=127.0.0.1 PORT=3000 npm start
```

Na Windows PowerShellu:

```powershell
$env:HOST="127.0.0.1"
$env:PORT="3000"
npm start
```

## Lokální spuštění s `.env`

Aplikace používá proměnné prostředí, ale čistý Node.js sám od sebe soubor `.env` automaticky nenačítá. Soubor [`.env.example`](.env.example) proto slouží jako vzor.

Jednoduchý postup na Linuxu:

```bash
cp .env.example .env
nano .env
set -a
source .env
set +a
npm start
```

Na produkčním serveru je vhodnější použít `EnvironmentFile` v systemd službě. Viz [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Struktura projektu aplikace

```text
project/
├─ package.json
├─ server.js
├─ src/
│  ├─ lib/
│  │  ├─ assets/
│  │  │  └─ fonts/
│  │  │     ├─ DejaVuSans.ttf
│  │  │     └─ DejaVuSans-Bold.ttf
│  │  ├─ reader.js
│  │  ├─ template-schema.js
│  │  ├─ template-validator.js
│  │  ├─ placeholder.js
│  │  ├─ image-registry.js
│  │  ├─ pdf-renderer.js
│  │  ├─ pdf-service.js
│  │  ├─ entra-mailer.js
│  │  └─ index.js
│  └─ routes/
│     └─ api.js
└─ public/
   ├─ index.html
   ├─ app.js
   ├─ styles.css
   └─ fonts/
      ├─ DejaVuSans.ttf
      └─ DejaVuSans-Bold.ttf
```

Poznámka: `src/lib/assets/fonts/` slouží pro skutečné PDF generování na serveru. `public/fonts/` slouží pro to, aby canvasový náhled v prohlížeči používal stejný typ písma jako výsledné PDF.

## Hlavní části aplikace

### `server.js`

Spouští Express server, nastavuje JSON limit, zpřístupňuje statické soubory z adresáře `public`, připojuje API router na `/api`, nastavuje `trust proxy` a čte `HOST` a `PORT` z proměnných prostředí.

### `public/index.html`

Obsahuje uživatelské rozhraní editoru. Jsou zde tlačítka pro novou šablonu, stažení a nahrání šablony, výběr složky s obrázky, přidání prvků, načtení dat, export PDF, ZIP export a e-mailové odesílání.

### `public/app.js`

Hlavní frontendová logika. Spravuje stav šablony, canvas editor, výběr a úpravy prvků, načítání dat, tabulkový náhled, PDF náhled, ZIP export a e-mailové odesílání.

### `src/routes/api.js`

Serverové endpointy. Přijímají data a šablony přes `multipart/form-data`, volají knihovní část aplikace a vrací PDF, ZIP nebo JSON odpověď.

### `src/lib/reader.js`

Načítá CSV, JSON, XLSX a XLS. U CSV se pokouší detekovat kódování a oddělovač. Výsledkem jsou normalizované řádky a sloupce.

### `src/lib/pdf-renderer.js`

Vykresluje jeden řádek dat do PDF stránky. Řeší souřadnice, české fonty, text, zalamování, obdélníky, čáry a obrázky.

### `src/lib/pdf-service.js`

Vyšší vrstva pro generování PDF: jedno PDF z jednoho řádku, vícestránkové PDF z více řádků a ZIP archiv.

### `src/lib/entra-mailer.js`

Získává access token z Microsoft Entra ID a odesílá e-mail s PDF přílohou přes Microsoft Graph.

## Základní pracovní postup pro uživatele

1. Otevřít aplikaci v prohlížeči.
2. Nahrát CSV, JSON, XLSX nebo XLS soubor.
3. Zkontrolovat, jak aplikace pojmenovala sloupce (`col_0`, `col_1`, ...).
4. Vytvořit nebo načíst JSON šablonu.
5. Do textových polí šablony vložit placeholdery, například `{{col_0}}`.
6. Pokud šablona používá obrázky, vybrat složku s obrázky.
7. Vygenerovat PDF náhled.
8. Stáhnout jeden PDF dokument nebo ZIP archiv.
9. Při e-mailovém odesílání zkontrolovat odesílatele, předmět, text a sloupec s adresou příjemce.

## Formát dat

Aplikace podporuje:

- `.csv`,
- `.json`,
- `.xlsx`,
- `.xls`.

Po načtení jsou sloupce dostupné jako:

```text
col_0, col_1, col_2, col_3, ...
```

Příklad použití v šabloně:

```text
Faktura č. {{col_0}}
Příjemce: {{col_3}}
Cena: {{col_5}}
```

Pokud se změní pořadí sloupců ve vstupním souboru, změní se i význam `col_0`, `col_1` atd. Proto je potřeba po každé změně vstupního souboru zkontrolovat náhled tabulky.

## E-mailové odesílání

E-mailové odesílání vyžaduje Microsoft Entra aplikaci a tyto proměnné prostředí:

```bash
ENTRA_CLIENT_ID=...
ENTRA_CLIENT_SECRET=...
ENTRA_TENANT_ID=...
```

Výchozí sloupec s e-mailovou adresou je v aktuálním frontendu nastavený jako `col_9`. Změna je popsaná v [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## Nasazení

Pro produkční nasazení se doporučuje:

- spouštět Node aplikaci pouze na `127.0.0.1:3000`,
- před aplikaci dát Nginx reverse proxy,
- povolit HTTPS,
- nepouštět port `3000` přímo do sítě,
- uložit tajné hodnoty do `.env` mimo Git,
- spouštět aplikaci přes systemd,
- nastavit firewall.

Podrobný postup je v [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Vzor Nginx konfigurace je v [`deploy/nginx/pdf-template-editor.conf`](deploy/nginx/pdf-template-editor.conf) a vzor systemd služby je v [`deploy/systemd/pdf-template-editor.service`](deploy/systemd/pdf-template-editor.service).

## Možné úpravy

Nejčastější interní úpravy jsou popsané v [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md):

- změna sloupce, ze kterého se bere e-mail příjemce,
- změna výchozí adresy odesílatele,
- změna výchozího předmětu a textu e-mailu,
- změna výchozího názvu PDF souborů,
- změna portu a hostu,
- změna upload limitu,
- přidání načítání `.env` přes `dotenv`,
- úprava Nginx omezení podle interní sítě.

## Bezpečnostní poznámky

- Soubor `.env` nikdy nepatří do veřejného repozitáře.
- `ENTRA_CLIENT_SECRET` je tajný údaj a musí se chránit stejně jako heslo.
- Na produkčním serveru by aplikace neměla být dostupná přímo přes port `3000`.
- Nginx má řešit HTTPS, velikost uploadů, základní bezpečnostní hlavičky a případně omezení na interní IP rozsahy.
- Před hromadným odesíláním e-mailů je vhodné otestovat výstup na malém vzorku dat.
