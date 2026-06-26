# Formát šablony

Šablona je JSON objekt, který popisuje stránku a prvky umístěné na stránce. Ukládá se a načítá jako `.json` soubor.

Souřadnice v editoru vycházejí z levého horního rohu. Pro PDF se interně převádějí do souřadnicového systému PDF.

## Základní struktura

```json
{
  "version": 1,
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margin": 0
  },
  "elements": []
}
```

## Stránka

| Vlastnost | Povolené hodnoty | Popis |
| --- | --- | --- |
| `size` | `A4` | Aktuálně podporovaná velikost stránky. |
| `orientation` | `portrait`, `landscape` | Orientace stránky. |
| `margin` | číslo | Rezervovaná hodnota. Aplikace pracuje hlavně s absolutními souřadnicemi. |

Rozměry A4 v PDF bodech:

| Orientace | Šířka | Výška |
| --- | ---: | ---: |
| `portrait` | `595.28` | `841.89` |
| `landscape` | `841.89` | `595.28` |

## Placeholdery

Placeholder je text ve tvaru:

```text
{{col_0}}
```

Při generování se nahradí hodnotou z aktuálního řádku dat.

Příklad:

```text
Faktura č. {{col_0}}
```

Pokud má první řádek dat hodnotu `2025001`, ve výsledném PDF bude:

```text
Faktura č. 2025001
```

Placeholdery se používají také v:

- názvu PDF souborů,
- předmětu e-mailu,
- těle e-mailu.

## Sloupce dat

Po načtení dat aplikace používá technické názvy podle pořadí sloupců:

```text
col_0, col_1, col_2, col_3, ...
```

Příklad mapování:

| Pořadí ve vstupním souboru | Interní název |
| ---: | --- |
| 1. sloupec | `col_0` |
| 2. sloupec | `col_1` |
| 3. sloupec | `col_2` |
| 10. sloupec | `col_9` |

Při změně pořadí sloupců ve vstupním CSV/XLSX souboru je nutné zkontrolovat šablonu.

## Textový prvek

```json
{
  "id": "text_1",
  "type": "text",
  "x": 40,
  "y": 60,
  "w": 250,
  "h": 80,
  "text": "Faktura č. {{col_0}}",
  "style": {
    "fontFamily": "DejaVuSans",
    "fontSize": 12,
    "color": "#000000",
    "bold": true,
    "align": "left",
    "lineHeight": 1.2,
    "paddingTop": 2,
    "paddingLeft": 2
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `id` | Jedinečný identifikátor prvku. |
| `type` | Musí být `text`. |
| `x`, `y` | Pozice levého horního rohu. |
| `w`, `h` | Šířka a výška textového boxu. |
| `text` | Text, může obsahovat placeholdery. |
| `style.fontFamily` | Použitý font. Výchozí je `DejaVuSans`. |
| `style.fontSize` | Velikost písma. |
| `style.color` | Barva textu ve formátu `#RRGGBB`. |
| `style.bold` | Tučný řez. |
| `style.align` | `left`, `center`, `right`. |
| `style.lineHeight` | Řádkování. |
| `style.paddingTop`, `style.paddingLeft` | Vnitřní odsazení textu. |

## Obdélník

```json
{
  "id": "rect_1",
  "type": "rect",
  "x": 40,
  "y": 100,
  "w": 200,
  "h": 80,
  "style": {
    "strokeColor": "#000000",
    "strokeWidth": 1,
    "fillColor": null
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `x`, `y` | Pozice levého horního rohu. |
| `w`, `h` | Šířka a výška. |
| `strokeColor` | Barva okraje. |
| `strokeWidth` | Tloušťka okraje. |
| `fillColor` | Výplň, nebo `null` bez výplně. |

## Čára

```json
{
  "id": "line_1",
  "type": "line",
  "x1": 40,
  "y1": 100,
  "x2": 300,
  "y2": 100,
  "style": {
    "strokeColor": "#000000",
    "strokeWidth": 1
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `x1`, `y1` | Začátek čáry. |
| `x2`, `y2` | Konec čáry. |
| `strokeColor` | Barva čáry. |
| `strokeWidth` | Tloušťka čáry. |

## Obrázek

```json
{
  "id": "image_1",
  "type": "image",
  "x": 40,
  "y": 40,
  "w": 120,
  "h": 60,
  "source": {
    "fileName": "logo.png",
    "relativePath": "logo.png"
  }
}
```

| Vlastnost | Popis |
| --- | --- |
| `x`, `y` | Pozice levého horního rohu. |
| `w`, `h` | Šířka a výška obrázku. |
| `source.fileName` | Název obrázku. Musí odpovídat nahranému souboru. |
| `source.relativePath` | Relativní cesta použitá při práci se složkou obrázků. |

Podporované obrázky:

- PNG,
- JPG/JPEG.

Po načtení šablony je potřeba znovu vybrat složku s obrázky, pokud je prohlížeč už nemá k dispozici.

## Validace šablony

Validátor kontroluje:

- existenci `page`,
- podporovanou velikost stránky,
- podporovanou orientaci,
- existenci pole `elements`,
- podporovaný typ prvku,
- číselné souřadnice a rozměry,
- barvy ve formátu `#RRGGBB`,
- strukturu `source` u obrázků.

## Praktická doporučení pro tvorbu šablony

- Nejdřív načtěte reálný datový soubor a ověřte mapování sloupců.
- Do šablony pište vždy technické placeholdery `{{col_X}}`.
- Šablonu průběžně ukládejte jako JSON.
- Po úpravě šablony vždy vygenerujte náhled PDF.
- Pokud používáte obrázky, držte je ve stejné složce jako šablonu nebo v jasně pojmenované podsložce.
- Po přenosu šablony na jiný počítač je obvykle nutné znovu vybrat složku s obrázky.
