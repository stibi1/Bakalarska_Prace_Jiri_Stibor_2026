// ------------------------------------------------------------
// PLACEHOLDER NAHRAZENÍ
// ------------------------------------------------------------
// Tento modul obsahuje jednoduchou funkci pro nahrazování placeholderů
// v textu hodnotami z jednoho datového řádku.
//
// Placeholder má tvar například:
//   {{col_0}}
//   {{ col_3 }}
//
// Pokud je v textu nalezen placeholder, funkce se pokusí najít stejně
// pojmenovaný klíč v objektu row. Hodnota z datového řádku se potom
// vloží do výsledného textu.

/**
 * Nahradí placeholdery v zadaném textu hodnotami z jednoho řádku dat.
 *
 * @param {string} text - Text, ve kterém se mají hledat placeholdery.
 * @param {object} row - Jeden řádek dat, například { col_0: "2025001", col_3: "Příjemce" }.
 * @returns {string} Text s nahrazenými placeholdery. Neznámé nebo prázdné hodnoty se nahradí prázdným řetězcem.
 */
export function resolvePlaceholders(text, row) {
  // Funkce očekává textový vstup. Pokud by omylem přišlo něco jiného
  // například null, undefined nebo číslo, vrátí se prázdný řetězec.
  // Tím se zabrání chybě při volání metody replace().
  if (typeof text !== "string") {
    return "";
  }

  // Regulární výraz hledá zápis {{název_klíče}}.
  // Mezery uvnitř závorek jsou povolené, takže funguje {{col_0}} i {{ col_0 }}.
  // Povolené znaky v názvu klíče jsou písmena, čísla, podtržítko, tečka,
  // dolar a pomlčka.
  return text.replace(/\{\{\s*([a-zA-Z0-9_.$-]+)\s*\}\}/g, (_, key) => {
    // Z aktuálního řádku dat se vytáhne hodnota podle názvu placeholderu.
    const value = row[key];

    // Pokud hodnota neexistuje nebo je null, do textu se vloží prázdný řetězec.
    // Jinak se hodnota převede na string, aby šly bezpečně použít i čísla.
    return value === undefined || value === null ? "" : String(value);
  });
}
