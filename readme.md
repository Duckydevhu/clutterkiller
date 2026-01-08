🧹 Digitális Rendrakó (Clutter Killer)
Egy modern, Electron-alapú Windows asztali alkalmazás, amely segít tisztán tartani a digitális munkakörnyezetedet. Figyeli a háttérben futó, inaktív alkalmazásokat, és figyelmeztet, ha ideje bezárni őket a fókusz és az erőforrások megőrzése érdekében.

✨ Funkciók
🕵️ Valós idejű figyelés: Másodpercenként elemzi az aktív ablakokat PowerShell scriptek segítségével.

⏱️ Inaktivitás mérése: Pontosan követi, mióta nem használtál egy adott programot.

🔔 Diszkrét értesítések: Windows értesítést küld, ha egy program túllépte az időkorlátot.

⚡ Gyorsváltás (Focus Switch): A listában egy kattintással előhozhatod a háttérbe szorult vagy lekicsinyített ablakokat (PID alapú vezérlés).

🛡️ Kivételek kezelése: Testreszabható "fehérlista" (Ignore List), hogy a rendszerkritikus vagy fontos appokat (pl. Zenelejátszó) békén hagyja.

⚙️ Testreszabható: Állítható időkorlát (pl. 30 vagy 60 perc inaktivitás).

👻 Tálca integráció (System Tray):

Bezáráskor nem áll le, hanem a tálcára (óra mellé) kicsinyítődik.

Jobb klikkes menü a teljes kilépéshez.

💾 Perzisztens adatok: A beállításokat és a kivételeket automatikusan menti (AppData mappába).

🚀 Telepítés és Használat (Felhasználóknak)
Töltsd le a legfrissebb telepítőt (Clutter Killer Setup 1.0.0.exe).

Futtasd a telepítőt.

A program automatikusan elindul, és megjelenik a tálcán (kis seprű ikon 🧹).

Használat:

Kattints az ikonra a főablak megnyitásához.

A Beállítások menüben add meg, hány perc után szóljon.

Ha egy programot nem szeretnél figyeltetni, nyomj a 🚫 Tiltás gombra.

🛠️ Fejlesztői Útmutató
Ha módosítani szeretnéd a kódot vagy saját magadnak lefordítani (build), kövesd az alábbi lépéseket.

Előfeltételek
Node.js telepítve (LTS verzió ajánlott).

Windows operációs rendszer (mivel PowerShell scripteket használ a háttérben).

1. Klónozás és Telepítés
Bash

# Klónozd le a repót (vagy töltsd le a forráskódot)
git clone https://github.com/SajatNeved/DigitaisRendrako.git

# Lépj a könyvtárba
cd DigitaisRendrako

# Függőségek telepítése
npm install
2. Fejlesztői mód indítása
Ez elindítja az alkalmazást "élőben", hot-reload nélkül.

Bash

npm start
3. Telepítő készítése (.exe)
Ez a parancs létrehozza a telepíthető .exe fájlt a dist mappában.

Fontos: Mivel az ikonok és az aláírási folyamat (winCodeSign) szimbolikus linkeket használhat, érdemes Rendszergazdaként futtatni a terminált, vagy bekapcsolni a Windows "Fejlesztői módját".

Bash

npm run build
A kész telepítő itt lesz: dist/Clutter Killer Setup 1.0.0.exe

🏗️ Technológiai Háttér
Frontend: HTML5, CSS3 (Flexbox, Sticky Headers), Vanilla JavaScript.

Backend: Node.js (Electron Main Process).

Rendszerhívások: PowerShell scriptek (window_monitor.ps1, window_switcher.ps1) a Win32 API eléréséhez (ablakcímek, PID lekérdezése, fókuszváltás).

Adattárolás: JSON fájlok (config.json, ignore_list.json) a felhasználó AppData/Roaming mappájában.

Build System: electron-builder.

📂 Fájlstruktúra
main.js: A backend "agya". Kezeli az ablakokat, a tálcát, a fájlrendszert és a PowerShell hívásokat.

index.html: A felhasználói felület.

window_monitor.ps1: (Generált) Lekérdezi az aktív ablakot és annak PID-jét.

window_switcher.ps1: (Generált) Kényszerített ablakváltást végez (Restore + SetForeground).

📝 Licenc
Ez a projekt saját használatra készült, szabadon módosítható.