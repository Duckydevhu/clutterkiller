const { app, BrowserWindow, ipcMain, Notification, Tray, Menu } = require('electron');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- GLOBÁLIS VÁLTOZÓK ---
let mainWindow;
let tray = null; 
let isQuitting = false; // Ez a kulcs a valódi kilépéshez!

// --- ABLAK LÉTREHOZÁSA ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: '#2b2b2b',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // --- BEZÁRÁS LOGIKA (FONTOS!) ---
    
    // Ha a felhasználó a minimalizálásra (-) kattint
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    // Ha a felhasználó az X-re kattint
    mainWindow.on('close', (event) => {
        // Ha NEM a tálca "Kilépés" gombját nyomtuk meg, akkor csak elrejtjük
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false; // Megakadályozzuk a bezárást
        }
        // Ha isQuitting === true, akkor engedjük bezáródni, és a program leáll.
    });
}

// --- TÁLCA IKON ÉS MENÜ (A kért módosítással) ---
function createTray() {
    const iconPath = path.join(__dirname, 'icon.ico');

    if (!fs.existsSync(iconPath)) {
        console.error("⚠️ Nem találom az icon.ico fájlt!");
        return;
    }

    try {
        tray = new Tray(iconPath);
        tray.setToolTip('Digitális Rendrakó');

        // --- ITT A VÁLTOZÁS: CSAK EGYETLEN MENÜPONT ---
        const contextMenu = Menu.buildFromTemplate([
            { 
                label: 'Kilépés', // Csak ez az egy opció van
                click: () => {
                    isQuitting = true; // Jelt adunk: "Most tényleg ki akarok lépni!"
                    app.quit();        // Leállítjuk az Electront
                } 
            }
        ]);
        
        tray.setContextMenu(contextMenu);

        // Bal klikk az ikonra továbbra is előhozza/eltünteti az ablakot
        tray.on('click', () => {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        });
        
    } catch (e) {
        console.error("Hiba a Tray létrehozásakor:", e);
    }
}

// --- 1. ADATKEZELÉS (UserData mappában) ---
let appTracker = {};
let ignoreList = [];
let config = { timeLimit: 60 }; 

const userDataPath = app.getPath('userData');
const ignorePath = path.join(userDataPath, 'ignore_list.json');
const configPath = path.join(userDataPath, 'config.json');
const monitorScriptPath = path.join(userDataPath, 'window_monitor.ps1');
const switcherScriptPath = path.join(userDataPath, 'window_switcher.ps1');

function loadData() {
    try {
        if (fs.existsSync(ignorePath)) {
            ignoreList = JSON.parse(fs.readFileSync(ignorePath));
        } else {
            ignoreList = ["explorer", "searchhost", "taskmgr", "systemsettings", "searchapp", "clutterkiller", "lockapp"];
            fs.writeFileSync(ignorePath, JSON.stringify(ignoreList, null, 2));
        }
    } catch (e) { console.error("Ignore load error:", e); }

    try {
        if (fs.existsSync(configPath)) {
            config = { ...config, ...JSON.parse(fs.readFileSync(configPath)) };
        } else {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
    } catch (e) { console.error("Config load error:", e); }
}
loadData();

// --- IPC KOMMUNIKÁCIÓ ---
ipcMain.on('add-to-ignore', (event, appName) => {
    if (!ignoreList.includes(appName)) {
        ignoreList.push(appName);
        fs.writeFileSync(ignorePath, JSON.stringify(ignoreList, null, 2));
        delete appTracker[appName];
        updateUI();
    }
});

ipcMain.on('remove-from-ignore', (event, appName) => {
    ignoreList = ignoreList.filter(item => item !== appName);
    fs.writeFileSync(ignorePath, JSON.stringify(ignoreList, null, 2));
    if (mainWindow) mainWindow.webContents.send('update-ignore-list', ignoreList);
});

ipcMain.on('request-ignore-list', () => { if (mainWindow) mainWindow.webContents.send('update-ignore-list', ignoreList); });
ipcMain.on('request-config', () => { if (mainWindow) mainWindow.webContents.send('update-config', config); });

ipcMain.on('save-settings', (event, newConfig) => {
    config = newConfig;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    for (const key in appTracker) { appTracker[key].alerted = false; }
    updateUI();
});

// --- 2. HÁTTÉR SCRIPTEK ---
const monitorScriptContent = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Utils {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
  }
"@
try {
    $hwnd = [Utils]::GetForegroundWindow()
    if ($hwnd -ne 0) {
        $pidVar = 0
        [void][Utils]::GetWindowThreadProcessId($hwnd, [ref]$pidVar)
        $proc = Get-Process -Id $pidVar -ErrorAction Stop
        $result = @{ Status = "OK"; App = $proc.Name; Title = $proc.MainWindowTitle; Id = $proc.Id }
        $json = $result | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $base64 = [Convert]::ToBase64String($bytes)
        Write-Output $base64
    }
} catch { }
`;
try { fs.writeFileSync(monitorScriptPath, monitorScriptContent); } catch (err) { }

const switcherScriptContent = `
param([int]$TargetPid)
$ErrorActionPreference = 'SilentlyContinue'
$code = @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
"@
Add-Type $code
try {
    $proc = Get-Process -Id $TargetPid
    $hwnd = $proc.MainWindowHandle
    if ($hwnd -ne [IntPtr]::Zero) {
        if ([Win32]::IsIconic($hwnd)) { [Win32]::ShowWindowAsync($hwnd, 9) }
        [Win32]::SetForegroundWindow($hwnd)
    }
} catch {}
`;
try { fs.writeFileSync(switcherScriptPath, switcherScriptContent); } catch (err) { }

ipcMain.on('switch-focus', (event, pid) => {
    const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', switcherScriptPath, '-TargetPid', pid.toString()]);
    child.on('error', (err) => console.error("Switch error:", err));
});

// --- 3. FIGYELŐ RENDSZER ---
function getActiveWindow() {
    const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', monitorScriptPath]);
    let dataBuffer = "";
    child.stdout.on('data', (data) => { dataBuffer += data.toString(); });
    child.on('close', (code) => {
        const encryptedOutput = dataBuffer.trim();
        if (encryptedOutput) {
            try {
                const jsonString = Buffer.from(encryptedOutput, 'base64').toString('utf-8');
                const activeData = JSON.parse(jsonString);
                if (activeData.Status === "OK") updateTracker(activeData);
            } catch (e) { }
        }
    });
}

function updateTracker(activeWindow) {
    const now = Date.now();
    const appName = activeWindow.App;
    const isIgnored = ignoreList.includes(appName);

    if (!isIgnored) {
        if (!appTracker[appName]) {
            appTracker[appName] = { name: appName, title: activeWindow.Title, pid: activeWindow.Id, lastActive: now, idleMs: 0, alerted: false };
        } else {
            appTracker[appName].lastActive = now;
            appTracker[appName].title = activeWindow.Title;
            appTracker[appName].pid = activeWindow.Id;
            appTracker[appName].idleMs = 0;
            appTracker[appName].alerted = false; 
        }
    }

    const limitMs = config.timeLimit * 60 * 1000;

    for (const key in appTracker) {
        if (ignoreList.includes(key)) { delete appTracker[key]; continue; }
        const app = appTracker[key];
        
        if (!isIgnored && key === appName) {
            app.idleMs = 0;
        } else {
            app.idleMs = now - app.lastActive;
        }

        if (app.idleMs > limitMs) {
            if (!app.alerted) {
                app.alerted = true; 
                triggerAlert(app.name);
            }
        }
    }
    updateUI(isIgnored ? null : appName);
}

function triggerAlert(appName) {
    const notification = new Notification({
        title: 'Digitális Rendrakó',
        body: `Hahó! A(z) ${appName} már régóta inaktív.`,
        silent: false
    });
    notification.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    notification.show();
}

function updateUI(currentActiveName = null) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-list', { tracker: appTracker, currentActive: currentActiveName, config: config });
    }
}

function startMonitoring() { setInterval(() => { getActiveWindow(); }, 1000); }

app.setAppUserModelId("com.clutterkiller.app");

// INDÍTÁS
app.whenReady().then(() => { 
    createWindow(); 
    createTray(); 
    startMonitoring(); 
});

// ABLAK BEZÁRÁS KEZELÉSE
app.on('window-all-closed', () => { 
    // Itt direkt NEM lépünk ki (hogy a háttérben fusson),
    // kivéve, ha MacOS-en vagyunk (ott más a szokás),
    // de az isQuitting flag kezeli a valódi kilépést a tálcáról.
});