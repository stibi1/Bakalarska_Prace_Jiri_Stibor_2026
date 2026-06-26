# API dokumentace

Serverové API je připojené pod cestou:

```text
/api
```

Většina endpointů používá `multipart/form-data`, protože pracuje se soubory šablon, dat a obrázků. Chybové odpovědi se vracejí jako JSON s `ok: false` a textem chyby.

## Přehled endpointů

| Metoda | Cesta | Účel | Výstup |
| --- | --- | --- | --- |
| `POST` | `/api/upload-data` | Načtení CSV/JSON/XLSX/XLS dat. | JSON s řádky a sloupci. |
| `POST` | `/api/validate-template` | Validace JSON šablony. | JSON s výsledkem validace. |
| `POST` | `/api/generate-pdf` | Vygenerování jednoho PDF. | `application/pdf` |
| `POST` | `/api/generate-pdf-zip` | Vygenerování ZIP archivu. | `application/zip` |
| `POST` | `/api/send-mails` | Vygenerování PDF a odeslání e-mailů. | JSON s výsledky odesílání. |

## `POST /api/upload-data`

Načte tabulkový soubor a převede ho do interní podoby.

### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `file` | soubor | ano | CSV, JSON, XLSX nebo XLS. |

### Chování

- CSV se dekóduje z podporovaných kódování.
- CSV delimiter se detekuje automaticky: čárka, středník nebo tabulátor.
- Excel soubor bere první list, pokud není v kódu doplněno jinak.
- Sloupce jsou ve výsledku reprezentované technickými názvy `col_0`, `col_1`, `col_2`, ...

### Příklad odpovědi

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

### Příklad `curl`

```bash
curl -X POST http://127.0.0.1:3000/api/upload-data \
  -F "file=@faktury.csv"
```

## `POST /api/validate-template`

Ověří, že šablona má správnou strukturu.

### Vstup

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

### Příklad odpovědi

```json
{
  "ok": true,
  "valid": true,
  "errors": []
}
```

### Příklad chybové validace

```json
{
  "ok": true,
  "valid": false,
  "errors": [
    "Nepodporovaný page.orientation. Povolené: portrait, landscape"
  ]
}
```

## `POST /api/generate-pdf`

Vygeneruje jeden PDF soubor. Pokud datový soubor obsahuje více řádků, výsledné PDF bude mít více stránek.

### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `templateFile` | soubor | ano | JSON šablona. |
| `dataFile` | soubor | ano | CSV, JSON, XLSX nebo XLS. |
| `image_<název>` | soubor | ne | Obrázek použitý v šabloně. |

### Výstup

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="output.pdf"
```

### Příklad `curl`

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

## `POST /api/generate-pdf-zip`

Vygeneruje ZIP archiv, kde každý řádek dat vytvoří jeden samostatný PDF soubor.

### Vstup

`multipart/form-data`

| Pole | Typ | Povinné | Popis |
| --- | --- | --- | --- |
| `templateFile` | soubor | ano | JSON šablona. |
| `dataFile` | soubor | ano | CSV, JSON, XLSX nebo XLS. |
| `fileNamePattern` | text | ne | Vzor názvu PDF souborů. |
| `image_<název>` | soubor | ne | Obrázek použitý v šabloně. |

### Vzor názvu souboru

`fileNamePattern` může používat placeholdery:

```text
Faktura {{col_0}} - {{col_3}}
```

Server automaticky přidá příponu `.pdf` a odstraní nebezpečné znaky pro názvy souborů.

### Výstup

```text
Content-Type: application/zip
Content-Disposition: attachment; filename="documents.zip"
```

### Příklad `curl`

```bash
curl -X POST http://127.0.0.1:3000/api/generate-pdf-zip \
  -F "templateFile=@template.json" \
  -F "dataFile=@faktury.csv" \
  -F "fileNamePattern=Faktura {{col_0}}" \
  --output faktury.zip
```

## `POST /api/send-mails`

Vygeneruje PDF pro každý řádek dat a odešle ho jako přílohu e-mailu.

### Vstup

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

### Placeholdery v e-mailu

Předmět, tělo e-mailu i název přílohy mohou používat placeholdery:

```text
Faktura č. {{col_0}}
```

### Příklad odpovědi

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

### Příklad `curl`

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

## Chybové odpovědi

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
