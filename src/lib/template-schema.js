// ------------------------------------------------------------
// SCHÉMA A VÝCHOZÍ HODNOTY ŠABLONY
// ------------------------------------------------------------
// Tento soubor neobsahuje žádnou výkonnou logiku. Slouží jako jedno
// centrální místo, kde jsou definované povolené hodnoty a výchozí styly
// pro PDF šablony.
//
// Hodnoty z tohoto souboru používají další části aplikace, hlavně:
// - validátor šablon,
// - editor šablon,
// - PDF renderer.
//
// Pokud se má do aplikace přidat nový typ prvku, nová velikost stránky
// nebo jiné výchozí chování, obvykle je potřeba začít právě tady.

// ------------------------------------------------------------
// PODPOROVANÉ VELIKOSTI A ORIENTACE STRÁNKY
// ------------------------------------------------------------

// Seznam velikostí stránky, které aplikace aktuálně dovoluje v šabloně.
// V tuto chvíli je podporovaná pouze A4.
export const SUPPORTED_PAGE_SIZES = ["A4"];

// Povolené orientace stránky.
// Hodnota "portrait" znamená stránku na výšku, "landscape" na šířku.
export const SUPPORTED_ORIENTATIONS = ["portrait", "landscape"];

// Typy prvků, které může šablona obsahovat.
// Každý prvek v template JSON musí mít jeden z těchto typů.
export const SUPPORTED_ELEMENT_TYPES = ["text", "rect", "line", "image"];

// ------------------------------------------------------------
// VÝCHOZÍ STYL TEXTOVÉHO PRVKU
// ------------------------------------------------------------

// Výchozí hodnoty pro textové prvky.
// Použijí se tam, kde konkrétní textový prvek v šabloně nemá vlastní
// hodnotu, nebo kde editor vytváří nový textový prvek.
export const DEFAULT_TEXT_STYLE = {
  // Název rodiny písma používané při vykreslování PDF.
  // Musí odpovídat fontům, které umí načíst renderer.
  fontFamily: "DejaVuSans",

  // Výchozí velikost textu v PDF bodech.
  fontSize: 12,

  // Výchozí barva textu ve formátu HEX.
  color: "#000000",

  // Výchozí zarovnání textu uvnitř textového boxu.
  // Podporované hodnoty jsou typicky "left", "center" a "right".
  align: "left",

  // Násobek velikosti písma použitý jako výška řádku.
  // Hodnota 1.2 znamená, že řádek bude mít přibližně 120 % velikosti písma.
  lineHeight: 1.2,

  // Vnitřní odsazení textu od horní hrany textového boxu v PDF bodech.
  paddingTop: 2,

  // Vnitřní odsazení textu od levé hrany textového boxu v PDF bodech.
  paddingLeft: 2
};

// ------------------------------------------------------------
// VÝCHOZÍ STYL OBDÉLNÍKU
// ------------------------------------------------------------

// Výchozí hodnoty pro obdélníkové prvky.
// Obdélník může mít obrys, výplň, nebo obojí.
export const DEFAULT_SHAPE_STYLE = {
  // Barva obrysu obdélníku ve formátu HEX.
  strokeColor: "#000000",

  // Tloušťka obrysu v PDF bodech.
  strokeWidth: 1,

  // Barva výplně obdélníku.
  // Hodnota null znamená, že obdélník nebude mít výplň.
  fillColor: null
};

// ------------------------------------------------------------
// VÝCHOZÍ STYL ČÁRY
// ------------------------------------------------------------

// Výchozí hodnoty pro čárové prvky.
export const DEFAULT_LINE_STYLE = {
  // Barva čáry ve formátu HEX.
  strokeColor: "#000000",

  // Tloušťka čáry v PDF bodech.
  strokeWidth: 1
};

// ------------------------------------------------------------
// ROZMĚRY STRÁNEK
// ------------------------------------------------------------

// Rozměry podporovaných stránek v PDF bodech.
// PDF používá body, ne milimetry ani pixely.
// A4 na výšku má přibližně 595.28 × 841.89 bodu.
export const PAGE_SIZES = {
  A4: {
    // A4 na výšku.
    portrait: { width: 595.28, height: 841.89 },

    // A4 na šířku.
    landscape: { width: 841.89, height: 595.28 }
  }
};
