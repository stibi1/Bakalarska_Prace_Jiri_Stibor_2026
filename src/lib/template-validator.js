// ------------------------------------------------------------
// VALIDÁTOR PDF ŠABLONY
// ------------------------------------------------------------
// Tento modul kontroluje, jestli JSON šablona odpovídá očekávané
// struktuře aplikace. Validace se používá před generováním PDF,
// aby se odchytily neplatné typy prvků, chybějící rozměry,
// špatné barvy nebo nepodporované nastavení stránky.
//
// Modul pouze kontroluje strukturu a typy hodnot. Šablonu nijak
// neupravuje ani nedoplňuje výchozí hodnoty. To řeší až další části
// aplikace při vykreslování PDF.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// Seznam podporovaných hodnot se bere ze společného schématu šablony,
// aby validátor používal stejné typy a hodnoty jako zbytek aplikace.
import {
  SUPPORTED_PAGE_SIZES,
  SUPPORTED_ORIENTATIONS,
  SUPPORTED_ELEMENT_TYPES
} from "./template-schema.js";

// ------------------------------------------------------------
// POMOCNÉ FUNKCE
// ------------------------------------------------------------

/**
 * Ověří, jestli je hodnota platné konečné číslo.
 *
 * Používá se pro souřadnice, rozměry, velikost písma a tloušťku čáry.
 * Nestačí pouze typeof number, protože hodnota může být například NaN
 * nebo Infinity, což by při vykreslování PDF způsobovalo chyby.
 */
function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Ověří, jestli je hodnota textový řetězec.
 *
 * Používá se například pro text elementu, názvy souborů obrázků
 * a relativní cesty k obrázkům.
 */
function isString(value) {
  return typeof value === "string";
}

/**
 * Ověří barvu ve formátu #RRGGBB.
 *
 * Hodnota null je povolená, protože se používá například u výplně
 * obdélníku, pokud má být prvek bez výplně.
 */
function isColor(value) {
  if (value === null) return true;
  if (!isString(value)) return false;
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

// ------------------------------------------------------------
// VALIDACE TEXT ELEMENTU
// ------------------------------------------------------------

/**
 * Zkontroluje textový prvek šablony.
 *
 * Textový prvek musí mít pozici, rozměry a vlastní text. Ve stylu se
 * kontrolují jen hodnoty, které jsou skutečně zadané. Pokud některá
 * stylová hodnota chybí, aplikace později použije výchozí styl.
 */
function validateTextElement(element, errors, index) {
  // Základní geometrie textového boxu v PDF bodech.
  if (!isNumber(element.x)) errors.push(`elements[${index}].x musí být číslo.`);
  if (!isNumber(element.y)) errors.push(`elements[${index}].y musí být číslo.`);
  if (!isNumber(element.w)) errors.push(`elements[${index}].w musí být číslo.`);
  if (!isNumber(element.h)) errors.push(`elements[${index}].h musí být číslo.`);

  // Text může obsahovat i placeholdery ve tvaru {{col_0}}.
  if (!isString(element.text)) errors.push(`elements[${index}].text musí být string.`);

  // Style je volitelný objekt. Pokud není uveden, kontroluje se prázdný objekt.
  const style = element.style ?? {};

  // Velikost písma musí být číslo, pokud je ve stylu explicitně zadaná.
  if (style.fontSize !== undefined && !isNumber(style.fontSize)) {
    errors.push(`elements[${index}].style.fontSize musí být číslo.`);
  }

  // Barva textu musí být v hex formátu #RRGGBB.
  if (style.color !== undefined && !isColor(style.color)) {
    errors.push(`elements[${index}].style.color musí být barva ve formátu #RRGGBB.`);
  }
}

// ------------------------------------------------------------
// VALIDACE RECT ELEMENTU
// ------------------------------------------------------------

/**
 * Zkontroluje obdélníkový prvek šablony.
 *
 * Obdélník používá pozici x/y, rozměry w/h a volitelný styl pro obrys,
 * výplň a tloušťku čáry.
 */
function validateRectElement(element, errors, index) {
  // Základní geometrie obdélníku.
  if (!isNumber(element.x)) errors.push(`elements[${index}].x musí být číslo.`);
  if (!isNumber(element.y)) errors.push(`elements[${index}].y musí být číslo.`);
  if (!isNumber(element.w)) errors.push(`elements[${index}].w musí být číslo.`);
  if (!isNumber(element.h)) errors.push(`elements[${index}].h musí být číslo.`);

  // Style je volitelný. Chybějící hodnoty doplní renderer výchozími styly.
  const style = element.style ?? {};

  // Barva obrysu musí být null nebo hex barva #RRGGBB.
  if (style.strokeColor !== undefined && !isColor(style.strokeColor)) {
    errors.push(`elements[${index}].style.strokeColor musí být barva ve formátu #RRGGBB.`);
  }

  // Výplň může být null, pokud má být obdélník bez výplně.
  if (style.fillColor !== undefined && !isColor(style.fillColor)) {
    errors.push(`elements[${index}].style.fillColor musí být null nebo #RRGGBB.`);
  }

  // Tloušťka obrysu musí být číslo, pokud je explicitně zadaná.
  if (style.strokeWidth !== undefined && !isNumber(style.strokeWidth)) {
    errors.push(`elements[${index}].style.strokeWidth musí být číslo.`);
  }
}

// ------------------------------------------------------------
// VALIDACE LINE ELEMENTU
// ------------------------------------------------------------

/**
 * Zkontroluje čárový prvek šablony.
 *
 * Čára se nepopisuje pomocí x/y/w/h, ale pomocí počátečního a koncového
 * bodu: x1/y1 a x2/y2.
 */
function validateLineElement(element, errors, index) {
  // Souřadnice počátečního a koncového bodu čáry.
  if (!isNumber(element.x1)) errors.push(`elements[${index}].x1 musí být číslo.`);
  if (!isNumber(element.y1)) errors.push(`elements[${index}].y1 musí být číslo.`);
  if (!isNumber(element.x2)) errors.push(`elements[${index}].x2 musí být číslo.`);
  if (!isNumber(element.y2)) errors.push(`elements[${index}].y2 musí být číslo.`);

  // Style je volitelný. Používá se hlavně pro barvu a sílu čáry.
  const style = element.style ?? {};

  // Barva čáry musí být v hex formátu #RRGGBB, pokud je zadaná.
  if (style.strokeColor !== undefined && !isColor(style.strokeColor)) {
    errors.push(`elements[${index}].style.strokeColor musí být barva ve formátu #RRGGBB.`);
  }

  // Tloušťka čáry musí být číslo, pokud je explicitně zadaná.
  if (style.strokeWidth !== undefined && !isNumber(style.strokeWidth)) {
    errors.push(`elements[${index}].style.strokeWidth musí být číslo.`);
  }
}

// ------------------------------------------------------------
// VALIDACE IMAGE ELEMENTU
// ------------------------------------------------------------

/**
 * Zkontroluje obrázkový prvek šablony.
 *
 * Obrázek má pozici a rozměry stejně jako text nebo obdélník. Navíc musí
 * obsahovat objekt source, ve kterém je uložený název souboru a případně
 * relativní cesta k obrázku.
 */
function validateImageElement(element, errors, index) {
  // Umístění a velikost obrázku ve výsledném PDF.
  if (!isNumber(element.x)) errors.push(`elements[${index}].x musí být číslo.`);
  if (!isNumber(element.y)) errors.push(`elements[${index}].y musí být číslo.`);
  if (!isNumber(element.w)) errors.push(`elements[${index}].w musí být číslo.`);
  if (!isNumber(element.h)) errors.push(`elements[${index}].h musí být číslo.`);

  // Obrázkový prvek musí mít source objekt. Bez něj renderer neví,
  // který obrázek má do PDF vložit.
  if (!element.source || typeof element.source !== "object") {
    errors.push(`elements[${index}].source musí být objekt.`);
    return;
  }

  // fileName je hlavní identifikátor souboru obrázku.
  if (!isString(element.source.fileName)) {
    errors.push(`elements[${index}].source.fileName musí být string.`);
  }

  // relativePath je volitelná. Může být undefined nebo null.
  // Pokud ale existuje jako reálná hodnota, musí jít o string.
  if (
    element.source.relativePath !== undefined &&
    element.source.relativePath !== null &&
    !isString(element.source.relativePath)
  ) {
    errors.push(`elements[${index}].source.relativePath musí být string.`);
  }
}

// ------------------------------------------------------------
// HLAVNÍ VALIDACE
// ------------------------------------------------------------

/**
 * Zvaliduje celou JSON šablonu.
 *
 * Funkce vrací objekt ve tvaru:
 * {
 *   valid: boolean,
 *   errors: string[]
 * }
 *
 * Pokud template vůbec není objekt, vyhodí se chyba. Běžné chyby uvnitř
 * šablony se ale sbírají do pole errors, aby uživatel dostal najednou
 * seznam všech problémů.
 */
export function validateTemplate(template) {
  // Seznam všech nalezených validačních chyb.
  const errors = [];

  // Základní kontrola, že vstup je objekt.
  // Bez toho by nešlo bezpečně kontrolovat vlastnosti template.page
  // a template.elements.
  if (!template || typeof template !== "object") {
    throw new Error("Template musí být objekt.");
  }

  // Kontrola nastavení stránky.
  // page určuje velikost a orientaci výsledného dokumentu.
  if (!template.page || typeof template.page !== "object") {
    errors.push("Template musí obsahovat page.");
  } else {
    // Velikost stránky musí být jedna z hodnot definovaných ve schématu.
    if (!SUPPORTED_PAGE_SIZES.includes(template.page.size)) {
      errors.push(`Nepodporovaný page.size. Povolené: ${SUPPORTED_PAGE_SIZES.join(", ")}`);
    }

    // Orientace musí být portrait nebo landscape podle schématu.
    if (!SUPPORTED_ORIENTATIONS.includes(template.page.orientation)) {
      errors.push(`Nepodporovaný page.orientation. Povolené: ${SUPPORTED_ORIENTATIONS.join(", ")}`);
    }
  }

  // elements musí být pole prvků, které se budou vykreslovat do PDF.
  if (!Array.isArray(template.elements)) {
    errors.push("Template musí obsahovat pole elements.");
  } else {
    // Každý prvek se kontroluje samostatně podle svého typu.
    template.elements.forEach((element, index) => {
      // Prvek musí být objekt. Pokud není, nemá smysl pokračovat
      // kontrolou jeho typu ani dalších vlastností.
      if (!element || typeof element !== "object") {
        errors.push(`elements[${index}] musí být objekt.`);
        return;
      }

      // Typ prvku musí být jeden z podporovaných typů: text, rect, line, image.
      if (!SUPPORTED_ELEMENT_TYPES.includes(element.type)) {
        errors.push(`elements[${index}].type není podporovaný.`);
        return;
      }

      // Podle typu prvku se zavolá specializovaná validační funkce.
      switch (element.type) {
        case "text":
          validateTextElement(element, errors, index);
          break;

        case "rect":
          validateRectElement(element, errors, index);
          break;

        case "line":
          validateLineElement(element, errors, index);
          break;

        case "image":
          validateImageElement(element, errors, index);
          break;
      }
    });
  }

  // Výsledek validace. valid je true pouze tehdy, když nebyla nalezena
  // žádná chyba.
  return {
    valid: errors.length === 0,
    errors
  };
}
