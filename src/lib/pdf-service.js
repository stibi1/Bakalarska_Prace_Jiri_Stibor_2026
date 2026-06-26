// ------------------------------------------------------------
// PDF SERVICE
// ------------------------------------------------------------
// Tento modul tvoří vyšší vrstvu nad samotným PDF rendererem.
// Neřeší už konkrétní kreslení textu, čar, obdélníků nebo obrázků,
// ale skládá dohromady celý proces generování PDF dokumentů.
//
// Používá se hlavně z API routeru. Router předá šablonu, data a obrázky,
// tento modul šablonu zvaliduje, vytvoří PDF dokument, připraví fonty
// a zavolá renderer pro každý řádek dat.
//
// Modul umí vytvořit:
// - jedno PDF z jednoho řádku dat,
// - jedno vícestránkové PDF z více řádků dat,
// - ZIP archiv, kde každý řádek dat vytvoří samostatný PDF soubor.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// JSZip slouží k vytvoření ZIP archivu v paměti.
// V této aplikaci se používá při exportu „1 řádek dat = 1 PDF soubor“.
import JSZip from "jszip";

// PDFDocument je hlavní třída z pdf-lib pro vytvoření a uložení PDF dokumentu.
import { PDFDocument } from "pdf-lib";

// Validátor kontroluje, jestli má šablona správnou strukturu
// ještě předtím, než se podle ní začne renderovat PDF.
import { validateTemplate } from "./template-validator.js";

// prepareFonts připraví české fonty pro PDF dokument.
// renderRowToPage vykreslí jeden řádek dat do jedné PDF stránky.
import { prepareFonts, renderRowToPage } from "./pdf-renderer.js";

// ------------------------------------------------------------
// PLACEHOLDERY PRO NÁZVY SOUBORŮ
// ------------------------------------------------------------

/**
 * Nahradí placeholdery v textu hodnotami z datového řádku.
 *
 * Používá se hlavně pro názvy souborů v ZIP exportu.
 * Například vzor „Faktura č {{col_0}}“ se pro řádek s hodnotou
 * row.col_0 = "2025001" převede na „Faktura č 2025001“.
 *
 * @param {string} text Text, který může obsahovat placeholdery ve tvaru {{col_0}}.
 * @param {object} row Jeden datový řádek, například { col_0: "2025001" }.
 * @returns {string} Text s nahrazenými placeholdery.
 */
function resolvePlaceholders(text, row) {
  // Pokud funkce dostane jiný typ než string, vrátí prázdný text.
  // Tím se zabrání chybě při volání replace() nad neplatnou hodnotou.
  if (typeof text !== "string") {
    return "";
  }

  // Regulární výraz hledá placeholdery ve tvaru {{col_0}}, {{ col_0 }} apod.
  // Povolené jsou znaky používané v technických názvech sloupců.
  return text.replace(/\{\{\s*([a-zA-Z0-9_.$-]+)\s*\}\}/g, (_, key) => {
    const value = row?.[key];

    // Pokud hodnota v řádku neexistuje, placeholder se nahradí prázdným textem.
    // Díky tomu se do názvu souboru nedostane text „undefined“ nebo „null“.
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * Vyčistí název souboru tak, aby byl použitelný ve Windows, Linuxu i ZIP archivu.
 *
 * Uživatel může v názvu souboru použít hodnoty z dat. Ty mohou obsahovat znaky,
 * které nejsou vhodné pro název souboru, například lomítko nebo dvojtečku.
 * Tato funkce je nahrazuje podtržítkem a zároveň odstraní přebytečné mezery.
 *
 * @param {string} name Původní název souboru bez přípony .pdf.
 * @returns {string} Bezpečný název souboru bez přípony .pdf.
 */
function sanitizeFileName(name) {
  const safe = String(name ?? "")
    // Znaky zakázané nebo problematické v názvech souborů se nahradí podtržítkem.
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    // Více mezer za sebou se zjednoduší na jednu mezeru.
    .replace(/\s+/g, " ")
    // Odstranění mezer na začátku a na konci názvu.
    .trim();

  // Pokud po vyčištění nezůstane žádný text, použije se výchozí název.
  return safe || "document";
}

// ------------------------------------------------------------
// GENEROVÁNÍ JEDNOHO PDF Z JEDNOHO ŘÁDKU
// ------------------------------------------------------------

/**
 * Vygeneruje jeden PDF dokument z jednoho datového řádku.
 *
 * Tato funkce se používá hlavně při ZIP exportu, kde každý řádek dat
 * vytváří samostatný PDF soubor. Používá se ale i jako obecná pomocná
 * funkce pro případy, kdy je potřeba vytvořit samostatné PDF.
 *
 * @param {object} params Parametry generování.
 * @param {object} params.template JSON šablona dokumentu.
 * @param {object} params.row Jeden datový řádek.
 * @param {object} [params.images={}] Mapa obrázků podle imageKey.
 * @returns {Promise<Uint8Array>} Binární obsah výsledného PDF.
 */
export async function generateSinglePdfFromRow({ template, row, images = {} }) {
  // Před renderem se vždy ověřuje, že šablona má očekávanou strukturu.
  // Chybná šablona by jinak mohla způsobit méně čitelnou chybu až uvnitř rendereru.
  const validation = validateTemplate(template);

  if (!validation.valid) {
    throw new Error(`Template není validní: ${validation.errors.join(" | ")}`);
  }

  // Vytvoření nového prázdného PDF dokumentu.
  const pdfDoc = await PDFDocument.create();

  // Připravení fontů pro tento konkrétní PDF dokument.
  // Fonty jsou navázané na instanci PDFDocument, proto se připravují po jejím vytvoření.
  const fonts = await prepareFonts(pdfDoc);

  // Jeden datový řádek se vykreslí jako jedna stránka PDF dokumentu.
  await renderRowToPage(pdfDoc, template, row, images, fonts);

  // Uložení PDF do binární podoby, kterou může API poslat klientovi
  // nebo vložit jako soubor do ZIP archivu.
  return await pdfDoc.save();
}

// ------------------------------------------------------------
// GENEROVÁNÍ PREVIEW / VÍCESTRÁNKOVÉHO PDF
// ------------------------------------------------------------

/**
 * Vygeneruje jeden PDF dokument z více datových řádků.
 *
 * Každý řádek vstupních dat vytvoří jednu stránku ve stejném PDF souboru.
 * Tato varianta se používá hlavně pro PDF náhled a pro stažení jednoho
 * vícestránkového PDF dokumentu.
 *
 * @param {object} params Parametry generování.
 * @param {object} params.template JSON šablona dokumentu.
 * @param {Array<object>} params.rows Pole datových řádků.
 * @param {object} [params.images={}] Mapa obrázků podle imageKey.
 * @returns {Promise<Uint8Array>} Binární obsah výsledného PDF.
 */
export async function generatePdfFromTemplate({ template, rows, images = {} }) {
  // Validace šablony probíhá před vytvořením PDF, aby se chybné zadání
  // zastavilo co nejdříve a vrátila se srozumitelná chyba.
  const validation = validateTemplate(template);

  if (!validation.valid) {
    throw new Error(`Template není validní: ${validation.errors.join(" | ")}`);
  }

  // rows musí být pole, protože funkce přes něj prochází cyklem
  // a každý záznam převádí na samostatnou stránku.
  if (!Array.isArray(rows)) {
    throw new Error("rows musí být pole.");
  }

  // Vytvoření nového PDF dokumentu, do kterého se budou postupně přidávat stránky.
  const pdfDoc = await PDFDocument.create();

  // Fonty se připraví jednou pro celý dokument a potom se předávají rendereru.
  const fonts = await prepareFonts(pdfDoc);

  // Každý řádek vstupních dat vytvoří jednu novou stránku ve výsledném PDF.
  for (const row of rows) {
    await renderRowToPage(pdfDoc, template, row, images, fonts);
  }

  // Výsledný vícestránkový dokument se vrací jako Uint8Array.
  return await pdfDoc.save();
}

// ------------------------------------------------------------
// GENEROVÁNÍ ZIPU: 1 ŘÁDEK = 1 PDF
// ------------------------------------------------------------

/**
 * Vygeneruje ZIP archiv, ve kterém každý řádek dat tvoří samostatné PDF.
 *
 * Tato funkce je určena pro hromadný export faktur nebo jiných dokumentů,
 * kde uživatel nechce jedno vícestránkové PDF, ale samostatný PDF soubor
 * pro každého příjemce / každý řádek dat.
 *
 * @param {object} params Parametry generování.
 * @param {object} params.template JSON šablona dokumentu.
 * @param {Array<object>} params.rows Pole datových řádků.
 * @param {object} [params.images={}] Mapa obrázků podle imageKey.
 * @param {string} [params.fileNamePattern="document"] Vzor názvu souboru, může obsahovat placeholdery.
 * @returns {Promise<Uint8Array>} Binární obsah výsledného ZIP archivu.
 */
export async function generateZipFromTemplate({
  template,
  rows,
  images = {},
  fileNamePattern = "document"
}) {
  // Stejně jako u ostatních exportů se nejdříve kontroluje šablona.
  const validation = validateTemplate(template);

  if (!validation.valid) {
    throw new Error(`Template není validní: ${validation.errors.join(" | ")}`);
  }

  // ZIP export potřebuje pole řádků, protože z každého řádku vytváří jeden soubor.
  if (!Array.isArray(rows)) {
    throw new Error("rows musí být pole.");
  }

  // Nový ZIP archiv se skládá v paměti.
  const zip = new JSZip();

  // Pro každý řádek dat se vygeneruje jeden samostatný PDF soubor.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Vytvoření jednoho PDF pro aktuální řádek.
    const pdfBytes = await generateSinglePdfFromRow({
      template,
      row,
      images
    });

    // Název souboru může obsahovat placeholdery z aktuálního řádku.
    // Například „Faktura č {{col_0}}“.
    const resolvedName = resolvePlaceholders(fileNamePattern, row);

    // Po nahrazení placeholderů se název ještě vyčistí od zakázaných znaků.
    // Pokud by byl prázdný, použije se document_1, document_2 atd.
    const safeName = sanitizeFileName(resolvedName || `document_${i + 1}`);

    // Přidání PDF souboru do ZIP archivu.
    zip.file(`${safeName}.pdf`, pdfBytes);
  }

  // Výsledný ZIP se vrací jako Uint8Array, aby ho API mohlo poslat klientovi.
  return await zip.generateAsync({ type: "uint8array" });
}
