// ------------------------------------------------------------
// API ROUTER APLIKACE
// ------------------------------------------------------------
// Tento soubor definuje serverové API endpointy aplikace.
// Frontend z public/app.js na tyto endpointy posílá data, šablony,
// obrázky a nastavení e-mailů.
//
// Router zajišťuje hlavně:
// - načítání tabulkových dat,
// - validaci PDF šablony,
// - generování PDF,
// - generování ZIP archivu,
// - hromadné odesílání PDF e-mailem přes Microsoft Graph.
//
// Soubor by neměl obsahovat samotnou logiku vykreslování PDF.
// Tu řeší knihovní část v src/lib/. Tento router pouze přijme request,
// připraví vstupní data a zavolá příslušné funkce.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// Express se zde používá pro vytvoření routeru s API endpointy.
import express from "express";

// Multer zpracovává multipart/form-data requesty.
// To je potřeba pro upload datových souborů, JSON šablon a obrázků.
import multer from "multer";

// Funkce pro načtení CSV, JSON, XLSX a XLS souborů.
// Vrací normalizovaná data ve formátu řádků a sloupců.
import { readTabularFile } from "../lib/reader.js";

// Funkce pro kontrolu, jestli má šablona správnou strukturu.
import { validateTemplate } from "../lib/template-validator.js";

// Hlavní veřejné funkce knihovní části aplikace.
// Přes src/lib/index.js se exportují služby pro PDF, ZIP a e-mail.
import {
  generatePdfFromTemplate,
  generateSinglePdfFromRow,
  generateZipFromTemplate,
  getEntraAccessToken,
  sendMailWithPdf
} from "../lib/index.js";

// ------------------------------------------------------------
// POMOCNÉ FUNKCE PRO E-MAILY A NÁZVY SOUBORŮ
// ------------------------------------------------------------

/**
 * Nahradí placeholdery v textu hodnotami z jednoho datového řádku.
 *
 * Příklad:
 * text: "Faktura č. {{col_0}}"
 * row:  { col_0: "2025001" }
 * výsledek: "Faktura č. 2025001"
 *
 * Funkce se používá hlavně pro předmět e-mailu, tělo e-mailu
 * a názvy generovaných PDF souborů.
 *
 * @param {string} text Text obsahující placeholdery ve tvaru {{col_0}}.
 * @param {object} row Jeden řádek dat načtený z CSV/JSON/XLSX.
 * @returns {string} Text s nahrazenými placeholdery.
 */
function resolvePlaceholders(text, row) {
  // Pokud vstup není text, vrátí se prázdný řetězec.
  // Díky tomu se zbytek kódu nerozbije na null/undefined hodnotách.
  if (typeof text !== "string") {
    return "";
  }

  // Regulární výraz hledá placeholdery typu {{col_0}}, {{ col_0 }},
  // případně obecnější klíče obsahující písmena, čísla, podtržítko,
  // tečku, dolar nebo pomlčku.
  return text.replace(/\{\{\s*([a-zA-Z0-9_.$-]+)\s*\}\}/g, (_, key) => {
    const value = row?.[key];

    // Chybějící hodnota se nahradí prázdným textem.
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * Vyčistí název souboru tak, aby neobsahoval znaky problematické
 * pro souborové systémy a ZIP archiv.
 *
 * Nahrazuje například lomítka, uvozovky, dvojtečky nebo řídicí znaky.
 * Pokud po vyčištění nezůstane žádný text, použije se název "document".
 *
 * @param {string} name Původní název souboru.
 * @returns {string} Bezpečný název souboru bez přípony.
 */
function sanitizeFileName(name) {
  const safe = String(name ?? "")
    // Znaky zakázané nebo problematické v názvech souborů se nahradí podtržítkem.
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    // Více mezer za sebou se zjednoduší na jednu mezeru.
    .replace(/\s+/g, " ")
    // Odstranění mezer na začátku a konci.
    .trim();

  return safe || "document";
}

// ------------------------------------------------------------
// ROUTER
// ------------------------------------------------------------

// Samostatný Express router, který se v server.js připojuje pod /api.
const router = express.Router();

// Multer ukládá uploadované soubory pouze do paměti serveru.
// To znamená, že se soubory neukládají na disk, ale jsou dostupné
// jako Buffer v req.file nebo req.files.
//
// Limit 20 MB chrání server před příliš velkými uploady.
// Pokud bude potřeba nahrávat větší vstupy, mění se právě fileSize.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

// ------------------------------------------------------------
// UPLOAD DATOVÉHO SOUBORU
// ------------------------------------------------------------

/**
 * POST /api/upload-data
 *
 * Načte jeden datový soubor z formulářového pole "file".
 * Podporované formáty řeší readTabularFile(): CSV, JSON, XLSX a XLS.
 *
 * Endpoint vrací JSON s normalizovanými řádky, metadaty a seznamem sloupců.
 * Frontend tato data používá pro tabulkový náhled a pro vkládání placeholderů.
 */
router.post("/upload-data", upload.single("file"), async (req, res) => {
  try {
    // readTabularFile zpracuje soubor z multeru a vrátí jednotný datový formát.
    const result = await readTabularFile(req.file);

    res.json({
      ok: true,
      fileName: req.file.originalname,
      type: result.type,
      encoding: result.encoding ?? null,
      delimiter: result.delimiter ?? null,
      sheetName: result.sheetName ?? null,
      rows: result.rows.length,
      data: result.rows,
      columns: result.columns ?? []
    });
  } catch (err) {
    // Chyby při čtení vstupního souboru jsou obvykle chyby uživatelského vstupu,
    // proto se vrací HTTP 400.
    res.status(400).json({
      ok: false,
      error: err.message
    });
  }
});

// ------------------------------------------------------------
// VALIDACE TEMPLATY
// ------------------------------------------------------------

/**
 * POST /api/validate-template
 *
 * Ověří JSON šablonu poslanou v request body.
 * Vrací informaci, jestli je šablona validní, a seznam nalezených chyb.
 */
router.post("/validate-template", (req, res) => {
  try {
    // Šablona se posílá jako JSON v těle requestu.
    const template = req.body;

    // validateTemplate kontroluje strukturu dokumentu a jednotlivé elementy.
    const result = validateTemplate(template);

    res.json({
      ok: true,
      valid: result.valid,
      errors: result.errors
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err.message
    });
  }
});

// ------------------------------------------------------------
// GENEROVÁNÍ PDF
// ------------------------------------------------------------
// Endpointy níže očekávají multipart/form-data.
// Typicky se posílá:
// - templateFile: JSON soubor se šablonou,
// - dataFile: CSV/JSON/XLSX/XLS soubor s daty,
// - image_logo, image_fotka, ... obrázky podle imageKey/source v šabloně.
// ------------------------------------------------------------

/**
 * POST /api/generate-pdf
 *
 * Vygeneruje PDF z celé šablony a datového souboru.
 * Výsledkem je jeden PDF soubor vrácený přímo v odpovědi.
 *
 * Pokud datový soubor obsahuje více řádků, knihovní vrstva rozhoduje,
 * jestli vznikne vícestránkové PDF.
 */
router.post(
  "/generate-pdf",
  upload.any(),
  async (req, res) => {
    try {
      // Všechny uploadované soubory z multipart requestu.
      const files = req.files ?? [];

      // Z uploadů se vybere JSON šablona a datový soubor.
      const templateFile = files.find(file => file.fieldname === "templateFile");
      const dataFile = files.find(file => file.fieldname === "dataFile");

      if (!templateFile) {
        throw new Error("Chybí templateFile.");
      }

      if (!dataFile) {
        throw new Error("Chybí dataFile.");
      }

      // Šablona je poslaná jako JSON soubor, proto se Buffer převede na text
      // a následně se rozparsuje přes JSON.parse.
      const templateText = templateFile.buffer.toString("utf-8");
      const template = JSON.parse(templateText);

      // Datový soubor se načte přes společnou čtecí funkci.
      const dataResult = await readTabularFile(dataFile);

      // Obrázky se posílají jako pole typu image_nazev.
      // Prefix image_ se níže odstraní a zůstane pouze klíč obrázku.
      const imageFiles = files.filter(file => file.fieldname.startsWith("image_"));

      // Pomocný výpis do konzole pro ladění, jestli server obrázky opravdu přijal.
      console.log(
        "IMAGE FILES RECEIVED:",
        imageFiles.map(file => ({
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }))
      );

      // Převod uploadovaných obrázků do mapy podle imageKey.
      // Výsledný objekt má podobu:
      // {
      //   logo: { fileName, mimeType, buffer },
      //   podpis: { fileName, mimeType, buffer }
      // }
      const images = {};
      for (const file of imageFiles) {
        const fileName = file.fieldname.replace(/^image_/, "");
        images[fileName] = {
          fileName: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer
        };
      }

      // Další ladicí výpis shrnuje vstup pro generování PDF.
      // Hodí se při řešení problémů s chybějícími obrázky nebo prvky šablony.
      console.log("IMAGE MAP KEYS:", Object.keys(images));
      console.log("GENERATE PDF INPUT:", {
        elementCount: template.elements?.length,
        rowCount: dataResult.rows?.length,
        imageKeys: Object.keys(images),
        imageElements: (template.elements ?? [])
          .filter(el => el.type === "image")
          .map(el => ({
            id: el.id,
            source: el.source ?? null
          }))
      });

      // Vlastní generování PDF probíhá v knihovní vrstvě.
      const pdfBytes = await generatePdfFromTemplate({
        template,
        rows: dataResult.rows,
        images
      });

      // Odpověď se vrací jako PDF soubor ke stažení.
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=\"output.pdf\"");
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      console.error("GENERATE PDF ERROR:", err);

      // Chyba se převádí na čitelný text, aby ji frontend mohl zobrazit uživateli.
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);

      res.status(400).json({
        ok: false,
        error: errorMessage || "Neznámá chyba při generování PDF."
      });
    }
  }
);

/**
 * POST /api/generate-pdf-zip
 *
 * Vygeneruje ZIP archiv, kde každý řádek dat vytvoří samostatný PDF soubor.
 * Název souborů se řídí hodnotou fileNamePattern z request body.
 */
router.post(
  "/generate-pdf-zip",
  upload.any(),
  async (req, res) => {
    try {
      const files = req.files ?? [];

      // Povinné soubory: JSON šablona a datový soubor.
      const templateFile = files.find(file => file.fieldname === "templateFile");
      const dataFile = files.find(file => file.fieldname === "dataFile");

      if (!templateFile) {
        throw new Error("Chybí templateFile.");
      }

      if (!dataFile) {
        throw new Error("Chybí dataFile.");
      }

      // Načtení šablony z uploadovaného JSON souboru.
      const templateText = templateFile.buffer.toString("utf-8");
      const template = JSON.parse(templateText);

      // Načtení tabulkových dat.
      const dataResult = await readTabularFile(dataFile);

      // Převod uploadovaných obrázků na mapu podle imageKey.
      const imageFiles = files.filter(file => file.fieldname.startsWith("image_"));

      const images = {};
      for (const file of imageFiles) {
        const fileName = file.fieldname.replace(/^image_/, "");
        images[fileName] = {
          fileName: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer
        };
      }

      // Vzor názvu souboru v ZIP archivu.
      // Může obsahovat placeholdery, například "Faktura č {{col_0}}".
      const fileNamePattern = req.body.fileNamePattern || "document";

      // Knihovní vrstva vytvoří ZIP s PDF soubory.
      const zipBytes = await generateZipFromTemplate({
        template,
        rows: dataResult.rows,
        images,
        fileNamePattern
      });

      // Odpověď se vrací jako ZIP archiv.
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=\"documents.zip\"");
      res.send(Buffer.from(zipBytes));
    } catch (err) {
      console.error("GENERATE ZIP ERROR:", err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);

      res.status(400).json({
        ok: false,
        error: errorMessage || "Neznámá chyba při generování ZIP."
      });
    }
  }
);

/**
 * POST /api/send-mails
 *
 * Hromadně vygeneruje PDF pro jednotlivé řádky dat a odešle je e-mailem.
 *
 * Request očekává:
 * - templateFile: JSON šablona,
 * - dataFile: datový soubor,
 * - image_*: volitelné obrázky,
 * - senderEmail: adresa odesílatele,
 * - subjectTemplate: předmět e-mailu, může obsahovat placeholdery,
 * - bodyTemplate: text e-mailu, může obsahovat placeholdery,
 * - fileNamePattern: vzor názvu přílohy,
 * - recipientColumnKey: sloupec s e-mailovou adresou příjemce.
 *
 * Endpoint se snaží odeslat e-mail pro každý řádek samostatně.
 * Pokud jeden řádek selže, ostatní řádky pokračují dál.
 */
router.post(
  "/send-mails",
  upload.any(),
  async (req, res) => {
    try {
      const files = req.files ?? [];

      // Vyhledání povinné šablony a datového souboru mezi uploady.
      const templateFile = files.find(file => file.fieldname === "templateFile");
      const dataFile = files.find(file => file.fieldname === "dataFile");

      if (!templateFile) {
        throw new Error("Chybí templateFile.");
      }

      if (!dataFile) {
        throw new Error("Chybí dataFile.");
      }

      // Nastavení e-mailového odesílání z request body.
      // Hodnoty se ořezávají přes trim, aby mezera na začátku/konci
      // nezpůsobila nečekanou chybu.
      const senderEmail = String(req.body.senderEmail ?? "").trim();
      const subjectTemplate = String(req.body.subjectTemplate ?? "").trim();
      const bodyTemplate = String(req.body.bodyTemplate ?? "").trim();
      const fileNamePattern = String(req.body.fileNamePattern ?? "document").trim();

      // Sloupec, ze kterého se bere e-mail příjemce.
      // Výchozí hodnota col_9 odpovídá aktuálnímu nastavení frontendu.
      const recipientColumnKey = String(req.body.recipientColumnKey ?? "col_9").trim();

      if (!senderEmail) {
        throw new Error("Chybí senderEmail.");
      }

      if (!subjectTemplate) {
        throw new Error("Chybí subjectTemplate.");
      }

      if (!bodyTemplate) {
        throw new Error("Chybí bodyTemplate.");
      }

      if (!recipientColumnKey) {
        throw new Error("Chybí recipientColumnKey.");
      }

      // Načtení a rozparsování JSON šablony.
      const templateText = templateFile.buffer.toString("utf-8");
      const template = JSON.parse(templateText);

      // Načtení tabulkových dat.
      const dataResult = await readTabularFile(dataFile);

      // Převod uploadovaných obrázků do mapy podle imageKey.
      const imageFiles = files.filter(file => file.fieldname.startsWith("image_"));

      const images = {};
      for (const file of imageFiles) {
        const fileName = file.fieldname.replace(/^image_/, "");
        images[fileName] = {
          fileName: file.originalname,
          mimeType: file.mimetype,
          buffer: file.buffer
        };
      }

      // Access token se získá jednou před celou dávkou e-mailů.
      // Následně se používá pro jednotlivé sendMail požadavky.
      const accessToken = await getEntraAccessToken();

      // Pole výsledků obsahuje stav pro každý řádek dat.
      const results = [];

      // Každý řádek dat se zpracuje samostatně.
      // Díky tomu chyba u jednoho příjemce nezastaví celou dávku.
      for (let index = 0; index < dataResult.rows.length; index++) {
        const row = dataResult.rows[index];

        // E-mail příjemce se bere z nakonfigurovaného sloupce.
        const recipientEmail = String(row?.[recipientColumnKey] ?? "").trim();

        // Předmět, tělo a název přílohy mohou používat placeholdery z dat.
        const resolvedSubject = resolvePlaceholders(subjectTemplate, row);
        const resolvedBody = resolvePlaceholders(bodyTemplate, row);
        const resolvedFileName = `${sanitizeFileName(resolvePlaceholders(fileNamePattern, row))}.pdf`;

        // Pokud řádek nemá e-mail, uloží se chyba a pokračuje se dalším řádkem.
        if (!recipientEmail) {
          results.push({
            ok: false,
            rowIndex: index,
            recipientEmail: "",
            fileName: resolvedFileName,
            error: `Chybí e-mail ve sloupci ${recipientColumnKey}.`
          });
          continue;
        }

        try {
          // Pro aktuální řádek se nejdříve vygeneruje samostatné PDF.
          const pdfBytes = await generateSinglePdfFromRow({
            template,
            row,
            images
          });

          // Vygenerované PDF se odešle jako příloha přes Microsoft Graph.
          await sendMailWithPdf({
            accessToken,
            senderEmail,
            recipientEmail,
            subject: resolvedSubject,
            message: resolvedBody,
            pdfBytes,
            fileName: resolvedFileName
          });

          // Úspěšný výsledek pro aktuální řádek.
          results.push({
            ok: true,
            rowIndex: index,
            recipientEmail,
            fileName: resolvedFileName
          });
        } catch (err) {
          // Chyba při generování nebo odesílání jednoho e-mailu se uloží
          // do výsledků, ale nezastaví celý cyklus.
          results.push({
            ok: false,
            rowIndex: index,
            recipientEmail,
            fileName: resolvedFileName,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      // Celkové shrnutí dávky pro frontend.
      res.json({
        ok: true,
        total: results.length,
        successCount: results.filter(item => item.ok).length,
        failCount: results.filter(item => !item.ok).length,
        results
      });
    } catch (err) {
      console.error("SEND MAILS ERROR:", err);

      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
);

// Router se exportuje jako default a v server.js se připojuje pod /api.
export default router;
