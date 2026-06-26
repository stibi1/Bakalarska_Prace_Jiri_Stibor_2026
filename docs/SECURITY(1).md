# Bezpečnostní poznámky

Tento dokument shrnuje bezpečnostní nastavení a provozní pravidla pro interní nasazení aplikace.

## Tajné údaje

Do repozitáře nepatří:

- `.env`,
- Microsoft Entra client secret,
- reálné faktury,
- reálné datové soubory s osobními údaji,
- PDF výstupy obsahující osobní nebo účetní data,
- produkční certifikáty a privátní klíče.

V repozitáři může být pouze `.env.example`, protože neobsahuje skutečné tajné hodnoty.

## Práva k `.env`

Na serveru:

```bash
sudo chown appuser:appuser /var/www/pdf-template-editor/.env
sudo chmod 600 /var/www/pdf-template-editor/.env
```

## Přístup k aplikaci

Doporučené produkční nastavení:

```text
Internet/interní síť → Nginx :443 → Node aplikace na 127.0.0.1:3000
```

Port `3000` nemá být otevřený zvenčí.

## Nginx

Nginx by měl řešit:

- HTTPS,
- reverzní proxy,
- maximální velikost uploadu,
- základní bezpečnostní hlavičky,
- volitelně omezení na interní IP rozsahy.

Příklad omezení na interní sítě:

```nginx
allow 10.0.0.0/8;
allow 172.16.0.0/12;
allow 192.168.0.0/16;
deny all;
```

## Microsoft Graph

E-mailové odesílání používá aplikační oprávnění. Proto je potřeba hlídat:

- kdo má přístup k client secretu,
- kdy client secret expiruje,
- na jaký mailbox může aplikace odesílat,
- zda nejsou oprávnění širší, než je nutné.

Pokud organizace podporuje omezení aplikačního přístupu na konkrétní mailbox, je vhodné ho použít.

## Osobní údaje a faktury

Datové soubory a vygenerovaná PDF mohou obsahovat osobní nebo účetní údaje. Proto:

- testovací data by měla být anonymizovaná,
- reálné výstupy neukládat do Gitu,
- ZIP/PDF soubory mazat z pracovních stanic podle interních pravidel,
- při chybě odesílání zkontrolovat, že nedošlo k odeslání na špatnou adresu.

## Kontrolní seznam bezpečného nasazení

- [ ] `.env` není v repozitáři.
- [ ] `.env` má práva `600`.
- [ ] Node aplikace poslouchá na `127.0.0.1`.
- [ ] Port `3000` není otevřený ve firewallu.
- [ ] Nginx používá HTTPS.
- [ ] Je nastavený rozumný `client_max_body_size`.
- [ ] Entra client secret má evidované datum expirace.
- [ ] Repozitář neobsahuje reálná data.
