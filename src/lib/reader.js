// ------------------------------------------------------------
// ČTENÍ TABULKOVÝCH DAT
// ------------------------------------------------------------
// Tento modul načítá vstupní datové soubory, které uživatel nahraje
// přes frontend aplikace. Podporuje CSV, JSON, XLSX a XLS.
//
// Výsledkem načtení není původní struktura souboru, ale normalizovaný
// tvar používaný zbytkem aplikace:
//
// {
//   type: "csv" | "json" | "xlsx",
//   rows: [ { col_0: "...", col_1: "..." } ],
//   columns: [ { id: "col_0", name: "Původní hlavička", index: 0 } ]
// }
//
// Technické názvy sloupců col_0, col_1, col_2 atd. jsou důležité
// pro placeholdery v šablonách PDF, například {{col_0}}.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// Synchronní parser CSV souborů. Používá se až poté, co je soubor
// dekódovaný na text a je detekovaný oddělovač sloupců.
import { parse as parseCsv } from "csv-parse/sync";

// Knihovna pro čtení Excel souborů XLSX a XLS.
import * as XLSX from "xlsx";

// Modul path slouží hlavně k získání přípony nahraného souboru.
import path from "path";

// ------------------------------------------------------------
// POKUS O DEKÓDOVÁNÍ TEXTU
// ------------------------------------------------------------

/**
 * Pokusí se dekódovat binární obsah souboru pomocí konkrétního kódování.
 *
 * Funkce se používá hlavně pro CSV a JSON soubory, protože ty přicházejí
 * jako Buffer a aplikace je musí převést na text. Parametr fatal: true
 * způsobí, že TextDecoder vyhodí chybu, pokud dané kódování neodpovídá
 * obsahu souboru.
 *
 * @param {Buffer|Uint8Array} buffer - Binární obsah nahraného souboru.
 * @param {string} encoding - Název kódování, například utf-8 nebo windows-1250.
 * @returns {string} Dekódovaný text bez případného BOM znaku na začátku.
 */
function tryDecode(buffer, encoding) {
  // TextDecoder převede binární data na řetězec podle zvoleného kódování.
  const decoder = new TextDecoder(encoding, { fatal: true });

  let text = decoder.decode(buffer);

  // Odstranění BOM znaku, pokud je na začátku souboru.
  // BOM se může objevit například u UTF-8 nebo UTF-16 souborů exportovaných
  // z některých tabulkových editorů.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  return text;
}

// ------------------------------------------------------------
// DETEKCE SPRÁVNÉHO ENCODINGU
// ------------------------------------------------------------

/**
 * Zkusí dekódovat textový soubor několika možnými kódováními.
 *
 * V českém prostředí je důležité počítat nejen s UTF-8, ale také
 * s Windows-1250 nebo ISO-8859-2. Funkce postupně vyzkouší zadaná
 * kódování a vrátí první, které vypadá použitelně.
 *
 * @param {Buffer|Uint8Array} buffer - Binární obsah nahraného souboru.
 * @param {string[]} encodings - Seznam kódování, která se mají vyzkoušet.
 * @returns {{ text: string, encoding: string }} Dekódovaný text a použité kódování.
 */
function decodeText(
  buffer,
  encodings = ["utf-8", "windows-1250", "iso-8859-2", "utf-16le"]
) {
  // Do attempts se ukládají informace o neúspěšných pokusech.
  // Pokud selže všechno, jsou součástí chybové hlášky.
  const attempts = [];

  for (const encoding of encodings) {
    try {
      const text = tryDecode(buffer, encoding);

      // Náhradní znak � většinou znamená, že dekódování nebylo správné.
      // Malé množství se toleruje, ale větší poměr značí podezřelý výsledek.
      const replacementCount = (text.match(/�/g) || []).length;
      const suspiciousRatio = text.length > 0 ? replacementCount / text.length : 0;

      // Pokud je podezřelých znaků méně než 1 %, kódování se považuje za použitelné.
      if (suspiciousRatio < 0.01) {
        return { text, encoding };
      }

      attempts.push(`${encoding}: podezřelé znaky`);
    } catch (err) {
      // Chyba z TextDecoderu znamená, že dané kódování pravděpodobně nesedí.
      attempts.push(`${encoding}: ${err.message}`);
    }
  }

  throw new Error(`Soubor se nepodařilo dekódovat: ${attempts.join(" | ")}`);
}

// ------------------------------------------------------------
// ROZDĚLENÍ ŘÁDKU MIMO UVOZOVKY
// ------------------------------------------------------------

/**
 * Rozdělí jeden řádek podle oddělovače, ale ignoruje oddělovače uvnitř uvozovek.
 *
 * Tato pomocná funkce se nepoužívá jako plnohodnotný CSV parser. Slouží jen
 * při detekci oddělovače, aby čárka nebo středník uvnitř textové hodnoty
 * nezkreslovaly počet sloupců.
 *
 * @param {string} line - Jeden řádek textu.
 * @param {string} delimiter - Kandidát na oddělovač, například ; nebo ,.
 * @returns {string[]} Části řádku rozdělené mimo uvozovky.
 */
function splitOutsideQuotes(line, delimiter) {
  // Výsledné části řádku.
  const result = [];

  // Aktuálně načítaná část mezi dvěma oddělovači.
  let current = "";

  // Určuje, zda se parser zrovna nachází uvnitř uvozovek.
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"") {
      // Dvě uvozovky za sebou uvnitř uvozovaného textu znamenají jednu
      // skutečnou uvozovku v hodnotě, ne konec uvozovaného úseku.
      if (inQuotes && next === "\"") {
        current += "\"";
        i++;
        continue;
      }

      // Přepnutí stavu: začátek nebo konec uvozovaného úseku.
      inQuotes = !inQuotes;
      continue;
    }

    // Oddělovač se bere v potaz pouze mimo uvozovky.
    if (!inQuotes && char === delimiter) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  // Přidání poslední načtené části řádku.
  result.push(current);
  return result;
}

// ------------------------------------------------------------
// DETEKCE CSV DELIMITERU
// ------------------------------------------------------------

/**
 * Odhadne oddělovač CSV souboru podle prvních neprázdných řádků.
 *
 * Funkce zkouší čárku, středník a tabulátor. Vyhrává oddělovač, který dává
 * nejvyšší počet sloupců a zároveň konzistentní počet sloupců mezi řádky.
 *
 * @param {string} text - Dekódovaný obsah CSV souboru.
 * @returns {string} Detekovaný oddělovač.
 */
function detectDelimiter(text) {
  // Stačí prvních několik neprázdných řádků, aby detekce nebyla zbytečně pomalá.
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter(line => line.trim().length > 0)
    .slice(0, 10);

  // Kandidáti běžní pro CSV exporty v českém prostředí a tabulkových editorech.
  const candidates = [",", ";", "\t"];

  // Výchozí oddělovač, kdyby nebylo možné spolehlivě rozhodnout.
  let bestDelimiter = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    // score hodnotí, kolik sloupců daný oddělovač pravděpodobně vytvoří.
    let score = 0;

    // consistentLines zvýhodňuje oddělovač, který vytváří stabilní počet sloupců.
    let consistentLines = 0;

    // Počet sloupců v předchozím řádku.
    let previousColumns = null;

    for (const line of lines) {
      const parts = splitOutsideQuotes(line, delimiter);
      const columnCount = parts.length;

      if (columnCount > 1) {
        score += columnCount;

        if (previousColumns === null || previousColumns === columnCount) {
          consistentLines += 1;
        }

        previousColumns = columnCount;
      }
    }

    // Konzistence má větší váhu než samotný počet sloupců.
    const finalScore = score + consistentLines * 3;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

// ------------------------------------------------------------
// ČIŠTĚNÍ HLAVIČEK
// ------------------------------------------------------------

/**
 * Převede hlavičku sloupce na čistý textový název.
 *
 * Technické ID sloupce se z hlavičky nevyrábí. Aplikace místo toho používá
 * stabilní názvy col_0, col_1 atd. Původní hlavička se ukládá jen jako
 * lidsky čitelný název pro tabulkový náhled.
 *
 * @param {*} header - Hodnota hlavičky z načteného souboru.
 * @returns {string} Očištěný název hlavičky.
 */
function cleanHeader(header) {
  return String(header ?? "").trim();
}

// ------------------------------------------------------------
// NORMALIZACE HODNOT
// ------------------------------------------------------------

/**
 * Normalizuje jednu hodnotu z datového souboru.
 *
 * Funkce převádí textové reprezentace booleanů a jednoduchých čísel
 * na skutečné JavaScript hodnoty. Ostatní text ponechává jako text.
 *
 * @param {*} value - Původní hodnota z CSV, JSON nebo Excelu.
 * @returns {*} Normalizovaná hodnota.
 */
function normalizeValue(value) {
  // Null a undefined se nechávají beze změny, aby bylo možné poznat prázdnou
  // hodnotu od prázdného textového řetězce.
  if (value === null || value === undefined) return null;

  // Hodnoty, které už nejsou textem, není potřeba dále zpracovávat.
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  // Prázdný text se vrací jako prázdný řetězec.
  if (trimmed === "") return "";

  // Převod textu true/false bez ohledu na velikost písmen.
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }

  // Převod celých čísel.
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Převod desetinných čísel s tečkou.
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Převod desetinných čísel s českou desetinnou čárkou.
  if (/^-?\d+,\d+$/.test(trimmed)) {
    return Number(trimmed.replace(",", "."));
  }

  return trimmed;
}

// ------------------------------------------------------------
// NORMALIZACE TABULKY + GENEROVÁNÍ COLUMN ID
// ------------------------------------------------------------

/**
 * Převede načtené řádky na jednotný interní formát se sloupci col_0, col_1 atd.
 *
 * Tato funkce je důležitá pro stabilitu šablon. Původní názvy sloupců mohou
 * obsahovat diakritiku, mezery nebo jiné znaky. Proto se pro placeholdery
 * používají technické názvy podle pořadí sloupců.
 *
 * @param {object[]} rows - Řádky načtené parserem CSV, JSON nebo Excelu.
 * @returns {{ rows: object[], columns: object[] }} Normalizované řádky a metadata sloupců.
 */
function normalizeRowsWithColumns(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: [], columns: [] };
  }

  // Původní hlavičky se berou z prvního řádku. Jejich pořadí určuje col_0, col_1 atd.
  const originalHeaders = Object.keys(rows[0]);

  // Metadata sloupců používaná frontendem pro náhled tabulky a vkládání placeholderů.
  const columns = originalHeaders.map((header, index) => ({
    id: `col_${index}`,
    name: cleanHeader(header),
    index
  }));

  // Každý původní řádek se přepíše na objekt s technickými názvy sloupců.
  const normalizedRows = rows.map(row => {
    const newRow = {};

    columns.forEach(col => {
      const originalKey = originalHeaders[col.index];
      newRow[col.id] = normalizeValue(row[originalKey]);
    });

    return newRow;
  });

  return {
    rows: normalizedRows,
    columns
  };
}

// ------------------------------------------------------------
// PARSOVÁNÍ CSV
// ------------------------------------------------------------

/**
 * Načte a znormalizuje CSV soubor.
 *
 * Funkce nejdřív detekuje textové kódování a oddělovač. Teprve potom použije
 * csv-parse pro skutečné načtení záznamů. Výsledné řádky převede na interní
 * col_0, col_1 formát.
 *
 * @param {Buffer} buffer - Binární obsah CSV souboru z multer uploadu.
 * @returns {object} Informace o CSV souboru, řádky a metadata sloupců.
 */
function parseCsvFile(buffer) {
  // Detekce kódování řeší zejména české CSV exporty z účetních nebo tabulkových systémů.
  const { text, encoding } = decodeText(buffer);

  // Detekce oddělovače umožňuje načíst CSV se středníkem, čárkou i tabulátorem.
  const delimiter = detectDelimiter(text);

  const records = parseCsv(text, {
    // První řádek se použije jako hlavička a zároveň se očistí přes cleanHeader.
    columns: headers => headers.map(cleanHeader),

    // Prázdné řádky se při čtení ignorují.
    skip_empty_lines: true,

    // Použije se automaticky detekovaný oddělovač.
    delimiter,

    // Podpora BOM znaku na začátku souboru.
    bom: true,

    // V praxi se mohou objevit řádky s chybějícími nebo přebývajícími sloupci.
    // Parser je kvůli tomu nastaven tolerantněji.
    relax_column_count: true,
    relax_quotes: true,

    // Standardní CSV uvozovky a escapování uvozovek.
    quote: "\"",
    escape: "\"",

    // trim je false, protože čištění hodnot řeší normalizeValue později.
    trim: false,

    // Prázdné hodnoty uvnitř řádku se nemají zahazovat.
    skip_records_with_empty_values: false
  });

  const { rows, columns } = normalizeRowsWithColumns(records);

  return {
    type: "csv",
    encoding,
    delimiter: delimiter === "\t" ? "\\t" : delimiter,
    rows,
    columns
  };
}

// ------------------------------------------------------------
// PARSOVÁNÍ JSON
// ------------------------------------------------------------

/**
 * Načte a znormalizuje JSON soubor.
 *
 * Podporované tvary JSON vstupu:
 * - pole objektů: [ { ... }, { ... } ]
 * - objekt s vlastností rows: { "rows": [ { ... } ] }
 * - jeden samostatný objekt: { ... }
 *
 * @param {Buffer} buffer - Binární obsah JSON souboru z multer uploadu.
 * @returns {object} Informace o JSON souboru, řádky a metadata sloupců.
 */
function parseJsonFile(buffer) {
  // JSON se typicky očekává jako UTF-8, ale funkce toleruje i další kódování.
  const { text, encoding } = decodeText(buffer, ["utf-8", "utf-16le", "windows-1250"]);

  const parsed = JSON.parse(text);

  let rows;

  // Pokud je JSON přímo pole, bere se jako seznam řádků.
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (Array.isArray(parsed.rows)) {
    // Pokud má objekt vlastnost rows, použije se její obsah.
    rows = parsed.rows;
  } else {
    // Samostatný objekt se zabalí jako jeden řádek.
    rows = [parsed];
  }

  const { rows: normalizedRows, columns } = normalizeRowsWithColumns(rows);

  return {
    type: "json",
    encoding,
    rows: normalizedRows,
    columns
  };
}

// ------------------------------------------------------------
// PARSOVÁNÍ EXCEL
// ------------------------------------------------------------

/**
 * Načte a znormalizuje Excel soubor XLSX nebo XLS.
 *
 * Pokud není zadaný konkrétní list, použije se první list v sešitu.
 * Hodnoty v prázdných buňkách se zachovají jako null.
 *
 * @param {Buffer} buffer - Binární obsah Excel souboru z multer uploadu.
 * @param {string} [sheetName] - Volitelný název listu, který se má načíst.
 * @returns {object} Informace o Excel souboru, řádky a metadata sloupců.
 */
function parseExcelFile(buffer, sheetName) {
  // XLSX knihovna načte celý sešit z bufferu.
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Pokud uživatel nezadal konkrétní list, bere se první dostupný list.
  const selectedSheetName = sheetName || workbook.SheetNames[0];

  if (!selectedSheetName || !workbook.Sheets[selectedSheetName]) {
    throw new Error(`List "${selectedSheetName}" neexistuje.`);
  }

  const sheet = workbook.Sheets[selectedSheetName];

  // sheet_to_json převede list na pole objektů, kde klíče odpovídají hlavičkám.
  // defval: null zajistí, že prázdné buňky nezmizí úplně.
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null
  });

  const { rows: normalizedRows, columns } = normalizeRowsWithColumns(rows);

  return {
    type: "xlsx",
    sheetName: selectedSheetName,
    rows: normalizedRows,
    columns
  };
}

// ------------------------------------------------------------
// HLAVNÍ FUNKCE
// ------------------------------------------------------------

/**
 * Hlavní veřejná funkce modulu pro načtení tabulkového souboru.
 *
 * Funkce očekává objekt souboru z multeru, tedy objekt s originalname
 * a buffer. Podle přípony rozhodne, který parser použít. Výstup je vždy
 * sjednocený, aby s ním frontend a PDF generátor mohly pracovat stejně
 * bez ohledu na původní formát souboru.
 *
 * @param {object} file - Soubor z multer uploadu.
 * @param {string} file.originalname - Původní název nahraného souboru.
 * @param {Buffer} file.buffer - Binární obsah nahraného souboru.
 * @param {object} [options] - Volitelné nastavení načítání.
 * @param {string} [options.sheetName] - Název listu pro Excel soubory.
 * @returns {Promise<object>} Normalizovaná data a metadata sloupců.
 */
export async function readTabularFile(file, options = {}) {
  // Základní validace objektu souboru. Bez názvu nebo bufferu nelze určit
  // formát ani načíst obsah.
  if (!file || !file.originalname || !file.buffer) {
    throw new Error("Nebyl předán validní soubor.");
  }

  // Přípona určuje, jaký parser se použije.
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === ".csv") {
    return parseCsvFile(file.buffer);
  }

  if (ext === ".json") {
    return parseJsonFile(file.buffer);
  }

  if (ext === ".xlsx" || ext === ".xls") {
    return parseExcelFile(file.buffer, options.sheetName);
  }

  throw new Error(`Nepodporovaný formát souboru: ${ext}`);
}
