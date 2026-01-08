
param([int]$TargetPid)
$ErrorActionPreference = 'SilentlyContinue'

# Win32 API definíciók a fókusz manipulálásához
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
        # 1. Ellenőrizzük, le van-e kicsinyítve (IsIconic)
        if ([Win32]::IsIconic($hwnd)) {
            # Ha igen, visszaállítjuk (9 = SW_RESTORE)
            [Win32]::ShowWindowAsync($hwnd, 9)
        }
        
        # 2. Előtérbe hozzuk
        [Win32]::SetForegroundWindow($hwnd)
    }
} catch {}
