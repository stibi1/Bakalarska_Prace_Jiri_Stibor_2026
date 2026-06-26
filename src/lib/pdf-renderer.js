// ------------------------------------------------------------
// PDF RENDERER
// ------------------------------------------------------------
// Tento modul převádí jednu datovou řádku a jednu JSON šablonu
// na skutečnou PDF stránku. Řeší hlavně vykreslení textů,
// obdélníků, čar a obrázků do PDF dokumentu pomocí knihovny pdf-lib.
//
// Důležitý rozdíl proti canvas náhledu ve frontendu:
// - frontend kreslí pouze vizuální náhled v prohlížeči,
// - tento soubor vytváří finální PDF soubor na serveru.
//
// Souřadnice v editoru jsou vedené od levého horního rohu stránky.
// PDF ale používá souřadnice od levého dolního rohu. Proto tento modul
// obsahuje převod souřadnic Y.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// Čtení souborů z disku. Používá se hlavně pro načtení fontů.
import fs from "fs/promises";

// Práce s cestami k souborům nezávisle na operačním systému.
import path from "path";

// Pomocná funkce pro získání cesty k aktuálnímu souboru v ES modulech.
import { fileURLToPath } from "url";

// Fontkit umožní knihovně pdf-lib vkládat vlastní TTF fonty.
// Bez toho by byl problém s českou diakritikou.
import fontkit from "@pdf-lib/fontkit";

// Funkce rgb vytváří barvu ve formátu, který očekává pdf-lib.
import { rgb } from "pdf-lib";

// Konstanty popisující velikosti stránek a výchozí styly prvků šablony.
import {
  PAGE_SIZES,
  DEFAULT_LINE_STYLE,
  DEFAULT_SHAPE_STYLE,
  DEFAULT_TEXT_STYLE
} from "./template-schema.js";

// Nahrazuje placeholdery typu {{col_0}} hodnotami z aktuální řádky dat.
import { resolvePlaceholders } from "./placeholder.js";

// Pomocná funkce pro vyhledání obrázku podle klíče. V aktuální podobě
// renderer pracuje primárně s fileName z element.source.
import { getImageByKey } from "./image-registry.js";

// Hypher a česká pravidla dělení slov slouží k dělení dlouhých českých slov.
import Hypher from "hypher";
import hyphenationCs from "hyphenation.cs";

// ------------------------------------------------------------
// KONSTANTY
// ------------------------------------------------------------

// Výchozí horní odsazení textu uvnitř textového elementu.
// Poznámka: konkrétní element si může padding přepsat ve style.
const TEXT_PADDING_TOP = 2;

// Výchozí levé odsazení textu uvnitř textového elementu.
// Poznámka: v aktuálním drawTextElement se přímo používá fallback 2.
const TEXT_PADDING_LEFT = 0;

// Instance českého děliče slov. Používá se při zalamování textu.
const czechHyphenator = new Hypher(hyphenationCs);

// ------------------------------------------------------------
// CESTY
// ------------------------------------------------------------

// Absolutní cesta k tomuto souboru.
const __filename = fileURLToPath(import.meta.url);

// Absolutní cesta ke složce, ve které se tento soubor nachází.
// Používá se pro dohledání src/lib/assets/fonts/.
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------
// BARVY
// ------------------------------------------------------------

/**
 * Převede hex barvu ze šablony na RGB objekt pro pdf-lib.
 *
 * Vstup ze šablony má běžně podobu například "#000000" nebo "#ffffff".
 * pdf-lib ale očekává barvy jako hodnoty 0-1, proto se složky R/G/B
 * převádějí z rozsahu 0-255 na desetinné hodnoty.
 */
function hexToRgb(hex) {
  // Když barva chybí, použije se černá jako bezpečný fallback.
  const safeHex = (hex ?? "#000000").replace("#", "");

  // Jednotlivé dvojice znaků reprezentují červenou, zelenou a modrou složku.
  const r = parseInt(safeHex.slice(0, 2), 16) / 255;
  const g = parseInt(safeHex.slice(2, 4), 16) / 255;
  const b = parseInt(safeHex.slice(4, 6), 16) / 255;

  return rgb(r, g, b);
}

// ------------------------------------------------------------
// SOUŘADNICE
// ------------------------------------------------------------

/**
 * Převede Y souřadnici z editorového systému do PDF systému.
 *
 * Editor i canvas pracují přirozeně od levého horního rohu.
 * PDF stránka ale počítá Y od levého dolního rohu. U prvků s výškou
 * je proto potřeba odečíst i výšku prvku, aby seděla horní hrana.
 */
function topLeftToPdfY(pageHeight, y, elementHeight = 0) {
  return pageHeight - y - elementHeight;
}

// ------------------------------------------------------------
// FONTY
// ------------------------------------------------------------

/**
 * Připraví fonty pro PDF dokument.
 *
 * Funkce registruje fontkit a vloží do PDF české fonty DejaVuSans.
 * To je důležité pro správné zobrazení české diakritiky ve výsledném PDF.
 *
 * Vrací mapu fontů, ze které si renderer později vybírá normální nebo tučný řez.
 */
export async function prepareFonts(pdfDoc) {
  // Bez registrace fontkit neumí pdf-lib správně vkládat vlastní TTF fonty.
  pdfDoc.registerFontkit(fontkit);

  // Cesty k fontům používaným pro finální PDF render na serveru.
  const regularFontPath = path.join(__dirname, "./assets/fonts/DejaVuSans.ttf");
  const boldFontPath = path.join(__dirname, "./assets/fonts/DejaVuSans-Bold.ttf");

  // Načtení binárních dat fontů z disku.
  const regularFontBytes = await fs.readFile(regularFontPath);
  const boldFontBytes = await fs.readFile(boldFontPath);

  // Vložení fontů do PDF. subset: true znamená, že se vloží jen použité znaky,
  // takže výsledné PDF může být menší.
  const regularFont = await pdfDoc.embedFont(regularFontBytes, { subset: true });
  const boldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true });

  // Mapa záměrně obsahuje i názvy Helvetica, aby starší šablony nebo výchozí
  // styl fungovaly, ale ve skutečnosti se použije DejaVuSans s češtinou.
  return {
    Helvetica: regularFont,
    "Helvetica-Bold": boldFont,
    DejaVuSans: regularFont,
    "DejaVuSans-Bold": boldFont
  };
}

// ------------------------------------------------------------
// STRÁNKA
// ------------------------------------------------------------

/**
 * Vrátí rozměry stránky podle nastavení šablony.
 *
 * Šablona obsahuje například page.size = "A4" a orientation = "portrait".
 * Konkrétní rozměry v PDF bodech jsou uložené v PAGE_SIZES.
 */
export function getPageDimensions(template) {
  const size = template.page.size;
  const orientation = template.page.orientation;
  return PAGE_SIZES[size][orientation];
}

// ------------------------------------------------------------
// RENDER TEXTU
// ------------------------------------------------------------

// Skutečná nedělitelná mezera, která se nakonec vykreslí do PDF.
const TYPO_NO_BREAK_SPACE = "\u00A0";

// Dočasná interní značka pro místa, která se při zalamování nesmí rozdělit.
// Používá se místo nedělitelné mezery, aby se s textem lépe pracovalo
// při splitování a měření šířky.
const TYPO_GLUE_MARK = "\uE000";

/**
 * Obnoví interní typografické značky zpět na skutečné nedělitelné mezery.
 */
function restoreTypographySpaces(text) {
  return String(text ?? "").replaceAll(TYPO_GLUE_MARK, TYPO_NO_BREAK_SPACE);
}

/**
 * Aplikuje základní česká typografická pravidla před zalamováním textu.
 *
 * Cílem je zabránit nevhodnému zalomení například po jednopísmenné předložce,
 * mezi číslem a měnou nebo uvnitř PSČ. Místa, která se nemají rozdělit,
 * se označí interní značkou TYPO_GLUE_MARK.
 */
function applyCzechTypographyRules(text) {
  if (typeof text !== "string") {
    return "";
  }

  // Sjednocení konců řádků, aby se dál pracovalo jen s \n.
  let result = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Jednopísmenné předložky a spojky nesmí zůstat na konci řádku.
  result = result.replace(/\b([AaIiKkOoSsUuVvZz])\s+/g, `$1${TYPO_GLUE_MARK}`);

  // Číslo + jednotka / měna držet pohromadě.
  result = result.replace(
    /(\d[\d.,]*)[ \t]+(kč|%|kg|g|mg|t|km|m|cm|mm|l|ml|dl|cl|ks|°c|h|min|s)(?=$|[ \t.,;:!?()])/gi,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // Paragraf a číslo držet pohromadě.
  result = result.replace(
    /§[ \t]+(\d+[a-zA-Z]*)/g,
    `§${TYPO_GLUE_MARK}$1`
  );

  // Zkratky typu odst., písm. a str. držet s následující hodnotou.
  result = result.replace(
    /\b(odst\.|písm\.|str\.)[ \t]+([^\s]+)/gi,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // Zkratku č. držet s následující hodnotou.
  result = result.replace(
    /(^|[\s(])č\.[ \t]+([^\s]+)/gi,
    `$1č.${TYPO_GLUE_MARK}$2`
  );

  // Tituly a běžné zkratky před jménem držet s následujícím slovem.
  result = result.replace(
    /\b(Bc\.|Mgr\.|Ing\.|Mgr\.A\.|JUDr\.|MUDr\.|RNDr\.|PhDr\.|doc\.|prof\.)[ \t]+([^\s]+)/g,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // PSČ držet pohromadě, například 400 01.
  result = result.replace(
    /(\d{3})[ \t]+(\d{2})/g,
    `$1${TYPO_GLUE_MARK}$2`
  );
  
  // Běžné zkratky držet s následujícím slovem.
  result = result.replace(
    /\b(např\.|atd\.|tj\.|tzv\.)[ \t]+([^\s]+)/gi,
    `$1${TYPO_GLUE_MARK}$2`
  );

  return result;
}

/**
 * Rozdělí jedno české slovo na části podle pravidel dělení slov.
 *
 * Některé výrazy se úmyslně nedělí: slepené typografické bloky,
 * výrazy s čísly a krátká slova.
 */
function hyphenateWordForCzech(word) {
  if (!word) {
    return [word];
  }

  // Nehyfenovat slepené typografické bloky a výrazy s čísly.
  if (word.includes(TYPO_GLUE_MARK) || /\d/.test(word)) {
    return [word];
  }

  // Krátká slova nedělit.
  if (word.length < 6) {
    return [word];
  }

  // Hypher vrací pole částí slova, mezi kterými je možné slovo rozdělit.
  const parts = czechHyphenator.hyphenate(word);

  if (!Array.isArray(parts) || parts.length <= 1) {
    return [word];
  }

  return parts;
}

/**
 * Zkusí dlouhé slovo rozdělit na části, které se vejdou do zadané šířky.
 *
 * Funkce používá české dělení slov a přidává pomlčku na místo rozdělení.
 * Aktuálně je povolené nejvýše jedno rozdělení slova, aby výstup nepůsobil
 * typograficky příliš agresivně.
 */
function splitWordToFittingChunks(word, maxWidth, measureFn) {
  const parts = hyphenateWordForCzech(word);

  if (parts.length <= 1) {
    return [word];
  }

  // Výsledné části slova, které se postupně vloží do řádků.
  const chunks = [];

  // Části slova, které ještě nebyly použité.
  let remainingParts = [...parts];

  // Počet provedených rozdělení. Omezuje se na jedno rozdělení.
  let splitCount = 0;

  while (remainingParts.length > 0) {
    if (splitCount >= 1) {
      chunks.push(remainingParts.join(""));
      break;
    }

    // Když už zbývá jen jedna část, přidáme ji bez pomlčky.
    if (remainingParts.length === 1) {
      chunks.push(remainingParts[0]);
      break;
    }

    // Nejlepší dosud nalezená část slova, která se ještě vejde na řádek.
    let bestChunk = null;

    // Počet hyfenačních částí použitých pro bestChunk.
    let bestCount = 0;

    // Zkusíme vzít co nejvíc částí, které se ještě vejdou.
    for (let count = 1; count < remainingParts.length; count++) {
      const candidate = remainingParts.slice(0, count).join("") + "-";

      if (measureFn(restoreTypographySpaces(candidate)) <= maxWidth) {
        bestChunk = candidate;
        bestCount = count;
      } else {
        break;
      }
    }

    // Když se nevejde ani nejmenší dělitelný kus, vezmeme první část + pomlčku.
    if (!bestChunk) {
      bestChunk = remainingParts[0] + "-";
      bestCount = 1;
    }

    chunks.push(bestChunk);
    remainingParts = remainingParts.slice(bestCount);
    splitCount++;
  }

  return chunks;
}

/**
 * Zalomí text podle maximální šířky textového boxu.
 *
 * Nejdříve aplikuje česká typografická pravidla, potom zpracuje text po
 * odstavcích a slovech. Výsledkem je pole řádků připravených k vykreslení.
 */
function wrapTextByWidth(text, maxWidth, measureFn) {
  // Text s aplikovanými českými pravidly pro nedělitelné mezery.
  const safeText = applyCzechTypographyRules(text);

  // Zachování ručně vložených odstavců z textového pole šablony.
  const paragraphs = safeText.split("\n");

  // Výsledné řádky, které se budou kreslit do PDF.
  const lines = [];

  for (const paragraph of paragraphs) {
    // Prázdný odstavec se zachová jako prázdný řádek.
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");

    // Aktuálně skládaný řádek.
    let currentLine = "";

    for (const word of words) {
      // Kandidát je aktuální řádek rozšířený o další slovo.
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const renderedCandidate = restoreTypographySpaces(candidate);

      if (currentLine === "") {
        // Když se samotné slovo vejde, založí nový řádek.
        if (measureFn(restoreTypographySpaces(word)) <= maxWidth) {
          currentLine = word;
          continue;
        }

        // Když je slovo širší než řádek, zkusí se české dělení slov.
        const chunks = splitWordToFittingChunks(word, maxWidth, measureFn);

        if (chunks.length <= 1) {
          currentLine = word;
          continue;
        }

        // Všechny části kromě poslední se rovnou vloží jako hotové řádky.
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const isLast = i === chunks.length - 1;

          if (isLast) {
            currentLine = chunk;
          } else {
            lines.push(restoreTypographySpaces(chunk));
          }
        }

        continue;
      }

      if (measureFn(renderedCandidate) <= maxWidth) {
        // Kandidát se vejde, takže aktuální řádek rozšíříme.
        currentLine = candidate;
      } else {
        // Kandidát se nevejde, aktuální řádek uzavřeme.
        lines.push(restoreTypographySpaces(currentLine));

        if (measureFn(restoreTypographySpaces(word)) <= maxWidth) {
          currentLine = word;
          continue;
        }

        // Pokud se nevejde ani samotné slovo, zkusí se ho rozdělit.
        const chunks = splitWordToFittingChunks(word, maxWidth, measureFn);

        if (chunks.length <= 1) {
          currentLine = word;
          continue;
        }

        currentLine = "";

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const isLast = i === chunks.length - 1;

          if (isLast) {
            currentLine = chunk;
          } else {
            lines.push(restoreTypographySpaces(chunk));
          }
        }
      }
    }

    // Po zpracování odstavce se doplní poslední rozpracovaný řádek.
    if (currentLine) {
      lines.push(restoreTypographySpaces(currentLine));
    }
  }

  return lines;
}

/**
 * Vykreslí textový element do PDF stránky.
 *
 * Text může obsahovat placeholdery, například {{col_0}}, které se před
 * vykreslením nahradí hodnotami z aktuální řádky dat.
 */
function drawTextElement(page, fonts, pageHeight, element, row) {
  // Spojení výchozího stylu s vlastním stylem elementu ze šablony.
  const style = {
    ...DEFAULT_TEXT_STYLE,
    ...(element.style ?? {})
  };

  // Nahrazení placeholderů skutečnými hodnotami z aktuální řádky.
  const text = resolvePlaceholders(element.text, row);

  // Výběr fontu podle stylu. Když požadovaný font není v mapě,
  // použije se DejaVuSans jako bezpečný fallback pro češtinu.
  let font = fonts[style.fontFamily] ?? fonts.DejaVuSans;
  if (style.bold) {
    font = fonts[`${style.fontFamily}-Bold`] ?? fonts["DejaVuSans-Bold"] ?? font;
  }
  
  // Základní vlastnosti textu.
  const fontSize = style.fontSize;
  const color = hexToRgb(style.color);
  
  // Odsazení, výška řádku a zarovnání uvnitř textového boxu.
  const paddingTop = style.paddingTop ?? 2;
  const paddingLeft = style.paddingLeft ?? 2;
  const lineHeightFactor = style.lineHeight ?? 1.2;
  const align = style.align ?? "left";
  
  // X souřadnice začátku textu po započtení levého paddingu.
  const x = element.x + paddingLeft;
  
  // Přepočet horní pozice textového elementu do PDF souřadnic.
  const textTopY = pageHeight - element.y - paddingTop;

  // Baseline prvního řádku. Koeficient 0.98 kompenzuje rozdíl mezi
  // horní hranou boxu a základní linkou písma.
  const firstLineBaselineY = textTopY - fontSize * 0.98;
  
  // Skutečná vzdálenost mezi řádky v PDF.
  const lineHeight = fontSize * lineHeightFactor;

  // Šířka prostoru, do kterého se může text zalamovat.
  const availableWidth = Math.max(1, element.w - paddingLeft * 2);
  
  // Zalamování textu podle šířky boxu. Měření provádí přímo vložený PDF font.
  const lines = wrapTextByWidth(
    text,
    availableWidth,
    candidate => font.widthOfTextAtSize(candidate, fontSize)
  );
  
  // Vykreslení jednotlivých řádků textu.
  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
  
    // Výchozí pozice pro zarovnání vlevo.
    let drawX = x;
  
    // Posun X podle nastaveného zarovnání.
    if (align === "center") {
      drawX = x + (availableWidth - lineWidth) / 2;
    } else if (align === "right") {
      drawX = x + (availableWidth - lineWidth);
    }
  
    page.drawText(line, {
      x: drawX,
      y: firstLineBaselineY - index * lineHeight,
      size: fontSize,
      font,
      color
    });
  });
}

// ------------------------------------------------------------
// RENDER OBDÉLNÍKU
// ------------------------------------------------------------

/**
 * Vykreslí obdélníkový element do PDF stránky.
 *
 * Obdélník může mít okraj, výplň nebo obojí podle stylu v šabloně.
 */
function drawRectElement(page, pageHeight, element) {
  // Spojení výchozího stylu obdélníku s vlastním stylem elementu.
  const style = {
    ...DEFAULT_SHAPE_STYLE,
    ...(element.style ?? {})
  };

  // X se nepřevádí, protože editor i PDF počítají X zleva.
  const x = element.x;

  // Y se převádí z horního souřadnicového systému editoru do PDF.
  const y = topLeftToPdfY(pageHeight, element.y, element.h);

  page.drawRectangle({
    x,
    y,
    width: element.w,
    height: element.h,
    borderColor: hexToRgb(style.strokeColor),
    borderWidth: style.strokeWidth,
    color: style.fillColor ? hexToRgb(style.fillColor) : undefined
  });
}

// ------------------------------------------------------------
// RENDER ČÁRY
// ------------------------------------------------------------

/**
 * Vykreslí čáru do PDF stránky.
 *
 * Čára používá dvě dvojice souřadnic: x1/y1 a x2/y2.
 */
function drawLineElement(page, pageHeight, element) {
  // Spojení výchozího stylu čáry s vlastním stylem elementu.
  const style = {
    ...DEFAULT_LINE_STYLE,
    ...(element.style ?? {})
  };

  page.drawLine({
    start: {
      x: element.x1,
      y: pageHeight - element.y1
    },
    end: {
      x: element.x2,
      y: pageHeight - element.y2
    },
    thickness: style.strokeWidth,
    color: hexToRgb(style.strokeColor)
  });
}

// ------------------------------------------------------------
// RENDER OBRÁZKU
// ------------------------------------------------------------

/**
 * Vykreslí obrázkový element do PDF stránky.
 *
 * Obrázek se do šablony neukládá jako binární data. Šablona si pamatuje
 * název souboru a backend při renderu dostane mapu nahraných obrázků.
 */
async function drawImageElement(pdfDoc, page, pageHeight, element, images) {
  // Název souboru obrázku uložený v element.source.fileName.
  const fileName = element.source?.fileName;

  // Konkrétní obrázek z mapy images. Pokud chybí, element se přeskočí.
  const imageFile = fileName ? images[fileName] ?? null : null;

  // Pomocný log pro ladění problémů s tím, jestli se obrázek našel.
  console.log("RENDER IMAGE:", {
    elementId: element.id,
    fileName,
    found: !!imageFile
  });

  // Když obrázek chybí, PDF se stále vygeneruje, jen bez tohoto obrázku.
  if (!imageFile) {
    return;
  }

  const x = element.x;
  const y = topLeftToPdfY(pageHeight, element.y, element.h);

  // Vložený obrázek ve formátu pdf-lib. Nastaví se podle PNG/JPG detekce.
  let embeddedImage;

  try {
    // Detekce podle binární signatury je spolehlivější než samotný MIME type.
    const detectedFormat = detectImageFormat(imageFile.buffer);

    console.log("EMBED IMAGE:", {
      fileName,
      mimeType: imageFile.mimeType,
      detectedFormat
    });

    if (detectedFormat === "png") {
      embeddedImage = await pdfDoc.embedPng(imageFile.buffer);
    } else if (detectedFormat === "jpg") {
      embeddedImage = await pdfDoc.embedJpg(imageFile.buffer);
    } else {
      // Fallback: když formát nejde bezpečně rozpoznat, zkusí se nejdřív PNG
      // a potom JPG. Pokud selžou obě možnosti, vyhodí se chyba.
      try {
        embeddedImage = await pdfDoc.embedPng(imageFile.buffer);
      } catch {
        embeddedImage = await pdfDoc.embedJpg(imageFile.buffer);
      }
    }
  } catch (err) {
    throw new Error(
      `Nepodařilo se vložit obrázek "${fileName}". ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  page.drawImage(embeddedImage, {
    x,
    y,
    width: element.w,
    height: element.h
  });
}

/**
 * Rozpozná základní formát obrázku podle binární signatury souboru.
 *
 * Podporované jsou PNG a JPEG/JPG, protože pdf-lib je umí přímo vložit.
 */
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (isPng) {
    return "png";
  }

  // JPEG signature: FF D8 FF
  const isJpg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  if (isJpg) {
    return "jpg";
  }

  return null;
}

// ------------------------------------------------------------
// RENDER STRÁNKY
// ------------------------------------------------------------

/**
 * Vyrenderuje jednu datovou řádku do jedné PDF stránky.
 *
 * Funkce projde všechny elementy šablony a podle typu zavolá příslušnou
 * vykreslovací funkci. Výsledkem je nově přidaná stránka v PDF dokumentu.
 */
export async function renderRowToPage(pdfDoc, template, row, images, fonts) {
  // Rozměry stránky podle nastavení šablony.
  const { width, height } = getPageDimensions(template);

  // Vytvoření nové PDF stránky s danými rozměry.
  const page = pdfDoc.addPage([width, height]);

  // Každý element se vykreslí podle svého typu.
  for (const element of template.elements) {
    switch (element.type) {
      case "text":
        drawTextElement(page, fonts, height, element, row);
        break;

      case "rect":
        drawRectElement(page, height, element);
        break;

      case "line":
        drawLineElement(page, height, element);
        break;

      case "image":
        await drawImageElement(pdfDoc, page, height, element, images);
        break;
    }
  }

  return page;
}
