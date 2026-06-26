# Nasazení na Linux server

Tento dokument popisuje doporučený interní způsob nasazení aplikace na Linux server. Cílem je, aby Node aplikace běžela pouze lokálně na serveru a před ní byl Nginx s HTTPS a základním bezpečnostním nastavením.

## Doporučená produkční architektura

```text
uživatel → HTTPS → Nginx :443 → Node/Express :3000 na 127.0.0.1
```

Aplikace by v produkci neměla být přímo dostupná z internetu nebo interní sítě přes port `3000`. Port `3000` má být dostupný jen lokálně na serveru.

## Předpoklady

- Linux server s přístupem přes SSH,
- Node.js 18 nebo novější,
- npm,
- Git,
- Nginx,
- systemd,
- přístup k Microsoft Entra údajům, pokud se používá e-mailové odesílání.

## 1. Vytvoření uživatele pro aplikaci

Doporučuje se nespouštět aplikaci pod `root` uživatelem.

```bash
sudo adduser --system --group --home /var/www/pdf-template-editor appuser
```

## 2. Stažení aplikace

```bash
sudo mkdir -p /var/www/pdf-template-editor
sudo chown appuser:appuser /var/www/pdf-template-editor
sudo -u appuser git clone <URL_REPOZITARE> /var/www/pdf-template-editor
cd /var/www/pdf-template-editor
```

## 3. Instalace závislostí

```bash
sudo -u appuser npm install
```

Pro produkční instalaci lze použít:

```bash
sudo -u appuser npm ci --omit=dev
```

Použijte `npm ci`, pokud je v repozitáři aktuální `package-lock.json`.

## 4. Vytvoření `.env`

```bash
cd /var/www/pdf-template-editor
sudo -u appuser cp .env.example .env
sudo -u appuser nano .env
```

Příklad:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000

ENTRA_CLIENT_ID=00000000-0000-0000-0000-000000000000
ENTRA_CLIENT_SECRET=sem-patri-client-secret
ENTRA_TENANT_ID=00000000-0000-0000-0000-000000000000
```

Nastavení práv:

```bash
sudo chown appuser:appuser /var/www/pdf-template-editor/.env
sudo chmod 600 /var/www/pdf-template-editor/.env
```

## 5. Ověření ručního startu

```bash
cd /var/www/pdf-template-editor
sudo -u appuser bash -lc 'set -a; source .env; set +a; npm start'
```

V jiném terminálu:

```bash
curl http://127.0.0.1:3000
```

Pokud se vrátí HTML aplikace, server běží správně.

## 6. Systemd služba

Vzor je v souboru:

```text
deploy/systemd/pdf-template-editor.service
```

Zkopírování:

```bash
sudo cp deploy/systemd/pdf-template-editor.service /etc/systemd/system/pdf-template-editor.service
sudo systemctl daemon-reload
sudo systemctl enable pdf-template-editor
sudo systemctl start pdf-template-editor
```

Kontrola stavu:

```bash
sudo systemctl status pdf-template-editor
```

Logy:

```bash
sudo journalctl -u pdf-template-editor -f
```

Restart po úpravách:

```bash
sudo systemctl restart pdf-template-editor
```

## 7. Nginx reverse proxy

Vzor je v:

```text
deploy/nginx/pdf-template-editor.conf
```

Zkopírování:

```bash
sudo cp deploy/nginx/pdf-template-editor.conf /etc/nginx/sites-available/pdf-template-editor.conf
sudo ln -s /etc/nginx/sites-available/pdf-template-editor.conf /etc/nginx/sites-enabled/pdf-template-editor.conf
sudo nginx -t
sudo systemctl reload nginx
```

V konfiguraci je nutné upravit:

- `server_name`,
- případné cesty k certifikátům,
- povolené IP rozsahy, pokud má být aplikace dostupná jen interně.

## 8. HTTPS

Pokud server používá veřejnou doménu, lze HTTPS řešit například přes certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d faktury.example.cz
```

Pokud jde čistě o interní server, použijte interní certifikační autoritu nebo reverzní proxy organizace.

## 9. Firewall

Příklad pro UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 3000/tcp
sudo ufw enable
sudo ufw status
```

Důležité: port `3000` se v produkci nemá otevírat do sítě. Nginx komunikuje s Node aplikací lokálně přes `127.0.0.1:3000`.

## 10. Bezpečnostní nastavení v Nginx

Doporučené prvky:

- `server_tokens off;`,
- `client_max_body_size 50m;`,
- bezpečnostní hlavičky,
- HTTPS,
- omezení přístupu na interní IP rozsahy, pokud je to potřeba,
- dostatečné proxy timeouty pro generování větších PDF/ZIP souborů.

Příklad omezení na interní síť:

```nginx
allow 10.0.0.0/8;
allow 172.16.0.0/12;
allow 192.168.0.0/16;
deny all;
```

Tento blok patří do `location /` nebo do `server` bloku podle požadovaného rozsahu omezení.

## 11. Microsoft Entra / Graph

Pro e-mailové odesílání musí být v Microsoft Entra vytvořená aplikace, která má oprávnění pro Microsoft Graph odesílání e-mailů.

Aplikace používá client credentials tok:

```text
client_id + client_secret + tenant_id → access token → /users/{senderEmail}/sendMail
```

Interně je potřeba evidovat:

- Tenant ID,
- Client ID,
- datum expirace client secretu,
- kdo má oprávnění secret obnovit,
- jaký účet se používá jako odesílatel,
- zda je odesílání omezené na konkrétní mailbox.

## 12. Aktualizace aplikace

```bash
cd /var/www/pdf-template-editor
sudo -u appuser git pull
sudo -u appuser npm ci --omit=dev
sudo systemctl restart pdf-template-editor
sudo systemctl status pdf-template-editor
```

Po aktualizaci zkontrolujte:

1. otevření aplikace v prohlížeči,
2. načtení testovacího CSV/XLSX,
3. vygenerování PDF náhledu,
4. ZIP export,
5. e-mailový test na jeden interní příjemce.

## 13. Rollback

Pokud po aktualizaci aplikace nefunguje:

```bash
cd /var/www/pdf-template-editor
git log --oneline -5
sudo -u appuser git checkout <POSLEDNI_FUNKCNI_COMMIT>
sudo -u appuser npm ci --omit=dev
sudo systemctl restart pdf-template-editor
```

Po rollbacku je vhodné vytvořit issue nebo interní záznam, proč byla verze vrácena.

## 14. Kontrolní seznam před předáním serveru

- [ ] Aplikace běží přes systemd.
- [ ] `.env` existuje a má práva `600`.
- [ ] Port `3000` není otevřený do sítě.
- [ ] Nginx proxy funguje.
- [ ] HTTPS funguje.
- [ ] Upload většího testovacího souboru projde.
- [ ] PDF náhled odpovídá šabloně.
- [ ] ZIP export funguje.
- [ ] Odeslání testovacího e-mailu funguje.
- [ ] Je zdokumentované, kdy expiruje Entra client secret.
- [ ] Je uložená aktuální testovací šablona a testovací datový soubor.
