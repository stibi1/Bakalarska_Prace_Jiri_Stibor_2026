# Provozní manuál

Tento dokument popisuje běžnou práci s aplikací z pohledu interního provozu. Je určený pro zaměstnance, kteří aplikaci používají nebo spravují.

## Role

### Běžný uživatel

- načítá data,
- vytváří nebo používá šablony,
- generuje PDF a ZIP,
- případně odesílá e-maily.

### Správce aplikace

- spravuje server,
- aktualizuje aplikaci,
- řeší `.env`, Entra údaje, Nginx a systemd,
- kontroluje logy,
- řeší chyby při odesílání.

## Běžný postup generování PDF

1. Otevřít aplikaci.
2. Nahrát datový soubor.
3. Zkontrolovat náhled tabulky a sloupce `col_X`.
4. Načíst existující šablonu nebo vytvořit novou.
5. Zkontrolovat placeholdery.
6. Vybrat složku s obrázky, pokud šablona používá logo nebo razítko.
7. Kliknout na `Vygenerovat PDF`.
8. Zkontrolovat náhled.
9. Stáhnout jedno PDF nebo ZIP.

## Běžný postup odesílání e-mailů

1. Nejdřív vygenerovat a zkontrolovat PDF náhled.
2. Ověřit, že datový soubor obsahuje e-mailové adresy.
3. Ověřit, že aplikace používá správný e-mailový sloupec, například `col_9`.
4. Otevřít e-mailový modal.
5. Zkontrolovat odesílatele.
6. Zkontrolovat předmět a text e-mailu.
7. Odeslat nejdřív malý testovací vzorek, pokud je to možné.
8. Po hromadném odeslání zkontrolovat počet úspěšných a chybných odeslání.
9. U chybných řádků opravit data a odeslat znovu jen opravené záznamy.

## Doporučený interní testovací balíček

V repozitáři nebo v interním úložišti je vhodné držet:

```text
test-data/
├─ faktury-test.csv
├─ faktury-test.xlsx
├─ template-test.json
└─ images/
   ├─ logo.png
   └─ razitko.png
```

Tento balíček by neměl obsahovat skutečné osobní údaje ani reálné faktury.

## Restart aplikace

```bash
sudo systemctl restart pdf-template-editor
```

Kontrola:

```bash
sudo systemctl status pdf-template-editor
```

## Sledování logů

```bash
sudo journalctl -u pdf-template-editor -f
```

Posledních 200 řádků:

```bash
sudo journalctl -u pdf-template-editor -n 200
```

## Restart Nginxu

Po změně Nginx konfigurace:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Pokud test `nginx -t` selže, Nginx nereloadovat a nejdřív opravit konfiguraci.

## Aktualizace aplikace

```bash
cd /var/www/pdf-template-editor
sudo -u appuser git pull
sudo -u appuser npm ci --omit=dev
sudo systemctl restart pdf-template-editor
```

Po aktualizaci vždy otestovat:

- otevření aplikace,
- načtení dat,
- PDF náhled,
- ZIP export,
- e-mail na interní testovací adresu.

## Záloha důležitých souborů

Zálohovat by se mělo hlavně:

- aktuální šablony `.json`,
- interní testovací data bez osobních údajů,
- dokumentace k Entra aplikaci,
- Nginx konfigurace,
- systemd služba,
- informace o doméně a HTTPS certifikátu.

Soubor `.env` obsahuje tajné údaje. Jeho záloha musí být uložená bezpečně a nesmí být ve veřejném repozitáři.

## Předávání novému zaměstnanci

Novému správci aplikace předejte:

- odkaz na repozitář,
- tuto dokumentaci,
- přístup na server,
- informaci, kde je produkční `.env`,
- informaci, kde jsou uložené šablony,
- testovací datový balíček,
- kontakt na správce Microsoft Entra aplikace,
- datum expirace client secretu,
- postup pro obnovu secretu.

## Provozní kontrolní seznam jednou za čas

- [ ] Funguje HTTPS certifikát.
- [ ] Neexpiruje Microsoft Entra client secret.
- [ ] Aplikace generuje PDF z testovacích dat.
- [ ] E-mailové odesílání funguje na testovací adresu.
- [ ] Server má dostatek místa.
- [ ] Logy neobsahují opakující se chyby.
- [ ] Repozitář neobsahuje `.env` ani reálné faktury.
