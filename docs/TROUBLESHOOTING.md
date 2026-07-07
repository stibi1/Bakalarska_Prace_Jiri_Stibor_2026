# Řešení problémů

## Aplikace se nespustí

### Kontrola stavu

```bash
sudo systemctl status pdf-template-editor
sudo journalctl -u pdf-template-editor -n 100
```

### Časté příčiny

| Problém | Příčina | Řešení |
| --- | --- | --- |
| `Chybí ENTRA_CLIENT_ID...` | Nejsou načtené proměnné prostředí. | Zkontrolovat `.env` a `EnvironmentFile` v systemd. |
| `EADDRINUSE` | Port už používá jiný proces. | Změnit `PORT` nebo zastavit druhý proces. |
| `Cannot find module` | Nejsou nainstalované závislosti. | Spustit `npm install` nebo `npm ci`. |
| `Permission denied` | Aplikační uživatel nemá práva k adresáři. | Opravit vlastníka a práva. |

## Webová stránka se neotevře

1. Ověřit Node aplikaci:

```bash
curl http://127.0.0.1:3000
```

2. Ověřit Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

3. Ověřit firewall:

```bash
sudo ufw status
```

4. Ověřit DNS/doménu, pokud se používá doména.

## Chyba při uploadu souboru

Možné příčiny:

- soubor je větší než limit v `multer`,
- soubor je větší než `client_max_body_size` v Nginxu,
- nepodporovaná přípona,
- poškozený Excel/CSV soubor.

Kontrola limitů:

```text
server.js                      express.json({ limit: "10mb" })
src/routes/api.js              fileSize: 20 * 1024 * 1024
Nginx konfigurace              client_max_body_size 50m;
```

## CSV má špatnou diakritiku

Aplikace se pokouší detekovat kódování. Podporovaná jsou mimo jiné:

- `utf-8`,
- `windows-1250`,
- `iso-8859-2`,
- `utf-16le`.

Pokud se diakritika načte špatně:

1. Otevřít CSV v editoru, který umí zobrazit kódování.
2. Uložit jako UTF-8.
3. Znovu nahrát do aplikace.

## PDF náhled nesedí s canvasem

Možné příčiny:

- rozdílný font ve frontendu a backendu,
- chybí `public/fonts/DejaVuSans.ttf`,
- chybí `src/lib/assets/fonts/DejaVuSans.ttf`,
- prohlížeč načetl starou verzi CSS/JS z cache.

Řešení:

1. Vyčistit cache prohlížeče.
2. Ověřit fonty v `public/fonts/` a `src/lib/assets/fonts/`.
3. Vygenerovat nový PDF náhled.

## Obrázek se nezobrazí v PDF

Možné příčiny:

- po načtení šablony nebyla vybrána složka s obrázky,
- název obrázku v šabloně neodpovídá souboru,
- obrázek je v nepodporovaném formátu,
- soubor je poškozený.

Podporované formáty:

- PNG,
- JPG/JPEG.

Postup:

1. Zkontrolovat `source.fileName` v šabloně.
2. Vybrat složku s obrázky tlačítkem `Vybrat složku s obrázky`.
3. Zkusit obrázek uložit znovu jako PNG nebo JPG.

## ZIP se nevygeneruje

Možné příčiny:

- příliš velký datový soubor,
- velké obrázky,
- nevalidní šablona,
- timeout v Nginxu.

Zkontrolovat:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
client_max_body_size 50m;
```

## E-maily se neodesílají

### Zkontrolovat proměnné prostředí

```bash
sudo systemctl show pdf-template-editor --property=Environment
```

Pozor: tento příkaz může ukázat tajné hodnoty. Používat opatrně.

Bezpečnější je zkontrolovat existenci `.env` a systemd konfiguraci:

```bash
sudo cat /etc/systemd/system/pdf-template-editor.service
sudo ls -l /var/www/pdf-template-editor/.env
```

### Časté příčiny

| Problém | Příčina | Řešení |
| --- | --- | --- |
| `Nepodařilo se získat access token` | Špatný tenant/client/secret. | Ověřit `.env` a Entra aplikaci. |
| `Unauthorized` nebo `Forbidden` | Chybí oprávnění Graph. | Ověřit Microsoft Graph permissions a admin consent. |
| Chybí e-mail ve sloupci `col_X` | Špatně zvolený sloupec nebo prázdná buňka. | Opravit data nebo změnit `recipientColumnKey`. |
| Odesílatel neexistuje | `senderEmail` není mailbox v tenantovi. | Upravit výchozí odesílatele. |

## Chybí e-mail ve sloupci `col_9`

Tato chyba znamená, že aplikace v daném řádku hledala příjemce ve sloupci `col_9`, ale hodnota byla prázdná.

Řešení:

1. Otevřít náhled tabulky po nahrání dat.
2. Najít, ve kterém sloupci je e-mail.
3. Pokud je e-mail například v osmém sloupci, použít `col_7`.
4. Upravit `public/app.js` podle `docs/CONFIGURATION.md`.

## Po změně kódu se nic nezměnilo

Možné příčiny:

- nebyl restartovaný systemd proces,
- prohlížeč má starý JS/CSS v cache,
- změna proběhla v jiné kopii repozitáře,
- Nginx servíruje jinou aplikaci.

Postup:

```bash
sudo systemctl restart pdf-template-editor
sudo systemctl reload nginx
```

V prohlížeči provést tvrdé obnovení stránky.
