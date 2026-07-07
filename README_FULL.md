# PDF Template Editor - kompletní interní dokumentace
Tento soubor slučuje hlavní README, podrobné dokumenty ze složky `docs/` a vzorové konfigurační soubory. Hodí se pro rychlé čtení na jednom místě. Pro GitHub repozitář je ale stále vhodné ponechat i samostatné soubory.

## Soubor `README.md`

## PDF Template Editor

Interní webová aplikace pro tvorbu A4 PDF šablon a hromadné generování PDF dokumentů z tabulkových dat. Typické použití je tvorba faktur: uživatel nahraje data, v editoru připraví nebo načte šablonu, zkontroluje PDF náhled, stáhne jeden PDF soubor nebo ZIP archiv a podle potřeby odešle PDF dokumenty e-mailem přes Microsoft Graph.

Tato dokumentace je psaná jako interní provozní manuál pro nové zaměstnance. Neřeší pouze spuštění aplikace, ale také konfiguraci, nasazení, bezpečnost, provozní postupy, řešení problémů a možné úpravy.


### Co musí být nahrané do GitHub repozitáře

Aby dokumentace fungovala kompletně, musí být v repozitáři nejen `README.md`, ale také složky `docs/`, `deploy/` a ukázkové soubory `.env.example` a `.gitignore`.

```text
project/
├─ README.md
├─ .env.example
├─ .gitignore
├─ docs/
│  ├─ API.md
│  ├─ TEMPLATE.md
│  ├─ CONFIGURATION.md
│  ├─ DEPLOYMENT.md
│  ├─ OPERATIONS.md
│  ├─ TROUBLESHOOTING.md
│  └─ SECURITY.md
└─ deploy/
   ├─ nginx/
   │  └─ pdf-template-editor.conf
   └─ systemd/
      └─ pdf-template-editor.service
```

### Obsah dokumentace

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
| [`.env.example`](.env.example) | Vzor konfiguračního souboru s proměnnými prostředí. |
| [`.gitignore`](.gitignore) | Interní `.gitignore`, který chrání `.env`, výstupy a závislosti. |
| [`deploy/nginx/pdf-template-editor.conf`](deploy/nginx/pdf-template-editor.conf) | Vzor Nginx reverse proxy konfigurace. |
| [`deploy/systemd/pdf-template-editor.service`](deploy/systemd/pdf-template-editor.service) | Vzor systemd služby. |
| [`README_FULL.md`](README_FULL.md) | Jednosouborová verze dokumentace pro případ, že chcete mít vše na jednom místě. |

### Rychlá orientace pro nového zaměstnance

| Potřeba | Kam jít |
| --- | --- |
| Chci aplikaci spustit lokálně. | Tato stránka, sekce [Rychlé spuštění lokálně](#rychlé-spuštění-lokálně). |
| Chci vědět, co má být v `.env`. | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) a [`.env.example`](.env.example). |
| Chci změnit sloupec, ze kterého se bere e-mail příjemce. | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md), část „Změna sloupce pro e-mail příjemce“. |
| Chci změnit výchozí text e-mailu nebo odesílatele. | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md). |
| Chci aplikaci nasadit na Linux server. | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). |
| Chci nastavit Nginx před Node aplikaci. | [`deploy/nginx/pdf-template-editor.conf`](deploy/nginx/pdf-template-editor.conf). |
| Chci nastavit automatické spouštění služby. | [`deploy/systemd/pdf-template-editor.service`](deploy/systemd/pdf-template-editor.service). |
| Něco nefunguje. | [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md). |
| Chci pochopit formát šablony. | [`docs/TEMPLATE.md`](docs/TEMPLATE.md). |
| Chci používat API přímo. | [`docs/API.md`](docs/API.md). |
| Chci zkontrolovat bezpečnost před nasazením. | [`docs/SECURITY.md`](docs/SECURITY.md). |

### Co aplikace umí

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

### Technologie

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

### Rychlé spuštění lokálně

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

### Lokální spuštění s `.env`

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

### Struktura projektu aplikace

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
      ├─ DejaVuSans.woff2
      └─ DejaVuSans-Bold.woff2
```

Poznámka: `src/lib/assets/fonts/` slouží pro skutečné PDF generování na serveru. `public/fonts/` slouží pro to, aby canvasový náhled v prohlížeči používal stejný typ písma jako výsledné PDF.

### Hlavní části aplikace

#### `server.js`

Spouští Express server, nastavuje JSON limit, zpřístupňuje statické soubory z adresáře `public`, připojuje API router na `/api`, nastavuje `trust proxy` a čte `HOST` a `PORT` z proměnných prostředí.

#### `public/index.html`

Obsahuje uživatelské rozhraní editoru. Jsou zde tlačítka pro novou šablonu, stažení a nahrání šablony, výběr složky s obrázky, přidání prvků, načtení dat, export PDF, ZIP export a e-mailové odesílání.

#### `public/app.js`

Hlavní frontendová logika. Spravuje stav šablony, canvas editor, výběr a úpravy prvků, načítání dat, tabulkový náhled, PDF náhled, ZIP export a e-mailové odesílání.

#### `src/routes/api.js`

Serverové endpointy. Přijímají data a šablony přes `multipart/form-data`, volají knihovní část aplikace a vrací PDF, ZIP nebo JSON odpověď.

#### `src/lib/reader.js`

Načítá CSV, JSON, XLSX a XLS. U CSV se pokouší detekovat kódování a oddělovač. Výsledkem jsou normalizované řádky a sloupce.

#### `src/lib/pdf-renderer.js`

Vykresluje jeden řádek dat do PDF stránky. Řeší souřadnice, české fonty, text, zalamování, obdélníky, čáry a obrázky.

#### `src/lib/pdf-service.js`

Vyšší vrstva pro generování PDF: jedno PDF z jednoho řádku, vícestránkové PDF z více řádků a ZIP archiv.

#### `src/lib/entra-mailer.js`

Získává access token z Microsoft Entra ID a odesílá e-mail s PDF přílohou přes Microsoft Graph.

### Základní pracovní postup pro uživatele

1. Otevřít aplikaci v prohlížeči.
2. Nahrát CSV, JSON, XLSX nebo XLS soubor.
3. Zkontrolovat, jak aplikace pojmenovala sloupce (`col_0`, `col_1`, ...).
4. Vytvořit nebo načíst JSON šablonu.
5. Do textových polí šablony vložit placeholdery, například `{{col_0}}`.
6. Pokud šablona používá obrázky, vybrat složku s obrázky.
7. Vygenerovat PDF náhled.
8. Stáhnout jeden PDF dokument nebo ZIP archiv.
9. Při e-mailovém odesílání zkontrolovat odesílatele, předmět, text a sloupec s adresou příjemce.

### Formát dat

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

### E-mailové odesílání

E-mailové odesílání vyžaduje Microsoft Entra aplikaci a tyto proměnné prostředí:

```bash
ENTRA_CLIENT_ID=...
ENTRA_CLIENT_SECRET=...
ENTRA_TENANT_ID=...
```

Výchozí sloupec s e-mailovou adresou je v aktuálním frontendu nastavený jako `col_9`. Změna je popsaná v [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

### Nasazení

Pro produkční nasazení se doporučuje:

- spouštět Node aplikaci pouze na `127.0.0.1:3000`,
- před aplikaci dát Nginx reverse proxy,
- povolit HTTPS,
- nepouštět port `3000` přímo do sítě,
- uložit tajné hodnoty do `.env` mimo Git,
- spouštět aplikaci přes systemd,
- nastavit firewall.

Podrobný postup je v [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Vzor Nginx konfigurace je v [`deploy/nginx/pdf-template-editor.conf`](deploy/nginx/pdf-template-editor.conf) a vzor systemd služby je v [`deploy/systemd/pdf-template-editor.service`](deploy/systemd/pdf-template-editor.service).

### Možné úpravy

Nejčastější interní úpravy jsou popsané v [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md):

- změna sloupce, ze kterého se bere e-mail příjemce,
- změna výchozí adresy odesílatele,
- změna výchozího předmětu a textu e-mailu,
- změna výchozího názvu PDF souborů,
- změna portu a hostu,
- změna upload limitu,
- přidání načítání `.env` přes `dotenv`,
- úprava Nginx omezení podle interní sítě.

### Bezpečnostní poznámky

- Soubor `.env` nikdy nepatří do veřejného repozitáře.
- `ENTRA_CLIENT_SECRET` je tajný údaj a musí se chránit stejně jako heslo.
- Na produkčním serveru by aplikace neměla být dostupná přímo přes port `3000`.
- Nginx má řešit HTTPS, velikost uploadů, základní bezpečnostní hlavičky a případně omezení na interní IP rozsahy.
- Před hromadným odesíláním e-mailů je vhodné otestovat výstup na malém vzorku dat.

### Poznámka k jednosouborové verzi

Pokud má být dokumentace opravdu celá na jedné stránce GitHubu, použijte soubor [`README_FULL.md`](README_FULL.md). Pro dlouhodobou údržbu je ale přehlednější mít hlavní `README.md` jako rozcestník a podrobné části ve složce `docs/`.


---

## Soubor `docs/API.md`

## API dokumentace

Serverové API je připojené pod cestou:

```text
/api
```

Většina endpointů používá `multipart/form-data`, protože pracuje se soubory šablon, dat a obrázků. Chybové odpovědi se vracejí jako JSON s `ok: false` a textem chyby.

### Přehled endpointů

| Metoda | Cesta | Účel | Výstup |
| --- | --- | --- | --- |
| `POST` | `/api/upload-data` | Načtení CSV/JSON/XLSX/XLS dat. | JSON s řádky a sloupci. |
| `POST` | `/api/validate-template` | Validace JSON šablony. | JSON s výsledkem validace. |
| `POST` | `/api/generate-pdf` | Vygenerování jednoho PDF. | `application/pdf` |
| `POST` | `/api/generate-pdf-zip` | Vygenerování ZIP archivu. | `application/zip` |
| `POST` | `/api/send-mails` | Vygenerování PDF a odeslání e-mailů. | JSON s výsledky odesílání. |

### `POST /api/upload-data`

Načte tabulkový soubor a převede ho do interní podoby.

#### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `file` | soubor | ano | CSV, JSON, XLSX nebo XLS. |

#### Chování

- CSV se dekóduje z podporovaných kódování.
- CSV delimiter se detekuje automaticky: čárka, středník nebo tabulátor.
- Excel soubor bere první list, pokud není v kódu doplněno jinak.
- Sloupce jsou ve výsledku reprezentované technickými názvy `col_0`, `col_1`, `col_2`, ...

#### Příklad odpovědi

```json
{
  "ok": true,
  "fileName": "faktury.csv",
  "type": "csv",
  "encoding": "windows-1250",
  "delimiter": ";",
  "sheetName": null,
  "rows": 2,
  "data": [
    {
      "col_0": "2025001",
      "col_1": "1",
      "col_2": "100,00 Kč",
      "col_3": "Příkladová instituce",
      "col_9": "prijemce@example.com"
    }
  ],
  "columns": [
    {
      "id": "col_0",
      "name": "Číslo faktury",
      "index": 0
    }
  ]
}
```

#### Příklad `curl`

```bash
curl -X POST http://127.0.0.1:3000/api/upload-data \
  -F "file=@faktury.csv"
```

### `POST /api/validate-template`

Ověří, že šablona má správnou strukturu.

#### Vstup

`application/json`

```json
{
  "version": 1,
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margin": 0
  },
  "elements": []
}
```

#### Příklad odpovědi

```json
{
  "ok": true,
  "valid": true,
  "errors": []
}
```

#### Příklad chybové validace

```json
{
  "ok": true,
  "valid": false,
  "errors": [
    "Nepodporovaný page.orientation. Povolené: portrait, landscape"
  ]
}
```

### `POST /api/generate-pdf`

Vygeneruje jeden PDF soubor. Pokud datový soubor obsahuje více řádků, výsledné PDF bude mít více stránek.

#### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `templateFile` | soubor | ano | JSON šablona. |
| `dataFile` | soubor | ano | CSV, JSON, XLSX nebo XLS. |
| `image_<název>` | soubor | ne | Obrázek použitý v šabloně. |

#### Výstup

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="output.pdf"
```

#### Příklad `curl`

```bash
curl -X POST http://127.0.0.1:3000/api/generate-pdf \
  -F "templateFile=@template.json" \
  -F "dataFile=@faktury.csv" \
  --output output.pdf
```

S obrázkem:

```bash
curl -X POST http://127.0.0.1:3000/api/generate-pdf \
  -F "templateFile=@template.json" \
  -F "dataFile=@faktury.csv" \
  -F "image_logo.png=@logo.png" \
  --output output.pdf
```

Poznámka: pole `image_<název>` musí odpovídat názvu souboru použitému v image elementu šablony.

### `POST /api/generate-pdf-zip`

Vygeneruje ZIP archiv, kde každý řádek dat vytvoří jeden samostatný PDF soubor.

#### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `templateFile` | soubor | ano | JSON šablona. |
| `dataFile` | soubor | ano | CSV, JSON, XLSX nebo XLS. |
| `fileNamePattern` | text | ne | Vzor názvu PDF souborů. |
| `image_<název>` | soubor | ne | Obrázek použitý v šabloně. |

#### Vzor názvu souboru

`fileNamePattern` může používat placeholdery:

```text
Faktura {{col_0}} - {{col_3}}
```

Server automaticky přidá příponu `.pdf` a odstraní nebezpečné znaky pro názvy souborů.

#### Výstup

```text
Content-Type: application/zip
Content-Disposition: attachment; filename="documents.zip"
```

#### Příklad `curl`

```bash
curl -X POST http://127.0.0.1:3000/api/generate-pdf-zip \
  -F "templateFile=@template.json" \
  -F "dataFile=@faktury.csv" \
  -F "fileNamePattern=Faktura {{col_0}}" \
  --output faktury.zip
```

### `POST /api/send-mails`

Vygeneruje PDF pro každý řádek dat a odešle ho jako přílohu e-mailu.

#### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `templateFile` | soubor | ano | JSON šablona. |
| `dataFile` | soubor | ano | CSV, JSON, XLSX nebo XLS. |
| `senderEmail` | text | ano | E-mailová adresa odesílatele. |
| `subjectTemplate` | text | ano | Šablona předmětu e-mailu. |
| `bodyTemplate` | text | ano | Šablona těla e-mailu. |
| `fileNamePattern` | text | ne | Vzor názvu PDF přílohy. |
| `recipientColumnKey` | text | ano | Sloupec s e-mailovou adresou příjemce, např. `col_9`. |
| `image_<název>` | soubor | ne | Obrázek použitý v šabloně. |

#### Placeholdery v e-mailu

Předmět, tělo e-mailu i název přílohy mohou používat placeholdery:

```text
Faktura č. {{col_0}}
```

#### Příklad odpovědi

```json
{
  "ok": true,
  "total": 2,
  "successCount": 1,
  "failCount": 1,
  "results": [
    {
      "ok": true,
      "rowIndex": 0,
      "recipientEmail": "prijemce@example.com",
      "fileName": "Faktura 2025001.pdf"
    },
    {
      "ok": false,
      "rowIndex": 1,
      "recipientEmail": "",
      "fileName": "Faktura 2025002.pdf",
      "error": "Chybí e-mail ve sloupci col_9."
    }
  ]
}
```

#### Příklad `curl`

```bash
curl -X POST http://127.0.0.1:3000/api/send-mails \
  -F "templateFile=@template.json" \
  -F "dataFile=@faktury.csv" \
  -F "senderEmail=odesilatel@example.com" \
  -F "subjectTemplate=Faktura {{col_0}}" \
  -F "bodyTemplate=Dobrý den, v příloze zasíláme fakturu." \
  -F "fileNamePattern=Faktura {{col_0}}" \
  -F "recipientColumnKey=col_9"
```

### Chybové odpovědi

Typická chybová odpověď:

```json
{
  "ok": false,
  "error": "Chybí dataFile."
}
```

Nejčastější chyby:

| Chyba | Význam | Řešení |
| --- | --- | --- |
| `Chybí templateFile.` | Nebyla poslána šablona. | Zkontrolovat formulář/API volání. |
| `Chybí dataFile.` | Nebyl poslán datový soubor. | Zkontrolovat formulář/API volání. |
| `Template není validní` | JSON šablona neprošla validací. | Ověřit strukturu šablony. |
| `Chybí e-mail ve sloupci col_X.` | V daném řádku není příjemce. | Opravit data nebo změnit `recipientColumnKey`. |
| `Chybí ENTRA_CLIENT_ID...` | Nejsou nastavené proměnné prostředí pro Microsoft Graph. | Zkontrolovat `.env` nebo systemd službu. |


---

## Soubor `docs/TEMPLATE.md`

## Formát šablony

Šablona je JSON objekt, který popisuje stránku a prvky umístěné na stránce. Ukládá se a načítá jako `.json` soubor.

Souřadnice v editoru vycházejí z levého horního rohu. Pro PDF se interně převádějí do souřadnicového systému PDF.

### Základní struktura

```json
{
  "version": 1,
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margin": 0
  },
  "elements": []
}
```

### Stránka

| Vlastnost | Povolené hodnoty | Popis |
| --- | --- | --- |
| `size` | `A4` | Aktuálně podporovaná velikost stránky. |
| `orientation` | `portrait`, `landscape` | Orientace stránky. |
| `margin` | číslo | Rezervovaná hodnota. Aplikace pracuje hlavně s absolutními souřadnicemi. |

Rozměry A4 v PDF bodech:

| Orientace | Šířka | Výška |
| --- | ---: | ---: |
| `portrait` | `595.28` | `841.89` |
| `landscape` | `841.89` | `595.28` |

### Placeholdery

Placeholder je text ve tvaru:

```text
{{col_0}}
```

Při generování se nahradí hodnotou z aktuálního řádku dat.

Příklad:

```text
Faktura č. {{col_0}}
```

Pokud má první řádek dat hodnotu `2025001`, ve výsledném PDF bude:

```text
Faktura č. 2025001
```

Placeholdery se používají také v:

- názvu PDF souborů,
- předmětu e-mailu,
- těle e-mailu.

### Sloupce dat

Po načtení dat aplikace používá technické názvy podle pořadí sloupců:

```text
col_0, col_1, col_2, col_3, ...
```

Příklad mapování:

| Pořadí ve vstupním souboru | Interní název |
| ---: | --- |
| 1. sloupec | `col_0` |
| 2. sloupec | `col_1` |
| 3. sloupec | `col_2` |
| 10. sloupec | `col_9` |

Při změně pořadí sloupců ve vstupním CSV/XLSX souboru je nutné zkontrolovat šablonu.

### Textový prvek

```json
{
  "id": "text_1",
  "type": "text",
  "x": 40,
  "y": 60,
  "w": 250,
  "h": 80,
  "text": "Faktura č. {{col_0}}",
  "style": {
    "fontFamily": "DejaVuSans",
    "fontSize": 12,
    "color": "#000000",
    "bold": true,
    "align": "left",
    "lineHeight": 1.2,
    "paddingTop": 2,
    "paddingLeft": 2
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `id` | Jedinečný identifikátor prvku. |
| `type` | Musí být `text`. |
| `x`, `y` | Pozice levého horního rohu. |
| `w`, `h` | Šířka a výška textového boxu. |
| `text` | Text, může obsahovat placeholdery. |
| `style.fontFamily` | Použitý font. Výchozí je `DejaVuSans`. |
| `style.fontSize` | Velikost písma. |
| `style.color` | Barva textu ve formátu `#RRGGBB`. |
| `style.bold` | Tučný řez. |
| `style.align` | `left`, `center`, `right`. |
| `style.lineHeight` | Řádkování. |
| `style.paddingTop`, `style.paddingLeft` | Vnitřní odsazení textu. |

### Obdélník

```json
{
  "id": "rect_1",
  "type": "rect",
  "x": 40,
  "y": 100,
  "w": 200,
  "h": 80,
  "style": {
    "strokeColor": "#000000",
    "strokeWidth": 1,
    "fillColor": null
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `x`, `y` | Pozice levého horního rohu. |
| `w`, `h` | Šířka a výška. |
| `strokeColor` | Barva okraje. |
| `strokeWidth` | Tloušťka okraje. |
| `fillColor` | Výplň, nebo `null` bez výplně. |

### Čára

```json
{
  "id": "line_1",
  "type": "line",
  "x1": 40,
  "y1": 100,
  "x2": 300,
  "y2": 100,
  "style": {
    "strokeColor": "#000000",
    "strokeWidth": 1
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `x1`, `y1` | Začátek čáry. |
| `x2`, `y2` | Konec čáry. |
| `strokeColor` | Barva čáry. |
| `strokeWidth` | Tloušťka čáry. |

### Obrázek

```json
{
  "id": "image_1",
  "type": "image",
  "x": 40,
  "y": 40,
  "w": 120,
  "h": 60,
  "source": {
    "fileName": "logo.png",
    "relativePath": "logo.png"
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `x`, `y` | Pozice levého horního rohu. |
| `w`, `h` | Šířka a výška obrázku. |
| `source.fileName` | Název obrázku. Musí odpovídat nahranému souboru. |
| `source.relativePath` | Relativní cesta použitá při práci se složkou obrázků. |

Podporované obrázky:

- PNG,
- JPG/JPEG.

Po načtení šablony je potřeba znovu vybrat složku s obrázky, pokud je prohlížeč už nemá k dispozici.

### Validace šablony

Validátor kontroluje:

- existenci `page`,
- podporovanou velikost stránky,
- podporovanou orientaci,
- existenci pole `elements`,
- podporovaný typ prvku,
- číselné souřadnice a rozměry,
- barvy ve formátu `#RRGGBB`,
- strukturu `source` u obrázků.

### Praktická doporučení pro tvorbu šablony

- Nejdřív načtěte reálný datový soubor a ověřte mapování sloupců.
- Do šablony pište vždy technické placeholdery `{{col_X}}`.
- Šablonu průběžně ukládejte jako JSON.
- Po úpravě šablony vždy vygenerujte náhled PDF.
- Pokud používáte obrázky, držte je ve stejné složce jako šablonu nebo v jasně pojmenované podsložce.
- Po přenosu šablony na jiný počítač je obvykle nutné znovu vybrat složku s obrázky.


---

## Soubor `docs/CONFIGURATION.md`

## Konfigurace a možné úpravy

Tento dokument popisuje, jak aplikaci konfigurovat a kde upravovat nejčastější interní nastavení. Cílem je, aby nový zaměstnanec dokázal najít konkrétní místo v kódu a bezpečně provést malou změnu.

### Proměnné prostředí

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

### Vzor `.env`

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

### Důležité: `.env` se automaticky nenačítá

Aktuální aplikace nepoužívá balíček `dotenv`. Pokud tedy vytvoříte soubor `.env`, Node.js ho sám od sebe nenačte.

Možnosti jsou tři:

#### Varianta A: použít systemd `EnvironmentFile`

Doporučené pro produkční server. Viz `deploy/systemd/pdf-template-editor.service`.

```ini
EnvironmentFile=/var/www/pdf-template-editor/.env
```

#### Varianta B: načíst `.env` ručně před lokálním spuštěním

```bash
set -a
source .env
set +a
npm start
```

#### Varianta C: přidat `dotenv` do projektu

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

### Změna sloupce pro e-mail příjemce

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

### Jak zjistit správné číslo sloupce

Po nahrání datového souboru se zobrazí náhled tabulky. Aplikace pracuje s technickými názvy sloupců podle pořadí:

```text
první sloupec  = col_0
druhý sloupec  = col_1
třetí sloupec  = col_2
...
desátý sloupec = col_9
```

Pokud je e-mail v desátém sloupci tabulky, použijte `col_9`. Pokud je v osmém sloupci, použijte `col_7`.

### Volitelná úprava: přidat výběr e-mailového sloupce do UI

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

### Změna výchozí adresy odesílatele

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

### Změna výchozího předmětu e-mailu

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

### Změna výchozího textu e-mailu

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

### Změna výchozího názvu PDF souborů v ZIP

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

### Změna portu a hostu

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

### Změna upload limitu

Server používá dvě omezení:

#### Limit JSON požadavků

Soubor:

```text
server.js
```

```js
app.use(express.json({ limit: "10mb" }));
```

#### Limit uploadovaného souboru přes multer

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

### Změna fontů

Serverové PDF fonty jsou v:

```text
src/lib/assets/fonts/
```

Frontendový canvas používá fonty z:

```text
public/fonts/
```

Pokud změníte font jen na jednom místě, může se stát, že náhled v canvasu nebude přesně odpovídat vygenerovanému PDF. Proto je potřeba držet serverový a frontendový font ve shodě.

### Změna výchozí velikosti canvasu

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

### Změna podporovaných prvků šablony

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

### Změna bezpečnostního omezení v Nginx

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


---

## Soubor `docs/DEPLOYMENT.md`

## Nasazení na Linux server

Tento dokument popisuje doporučený interní způsob nasazení aplikace na Linux server. Cílem je, aby Node aplikace běžela pouze lokálně na serveru a před ní byl Nginx s HTTPS a základním bezpečnostním nastavením.

### Doporučená produkční architektura

```text
uživatel → HTTPS → Nginx :443 → Node/Express :3000 na 127.0.0.1
```

Aplikace by v produkci neměla být přímo dostupná z internetu nebo interní sítě přes port `3000`. Port `3000` má být dostupný jen lokálně na serveru.

### Předpoklady

- Linux server s přístupem přes SSH,
- Node.js 18 nebo novější,
- npm,
- Git,
- Nginx,
- systemd,
- přístup k Microsoft Entra údajům, pokud se používá e-mailové odesílání.

### 1. Vytvoření uživatele pro aplikaci

Doporučuje se nespouštět aplikaci pod `root` uživatelem.

```bash
sudo adduser --system --group --home /var/www/pdf-template-editor appuser
```

### 2. Stažení aplikace

```bash
sudo mkdir -p /var/www/pdf-template-editor
sudo chown appuser:appuser /var/www/pdf-template-editor
sudo -u appuser git clone <URL_REPOZITARE> /var/www/pdf-template-editor
cd /var/www/pdf-template-editor
```

### 3. Instalace závislostí

```bash
sudo -u appuser npm install
```

Pro produkční instalaci lze použít:

```bash
sudo -u appuser npm ci --omit=dev
```

Použijte `npm ci`, pokud je v repozitáři aktuální `package-lock.json`.

### 4. Vytvoření `.env`

```bash
cd /var/www/pdf-template-editor
sudo -u appuser cp .env.example .env
sudo -u appuser nano .env
```

Příklad:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000

ENTRA_CLIENT_ID=00000000-0000-0000-0000-000000000000
ENTRA_CLIENT_SECRET=sem-patri-client-secret
ENTRA_TENANT_ID=00000000-0000-0000-0000-000000000000
```

Nastavení práv:

```bash
sudo chown appuser:appuser /var/www/pdf-template-editor/.env
sudo chmod 600 /var/www/pdf-template-editor/.env
```

### 5. Ověření ručního startu

```bash
cd /var/www/pdf-template-editor
sudo -u appuser bash -lc 'set -a; source .env; set +a; npm start'
```

V jiném terminálu:

```bash
curl http://127.0.0.1:3000
```

Pokud se vrátí HTML aplikace, server běží správně.

### 6. Systemd služba

Vzor je v souboru:

```text
deploy/systemd/pdf-template-editor.service
```

Zkopírování:

```bash
sudo cp deploy/systemd/pdf-template-editor.service /etc/systemd/system/pdf-template-editor.service
sudo systemctl daemon-reload
sudo systemctl enable pdf-template-editor
sudo systemctl start pdf-template-editor
```

Kontrola stavu:

```bash
sudo systemctl status pdf-template-editor
```

Logy:

```bash
sudo journalctl -u pdf-template-editor -f
```

Restart po úpravách:

```bash
sudo systemctl restart pdf-template-editor
```

### 7. Nginx reverse proxy

Vzor je v:

```text
deploy/nginx/pdf-template-editor.conf
```

Zkopírování:

```bash
sudo cp deploy/nginx/pdf-template-editor.conf /etc/nginx/sites-available/pdf-template-editor.conf
sudo ln -s /etc/nginx/sites-available/pdf-template-editor.conf /etc/nginx/sites-enabled/pdf-template-editor.conf
sudo nginx -t
sudo systemctl reload nginx
```

V konfiguraci je nutné upravit:

- `server_name`,
- případné cesty k certifikátům,
- povolené IP rozsahy, pokud má být aplikace dostupná jen interně.

### 8. HTTPS

Pokud server používá veřejnou doménu, lze HTTPS řešit například přes certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d faktury.example.cz
```

Pokud jde čistě o interní server, použijte interní certifikační autoritu nebo reverzní proxy organizace.

### 9. Firewall

Příklad pro UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 3000/tcp
sudo ufw enable
sudo ufw status
```

Důležité: port `3000` se v produkci nemá otevírat do sítě. Nginx komunikuje s Node aplikací lokálně přes `127.0.0.1:3000`.

### 10. Bezpečnostní nastavení v Nginx

Doporučené prvky:

- `server_tokens off;`,
- `client_max_body_size 50m;`,
- bezpečnostní hlavičky,
- HTTPS,
- omezení přístupu na interní IP rozsahy, pokud je to potřeba,
- dostatečné proxy timeouty pro generování větších PDF/ZIP souborů.

Příklad omezení na interní síť:

```nginx
allow 10.0.0.0/8;
allow 172.16.0.0/12;
allow 192.168.0.0/16;
deny all;
```

Tento blok patří do `location /` nebo do `server` bloku podle požadovaného rozsahu omezení.

### 11. Microsoft Entra / Graph

Pro e-mailové odesílání musí být v Microsoft Entra vytvořená aplikace, která má oprávnění pro Microsoft Graph odesílání e-mailů.

Aplikace používá client credentials tok:

```text
client_id + client_secret + tenant_id → access token → /users/{senderEmail}/sendMail
```

Interně je potřeba evidovat:

- Tenant ID,
- Client ID,
- datum expirace client secretu,
- kdo má oprávnění secret obnovit,
- jaký účet se používá jako odesílatel,
- zda je odesílání omezené na konkrétní mailbox.

### 12. Aktualizace aplikace

```bash
cd /var/www/pdf-template-editor
sudo -u appuser git pull
sudo -u appuser npm ci --omit=dev
sudo systemctl restart pdf-template-editor
sudo systemctl status pdf-template-editor
```

Po aktualizaci zkontrolujte:

1. otevření aplikace v prohlížeči,
2. načtení testovacího CSV/XLSX,
3. vygenerování PDF náhledu,
4. ZIP export,
5. e-mailový test na jeden interní příjemce.

### 13. Rollback

Pokud po aktualizaci aplikace nefunguje:

```bash
cd /var/www/pdf-template-editor
git log --oneline -5
sudo -u appuser git checkout <POSLEDNI_FUNKCNI_COMMIT>
sudo -u appuser npm ci --omit=dev
sudo systemctl restart pdf-template-editor
```

Po rollbacku je vhodné vytvořit issue nebo interní záznam, proč byla verze vrácena.

### 14. Kontrolní seznam před předáním serveru

- [ ] Aplikace běží přes systemd.
- [ ] `.env` existuje a má práva `600`.
- [ ] Port `3000` není otevřený do sítě.
- [ ] Nginx proxy funguje.
- [ ] HTTPS funguje.
- [ ] Upload většího testovacího souboru projde.
- [ ] PDF náhled odpovídá šabloně.
- [ ] ZIP export funguje.
- [ ] Odeslání testovacího e-mailu funguje.
- [ ] Je zdokumentované, kdy expiruje Entra client secret.
- [ ] Je uložená aktuální testovací šablona a testovací datový soubor.


---

## Soubor `docs/OPERATIONS.md`

## Provozní manuál

Tento dokument popisuje běžnou práci s aplikací z pohledu interního provozu. Je určený pro zaměstnance, kteří aplikaci používají nebo spravují.

### Role

#### Běžný uživatel

- načítá data,
- vytváří nebo používá šablony,
- generuje PDF a ZIP,
- případně odesílá e-maily.

#### Správce aplikace

- spravuje server,
- aktualizuje aplikaci,
- řeší `.env`, Entra údaje, Nginx a systemd,
- kontroluje logy,
- řeší chyby při odesílání.

### Běžný postup generování PDF

1. Otevřít aplikaci.
2. Nahrát datový soubor.
3. Zkontrolovat náhled tabulky a sloupce `col_X`.
4. Načíst existující šablonu nebo vytvořit novou.
5. Zkontrolovat placeholdery.
6. Vybrat složku s obrázky, pokud šablona používá logo nebo razítko.
7. Kliknout na `Vygenerovat PDF`.
8. Zkontrolovat náhled.
9. Stáhnout jedno PDF nebo ZIP.

### Běžný postup odesílání e-mailů

1. Nejdřív vygenerovat a zkontrolovat PDF náhled.
2. Ověřit, že datový soubor obsahuje e-mailové adresy.
3. Ověřit, že aplikace používá správný e-mailový sloupec, například `col_9`.
4. Otevřít e-mailový modal.
5. Zkontrolovat odesílatele.
6. Zkontrolovat předmět a text e-mailu.
7. Odeslat nejdřív malý testovací vzorek, pokud je to možné.
8. Po hromadném odeslání zkontrolovat počet úspěšných a chybných odeslání.
9. U chybných řádků opravit data a odeslat znovu jen opravené záznamy.

### Doporučený interní testovací balíček

V repozitáři nebo v interním úložišti je vhodné držet:

```text
test-data/
├─ faktury-test.csv
├─ faktury-test.xlsx
├─ template-test.json
└─ images/
   ├─ logo.png
   └─ razitko.png
```

Tento balíček by neměl obsahovat skutečné osobní údaje ani reálné faktury.

### Restart aplikace

```bash
sudo systemctl restart pdf-template-editor
```

Kontrola:

```bash
sudo systemctl status pdf-template-editor
```

### Sledování logů

```bash
sudo journalctl -u pdf-template-editor -f
```

Posledních 200 řádků:

```bash
sudo journalctl -u pdf-template-editor -n 200
```

### Restart Nginxu

Po změně Nginx konfigurace:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Pokud test `nginx -t` selže, Nginx nereloadovat a nejdřív opravit konfiguraci.

### Aktualizace aplikace

```bash
cd /var/www/pdf-template-editor
sudo -u appuser git pull
sudo -u appuser npm ci --omit=dev
sudo systemctl restart pdf-template-editor
```

Po aktualizaci vždy otestovat:

- otevření aplikace,
- načtení dat,
- PDF náhled,
- ZIP export,
- e-mail na interní testovací adresu.

### Záloha důležitých souborů

Zálohovat by se mělo hlavně:

- aktuální šablony `.json`,
- interní testovací data bez osobních údajů,
- dokumentace k Entra aplikaci,
- Nginx konfigurace,
- systemd služba,
- informace o doméně a HTTPS certifikátu.

Soubor `.env` obsahuje tajné údaje. Jeho záloha musí být uložená bezpečně a nesmí být ve veřejném repozitáři.

### Předávání novému zaměstnanci

Novému správci aplikace předejte:

- odkaz na repozitář,
- tuto dokumentaci,
- přístup na server,
- informaci, kde je produkční `.env`,
- informaci, kde jsou uložené šablony,
- testovací datový balíček,
- kontakt na správce Microsoft Entra aplikace,
- datum expirace client secretu,
- postup pro obnovu secretu.

### Provozní kontrolní seznam jednou za čas

- [ ] Funguje HTTPS certifikát.
- [ ] Neexpiruje Microsoft Entra client secret.
- [ ] Aplikace generuje PDF z testovacích dat.
- [ ] E-mailové odesílání funguje na testovací adresu.
- [ ] Server má dostatek místa.
- [ ] Logy neobsahují opakující se chyby.
- [ ] Repozitář neobsahuje `.env` ani reálné faktury.


---

## Soubor `docs/TROUBLESHOOTING.md`

## Řešení problémů

### Aplikace se nespustí

#### Kontrola stavu

```bash
sudo systemctl status pdf-template-editor
sudo journalctl -u pdf-template-editor -n 100
```

#### Časté příčiny

| Problém | Příčina | Řešení |
| --- | --- | --- |
| `Chybí ENTRA_CLIENT_ID...` | Nejsou načtené proměnné prostředí. | Zkontrolovat `.env` a `EnvironmentFile` v systemd. |
| `EADDRINUSE` | Port už používá jiný proces. | Změnit `PORT` nebo zastavit druhý proces. |
| `Cannot find module` | Nejsou nainstalované závislosti. | Spustit `npm install` nebo `npm ci`. |
| `Permission denied` | Aplikační uživatel nemá práva k adresáři. | Opravit vlastníka a práva. |

### Webová stránka se neotevře

1. Ověřit Node aplikaci:

```bash
curl http://127.0.0.1:3000
```

2. Ověřit Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

3. Ověřit firewall:

```bash
sudo ufw status
```

4. Ověřit DNS/doménu, pokud se používá doména.

### Chyba při uploadu souboru

Možné příčiny:

- soubor je větší než limit v `multer`,
- soubor je větší než `client_max_body_size` v Nginxu,
- nepodporovaná přípona,
- poškozený Excel/CSV soubor.

Kontrola limitů:

```text
server.js                      express.json({ limit: "10mb" })
src/routes/api.js              fileSize: 20 * 1024 * 1024
Nginx konfigurace              client_max_body_size 50m;
```

### CSV má špatnou diakritiku

Aplikace se pokouší detekovat kódování. Podporovaná jsou mimo jiné:

- `utf-8`,
- `windows-1250`,
- `iso-8859-2`,
- `utf-16le`.

Pokud se diakritika načte špatně:

1. Otevřít CSV v editoru, který umí zobrazit kódování.
2. Uložit jako UTF-8.
3. Znovu nahrát do aplikace.

### PDF náhled nesedí s canvasem

Možné příčiny:

- rozdílný font ve frontendu a backendu,
- chybí `public/fonts/DejaVuSans.woff2`,
- chybí `src/lib/assets/fonts/DejaVuSans.ttf`,
- prohlížeč načetl starou verzi CSS/JS z cache.

Řešení:

1. Vyčistit cache prohlížeče.
2. Ověřit fonty v `public/fonts/` a `src/lib/assets/fonts/`.
3. Vygenerovat nový PDF náhled.

### Obrázek se nezobrazí v PDF

Možné příčiny:

- po načtení šablony nebyla vybrána složka s obrázky,
- název obrázku v šabloně neodpovídá souboru,
- obrázek je v nepodporovaném formátu,
- soubor je poškozený.

Podporované formáty:

- PNG,
- JPG/JPEG.

Postup:

1. Zkontrolovat `source.fileName` v šabloně.
2. Vybrat složku s obrázky tlačítkem `Vybrat složku s obrázky`.
3. Zkusit obrázek uložit znovu jako PNG nebo JPG.

### ZIP se nevygeneruje

Možné příčiny:

- příliš velký datový soubor,
- velké obrázky,
- nevalidní šablona,
- timeout v Nginxu.

Zkontrolovat:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
client_max_body_size 50m;
```

### E-maily se neodesílají

#### Zkontrolovat proměnné prostředí

```bash
sudo systemctl show pdf-template-editor --property=Environment
```

Pozor: tento příkaz může ukázat tajné hodnoty. Používat opatrně.

Bezpečnější je zkontrolovat existenci `.env` a systemd konfiguraci:

```bash
sudo cat /etc/systemd/system/pdf-template-editor.service
sudo ls -l /var/www/pdf-template-editor/.env
```

#### Časté příčiny

| Problém | Příčina | Řešení |
| --- | --- | --- |
| `Nepodařilo se získat access token` | Špatný tenant/client/secret. | Ověřit `.env` a Entra aplikaci. |
| `Unauthorized` nebo `Forbidden` | Chybí oprávnění Graph. | Ověřit Microsoft Graph permissions a admin consent. |
| Chybí e-mail ve sloupci `col_X` | Špatně zvolený sloupec nebo prázdná buňka. | Opravit data nebo změnit `recipientColumnKey`. |
| Odesílatel neexistuje | `senderEmail` není mailbox v tenantovi. | Upravit výchozí odesílatele. |

### Chybí e-mail ve sloupci `col_9`

Tato chyba znamená, že aplikace v daném řádku hledala příjemce ve sloupci `col_9`, ale hodnota byla prázdná.

Řešení:

1. Otevřít náhled tabulky po nahrání dat.
2. Najít, ve kterém sloupci je e-mail.
3. Pokud je e-mail například v osmém sloupci, použít `col_7`.
4. Upravit `public/app.js` podle `docs/CONFIGURATION.md`.

### Po změně kódu se nic nezměnilo

Možné příčiny:

- nebyl restartovaný systemd proces,
- prohlížeč má starý JS/CSS v cache,
- změna proběhla v jiné kopii repozitáře,
- Nginx servíruje jinou aplikaci.

Postup:

```bash
sudo systemctl restart pdf-template-editor
sudo systemctl reload nginx
```

V prohlížeči provést tvrdé obnovení stránky.


---

## Soubor `docs/SECURITY.md`

## Bezpečnostní poznámky

Tento dokument shrnuje bezpečnostní nastavení a provozní pravidla pro interní nasazení aplikace.

### Tajné údaje

Do repozitáře nepatří:

- `.env`,
- Microsoft Entra client secret,
- reálné faktury,
- reálné datové soubory s osobními údaji,
- PDF výstupy obsahující osobní nebo účetní data,
- produkční certifikáty a privátní klíče.

V repozitáři může být pouze `.env.example`, protože neobsahuje skutečné tajné hodnoty.

### Práva k `.env`

Na serveru:

```bash
sudo chown appuser:appuser /var/www/pdf-template-editor/.env
sudo chmod 600 /var/www/pdf-template-editor/.env
```

### Přístup k aplikaci

Doporučené produkční nastavení:

```text
Internet/interní síť → Nginx :443 → Node aplikace na 127.0.0.1:3000
```

Port `3000` nemá být otevřený zvenčí.

### Nginx

Nginx by měl řešit:

- HTTPS,
- reverzní proxy,
- maximální velikost uploadu,
- základní bezpečnostní hlavičky,
- volitelně omezení na interní IP rozsahy.

Příklad omezení na interní sítě:

```nginx
allow 10.0.0.0/8;
allow 172.16.0.0/12;
allow 192.168.0.0/16;
deny all;
```

### Microsoft Graph

E-mailové odesílání používá aplikační oprávnění. Proto je potřeba hlídat:

- kdo má přístup k client secretu,
- kdy client secret expiruje,
- na jaký mailbox může aplikace odesílat,
- zda nejsou oprávnění širší, než je nutné.

Pokud organizace podporuje omezení aplikačního přístupu na konkrétní mailbox, je vhodné ho použít.

### Osobní údaje a faktury

Datové soubory a vygenerovaná PDF mohou obsahovat osobní nebo účetní údaje. Proto:

- testovací data by měla být anonymizovaná,
- reálné výstupy neukládat do Gitu,
- ZIP/PDF soubory mazat z pracovních stanic podle interních pravidel,
- při chybě odesílání zkontrolovat, že nedošlo k odeslání na špatnou adresu.

### Kontrolní seznam bezpečného nasazení

- [ ] `.env` není v repozitáři.
- [ ] `.env` má práva `600`.
- [ ] Node aplikace poslouchá na `127.0.0.1`.
- [ ] Port `3000` není otevřený ve firewallu.
- [ ] Nginx používá HTTPS.
- [ ] Je nastavený rozumný `client_max_body_size`.
- [ ] Entra client secret má evidované datum expirace.
- [ ] Repozitář neobsahuje reálná data.


---

## Soubor `.env.example`

```env
# ------------------------------------------------------------
# PDF Template Editor - vzor konfigurace
# ------------------------------------------------------------
# Tento soubor zkopírujte jako .env a doplňte skutečné hodnoty.
# Soubor .env nikdy neukládejte do veřejného repozitáře.

# Režim aplikace
NODE_ENV=production

# Express server
# Pro produkci za Nginx ponechte 127.0.0.1.
# Pro test v lokální síti lze dočasně použít 0.0.0.0.
HOST=127.0.0.1
PORT=3000

# Microsoft Entra / Microsoft Graph
# Potřebné pro e-mailové odesílání přes /users/{senderEmail}/sendMail.
ENTRA_CLIENT_ID=00000000-0000-0000-0000-000000000000
ENTRA_CLIENT_SECRET=sem-patri-client-secret
ENTRA_TENANT_ID=00000000-0000-0000-0000-000000000000
```


---

## Soubor `.gitignore`

```gitignore
# Závislosti
node_modules/

# Konfigurace a tajné údaje
.env
.env.*
!.env.example

# Logy
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Vygenerované dokumenty a archivy
*.pdf
*.zip
*.rar
output/
exports/
tmp/
temp/

# Systémové soubory
.DS_Store
Thumbs.db

# Editor/IDE
.vscode/
.idea/

# Testovací lokální data s možnými osobními údaji
test-data/private/
data/private/
```


---

## Soubor `deploy/nginx/pdf-template-editor.conf`

```nginx
# ------------------------------------------------------------
# PDF Template Editor - Nginx reverse proxy
# ------------------------------------------------------------
# Upravte server_name a případné cesty k certifikátům.
# Node aplikace má běžet na 127.0.0.1:3000.

server {
    listen 80;
    server_name faktury.example.cz;

    # Pokud používáte certbot, může si tuto část upravit automaticky.
    # Pro vynucení HTTPS po nasazení certifikátu odkomentujte:
    # return 301 https://$host$request_uri;

    server_tokens off;
    client_max_body_size 50m;

    # Základní bezpečnostní hlavičky.
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    location / {
        # Volitelné omezení na interní sítě.
        # allow 10.0.0.0/8;
        # allow 172.16.0.0/12;
        # allow 192.168.0.0/16;
        # deny all;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Větší exporty PDF/ZIP mohou trvat déle.
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# HTTPS varianta po získání certifikátu může vypadat například takto:
#
# server {
#     listen 443 ssl http2;
#     server_name faktury.example.cz;
#
#     ssl_certificate /etc/letsencrypt/live/faktury.example.cz/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/faktury.example.cz/privkey.pem;
#
#     server_tokens off;
#     client_max_body_size 50m;
#
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header Referrer-Policy "strict-origin-when-cross-origin" always;
#     add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
#
#     location / {
#         proxy_pass http://127.0.0.1:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_connect_timeout 60s;
#         proxy_send_timeout 300s;
#         proxy_read_timeout 300s;
#     }
# }
```


---

## Soubor `deploy/systemd/pdf-template-editor.service`

```ini
[Unit]
Description=PDF Template Editor
After=network.target

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/var/www/pdf-template-editor
EnvironmentFile=/var/www/pdf-template-editor/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

# Základní hardening. Pokud by některé omezení vadilo zápisu/cache, upravit podle serveru.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/www/pdf-template-editor

[Install]
WantedBy=multi-user.target
```
