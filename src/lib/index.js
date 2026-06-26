// ------------------------------------------------------------
// VEŘEJNÉ API KNIHOVNY
// ------------------------------------------------------------
// Tento soubor slouží jako centrální vstupní bod knihovní části aplikace.
// Ostatní části projektu mohou importovat funkce právě z tohoto souboru,
// místo aby musely znát přesné umístění jednotlivých modulů ve složce src/lib.
//
// Prakticky jde o takzvaný barrel file: shromažďuje exporty z více souborů
// a zpřehledňuje práci s knihovní částí aplikace.

// ------------------------------------------------------------
// VALIDACE ŠABLONY
// ------------------------------------------------------------
// validateTemplate() kontroluje, jestli má JSON šablona správnou strukturu.
// Používá se před generováním PDF, aby se chyba v šabloně zachytila dříve,
// než začne samotné vykreslování dokumentu.
export { validateTemplate } from "./template-validator.js";

// ------------------------------------------------------------
// GENEROVÁNÍ PDF A ZIP ARCHIVŮ
// ------------------------------------------------------------
// generatePdfFromTemplate()
//   Vygeneruje jeden PDF dokument z celé šablony a více řádků dat.
//   Typicky se používá pro náhled nebo pro vícestránkové PDF.
//
// generateSinglePdfFromRow()
//   Vygeneruje jeden PDF dokument pouze z jednoho řádku dat.
//   Používá se hlavně při ZIP exportu nebo při e-mailovém odesílání,
//   kdy jeden příjemce dostává jeden vlastní PDF soubor.
//
// generateZipFromTemplate()
//   Vygeneruje ZIP archiv, ve kterém každý řádek dat vytvoří samostatné PDF.
export {
  generatePdfFromTemplate,
  generateSinglePdfFromRow,
  generateZipFromTemplate
} from "./pdf-service.js";

// ------------------------------------------------------------
// MICROSOFT ENTRA / MICROSOFT GRAPH E-MAILY
// ------------------------------------------------------------
// getEntraAccessToken()
//   Získá access token z Microsoft Entra ID pomocí údajů z proměnných prostředí.
//
// sendMailWithPdf()
//   Odešle e-mail přes Microsoft Graph a připojí k němu PDF přílohu.
export {
  getEntraAccessToken,
  sendMailWithPdf
} from "./entra-mailer.js";
