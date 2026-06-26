// ------------------------------------------------------------
// MICROSOFT ENTRA / GRAPH MAILER
// ------------------------------------------------------------
// Tento modul řeší odesílání e-mailů přes Microsoft Graph.
// Používá tzv. client credentials flow, tedy přihlášení aplikace
// pomocí údajů ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET a ENTRA_TENANT_ID.
//
// Modul neřeší generování PDF. Dostává už hotové PDF bajty z jiné části
// aplikace a pouze je připojí jako přílohu k e-mailu.
//
// Důležité: údaje pro Entra aplikaci se nesmí zapisovat natvrdo do kódu.
// Mají být uložené v proměnných prostředí nebo v .env souboru, který není
// nahraný do GitHubu.

// ------------------------------------------------------------
// IMPORTY
// ------------------------------------------------------------

// Microsoft Graph klient zjednodušuje volání endpointů Graph API.
import { Client } from "@microsoft/microsoft-graph-client";

// isomorphic-fetch doplňuje fetch do Node prostředí tak, aby ho Graph klient
// i ruční request na token mohly používat podobně jako v prohlížeči.
import "isomorphic-fetch";

// ------------------------------------------------------------
// ENTRA / GRAPH KONFIGURACE
// ------------------------------------------------------------
// Tyto hodnoty se čtou z proměnných prostředí.
// Lokálně mohou být nastavené ručně v PowerShellu, načtené z .env přes dotenv,
// nebo na produkčním serveru předané přes systemd EnvironmentFile.

// ID aplikace registrované v Microsoft Entra ID.
const CLIENT_ID = process.env.ENTRA_CLIENT_ID;

// Tajný klíč aplikace. Tento údaj se musí chránit jako heslo.
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET;

// ID tenant prostředí, ve kterém je aplikace registrovaná.
const TENANT_ID = process.env.ENTRA_TENANT_ID;

// Kontrola, že server má všechny údaje potřebné pro získání tokenu.
// Pokud něco chybí, je lepší aplikaci zastavit hned při startu,
// než aby chyba vznikla až během hromadného odesílání faktur.
if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
  throw new Error("Chybí ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET nebo ENTRA_TENANT_ID.");
}

// ------------------------------------------------------------
// TOKEN
// ------------------------------------------------------------

/**
 * Získá access token pro Microsoft Graph.
 *
 * Funkce používá OAuth 2.0 client credentials flow:
 * - aplikace se přihlásí pomocí client_id a client_secret,
 * - token se vydá pro oprávnění nastavená v Entra aplikaci,
 * - token se potom použije při volání Microsoft Graph endpointů.
 *
 * @returns {Promise<string>} Access token použitelný pro Microsoft Graph.
 * @throws {Error} Pokud se token nepodaří získat.
 */
export async function getEntraAccessToken() {
  // Token endpoint konkrétního Microsoft tenant prostředí.
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  // Parametry požadované pro client_credentials flow.
  // Scope .default znamená, že se použijí aplikační oprávnění,
  // která jsou nastavená u Entra aplikace.
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });

  // Odeslání požadavku na token endpoint.
  // Microsoft očekává tělo ve formátu application/x-www-form-urlencoded.
  const response = await fetch(url, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  // Odpověď obsahuje buď access_token, nebo informace o chybě.
  const data = await response.json();

  // Pokud Microsoft vrátí HTTP chybu nebo chybové pole v JSONu,
  // předáme dál čitelnou chybovou hlášku.
  if (!response.ok || data.error) {
    throw new Error(
      `Nepodařilo se získat access token: ${data.error_description || data.error || response.statusText}`
    );
  }

  // Samotný token, který se následně použije při odesílání e-mailu.
  return data.access_token;
}

// ------------------------------------------------------------
// ODESLÁNÍ 1 E-MAILU S PDF PŘÍLOHOU
// ------------------------------------------------------------

/**
 * Odešle jeden e-mail s jednou PDF přílohou přes Microsoft Graph.
 *
 * Funkce předpokládá, že PDF už bylo vygenerováno jinde v aplikaci.
 * PDF bajty převede do Base64, vytvoří Graph API objekt zprávy
 * a odešle jej jménem zadané odesílací adresy.
 *
 * @param {object} options Nastavení e-mailu.
 * @param {string} options.accessToken Platný Microsoft Graph access token.
 * @param {string} options.senderEmail E-mailová adresa schránky, ze které se má odesílat.
 * @param {string} options.recipientEmail E-mailová adresa příjemce.
 * @param {string} options.subject Předmět e-mailu.
 * @param {string} options.message Text těla e-mailu.
 * @param {Uint8Array|Buffer|ArrayBuffer} options.pdfBytes Bajty PDF přílohy.
 * @param {string} options.fileName Název PDF přílohy v e-mailu.
 * @returns {Promise<void>}
 */
export async function sendMailWithPdf({
  accessToken,
  senderEmail,
  recipientEmail,
  subject,
  message,
  pdfBytes,
  fileName
}) {
  // Inicializace Graph klienta s jednoduchým authProviderem.
  // Graph klient si při každém requestu vyžádá token přes callback done().
  const client = Client.init({
    authProvider: done => done(null, accessToken)
  });

  // Microsoft Graph očekává obsah souborové přílohy jako Base64 string.
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  // Objekt zprávy ve formátu požadovaném endpointem /sendMail.
  const mail = {
    message: {
      // Předmět e-mailu. V api.js může být předem doplněný o placeholdery z dat.
      subject,

      // Textové tělo e-mailu. Aktuálně se odesílá jako prostý text, ne HTML.
      body: {
        contentType: "Text",
        content: message
      },

      // Seznam příjemců. Zde se posílá vždy jeden příjemce.
      // trim() odstraňuje případné mezery okolo adresy z tabulkových dat.
      toRecipients: [
        {
          emailAddress: {
            address: recipientEmail.trim()
          }
        }
      ],

      // Seznam příloh. Aktuálně aplikace přikládá jedno PDF.
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: fileName,
          contentBytes: pdfBase64
        }
      ]
    },

    // Uložení odeslané zprávy do složky Odeslaná pošta dané schránky.
    saveToSentItems: "true"
  };

  // Odeslání zprávy jménem konkrétní schránky.
  // Používá se /users/{senderEmail}/sendMail, protože jde o aplikační token.
  // Endpoint /me/sendMail by fungoval jen s delegovaným přihlášením uživatele.
  await client.api(`/users/${senderEmail}/sendMail`).post(mail);
}
