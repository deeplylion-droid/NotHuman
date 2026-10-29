// Malvento come programma per Windows (27 ottobre: "il gioco uscira' su Steam, provalo come eseguibile"). Electron e'
// Chromium con la scheda video del computer: la stessa pagina del browser, a tutto schermo, senza il visualizzatore
// degli Artifact attorno. Apre il gioco (pagina/, la prepara prepara.mjs).
// I file si servono dal protocollo gioco:// (con file:// il browser non lascia caricare i moduli e i modelli).
const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const PAGINA = path.join(__dirname, "pagina");

// i portatili con due schede video: quella buona
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
protocol.registerSchemesAsPrivileged([
  { scheme: "gioco", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

app.whenReady().then(() => {
  protocol.handle("gioco", (richiesta) => {
    const file = path.join(PAGINA, decodeURIComponent(new URL(richiesta.url).pathname));
    if (path.relative(PAGINA, file).startsWith("..")) return new Response("vietato", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  const finestra = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: "#000000",
    title: "Malvento",
    // l'icona: la maschera del logo (tools/steam.py)
    icon: path.join(__dirname, "icona.ico"),
    autoHideMenuBar: true,
    webPreferences: { backgroundThrottling: false },
  });
  finestra.removeMenu();
  // il nome della finestra resta quello del gioco, non il titolo della pagina
  finestra.on("page-title-updated", (e) => e.preventDefault());
  // F12 apre gli strumenti di Chromium, se qualcosa non va
  finestra.webContents.on("before-input-event", (e, tasto) => {
    if (tasto.type === "keyDown" && tasto.key === "F12") finestra.webContents.toggleDevTools();
  });
  finestra.loadURL("gioco://malvento/index.html");
});

app.on("window-all-closed", () => app.quit());
