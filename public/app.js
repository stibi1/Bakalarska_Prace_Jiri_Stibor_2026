// ------------------------------------------------------------
// FRONTENDOVÁ LOGIKA PDF TEMPLATE EDITORU
// ------------------------------------------------------------
// Tento soubor řídí uživatelské rozhraní v prohlížeči.
// Spravuje stav šablony, kreslení do canvasu, nahrávání dat,
// práci s obrázky, generování PDF/ZIP a e-mailový dialog.
//
// Soubor běží pouze v prohlížeči. Serverová logika je v src/routes
// a v modulech src/lib.

// ------------------------------------------------------------
// STAV APLIKACE
// ------------------------------------------------------------

const state = {
  // Aktuální PDF šablona, se kterou editor pracuje.
  // Obsahuje nastavení stránky a pole všech prvků na stránce.
  template: createEmptyTemplate("portrait"),

  // ID aktuálně vybraného prvku v canvas editoru.
  // Hodnota null znamená, že není vybraný žádný prvek.
  selectedElementId: null,

  // Načtené řádky z CSV/JSON/XLSX/XLS souboru.
  // Každý objekt odpovídá jednomu řádku dat.
  dataRows: [],

  // Metadata sloupců z načteného datového souboru.
  // Používají se pro hlavičku náhledové tabulky a placeholdery.
  dataColumns: [],

  // Lokálně načtené obrázky podle názvu souboru.
  // Klíčem je název souboru a hodnotou je objekt s File, URL a rozměry.
  imageAssets: {}
};

// ------------------------------------------------------------
// DOM
// ------------------------------------------------------------
// V této části se získávají HTML prvky z public/index.html.
// Pokud se změní id v HTML, musí se změnit i odpovídající konstanta zde.

// Hlavní kreslicí plocha editoru a její 2D kreslicí kontext.
const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

// Základní formulářové prvky pro orientaci stránky, šablonu a data.
const orientationInput = document.getElementById("orientation");
const templateFileInput = document.getElementById("templateFile");
const dataFileInput = document.getElementById("dataFile");

// Skryté inputy pro výběr jednotlivého obrázku nebo celé složky obrázků.
const imagePickerInput = document.getElementById("imagePicker");
const imageFolderPickerInput = document.getElementById("imageFolderPicker");
const btnPickImageFolder = document.getElementById("btnPickImageFolder");

// Formulář pro úpravu aktuálně vybraného prvku šablony.
const elTypeInput = document.getElementById("elType");
const elXInput = document.getElementById("elX");
const elYInput = document.getElementById("elY");
const elWInput = document.getElementById("elW");
const elHInput = document.getElementById("elH");
const elTextInput = document.getElementById("elText");
const elFontSizeInput = document.getElementById("elFontSize");
const elColorInput = document.getElementById("elColor");
const alignButtons = Array.from(document.querySelectorAll(".align-btn"));

// Prvky pro náhled načtených dat, stav generování a PDF preview modal.
const dataMeta = document.getElementById("dataMeta");
const dataError = document.getElementById("dataError");
const previewTable = document.getElementById("previewTable");
const imageInputs = document.getElementById("imageInputs");
const generateStatus = document.getElementById("generateStatus");
const pdfPreviewModal = document.getElementById("pdfPreviewModal");
const pdfPreviewFrame = document.getElementById("pdfPreviewFrame");
const btnClosePdfPreview = document.getElementById("btnClosePdfPreview");
const btnDownloadPreviewPdf = document.getElementById("btnDownloadPreviewPdf");
const btnDownloadZipPdf = document.getElementById("btnDownloadZipPdf");
const fileNamePatternInput = document.getElementById("fileNamePattern");
const btnOpenEmailModal = document.getElementById("btnOpenEmailModal");

// Prvky modalu s uživatelským návodem.
// Modal je pouze informační, nemění žádný stav šablony ani dat.
const helpModal = document.getElementById("helpModal");
const btnOpenHelpModal = document.getElementById("btnOpenHelpModal");
const btnCloseHelpModal = document.getElementById("btnCloseHelpModal");

// Prvky e-mailového modalu a jeho formuláře.
const emailModal = document.getElementById("emailModal");
const btnCloseEmailModal = document.getElementById("btnCloseEmailModal");
const btnSendEmails = document.getElementById("btnSendEmails");

const senderEmailInput = document.getElementById("senderEmail");
const emailSubjectInput = document.getElementById("emailSubject");
const emailBodyInput = document.getElementById("emailBody");

const mailLoadingBar = document.getElementById("mailLoadingBar");
const mailStatus = document.getElementById("mailStatus");
const failedInvoices = document.getElementById("failedInvoices");
const failedInvoiceWrapper = document.getElementById("failedInvoiceWrapper");

// ------------------------------------------------------------
// POMOCNÉ FUNKCE
// ------------------------------------------------------------

// Velikost kroku, na který se při tažení zarovnávají prvky.
// Čím menší číslo, tím jemnější posun.
const SNAP_GRID_SIZE = 5;

// Velikost aktivní plochy pro změnu velikosti prvku v pravém dolním rohu.
const RESIZE_HANDLE_SIZE = 12;

// Výchozí odsazení textu uvnitř textového boxu v canvas náhledu.
const TEXT_PADDING_TOP = 2;
const TEXT_PADDING_LEFT = 0;

/**
 * Vytvoří prázdnou šablonu ve výchozím formátu aplikace.
 * Používá se při startu aplikace a při kliknutí na „Nová template“.
 */
function createEmptyTemplate(orientation = "portrait") {
  return {
    version: 1,
    page: {
      size: "A4",
      orientation,
      margin: 0
    },
    elements: []
  };
}

/**
 * Vrátí rozměry canvasu podle orientace A4 stránky.
 * Hodnoty odpovídají PDF bodům používaným pro A4.
 */
function getCanvasSize(orientation) {
  if (orientation === "landscape") {
    return { width: 842, height: 595 };
  }

  return { width: 595, height: 842 };
}

/**
 * Přenastaví velikost canvasu podle aktuální orientace šablony
 * a překreslí celý editor.
 */
function resizeCanvasByOrientation() {
  const { width, height } = getCanvasSize(state.template.page.orientation);
  canvas.width = width;
  canvas.height = height;
  renderCanvas();
}

/**
 * Vytvoří unikátní ID prvku šablony.
 * Prefix usnadňuje rozeznání typu prvku při ladění.
 */
function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Najde aktuálně vybraný prvek podle state.selectedElementId.
 * Pokud žádný prvek není vybraný, vrací null.
 */
function getSelectedElement() {
  return state.template.elements.find(el => el.id === state.selectedElementId) ?? null;
}

/**
 * Nastaví aktuálně vybraný prvek, synchronizuje pravý/levý editační formulář
 * a překreslí canvas, aby se zobrazilo označení výběru.
 */
function setSelectedElement(id) {
  state.selectedElementId = id;
  syncSelectedElementForm();
  renderCanvas();
}

/**
 * Posune aktuálně vybraný prvek o zadaný počet bodů v canvasu.
 * Používají ho nová tlačítka šipek v levém panelu.
 * U čáry se musí posunout začátek i konec, aby se neposunul jen jeden bod čáry.
 */
function moveSelectedElementBy(dx, dy) {
  const element = getSelectedElement();
  if (!element) return;

  if (element.type === "line") {
    element.x1 += dx;
    element.y1 += dy;
    element.x2 += dx;
    element.y2 += dy;
  } else {
    element.x += dx;
    element.y += dy;
  }

  syncSelectedElementForm();
  renderCanvas();
}

/**
 * Vyčistí formulář pro vlastnosti prvku.
 * Volá se ve chvíli, kdy není vybraný žádný prvek.
 */
function clearSelectedElementForm() {
  elTypeInput.value = "";
  elXInput.value = "";
  elYInput.value = "";
  elWInput.value = "";
  elHInput.value = "";
  elTextInput.value = "";
  elFontSizeInput.value = "12";
  setActiveAlignButton("left");
  elColorInput.value = "#000000";
}

/**
 * Přenese vlastnosti vybraného prvku do formulářových polí.
 * Každý typ prvku používá trochu jiné vlastnosti, proto se zde rozlišuje
 * text, obrázek, obdélník a čára.
 */
function syncSelectedElementForm() {
  const element = getSelectedElement();

  if (!element) {
    clearSelectedElementForm();
    return;
  }

  elTypeInput.value = element.type;

  if (element.type === "line") {
    elXInput.value = element.x1;
    elYInput.value = element.y1;
    elWInput.value = element.x2;
    elHInput.value = element.y2;
    elTextInput.value = "";
    elFontSizeInput.value = element.style?.strokeWidth ?? 1;
    setActiveAlignButton("left");
    elColorInput.value = element.style?.strokeColor ?? "#000000";
    return;
  }

  elXInput.value = element.x ?? "";
  elYInput.value = element.y ?? "";
  elWInput.value = element.w ?? "";
  elHInput.value = element.h ?? "";

  if (element.type === "text") {
    elTextInput.value = element.text ?? "";
    elFontSizeInput.value = element.style?.fontSize ?? 12;
    setActiveAlignButton(element.style?.align ?? "left");
    elColorInput.value = element.style?.color ?? "#000000";
  } else if (element.type === "image") {
    elTextInput.value = element.source?.fileName ?? "";
    elFontSizeInput.value = 1;
    setActiveAlignButton("left");
    elColorInput.value = "#000000";
  } else if (element.type === "rect") {
    elTextInput.value = "";
    elFontSizeInput.value = element.style?.strokeWidth ?? 1;
    setActiveAlignButton("left");
    elColorInput.value = element.style?.strokeColor ?? "#000000";
  }
}

/**
 * Aktualizuje seznam obrázků používaných v šabloně.
 * U každého názvu souboru ukáže, zda už je obrázek lokálně načtený.
 */
function renderImageInputs() {
  const imageElements = state.template.elements.filter(el => el.type === "image");
  const uniqueFileNames = [
    ...new Set(
      imageElements
        .map(el => el.source?.fileName)
        .filter(Boolean)
    )
  ];

  imageInputs.innerHTML = "";

  if (uniqueFileNames.length === 0) {
    imageInputs.innerHTML = "<p class=\"small\">Template zatím neobsahuje žádné obrázky.</p>";
    return;
  }

  // Obrázky se přikládají pod klíčem image_<název_souboru>, aby je backend dokázal spárovat se šablonou.
  for (const fileName of uniqueFileNames) {
    const asset = state.imageAssets[fileName];
    const status = asset ? "nalezen" : "chybí";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="small">
        Obrázek: <strong>${escapeHtml(fileName)}</strong> — ${escapeHtml(status)}
      </div>
    `;

    imageInputs.appendChild(wrapper);
  }
  console.log("CURRENT IMAGE ASSETS:", state.imageAssets);
}

/**
 * Bezpečně převede hodnotu na HTML text.
 * Používá se při vkládání dat do innerHTML, aby data nemohla rozbít stránku.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Spočítá výchozí pozici pro automaticky vložený placeholder z tabulky.
 * Každý další placeholder se posune níže, aby se prvky nepřekrývaly.
 */
function getNextAutoPosition() {
  const textElements = state.template.elements.filter(el => el.type === "text");

  const startX = 40;
  const startY = 40;
  const stepY = 30;

  return {
    x: startX,
    y: startY + (textElements.length * stepY)
  };
}

/**
 * Vloží do šablony nový textový prvek s placeholderem daného sloupce.
 * Používá se po kliknutí na hlavičku sloupce v náhledové tabulce.
 */
function addPlaceholderElement(columnId) {
  const { x, y } = getNextAutoPosition();

  const el = {
    id: createId("text"),
    type: "text",
    x,
    y,
    w: 220,
    h: 24,
    text: `{{${columnId}}}`,
    style: {
      fontFamily: "DejaVuSans",
      fontSize: 14,
      color: "#000000",
      align: "left",
      bold: false,
      lineHeight: 1.2,
      paddingTop: 2,
      paddingLeft: 2
    }
  };

  state.template.elements.push(el);
  setSelectedElement(el.id);
  renderImageInputs();
  renderCanvas();
}

/**
 * Zjistí, zda uživatel kliknul do pravého dolního rohu prvku,
 * tedy do oblasti pro změnu velikosti.
 */
function isInResizeHandle(element, x, y) {
  if (!element || element.type === "line") {
    return false;
  }

  const handleX = element.x + element.w - RESIZE_HANDLE_SIZE / 2;
  const handleY = element.y + element.h - RESIZE_HANDLE_SIZE / 2;

  return (
    x >= handleX &&
    x <= handleX + RESIZE_HANDLE_SIZE &&
    y >= handleY &&
    y <= handleY + RESIZE_HANDLE_SIZE
  );
}

/**
 * Zarovná číselnou hodnotu na nejbližší bod mřížky.
 * Používá se při přesunu a změně velikosti prvků.
 */
function snapToGrid(value) {
  return Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
}

// Skutečná nedělitelná mezera používaná ve vykresleném textu.
const TYPO_NO_BREAK_SPACE = "\u00A0";

// Interní značka používaná během zalamování textu.
// Pomáhá odlišit mezery, které se nemají stát místem pro zalomení.
const TYPO_GLUE_MARK = "\uE000";

/**
 * Vrátí pomocné interní značky pro nedělitelné mezery zpět na skutečné NBSP.
 * Díky tomu se text vykreslí se správnými českými typografickými mezerami.
 */
function restoreTypographySpaces(text) {
  return String(text ?? "").replaceAll(TYPO_GLUE_MARK, TYPO_NO_BREAK_SPACE);
}

/**
 * Aplikuje základní česká typografická pravidla před zalomením textu.
 * Pomocí interní značky slepuje výrazy, které nemají zůstat rozdělené na konci řádku.
 */
function applyCzechTypographyRules(text) {
  if (typeof text !== "string") {
    return "";
  }

  let result = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Jednopísmenné předložky a spojky nesmí zůstat na konci řádku.
  result = result.replace(/\b([AaIiKkOoSsUuVvZz])\s+/g, `$1${TYPO_GLUE_MARK}`);

  // Číslo + jednotka / měna držet pohromadě.
  result = result.replace(
    /(\d[\d.,]*)[ \t]+(kč|%|kg|g|mg|t|km|m|cm|mm|l|ml|dl|cl|ks|°c|h|min|s)(?=$|[ \t.,;:!?()])/gi,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // § + číslo
  result = result.replace(
    /§[ \t]+(\d+[a-zA-Z]*)/g,
    `§${TYPO_GLUE_MARK}$1`
  );

  // odst. / písm. / str. + hodnota
  result = result.replace(
    /\b(odst\.|písm\.|str\.)[ \t]+([^\s]+)/gi,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // č. + hodnota
  result = result.replace(
    /(^|[\s(])č\.[ \t]+([^\s]+)/gi,
    `$1č.${TYPO_GLUE_MARK}$2`
  );

  // Tituly a běžné zkratky před jménem
  result = result.replace(
    /\b(Bc\.|Mgr\.|Ing\.|Mgr\.A\.|JUDr\.|MUDr\.|RNDr\.|PhDr\.|doc\.|prof\.)[ \t]+([^\s]+)/g,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // PSČ
  result = result.replace(
    /(\d{3})[ \t]+(\d{2})/g,
    `$1${TYPO_GLUE_MARK}$2`
  );

  // Zkratky
  result = result.replace(
    /\b(např\.|atd\.|tj\.|tzv\.)[ \t]+([^\s]+)/gi,
    `$1${TYPO_GLUE_MARK}$2`
  );

  return result;
}

/**
 * Rozdělí české slovo na části podle hyfenační knihovny Hypher.
 * Pokud knihovna není dostupná nebo slovo není vhodné dělit, vrátí celé slovo.
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

  if (!window.czechHyphenator) {
    return [word];
  }

  const parts = window.czechHyphenator.hyphenate(word);

  if (!Array.isArray(parts) || parts.length <= 1) {
    return [word];
  }

  return parts;
}

/**
 * Zaláme text do řádků podle maximální šířky boxu.
 * Funkce používá měřicí callback, aby šla použít nad canvasem i podobnou logikou jako PDF renderer.
 */
function wrapTextByWidth(text, maxWidth, measureFn) {
  const safeText = applyCzechTypographyRules(text);
  const paragraphs = safeText.split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const renderedCandidate = restoreTypographySpaces(candidate);

      if (currentLine === "") {
        if (measureFn(restoreTypographySpaces(word)) <= maxWidth) {
          currentLine = word;
          continue;
        }

        const chunks = splitWordToFittingChunks(word, maxWidth, measureFn);

        if (chunks.length <= 1) {
          currentLine = word;
          continue;
        }

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
        currentLine = candidate;
      } else {
        lines.push(restoreTypographySpaces(currentLine));

        if (measureFn(restoreTypographySpaces(word)) <= maxWidth) {
          currentLine = word;
          continue;
        }

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

    if (currentLine) {
      lines.push(restoreTypographySpaces(currentLine));
    }
  }
  //console.log("WRAPPED LINES:", lines);
  //console.log("SAFE TEXT:", safeText);
  return lines;
}

// Aktuální Blob URL pro PDF náhled. Ukládá se kvůli pozdějšímu uvolnění z paměti.
let currentPreviewPdfUrl = null;

/**
 * Otevře modal s PDF náhledem a nastaví iframe na vytvořenou Blob URL.
 * Předchozí Blob URL se zruší, aby se zbytečně nedržela v paměti.
 */
function openPdfPreviewModal(url) {
  if (currentPreviewPdfUrl) {
    pdfPreviewFrame.src = "";
    URL.revokeObjectURL(currentPreviewPdfUrl);
    currentPreviewPdfUrl = null;
  }

  currentPreviewPdfUrl = url;
  pdfPreviewFrame.src = url;
  pdfPreviewModal.classList.remove("hidden");
}

/**
 * Zavře PDF preview modal a uvolní aktuální Blob URL náhledu.
 */
function closePdfPreviewModal() {
  pdfPreviewModal.classList.add("hidden");
  pdfPreviewFrame.src = "";

  if (currentPreviewPdfUrl) {
    URL.revokeObjectURL(currentPreviewPdfUrl);
    currentPreviewPdfUrl = null;
  }
}

/**
 * Otevře modal s krátkým uživatelským návodem.
 * Návod je čistě informační, proto se zde nemění data ani šablona.
 */
function openHelpModal() {
  helpModal.classList.remove("hidden");
}

/**
 * Zavře modal s uživatelským návodem.
 */
function closeHelpModal() {
  helpModal.classList.add("hidden");
}

/**
 * Nahradí placeholdery ve tvaru {{col_0}} hodnotami z prvního řádku dat.
 * Slouží pouze pro canvas náhled v editoru.
 */
function resolvePlaceholdersForPreview(text, row) {
  if (typeof text !== "string") {
    return "";
  }

  return text.replace(/\{\{\s*([a-zA-Z0-9_.$-]+)\s*\}\}/g, (_, key) => {
    const value = row?.[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * Načte vybraný obrázkový soubor do prohlížeče.
 * Vrací objekt s původním File, dočasnou Object URL a skutečnými rozměry obrázku.
 */
async function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        fileName: file.name,
        url: objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        file
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Nepodařilo se načíst obrázek: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Spočítá bezpečnou počáteční velikost obrázku při vložení do šablony.
 * Zachovává poměr stran a nezvětšuje obrázek nad jeho původní velikost.
 */
function computeImageInsertSize(width, height, maxWidth = 160, maxHeight = 120) {
  if (!width || !height) {
    return { width: maxWidth, height: maxHeight };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  const safeRatio = Math.min(ratio, 1);

  return {
    width: Math.round(width * safeRatio),
    height: Math.round(height * safeRatio)
  };
}

/**
 * Najde načtený obrázek podle názvu souboru.
 */
function getImageAssetByFileName(fileName) {
  return state.imageAssets[fileName] ?? null;
}

/**
 * Vrátí seznam názvů obrázků, které šablona používá,
 * ale uživatel je zatím nenačetl do prohlížeče.
 */
function getMissingImageFileNames() {
  const imageElements = state.template.elements.filter(el => el.type === "image");

  const uniqueFileNames = [
    ...new Set(
      imageElements
        .map(el => el.source?.fileName)
        .filter(Boolean)
    )
  ];

  return uniqueFileNames.filter(fileName => {
    const asset = state.imageAssets[fileName];
    return !asset?.file;
  });
}

/**
 * Vytvoří kopii FormData.
 * FormData se po odeslání requestu používá špatně opakovaně, proto se pro preview vytváří kopie.
 */
function cloneFormData(sourceFormData) {
  const cloned = new FormData();

  for (const [key, value] of sourceFormData.entries()) {
    cloned.append(key, value);
  }

  return cloned;
}

/**
 * Vizuálně označí aktivní tlačítko zarovnání textu.
 */
function setActiveAlignButton(align = "left") {
  for (const button of alignButtons) {
    button.classList.toggle("active", button.dataset.align === align);
  }
}

/**
 * Rozdělí příliš dlouhé slovo na části, které se vejdou do šířky řádku.
 * Kvůli čitelnosti je zde omezení maximálně na jedno dělení slova.
 */
function splitWordToFittingChunks(word, maxWidth, measureFn) {
  const parts = hyphenateWordForCzech(word);

  if (parts.length <= 1) {
    return [word];
  }

  const chunks = [];
  let remainingParts = [...parts];

  let splitCount = 0; //max jedno dělení

  while (remainingParts.length > 0) {
    // Když už zbývá jen jedna část, přidáme ji bez pomlčky.
    if (remainingParts.length === 1) {
      chunks.push(remainingParts[0]);
      break;
    }

    let bestChunk = null;
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

    if (splitCount >= 1) {
      chunks.push(remainingParts.join(""));
      break;
    }
  }

  return chunks;
}

/**
 * Otevře modal pro hromadné odesílání e-mailů.
 */
function openEmailModal() {
  emailModal.classList.remove("hidden");
}

/**
 * Zavře modal pro hromadné odesílání e-mailů.
 */
function closeEmailModal() {
  emailModal.classList.add("hidden");
}

/**
 * Vykreslí jednoduchý progress bar pro dávkové odesílání e-mailů.
 * Každý segment odpovídá jednomu řádku dat / jednomu e-mailu.
 */
function renderMailProgressBar(total, results = []) {
  mailLoadingBar.innerHTML = "";

  if (!total || total <= 0) {
    return;
  }

  for (let i = 0; i < total; i++) {
    const segment = document.createElement("div");
    segment.className = "mail-loading-segment pending";

    const result = results[i];
    if (result) {
      segment.classList.remove("pending");
      segment.classList.add(result.ok ? "success" : "fail");
    }

    mailLoadingBar.appendChild(segment);
  }
}

/**
 * Vyčistí stav e-mailového modalu před novým odesíláním.
 */
function resetEmailUiState() {
  renderMailProgressBar(0, []);
  mailStatus.textContent = "";
  failedInvoices.textContent = "";
}

// ------------------------------------------------------------
// RENDER CANVASU
// ------------------------------------------------------------

/**
 * Překreslí celý canvas editor podle aktuální šablony.
 * Tato funkce je hlavní vizuální náhled šablony v prohlížeči.
 */
function renderCanvas() {
  //console.log("WRAPPED LINES:", canvas.lines);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Prvky se kreslí v pořadí uloženém v šabloně.
  // Pozdější prvky se zobrazí nad dřívějšími.
  for (const element of state.template.elements) {
    const selected = element.id === state.selectedElementId;

    // Textový prvek: řeší font, placeholdery, zarovnání a zalomení řádků.
    if (element.type === "text") {
      const fontSize = element.style?.fontSize ?? 12;
      const fontFamily = "PdfEditorFont";
      const paddingTop = element.style?.paddingTop ?? 2;
      const paddingLeft = element.style?.paddingLeft ?? 2;
      const lineHeightFactor = element.style?.lineHeight ?? 1.2;
      const align = element.style?.align ?? "left";
      
      ctx.fillStyle = element.style?.color ?? "#000000";
      const weight = element.style?.bold ? "bold" : "normal";
      ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "top";
      
      const previewRow = state.dataRows?.[0] ?? null;
      const text = resolvePlaceholdersForPreview(element.text ?? "", previewRow);
      
      const lineHeight = fontSize * lineHeightFactor;
      const availableWidth = Math.max(1, element.w - paddingLeft * 2);
      
      const lines = wrapTextByWidth(
        text,
        availableWidth,
        candidate => ctx.measureText(candidate).width
      );
      
      lines.forEach((line, index) => {
        const lineWidth = ctx.measureText(line).width;
      
        let drawX = element.x + paddingLeft;
      
        if (align === "center") {
          drawX = element.x + paddingLeft + (availableWidth - lineWidth) / 2;
        } else if (align === "right") {
          drawX = element.x + paddingLeft + (availableWidth - lineWidth);
        }
      
        ctx.fillText(
          line,
          drawX,
          element.y + paddingTop + index * lineHeight
        );
      });
    
      if (selected) {
        ctx.strokeStyle = "#0066cc";
        ctx.strokeRect(element.x, element.y, element.w, element.h);
    
        ctx.fillStyle = "#0066cc";
        ctx.fillRect(
          element.x + element.w - RESIZE_HANDLE_SIZE / 2,
          element.y + element.h - RESIZE_HANDLE_SIZE / 2,
          RESIZE_HANDLE_SIZE,
          RESIZE_HANDLE_SIZE
        );
      }
    }

    // Obdélník: kreslí se pouze obrys podle barvy a tloušťky tahu.
    if (element.type === "rect") {
      ctx.strokeStyle = element.style?.strokeColor ?? "#000000";
      ctx.lineWidth = element.style?.strokeWidth ?? 1;
      ctx.strokeRect(element.x, element.y, element.w, element.h);
    
      if (selected) {
        ctx.strokeStyle = "#0066cc";
        ctx.strokeRect(element.x - 2, element.y - 2, element.w + 4, element.h + 4);
    
        ctx.fillStyle = "#0066cc";
        ctx.fillRect(element.x + element.w - 4, element.y + element.h - 4, 8, 8);
      }
    }

    // Čára: používá samostatné souřadnice začátku a konce.
    if (element.type === "line") {
      ctx.strokeStyle = element.style?.strokeColor ?? "#000000";
      ctx.lineWidth = element.style?.strokeWidth ?? 1;
      ctx.beginPath();
      ctx.moveTo(element.x1, element.y1);
      ctx.lineTo(element.x2, element.y2);
      ctx.stroke();

      if (selected) {
        ctx.fillStyle = "#0066cc";
        ctx.fillRect(element.x1 - 3, element.y1 - 3, 6, 6);
        ctx.fillRect(element.x2 - 3, element.y2 - 3, 6, 6);
      }
    }

    // Obrázek: pokud je lokálně načtený, vykreslí se bitmapa; jinak placeholder rámeček.
    if (element.type === "image") {
      const fileName = element.source?.fileName ?? "";
      const asset = getImageAssetByFileName(fileName);
    
      if (asset) {
        const img = new Image();
        img.src = asset.url;
        ctx.drawImage(img, element.x, element.y, element.w, element.h);
      } else {
        ctx.strokeStyle = "#666";
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(element.x, element.y, element.w, element.h);
        ctx.setLineDash([]);
        ctx.fillStyle = "#666";
        ctx.font = "12px Arial";
        ctx.fillText(`IMG: ${fileName}`, element.x + 6, element.y + 6);
      }
    
      if (selected) {
        ctx.strokeStyle = "#0066cc";
        ctx.strokeRect(element.x - 2, element.y - 2, element.w + 4, element.h + 4);
    
        ctx.fillStyle = "#0066cc";
        ctx.fillRect(
          element.x + element.w - RESIZE_HANDLE_SIZE / 2,
          element.y + element.h - RESIZE_HANDLE_SIZE / 2,
          RESIZE_HANDLE_SIZE,
          RESIZE_HANDLE_SIZE
        );
      }
    }
  }
}

// ------------------------------------------------------------
// HIT TEST
// ------------------------------------------------------------

/**
 * Najde prvek šablony na daných souřadnicích canvasu.
 * Prochází prvky odzadu, aby šel vybrat prvek, který je vizuálně nahoře.
 */
function findElementAt(x, y) {
  for (let i = state.template.elements.length - 1; i >= 0; i--) {
    const el = state.template.elements[i];

    if (el.type === "line") {
      const minX = Math.min(el.x1, el.x2) - 5;
      const maxX = Math.max(el.x1, el.x2) + 5;
      const minY = Math.min(el.y1, el.y2) - 5;
      const maxY = Math.max(el.y1, el.y2) + 5;

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return el;
      }

      continue;
    }

    if (
      x >= el.x &&
      x <= el.x + el.w &&
      y >= el.y &&
      y <= el.y + el.h
    ) {
      return el;
    }
  }

  return null;
}

// ------------------------------------------------------------
// DRAG & DROP
// ------------------------------------------------------------

let dragState = null;

// Začátek interakce s canvasem: výběr prvku, začátek tažení nebo změna velikosti. 
canvas.addEventListener("mousedown", event => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const element = findElementAt(x, y);

  if (!element) {
    setSelectedElement(null);
    return;
  }

  setSelectedElement(element.id);

  const resizeMode = isInResizeHandle(element, x, y);

  dragState = {
    startX: x,
    startY: y,
    elementId: element.id,
    mode: resizeMode ? "resize" : "move"
  };
});

// Pohyb myší nad canvasem: řeší kurzor, přesun prvku a změnu velikosti. 
canvas.addEventListener("mousemove", event => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (!dragState) {
    const hoveredElement = findElementAt(x, y);

    if (hoveredElement && isInResizeHandle(hoveredElement, x, y)) {
      canvas.style.cursor = "nwse-resize";
    } else if (hoveredElement) {
      canvas.style.cursor = "move";
    } else {
      canvas.style.cursor = "default";
    }

    return;
  }

  const dx = x - dragState.startX;
  const dy = y - dragState.startY;

  const element = state.template.elements.find(el => el.id === dragState.elementId);
  if (!element) return;

  if (dragState.mode === "resize" && element.type !== "line") {
    element.w = Math.max(20, snapToGrid(element.w + dx));
    element.h = Math.max(20, snapToGrid(element.h + dy));
    canvas.style.cursor = "nwse-resize";
  } else {
    // Čára: používá samostatné souřadnice začátku a konce.
    if (element.type === "line") {
      element.x1 = snapToGrid(element.x1 + dx);
      element.y1 = snapToGrid(element.y1 + dy);
      element.x2 = snapToGrid(element.x2 + dx);
      element.y2 = snapToGrid(element.y2 + dy);
    } else {
      element.x = snapToGrid(element.x + dx);
      element.y = snapToGrid(element.y + dy);
    }

    canvas.style.cursor = "move";
  }

  dragState.startX = x;
  dragState.startY = y;

  syncSelectedElementForm();
  renderCanvas();
});

// Ukončení tažení nebo změny velikosti i v případě, že myš skončí mimo canvas. 
window.addEventListener("mouseup", () => {
  dragState = null;
});

// Klávesové zkratky pro editor: mazání, posun prvku šipkami a použití změn Enterem. 
window.addEventListener("keydown", event => {
  const activeTag = document.activeElement?.tagName;
  const isTyping =
    activeTag === "INPUT" ||
    activeTag === "TEXTAREA" ||
    activeTag === "SELECT" ||
    document.activeElement?.isContentEditable;

  const selectedElement = getSelectedElement();

  if (isTyping && event.key === "Enter") {
    if (!selectedElement) {
      return;
    }

    document.getElementById("btnApplyChanges").click();
    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && !helpModal.classList.contains("hidden")) {
    closeHelpModal();
    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && !emailModal.classList.contains("hidden")) {
    closeEmailModal();
    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && !pdfPreviewModal.classList.contains("hidden")) {
    closePdfPreviewModal();
    event.preventDefault();
    return;
  }

  if (isTyping) {
    return;
  }

  if (event.key === "Delete") {
    if (!selectedElement) {
      return;
    }

    state.template.elements = state.template.elements.filter(
      el => el.id !== selectedElement.id
    );

    state.selectedElementId = null;
    clearSelectedElementForm();
    renderImageInputs();
    renderCanvas();

    event.preventDefault();
    return;
  }

  if (!selectedElement) {
    return;
  }

  const step = SNAP_GRID_SIZE;

  if (event.key === "ArrowLeft") {
    if (selectedElement.type === "line") {
      selectedElement.x1 -= step;
      selectedElement.x2 -= step;
    } else {
      selectedElement.x -= step;
    }

    syncSelectedElementForm();
    renderCanvas();
    event.preventDefault();
    return;
  }

  if (event.key === "ArrowRight") {
    if (selectedElement.type === "line") {
      selectedElement.x1 += step;
      selectedElement.x2 += step;
    } else {
      selectedElement.x += step;
    }

    syncSelectedElementForm();
    renderCanvas();
    event.preventDefault();
    return;
  }

  if (event.key === "ArrowUp") {
    if (selectedElement.type === "line") {
      selectedElement.y1 -= step;
      selectedElement.y2 -= step;
    } else {
      selectedElement.y -= step;
    }

    syncSelectedElementForm();
    renderCanvas();
    event.preventDefault();
    return;
  }

  if (event.key === "ArrowDown") {
    if (selectedElement.type === "line") {
      selectedElement.y1 += step;
      selectedElement.y2 += step;
    } else {
      selectedElement.y += step;
    }

    syncSelectedElementForm();
    renderCanvas();
    event.preventDefault();
  }
});

// Otevření uživatelského návodu tlačítkem s otazníkem.
btnOpenHelpModal.addEventListener("click", () => {
  openHelpModal();
});

// Zavření uživatelského návodu tlačítkem v modalu.
btnCloseHelpModal.addEventListener("click", () => {
  closeHelpModal();
});

// Zavření uživatelského návodu kliknutím mimo obsah modalu.
helpModal.addEventListener("click", event => {
  if (event.target === helpModal) {
    closeHelpModal();
  }
});

// Zavření PDF náhledu tlačítkem v modalu. 
btnClosePdfPreview.addEventListener("click", () => {
  closePdfPreviewModal();
});

// Zavření PDF náhledu kliknutím mimo obsah modalu. 
pdfPreviewModal.addEventListener("click", event => {
  if (event.target === pdfPreviewModal) {
    closePdfPreviewModal();
  }
});

// Stažení právě zobrazeného PDF náhledu jako samostatného souboru. 
btnDownloadPreviewPdf.addEventListener("click", () => {
  if (!currentPreviewPdfUrl) {
    return;
  }

  const a = document.createElement("a");
  a.href = currentPreviewPdfUrl;
  a.download = "output.pdf";
  a.click();
});

// Otevření e-mailového modalu z PDF náhledu. 
btnOpenEmailModal.addEventListener("click", () => {
  resetEmailUiState();
  openEmailModal();
});

// Zavření e-mailového modalu tlačítkem. 
btnCloseEmailModal.addEventListener("click", () => {
  closeEmailModal();
});

// Zavření e-mailového modalu kliknutím mimo jeho obsah. 
emailModal.addEventListener("click", event => {
  if (event.target === emailModal) {
    closeEmailModal();
  }
});

// Hromadné odeslání e-mailů s PDF přílohami přes serverové API. 
btnSendEmails.addEventListener("click", async () => {
  resetEmailUiState();

  // Aktuální šablona se serveru posílá jako JSON soubor uvnitř FormData.
  const templateBlob = new Blob(
    [JSON.stringify(state.template, null, 2)],
    { type: "application/json" }
  );

  const dataFile = dataFileInput.files[0];
  if (!dataFile) {
    mailStatus.textContent = "Nejprve nahraj datový soubor.";
    return;
  }

  const totalEmails = state.dataRows?.length ?? 0;
  renderMailProgressBar(totalEmails, []);

  // Před exportem ověříme, že všechny obrázky ze šablony jsou opravdu načtené.
  const missingImageFileNames = getMissingImageFileNames();

  if (missingImageFileNames.length > 0) {
    mailStatus.textContent = `Chybí obrázky: ${missingImageFileNames.join(", ")}`;
    return;
  }

  // FormData obsahuje šablonu, datový soubor, vzor názvu a případné obrázky.
  const form = new FormData();
  form.append("templateFile", templateBlob, "template.json");
  form.append("dataFile", dataFile);

  form.append("senderEmail", senderEmailInput.value.trim());
  form.append("subjectTemplate", emailSubjectInput.value);
  form.append("bodyTemplate", emailBodyInput.value);
  form.append("fileNamePattern", fileNamePatternInput.value.trim() || "document");
  form.append("recipientColumnKey", "col_9");

  const imageElements = state.template.elements.filter(el => el.type === "image");
  const uniqueFileNames = [
    ...new Set(
      imageElements
        .map(el => el.source?.fileName)
        .filter(Boolean)
    )
  ];

  for (const fileName of uniqueFileNames) {
    const asset = state.imageAssets[fileName];
    if (!asset?.file) {
      continue;
    }

    form.append(`image_${fileName}`, asset.file, fileName);
  }

  mailLoadingBar.textContent = "Odesílání...";
  mailStatus.textContent = "Probíhá odesílání e-mailů...";

  const res = await fetch("/api/send-mails", {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    let errorMessage = `Chyba při odesílání e-mailů. HTTP ${res.status}`;
  
    const rawText = await res.text();
    console.log("SEND MAILS ERROR RESPONSE:", rawText);
  
    try {
      const json = JSON.parse(rawText);
      errorMessage = json.error || errorMessage;
    } catch {
      if (rawText.trim()) {
        errorMessage = rawText;
      }
    }
  
    renderMailProgressBar(0, []);
    mailStatus.textContent = errorMessage;
    return;
  }

  const json = await res.json();

  renderMailProgressBar(json.total, json.results ?? []);
  mailStatus.textContent = `Úspěšně odesláno: ${json.successCount}, chybně: ${json.failCount}`;
  
  const failed = (json.results ?? [])
    .filter(item => !item.ok)
    .map(item => {
      const recipient = item.recipientEmail || "(bez e-mailu)";
      return `${item.fileName} → ${recipient} → ${item.error}`;
    });
  
  failedInvoices.textContent = failed.join("\n");
});

// ------------------------------------------------------------
// PŘIDÁVÁNÍ ELEMENTŮ
// ------------------------------------------------------------

// Přidání nového textového pole do šablony. 
document.getElementById("btnAddText").addEventListener("click", () => {
  const el = {
    id: createId("text"),
    type: "text",
    x: 40,
    y: 40,
    w: 200,
    h: 24,
    text: "Jméno: {{jmeno}}",
    style: {
      fontFamily: "DejaVuSans",
      fontSize: 14,
      color: "#000000",
      align: "left",
      bold: false,
      lineHeight: 1.2,
      paddingTop: 2,
      paddingLeft: 2
    }
  };

  state.template.elements.push(el);
  setSelectedElement(el.id);
  renderImageInputs();
  renderCanvas();
});

// Přidání nového obdélníku do šablony. 
document.getElementById("btnAddRect").addEventListener("click", () => {
  const el = {
    id: createId("rect"),
    type: "rect",
    x: 30,
    y: 30,
    w: 250,
    h: 100,
    style: {
      strokeColor: "#000000",
      strokeWidth: 1,
      fillColor: null
    }
  };

  state.template.elements.push(el);
  setSelectedElement(el.id);
  renderImageInputs();
  renderCanvas();
});

// Přidání nové čáry do šablony. 
document.getElementById("btnAddLine").addEventListener("click", () => {
  const el = {
    id: createId("line"),
    type: "line",
    x1: 30,
    y1: 150,
    x2: 300,
    y2: 150,
    style: {
      strokeColor: "#000000",
      strokeWidth: 1
    }
  };

  state.template.elements.push(el);
  setSelectedElement(el.id);
  renderImageInputs();
  renderCanvas();
});

// Otevře výběr jednoho obrázku pro vložení do šablony. 
document.getElementById("btnAddImage").addEventListener("click", () => {
  imagePickerInput.value = "";
  imagePickerInput.click();
});

// Zpracování jednoho vybraného obrázku a jeho vložení do šablony. 
imagePickerInput.addEventListener("change", async () => {
  const file = imagePickerInput.files?.[0];
  if (!file) {
    return;
  }

  try {
    const asset = await loadImageFile(file);

    state.imageAssets[asset.fileName] = asset;
    console.log("IMAGE ASSET ADDED:", asset.fileName, state.imageAssets);

    const size = computeImageInsertSize(asset.width, asset.height, 180, 120);

    const el = {
      id: createId("image"),
      type: "image",
      x: 320,
      y: 40,
      w: size.width,
      h: size.height,
      source: {
        fileName: asset.fileName,
        relativePath: asset.fileName
      },
      originalSize: {
        width: asset.width,
        height: asset.height
      }
    };

    state.template.elements.push(el);
    setSelectedElement(el.id);
    renderCanvas();
  } catch (err) {
    alert(err.message);
  }
});

// Otevře systémový dialog pro výběr složky s obrázky. 
btnPickImageFolder.addEventListener("click", () => {
  imageFolderPickerInput.value = "";
  imageFolderPickerInput.click();
});

// Načte všechny obrázky z vybrané složky do lokálního registru obrázků. 
imageFolderPickerInput.addEventListener("change", async () => {
  const files = Array.from(imageFolderPickerInput.files ?? []);
  if (files.length === 0) {
    return;
  }

  const imageFiles = files.filter(file =>
    /^image\/(png|jpeg)$/.test(file.type) ||
    /\.(png|jpg|jpeg)$/i.test(file.name)
  );

  for (const file of imageFiles) {
    try {
      const asset = await loadImageFile(file);
      state.imageAssets[asset.fileName] = asset;
    } catch (err) {
      console.warn(err.message);
    }
  }

  renderImageInputs();
  renderCanvas();
  generateStatus.textContent = "";
});

// ------------------------------------------------------------
// ÚPRAVY ELEMENTU
// ------------------------------------------------------------

// Tlačítka šipek posouvají vybraný prvek o 1 bod daným směrem.
// Když uživatel tlačítko jen klikne, provede se jeden posun.
// Když ho podrží, po krátké prodlevě se spustí opakovaný posun.
const moveButtonSettings = [
  ["btnMoveUp", 0, -1],
  ["btnMoveDown", 0, 1],
  ["btnMoveLeft", -1, 0],
  ["btnMoveRight", 1, 0]
];

// Prodleva před spuštěním souvislého posouvání.
// Díky tomu běžné kliknutí stále působí jako přesný posun o jeden bod.
const MOVE_HOLD_DELAY_MS = 250;

// Rychlost opakovaného posouvání při podržení tlačítka.
// Nižší hodnota znamená rychlejší posun. Jeden krok pořád odpovídá 1 bodu.
const MOVE_HOLD_INTERVAL_MS = 40;

/**
 * Napojí jedno tlačítko šipky na posun prvku.
 * Funkce řeší jak krátké kliknutí, tak držení tlačítka myší, perem nebo dotykem.
 */
function registerMoveButton(buttonId, dx, dy) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  let holdDelayId = null;
  let holdIntervalId = null;

  // Zastaví čekání i případný běžící interval.
  // Volá se při puštění tlačítka, odjetí kurzorem nebo zrušení pointer události.
  function stopMoving() {
    if (holdDelayId !== null) {
      clearTimeout(holdDelayId);
      holdDelayId = null;
    }

    if (holdIntervalId !== null) {
      clearInterval(holdIntervalId);
      holdIntervalId = null;
    }
  }

  // Spustí jednorázový posun a připraví opakované posouvání při držení.
  function startMoving(event) {
    event.preventDefault();
    stopMoving();

    moveSelectedElementBy(dx, dy);

    holdDelayId = setTimeout(() => {
      holdDelayId = null;
      holdIntervalId = setInterval(() => {
        moveSelectedElementBy(dx, dy);
      }, MOVE_HOLD_INTERVAL_MS);
    }, MOVE_HOLD_DELAY_MS);
  }

  button.addEventListener("pointerdown", startMoving);
  button.addEventListener("pointerup", stopMoving);
  button.addEventListener("pointerleave", stopMoving);
  button.addEventListener("pointercancel", stopMoving);

  // Když uživatel drží tlačítko a pustí myš mimo samotný button,
  // globální listener zajistí zastavení posunu.
  window.addEventListener("pointerup", stopMoving);
  window.addEventListener("blur", stopMoving);
}

for (const [buttonId, dx, dy] of moveButtonSettings) {
  registerMoveButton(buttonId, dx, dy);
}

// Přenese hodnoty z editačního formuláře zpět do vybraného prvku. 
document.getElementById("btnApplyChanges").addEventListener("click", () => {
  const el = getSelectedElement();
  if (!el) return;

  if (el.type === "line") {
    el.x1 = Number(elXInput.value);
    el.y1 = Number(elYInput.value);
    el.x2 = Number(elWInput.value);
    el.y2 = Number(elHInput.value);
    el.style = {
      strokeColor: elColorInput.value || "#000000",
      strokeWidth: Number(elFontSizeInput.value) || 1
    };
  } else if (el.type === "text") {
    el.x = Number(elXInput.value);
    el.y = Number(elYInput.value);
    el.w = Number(elWInput.value);
    el.h = Number(elHInput.value);
    el.text = elTextInput.value;
    el.style = {
      fontFamily: "DejaVuSans",
      fontSize: Number(elFontSizeInput.value) || 12,
      color: elColorInput.value || "#000000",
      align: document.querySelector(".align-btn.active")?.dataset.align || "left",
      bold: el.style?.bold ?? false,
      lineHeight: el.style?.lineHeight ?? 1.2,
      paddingTop: el.style?.paddingTop ?? 2,
      paddingLeft: el.style?.paddingLeft ?? 2
    };
  } else if (el.type === "rect") {
    el.x = Number(elXInput.value);
    el.y = Number(elYInput.value);
    el.w = Number(elWInput.value);
    el.h = Number(elHInput.value);
    el.style = {
      strokeColor: elColorInput.value || "#000000",
      strokeWidth: Number(elFontSizeInput.value) || 1,
      fillColor: null
    };
  } else if (el.type === "image") {
    el.x = Number(elXInput.value);
    el.y = Number(elYInput.value);
    el.w = Number(elWInput.value);
    el.h = Number(elHInput.value);
  
    el.source = {
      ...(el.source ?? {}),
      fileName: elTextInput.value.trim(),
      relativePath: elTextInput.value.trim()
    };
  }

  renderImageInputs();
  renderCanvas();
});

// Smaže aktuálně vybraný prvek ze šablony. 
document.getElementById("btnDeleteElement").addEventListener("click", () => {
  if (!state.selectedElementId) return;

  state.template.elements = state.template.elements.filter(
    el => el.id !== state.selectedElementId
  );

  state.selectedElementId = null;
  clearSelectedElementForm();
  renderImageInputs();
  renderCanvas();
});

// Přepne tučný řez u vybraného textového prvku. 
document.getElementById("btnBold").addEventListener("click", () => {
  const el = getSelectedElement();
  if (!el || el.type !== "text") return;

  el.style.bold = !el.style.bold;

  syncSelectedElementForm();
  renderCanvas();
});

// Tlačítka zarovnání mění align u vybraného textového prvku.
for (const button of alignButtons) {
  button.addEventListener("click", () => {
    const selectedElement = getSelectedElement();
    if (!selectedElement || selectedElement.type !== "text") {
      return;
    }

    setActiveAlignButton(button.dataset.align);
    document.getElementById("btnApplyChanges").click();
  });
}

// ------------------------------------------------------------
// ORIENTACE
// ------------------------------------------------------------

// Změní orientaci stránky a přepočítá canvas. 
orientationInput.addEventListener("change", () => {
  state.template.page.orientation = orientationInput.value;
  resizeCanvasByOrientation();
});

// ------------------------------------------------------------
// TEMPLATE DOWNLOAD
// ------------------------------------------------------------

// Stáhne aktuální šablonu jako JSON soubor. 
document.getElementById("btnDownloadTemplate").addEventListener("click", () => {
  const json = JSON.stringify(state.template, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "template.json";
  a.click();

  URL.revokeObjectURL(url);
});

// ------------------------------------------------------------
// NOVÁ TEMPLATE
// ------------------------------------------------------------

// Vytvoří novou prázdnou šablonu a zahodí aktuální prvky v editoru. 
document.getElementById("btnNewTemplate").addEventListener("click", () => {
  state.template = createEmptyTemplate(orientationInput.value);
  state.selectedElementId = null;
  clearSelectedElementForm();
  renderImageInputs();
  resizeCanvasByOrientation();
});

// ------------------------------------------------------------
// TEMPLATE UPLOAD
// ------------------------------------------------------------

// Načte JSON šablonu ze souboru a nechá ji ověřit serverem. 
templateFileInput.addEventListener("change", async () => {
  const file = templateFileInput.files[0];
  if (!file) return;

  const text = await file.text();
  const template = JSON.parse(text);

  const res = await fetch("/api/validate-template", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(template)
  });

  const json = await res.json();

  if (!json.ok || !json.valid) {
    alert(json.error || json.errors.join("\n"));
    return;
  }

  state.template = template;
  orientationInput.value = state.template.page.orientation;
  state.selectedElementId = null;
  clearSelectedElementForm();
  renderImageInputs();
  resizeCanvasByOrientation();
});

// ------------------------------------------------------------
// NAČTENÍ DAT
// ------------------------------------------------------------

// Odešle datový soubor na server, který ho přečte a vrátí normalizované řádky. 
document.getElementById("btnUploadData").addEventListener("click", async () => {
  dataError.textContent = "";
  dataMeta.textContent = "";
  previewTable.innerHTML = "";

  const file = dataFileInput.files[0];
  if (!file) {
    dataError.textContent = "Vyber datový soubor.";
    return;
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch("/api/upload-data", {
      method: "POST",
      body: form
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      dataError.textContent = json.error || "Chyba při načítání dat.";
      return;
    }

    state.dataRows = json.data;
    state.dataColumns = json.columns ?? [];

    dataMeta.textContent =
      `Soubor: ${json.fileName}, typ: ${json.type}, řádků: ${json.rows}`;

      //console.log("UPLOAD DATA JSON:", json);
    renderPreviewTable(json.data);
  } catch (err) {
    dataError.textContent = err.message;
  }
});

// ------------------------------------------------------------
// PREVIEW TABULKY
// ------------------------------------------------------------

/**
 * Vykreslí náhled prvních řádků načtených dat do HTML tabulky.
 * Hlavičky sloupců jsou klikatelné a vkládají placeholder do šablony.
 */
function renderPreviewTable(rows) {
  previewTable.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    previewTable.innerHTML = "<tr><td>Žádná data.</td></tr>";
    return;
  }

  const columns = state.dataColumns;

  if (!Array.isArray(columns) || columns.length === 0) {
    previewTable.innerHTML = "<tr><td>Chybí metadata sloupců.</td></tr>";
    return;
  }

  let html = "<thead><tr>";

  for (const col of columns) {
    html += `
      <th>
        <button
          type="button"
          class="header-btn"
          data-column-id="${escapeHtml(col.id)}"
          data-column-name="${escapeHtml(col.name)}"
          title="Vložit {{${escapeHtml(col.id)}}}"
        >
          ${escapeHtml(col.name)}
        </button>
      </th>
    `;
  }

  html += "</tr></thead><tbody>";

  for (const row of rows.slice(0, 10)) {
    html += "<tr>";

    for (const col of columns) {
      html += `<td>${escapeHtml(row[col.id] ?? "")}</td>`;
    }

    html += "</tr>";
  }

  html += "</tbody>";
  previewTable.innerHTML = html;

  const buttons = previewTable.querySelectorAll(".header-btn");

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const columnId = button.dataset.columnId;
      addPlaceholderElement(columnId);
    });
  }
}

// ------------------------------------------------------------
// GENEROVÁNÍ PDF
// ------------------------------------------------------------

// Vygeneruje PDF náhled z aktuální šablony, dat a obrázků. 
document.getElementById("btnGeneratePdf").addEventListener("click", async () => {
  generateStatus.textContent = "";

  const templateBlob = new Blob(
    [JSON.stringify(state.template, null, 2)],
    { type: "application/json" }
  );

  const dataFile = dataFileInput.files[0];
  if (!dataFile) {
    generateStatus.innerHTML = "<span class=\"error\">Nejprve nahraj datový soubor.</span>";
    return;
  }

  const missingImageFileNames = getMissingImageFileNames();

  if (missingImageFileNames.length > 0) {
    generateStatus.innerHTML = `
      <span class="error">
        Chybí obrázky pro export PDF: ${escapeHtml(missingImageFileNames.join(", "))}.
        Klikni na „Vybrat složku s obrázky“.
      </span>
    `;
    return;
  }

  const form = new FormData();
  form.append("templateFile", templateBlob, "template.json");
  form.append("dataFile", dataFile);
  form.append("fileNamePattern", fileNamePatternInput.value.trim() || "document");

  const imageElements = state.template.elements.filter(el => el.type === "image");
  const uniqueFileNames = [
    ...new Set(
      imageElements
        .map(el => el.source?.fileName)
        .filter(Boolean)
    )
  ];
  
  for (const fileName of uniqueFileNames) {
    const asset = state.imageAssets[fileName];
    if (!asset?.file) {
      continue;
    }
  
    form.append(`image_${fileName}`, asset.file, fileName);
  }

  try {
    const previewForm = cloneFormData(form);

    const previewRes = await fetch("/api/generate-pdf", {
      method: "POST",
      body: previewForm
    });
    
    if (!previewRes.ok) {
      let errorMessage = `Chyba při generování PDF. HTTP ${previewRes.status}`;
    
      const rawText = await previewRes.text();
      console.log("GENERATE PDF ERROR RESPONSE:", rawText);
    
      try {
        const json = JSON.parse(rawText);
        errorMessage = json.error || errorMessage;
      } catch {
        if (rawText.trim()) {
          errorMessage = rawText;
        }
      }
    
      generateStatus.innerHTML = `<span class="error">${escapeHtml(errorMessage)}</span>`;
      return;
    }
    
    const previewBlob = await previewRes.blob();
    const previewUrl = URL.createObjectURL(previewBlob);
    
    openPdfPreviewModal(previewUrl);
    
    generateStatus.innerHTML = "<span class=\"success\">PDF bylo vygenerováno a otevřeno v náhledu.</span>";
  } catch (err) {
    generateStatus.innerHTML = `<span class="error">${escapeHtml(err.message)}</span>`;
  }
});

// Vygeneruje ZIP, kde každý řádek dat vytvoří samostatné PDF. 
btnDownloadZipPdf.addEventListener("click", async () => {
  generateStatus.textContent = "";

  const templateBlob = new Blob(
    [JSON.stringify(state.template, null, 2)],
    { type: "application/json" }
  );

  const dataFile = dataFileInput.files[0];
  if (!dataFile) {
    generateStatus.innerHTML = "<span class=\"error\">Nejprve nahraj datový soubor.</span>";
    return;
  }

  const missingImageFileNames = getMissingImageFileNames();

  if (missingImageFileNames.length > 0) {
    generateStatus.innerHTML = `
      <span class="error">
        Chybí obrázky pro export PDF: ${escapeHtml(missingImageFileNames.join(", "))}.
        Klikni na „Vybrat složku s obrázky“.
      </span>
    `;
    return;
  }

  const form = new FormData();
  form.append("templateFile", templateBlob, "template.json");
  form.append("dataFile", dataFile);
  form.append("fileNamePattern", fileNamePatternInput.value.trim() || "document");

  const imageElements = state.template.elements.filter(el => el.type === "image");
  const uniqueFileNames = [
    ...new Set(
      imageElements
        .map(el => el.source?.fileName)
        .filter(Boolean)
    )
  ];

  for (const fileName of uniqueFileNames) {
    const asset = state.imageAssets[fileName];
    if (!asset?.file) {
      continue;
    }

    form.append(`image_${fileName}`, asset.file, fileName);
  }

  generateStatus.innerHTML = "<span class=\"small\">Generuji ZIP...</span>";

  const res = await fetch("/api/generate-pdf-zip", {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    let errorMessage = `Chyba při generování ZIP. HTTP ${res.status}`;

    const rawText = await res.text();
    console.log("GENERATE ZIP ERROR RESPONSE:", rawText);

    try {
      const json = JSON.parse(rawText);
      errorMessage = json.error || errorMessage;
    } catch {
      if (rawText.trim()) {
        errorMessage = rawText;
      }
    }

    generateStatus.innerHTML = `<span class="error">${escapeHtml(errorMessage)}</span>`;
    return;
  }

  const zipBlob = await res.blob();
  const zipUrl = URL.createObjectURL(zipBlob);

  const a = document.createElement("a");
  a.href = zipUrl;
  a.download = "documents.zip";
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(zipUrl);
  }, 1000);

  generateStatus.innerHTML = "<span class=\"success\">ZIP byl stažen.</span>";
});
// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

/**
 * Inicializuje editor po načtení stránky.
 * Počká na fonty, nastaví canvas a vyčistí formulář vlastností.
 */
async function initApp() {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  resizeCanvasByOrientation();
  renderImageInputs();
  clearSelectedElementForm();
}

initApp();