// ------------------------------------------------------------
// PRÁCE S OBRÁZKY
// ------------------------------------------------------------
// Tento modul obsahuje jednoduchou pomocnou funkci pro dohledání
// obrázku podle jeho imageKey.
//
// V šabloně se obrázkový prvek neodkazuje přímo na binární data obrázku,
// ale používá textový klíč, například:
//   image_0
//   logo.png
//   razitko.jpg
//
// Skutečná data obrázků se předávají zvlášť v objektu images.
// Úkolem tohoto modulu je bezpečně zjistit, jestli v tomto objektu existuje
// obrázek odpovídající zadanému klíči.

/**
 * Vrátí obrázek podle zadaného klíče.
 *
 * @param {object} images
 * Objekt s dostupnými obrázky. Klíčem je název nebo identifikátor obrázku
 * a hodnotou jsou data obrázku připravená pro další zpracování.
 *
 * @param {string} imageKey
 * Klíč obrázku, který je uložený v obrázkovém prvku šablony.
 *
 * @returns {*|null}
 * Vrací nalezený obrázek. Pokud objekt images neexistuje, není objektem,
 * nebo obrázek pod zadaným klíčem není dostupný, vrací null.
 */
export function getImageByKey(images, imageKey) {
  // Pokud obrázky nebyly předány nebo mají neplatný formát,
  // nemá smysl v nich hledat. Funkce proto bezpečně vrátí null.
  if (!images || typeof images !== "object") {
    return null;
  }

  // Vrátí obrázek uložený pod zadaným klíčem.
  // Operátor ?? zajistí, že při undefined nebo null výsledku vrátíme null,
  // takže další části aplikace nemusí řešit více různých prázdných hodnot.
  return images[imageKey] ?? null;
}
