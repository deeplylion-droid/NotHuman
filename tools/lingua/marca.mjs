// Trova i testi da tradurre nel codice del gioco e li segna con T (vedi gioco/js/lingua.js).
//   node tools/lingua/marca.mjs elenco [file...]   i testi trovati ("testo") e le parole lasciate stare ("dubbio")
//   node tools/lingua/marca.mjs segna [file...]    avvolge i testi in T("...") o T`...` e aggiunge l'import
//   node tools/lingua/marca.mjs catalogo           raccoglie le chiavi di T in tools/lingua/catalogo.json
//   node tools/lingua/marca.mjs nuove              i testi del catalogo ancora senza traduzione, in parti/nuove-<data>.json
//   node tools/lingua/marca.mjs incroci            i testi da tradurre che il codice usa anche come nomi
// Quando si aggiungono testi al gioco: segna, catalogo, nuove; poi si traduce parti/nuove-<data>.json in
// parti/nuove-<data>_en.json (con GUIDA.md) e si scrive il catalogo del gioco con controlla.mjs scrivi.
// Una stringa e' "codice" quando fa da nome (id, classi, selettori, percorsi, suoni, icone, chiavi, confronti) e
// "testo" quando si legge sullo schermo. Le frasi sono testo e le parole minuscole codice, salvo il posto dove
// stanno (gli argomenti delle funzioni e le proprieta' qui sotto). Le eccezioni scelte a mano sono in
// eccezioni.json: "codice" e "testo", con "file:riga:testo" (o "file:testo" per tutte le righe).
// La prova che non manchi niente e' la lingua finta (#prova-xx): ogni testo segnato si vede tra ⟦ ⟧.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import MagicString from "magic-string";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(QUI, "../../gioco/js");
export const FILE = ["dati.js", "giorno2.js", "giorno3.js", "gioco.js", "stanza.js", "primapagina.js", "parole.js", "controller.js"];
const ECCEZIONI = fs.existsSync(path.join(QUI, "eccezioni.json")) ? JSON.parse(fs.readFileSync(path.join(QUI, "eccezioni.json"), "utf8")) : {};

// gli argomenti che si leggono (indice, o "*" per tutti da quell'indice in poi) e quelli che sono nomi
const ARG_TESTO = {
  el: [2, 3, 4, 5], bottone: [0], tasto: [0], notifica: [0], aiuto: [0], riga: [0, 1], segnoFax: [1, 2], sceltaStato: [1, 2],
  quante: [1, 2], scelta: [0, 1], timbro: [0], timbra: [0], voce: [0], mostraEtichetta: [0], testaFax: [0], bloccoFax: [0],
  rigaTacche: [0, 5], rigaScelte: [0], passo: [2], spillo: [4], colpo: [1], scrivi: [1], fillText: [0], measureText: [0],
  createTextNode: [0], push: [0], mostra: [1], righe: [1], dici: [], didascalia: [0], avvisa: [0], titoloStanza: [0],
};
const ARG_CODICE = new Set([
  "querySelector", "querySelectorAll", "getElementById", "closest", "matches", "matchMedia", "createElement", "createElementNS",
  "getAttribute", "removeAttribute", "hasAttribute", "toggleAttribute", "addEventListener", "removeEventListener",
  "add", "remove", "toggle", "contains", "replace", "getItem", "setItem", "removeItem", "fetch", "Error", "TypeError", "log", "warn",
  "error", "info", "debug", "time", "timeEnd", "ambiente", "suona", "musica", "icona", "pittogramma", "getContext", "toDataURL",
  "includes", "startsWith", "endsWith", "split", "join", "indexOf", "lastIndexOf", "has", "get", "delete", "padStart", "padEnd",
  "postMessage", "carica", "immagine", "img", "url", "requestPointerLock", "setProperty", "removeProperty", "getPropertyValue",
  "parse", "test", "exec", "match", "matchAll", "RegExp", "Date", "Symbol", "URL", "Image", "Worker", "Blob", "Event",
  "CustomEvent", "KeyboardEvent", "MouseEvent", "dispatchEvent", "vai", "vaiLuogo", "vaiStanza", "apriFoglio", "fase", "nebbia",
  "Color", "setHex", "setStyle", "scrollIntoView", "insertAdjacentHTML", "addColorStop", "c", "oggi", "ieri2", "registra",
  "mode", "imposta", "segna", "mostraIndicatori", "mettiSulNastro", "ha", "inPosa", "prestito", "apriVisita", "concludi",
  "casella", "filo", "ellissi", "togli", "nodo", "parete", "evento", "caricaModello", "piano", "segnaOra", "hasOwn", "scorribile",
  "deleteAttribute", "set", "svgEl", "blocco", "pacco", "suonaUna", "pezzi", "maiuscolo", "esameFatto", "stato", "donna",
]);
// gli indici che sono nomi nelle funzioni con testo (el: tag e classe; bottone: classe e icona...)
const ARG_NOME = { el: [0, 1], bottone: [2, 3], tasto: [2, 3], segnoFax: [0, 3], sceltaStato: [0], timbro: [1], timbra: [3], spillo: [0], setAttribute: [0], passo: [0] };
// le proprieta' che si leggono e quelle che sono nomi
const PROP_TESTO = new Set(["testo", "reperto", "nome", "ruolo", "mestiere", "meta", "breve", "titolo", "didascalia", "sommario", "articolo",
  "pubblicita", "muto", "arriva", "perche", "timbro", "nota", "lettera", "data", "etichetta", "scritta", "anagrafe"]);
const PROP_CODICE = new Set(["id", "tipo", "casa", "luogo", "stato", "voce", "volto", "k", "d", "prova", "poi", "ritorno", "persona", "parte",
  "zona", "img", "src", "classe", "class", "icona", "pitto", "suono", "lato", "chi", "dove", "porta", "chiave", "link", "cls", "colore",
  "tono", "pacco", "scena", "vista", "verso", "modo", "fase", "segno", "esito", "finale", "traccia", "oggetto", "evento", "azione",
  "animazione", "espressione", "base", "strato", "maschera", "mappa", "file", "ambiente", "vai", "sblocca", "conosci", "calore",
  "barra", "detta", "esame", "se", "cosa", "provvedimento", "ospite_id", "filtro", "block", "behavior", "inline", "key", "code"]);
// le proprieta' assegnate che si leggono e quelle che sono nomi
const ASSEGNA_TESTO = new Set(["textContent", "innerText", "title", "placeholder", "alt", "ariaLabel", "value"]);
// le proprieta' che in un file decide il contenuto (in stanza.js "nome" e' sia il nome degli oggetti, "La scrivania", sia
// quello dei modelli, "scrivania")
const PROP_DAL_CONTENUTO = { "stanza.js": ["nome"] };
let FILE_ORA = "";
const PAROLE_UGUALI = new Set(["REC", "PLAY", "IR", "YXZ", "MALVENTO"]);

let VOCI = null; // le voci dei dialoghi (PADRE, FIGLIA...): nomi, che si traducono quando si scrivono (parole.js)

function contenuto(s) {
  const t = s.trim();
  if (!/[A-Za-zÀ-ÿ]/.test(t) || t.length === 1) return "codice";
  if (/#include|\bvec[234]\b|\buniform\b|\bvarying\b|gl_\w+|void main|\bfloat \w|sampler2D|texture2D/.test(t)) return "codice";
  if (/^(#|\.)[\w-]+([ .#>:\[,][^ ]*)*$/.test(t) && !/\s[a-zà-ÿ]{4,}\s/.test(t)) return "codice"; // selettori
  if (/(^|[\s(,])(-?\d+(\.\d+)?(px|%|deg|ms|s|vw|vh|cqw|cqh|em|rem)\b)|rgba?\(|hsla?\(|var\(--|url\(|translate|cubic-bezier|calc\(|inset\(|gradient\(/.test(t)) return "codice";
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(t) && /\d/.test(t)) return "codice"; // percorsi SVG
  if (/^[\w.{}\/-]*\/[\w.{}\/-]*$/.test(t) || /^https?:/.test(t)) return "codice"; // percorsi e indirizzi
  if (/^[\w{}-]+\.(js|json|jpg|jpeg|png|webp|glb|gltf|mp3|ogg|wav|svg|hdr|exr|ktx2|bin|html|css)$/.test(t)) return "codice";
  if (/^<[a-z!]/.test(t)) return "codice";
  if (/\b(serif|sans-serif|monospace|cursive)\b/.test(t) && /[",]/.test(t)) return "codice"; // i caratteri
  if (/^[a-z][\w{}.$-]*$/.test(t) && t.includes("{")) return "codice"; // nomi con dentro dei valori: casa{0}
  if (/^[a-z][\w-]*(:[\w.{}-]+)+$/.test(t)) return "codice"; // collegamenti "parte:padre.collo"
  if (/^[\w{}]*_[\w{}]*$/.test(t) || /^[a-z]+\.[a-z.]+$/.test(t) || /^(Key|Arrow|Digit)[A-Z0-9]\w*$/.test(t) || /^[a-z]+(-[a-z]+)+$/.test(t)) return "codice";
  if (/^[a-z][\w$-]*$/.test(t)) return "parola"; // una parola minuscola: nome, se il posto non dice altro
  if (/^[A-Z][A-Z0-9_]*$/.test(t)) return VOCI.has(t) || PAROLE_UGUALI.has(t) ? "parola" : "testo";
  return "testo";
}

// sale dalle espressioni che passano il valore (a ? "x" : "y", a || "x", ["x", "y"][i], { a: "x" }[k]) al posto dove finisce
function sali(n, antenati) {
  let i = antenati.length - 1;
  let nodo = n;
  for (;;) {
    const padre = antenati[i - 1];
    if (!padre) return { nodo, padre: null, i };
    if ((padre.type === "ConditionalExpression" && padre.test !== nodo) || padre.type === "LogicalExpression"
      || (padre.type === "ArrayExpression" && antenati[i - 2]?.type === "MemberExpression" && antenati[i - 2].object === padre && antenati[i - 2].computed)
      || (padre.type === "MemberExpression" && padre.object === nodo && padre.computed && (nodo.type === "ArrayExpression" || nodo.type === "ObjectExpression"))) {
      nodo = padre;
      i--;
      continue;
    }
    if (padre.type === "Property" && padre.value === nodo && antenati[i - 2]?.type === "ObjectExpression"
      && antenati[i - 3]?.type === "MemberExpression" && antenati[i - 3].object === antenati[i - 2] && antenati[i - 3].computed) {
      nodo = antenati[i - 3];
      i -= 3;
      continue;
    }
    return { nodo, padre, i };
  }
}

function nomeFunzione(c) {
  return c.type === "Identifier" ? c.name : c.type === "MemberExpression" && !c.computed ? c.property.name : null;
}

// "testo", "codice" o null (decide il contenuto)
function posto(n, antenati) {
  const { nodo, padre, i } = sali(n, antenati);
  if (!padre) return null;
  switch (padre.type) {
    case "ImportDeclaration": case "ExportNamedDeclaration": case "ExportAllDeclaration": case "ImportExpression":
      return "codice";
    case "Property":
      if (padre.key === nodo) return "codice";
      if (!padre.computed) {
        const k = padre.key.name ?? padre.key.value;
        if (PROP_DAL_CONTENUTO[FILE_ORA]?.includes(k)) return null;
        if (PROP_TESTO.has(k)) return "testo";
        if (PROP_CODICE.has(k)) return "codice";
      }
      return null;
    case "MemberExpression":
      return padre.property === nodo ? "codice" : null;
    case "BinaryExpression":
      return ["===", "!==", "==", "!=", "in", "instanceof", "<", ">", "<=", ">="].includes(padre.operator) ? "codice" : null;
    case "SwitchCase":
      return padre.test === nodo ? "codice" : null;
    case "TaggedTemplateExpression":
      return "codice";
    case "TemplateLiteral": {
      // dentro un testo: si legge anche lui (`nat${donna ? "a" : "o"}` no: una lettera sola non conta)
      const sopra = antenati[i - 2];
      const testo = padre.quasis.map((q) => q.value.cooked).join(" ");
      if (sopra?.type === "TaggedTemplateExpression") return sopra.tag.name === "T" ? "testo" : "codice";
      return /[A-Za-zÀ-ÿ]{2,}\s|\s[A-Za-zÀ-ÿ]{2,}/.test(testo) && contenuto(testo) === "testo" ? "testo" : null;
    }
    case "CallExpression": case "NewExpression": {
      const f = nomeFunzione(padre.callee);
      const j = padre.arguments.indexOf(nodo);
      if (f === "T") return "segnato";
      if (f === "setAttribute") return j === 1 && /^(aria-label|title|alt|placeholder|aria-description|aria-valuetext)$/.test(padre.arguments[0]?.value) ? "testo" : "codice";
      if (ARG_NOME[f]?.includes(j)) return "codice";
      if (ARG_TESTO[f]?.includes(j)) return "testo";
      if (ARG_CODICE.has(f)) return "codice";
      return null;
    }
    case "AssignmentExpression": {
      const l = padre.left;
      if (padre.right !== nodo || l.type !== "MemberExpression" || l.computed) return null;
      if (ASSEGNA_TESTO.has(l.property.name)) return "testo";
      if (l.object.type === "MemberExpression" && !l.object.computed && ["dataset", "style"].includes(l.object.property.name)) return "codice";
      if (["className", "id", "src", "href", "type", "cursor", "display", "font", "fillStyle", "strokeStyle", "textAlign", "textBaseline",
        "globalCompositeOperation", "lineCap", "lineJoin", "filter", "transform", "background", "hash", "crossOrigin", "role", "lang",
        "schermo", "luogo", "fase", "ritorno", "esito", "colorSpace", "name", "key", "mode", "ospite"].includes(l.property.name)) return "codice";
      return null;
    }
    case "ReturnStatement": case "VariableDeclarator": case "ArrayExpression": case "ExpressionStatement":
      return null;
  }
  return null;
}

function chiaveModello(n) {
  return n.quasis.map((q, i) => (i ? `{${i - 1}}` : "") + q.value.cooked).join("");
}

function leggi(nome) {
  const file = path.join(JS, nome);
  const sorgente = fs.readFileSync(file, "utf8");
  const ast = acorn.parse(sorgente, { ecmaVersion: "latest", sourceType: "module", locations: true, allowAwaitOutsideFunction: true });
  return { file, sorgente, ast };
}

// le voci: i "voce" delle persone e i primi elementi delle battute ["PADRE", "testo"]
function trovaVoci(nomi) {
  VOCI = new Set(["TU"]);
  for (const nome of nomi) {
    const { ast } = leggi(nome);
    walk.simple(ast, {
      Property(p) { if (!p.computed && (p.key.name ?? p.key.value) === "voce" && p.value.type === "Literal") VOCI.add(p.value.value); },
      ArrayExpression(a) {
        const [x, y] = a.elements;
        // la battuta ha delle minuscole (["PROMOZIONE", "RESPONSABILE DEL RECINTO"] e ["ZERO", "UNO"] non sono battute)
        const t = y?.type === "CallExpression" && y.callee.name === "T" ? y.arguments[0] : y?.type === "TaggedTemplateExpression" && y.tag.name === "T" ? y.quasi : y;
        const testo = t && ((t.type === "Literal" && typeof t.value === "string" && /[a-zà-ÿ]/.test(t.value))
          || (t.type === "TemplateLiteral" && t.quasis.some((q) => /[a-zà-ÿ]/.test(q.value.cooked))));
        if (x?.type === "Literal" && typeof x.value === "string" && /^[A-Z][A-Z]+$/.test(x.value) && testo) VOCI.add(x.value);
      },
    });
  }
  return VOCI;
}

export function analizza(nome) {
  const { file, sorgente, ast } = leggi(nome);
  FILE_ORA = nome;
  const trovati = [];
  walk.ancestor(ast, {
    Literal(n, _s, antenati) {
      if (typeof n.value !== "string") return;
      const p = posto(n, antenati);
      const c = contenuto(n.value);
      const tipo = p === "segnato" ? "segnato" : c === "codice" ? "codice" : p === "testo" ? (c === "parola" && VOCI.has(n.value.trim()) ? "parola" : "testo") : p === "codice" ? (c === "testo" ? "dubbio" : "codice") : c === "parola" ? "parola" : "testo";
      trovati.push({ nodo: n, tipo, riga: n.loc.start.line, testo: n.value, modello: false });
    },
    TemplateLiteral(n, _s, antenati) {
      const padre = antenati[antenati.length - 2];
      const chiave = chiaveModello(n);
      if (padre?.type === "TaggedTemplateExpression") {
        trovati.push({ nodo: n, tipo: padre.tag.type === "Identifier" && padre.tag.name === "T" ? "segnato" : "codice", riga: n.loc.start.line, testo: chiave, modello: true });
        return;
      }
      const soloTesto = n.quasis.map((q) => q.value.cooked).join(" ").replace(/\s+/g, " ");
      const p = posto(n, antenati);
      let tipo;
      if (!/[A-Za-zÀ-ÿ]{2,}/.test(soloTesto)) tipo = "codice"; // `${a}${b}`, `${n} €` e simili
      else {
        const c = contenuto(chiave.includes("{") && !/\s/.test(chiave) ? chiave : soloTesto);
        tipo = p === "segnato" ? "segnato" : c === "codice" ? "codice" : p === "testo" ? "testo" : p === "codice" ? (c === "testo" ? "dubbio" : "codice") : c === "parola" ? "parola" : "testo";
      }
      trovati.push({ nodo: n, tipo, riga: n.loc.start.line, testo: chiave, modello: true });
    },
  });
  for (const t of trovati) {
    const firme = [`${nome}:${t.riga}:${t.testo}`, `${nome}:${t.testo}`];
    if (firme.some((f) => ECCEZIONI.codice?.includes(f))) t.tipo = "codice";
    if (firme.some((f) => ECCEZIONI.testo?.includes(f))) t.tipo = "testo";
  }
  return { file, sorgente, ast, trovati };
}

const [modo = "elenco", ...scelti] = process.argv.slice(2);
const file = scelti.length ? scelti : FILE;
// le battute stanno nei dati dei giorni (in primapagina.js ["LEGNA", "..."] sono i titoletti del giornale)
trovaVoci(["dati.js", "giorno2.js", "giorno3.js", "gioco.js"]);

if (modo === "elenco") {
  const conta = {};
  for (const nome of file) {
    for (const t of analizza(nome).trovati) {
      conta[t.tipo] = (conta[t.tipo] || 0) + 1;
      if (t.tipo !== "codice" && t.tipo !== "segnato") console.log(`${t.tipo.padEnd(6)} ${nome}:${t.riga}  ${JSON.stringify(t.testo).slice(0, 160)}`);
    }
  }
  console.error(conta);
} else if (modo === "segna") {
  for (const nome of file) {
    const { file: f, sorgente, ast, trovati } = analizza(nome);
    const s = new MagicString(sorgente);
    let n = 0;
    for (const t of trovati) {
      if (t.tipo !== "testo") continue;
      if (t.modello) s.prependLeft(t.nodo.start, "T");
      else { s.prependLeft(t.nodo.start, "T("); s.appendRight(t.nodo.end, ")"); }
      n++;
    }
    if (!n) continue;
    if (!/import \{ T(, [^}]*)? \} from "\.\/lingua\.js";/.test(sorgente)) {
      const ultimo = ast.body.filter((b) => b.type === "ImportDeclaration").pop();
      if (ultimo) s.appendLeft(ultimo.end, `\nimport { T } from "./lingua.js";`);
      else {
        // in cima, dopo i commenti iniziali
        const primo = ast.body[0];
        s.prependLeft(primo.start, `import { T } from "./lingua.js";\n\n`);
      }
    }
    fs.writeFileSync(f, s.toString());
    console.error(`${nome}: ${n} testi segnati`);
  }
} else if (modo === "incroci") {
  // i testi da tradurre che il codice usa anche come nomi (confronti, chiavi, includes...): tradotti, non tornano piu'
  const testi = new Map(), nomi = new Map();
  for (const nome of FILE) {
    for (const t of analizza(nome).trovati) {
      const dove = `${nome}:${t.riga}`;
      if (t.tipo === "testo") (testi.get(t.testo) ?? testi.set(t.testo, []).get(t.testo)).push(dove);
      else if (t.tipo === "codice" || t.tipo === "parola" || t.tipo === "dubbio") (nomi.get(t.testo) ?? nomi.set(t.testo, []).get(t.testo)).push(dove);
    }
  }
  for (const [k, v] of testi) if (nomi.has(k)) console.log(`${JSON.stringify(k)}  testo: ${v.slice(0, 4).join(" ")}  nome: ${nomi.get(k).slice(0, 6).join(" ")}`);
} else if (modo === "nuove") {
  const catalogo = JSON.parse(fs.readFileSync(path.join(QUI, "catalogo.json"), "utf8"));
  const fatte = {};
  for (const f of fs.readdirSync(path.join(QUI, "parti")).filter((f) => f.endsWith("_en.json"))) Object.assign(fatte, JSON.parse(fs.readFileSync(path.join(QUI, "parti", f), "utf8")));
  const nuove = Object.fromEntries(Object.entries(catalogo).filter(([k]) => !(k in fatte)));
  if (!Object.keys(nuove).length) console.error("nessun testo nuovo");
  else {
    const nome = `nuove-${new Date().toISOString().slice(0, 10)}`;
    fs.writeFileSync(path.join(QUI, "parti", `${nome}.json`), JSON.stringify(nuove, null, 1));
    console.error(`${Object.keys(nuove).length} testi da tradurre in tools/lingua/parti/${nome}.json`);
  }
} else if (modo === "catalogo") {
  const catalogo = {};
  const righe = {};
  for (const nome of fs.readdirSync(JS).filter((f) => f.endsWith(".js") && !f.startsWith("lingua"))) {
    const { sorgente, trovati } = analizza(nome);
    const linee = sorgente.split("\n");
    for (const t of trovati) {
      if (t.tipo !== "segnato") continue;
      (catalogo[t.testo] ??= []).push(`${nome}:${t.riga}`);
      righe[t.testo] ??= linee[t.riga - 1].trim().slice(0, 300);
    }
  }
  // i testi di index.html (traduciPagina in lingua.js): il titolo, le scritte e le etichette
  const html = fs.readFileSync(path.join(JS, "../index.html"), "utf8");
  const pagina = [html.match(/<title>([^<]*)<\/title>/)[1]];
  const corpo = html.slice(html.indexOf("</style>"));
  for (const m of corpo.matchAll(/>([^<>]*[A-Za-zÀ-ÿ][^<>]*)</g)) pagina.push(m[1].trim());
  for (const m of corpo.matchAll(/\s(?:aria-label|title|alt)="([^"]*[A-Za-zÀ-ÿ][^"]*)"/g)) pagina.push(m[1]);
  for (const t of pagina) { (catalogo[t] ??= []).push("index.html"); righe[t] ??= "index.html"; }
  // le voci dei dialoghi, che parole.js traduce quando scrive chi parla
  for (const v of [...VOCI].filter((v) => v !== "TU").sort()) { catalogo[v] ??= ["voce"]; righe[v] ??= "chi parla (in maiuscolo)"; }
  fs.writeFileSync(path.join(QUI, "catalogo.json"), JSON.stringify(Object.fromEntries(Object.entries(catalogo).map(([k, v]) => [k, { dove: v, riga: righe[k] }])), null, 1));
  console.error(`${Object.keys(catalogo).length} chiavi in tools/lingua/catalogo.json`);
}
