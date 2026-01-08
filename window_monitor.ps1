
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
        
        $result = @{ 
            Status = "OK"
            App = $proc.Name
            Title = $proc.MainWindowTitle
            Id = $proc.Id 
        }
        
        $json = $result | ConvertTo-Json -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $base64 = [Convert]::ToBase64String($bytes)
        Write-Output $base64
    }
} catch { }
