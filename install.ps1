# floti.dev's install script for Windows:
#
#   irm https://floti.dev/install.ps1 | iex
#
# It installs floti 3.0.0 in your own folder,
# %LOCALAPPDATA%\Programs\Floti\bin, with no admin rights, puts that folder on
# your PATH, then runs `floti setup`, which makes the host's key; the Floti
# host starts when Floti or a connection needs it. It picks the floti for this computer's CPU, downloads it from the
# release, and checks it against the SHA-256 written below before it is put
# in place. The whole script is one function called on its last line, so a
# script cut off halfway runs nothing. It runs in your own PowerShell session,
# so it never exits it: a failure is one line starting "floti install: ".
#
# Written by Floti's release workflow from scripts/floti.dev/install.ps1.template
# (packages/desktop/scripts/floti-dev.mjs); the install steps inside are
# scripts/install/install.ps1, the same ones the desktop app sends a computer
# it installs floti on.

function Get-Floti {
  function Install-Floti {
    param([string]$Version, [string]$File, [string]$Sha256, [string]$From)
    $ErrorActionPreference = 'Stop'
    # Progress on a redirected stream is written as CLIXML, burying the last line.
    $ProgressPreference = 'SilentlyContinue'
    $tmp = $null
    $protocol = [Net.ServicePointManager]::SecurityProtocol
    try {
      if (-not ($Version -and $File -and $Sha256 -and $From)) { throw 'usage: Install-Floti <version> <file name> <sha256> <URL | ->' }
      $dir = Join-Path $env:LOCALAPPDATA 'Programs\Floti\bin'
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
      $tmp = Join-Path $dir ".floti-$Version.$PID.exe"
      if ($From -eq '-') {
        $in = [Console]::OpenStandardInput()
        $out = [IO.File]::Create($tmp)
        try { $in.CopyTo($out) } finally { $out.Close() }
      } else {
        [Net.ServicePointManager]::SecurityProtocol = $protocol -bor [Net.SecurityProtocolType]::Tls12
        (New-Object Net.WebClient).DownloadFile("$From/$File", $tmp)
      }
      # .NET, not Get-FileHash: a script function that Windows PowerShell cannot
      # load when it inherits PowerShell 7's PSModulePath (an ssh shell of pwsh).
      $s = [IO.File]::OpenRead($tmp)
      try { $got = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($s)).Replace('-', '').ToLowerInvariant() } finally { $s.Close() }
      if ($got -ne $Sha256) { throw "$File did not match its SHA-256, so it was not installed." }
      $dest = Join-Path $dir 'floti.exe'
      $old = Join-Path $dir 'floti.old.exe'
      # A running floti.exe can be renamed but not replaced.
      if (Test-Path -LiteralPath $dest) { Move-Item -Force -LiteralPath $dest -Destination $old }
      try { Move-Item -LiteralPath $tmp -Destination $dest }
      catch { if (Test-Path -LiteralPath $old) { Move-Item -Force -LiteralPath $old -Destination $dest }; throw }
      Remove-Item -Force -ErrorAction SilentlyContinue -LiteralPath $old
      $dest
    } catch {
      if ($tmp -and (Test-Path -LiteralPath $tmp)) { Remove-Item -Force -ErrorAction SilentlyContinue -LiteralPath $tmp }
      [Console]::Error.WriteLine("floti install: $($_.Exception.Message)")
    } finally {
      [Net.ServicePointManager]::SecurityProtocol = $protocol
    }
  }

  $version = '3.0.0'
  $release = 'https://github.com/floti-dev/floti/releases/download/v3.0.0'
  $sums = @{
    'windows-x64' = '3cb17ef000bdaa5191faaf3cd8f1fac3662b037efb736b9aaa9671425897c47b'
    'windows-arm64' = '6d2ff3890f54fbf8ba5a5c66d3351325ffb4e9ba02763bec4964ada291261810'
  }

  # The computer's own CPU, as the system keeps it: an x64 PowerShell on an
  # arm64 computer says AMD64 in its own environment.
  $machine = (Get-ItemProperty -ErrorAction SilentlyContinue -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment').PROCESSOR_ARCHITECTURE
  if (-not $machine) { $machine = $env:PROCESSOR_ARCHITECTURE }
  $cpu = switch ($machine) { 'AMD64' { 'x64' } 'ARM64' { 'arm64' } default { $machine } }
  $target = "windows-$cpu"
  if (-not $sums.ContainsKey($target)) {
    [Console]::Error.WriteLine("floti install: Floti has no build for Windows on $machine; it runs on Windows on x64 and arm64, macOS on Apple Silicon, and Linux on x64 and arm64.")
    return
  }

  Write-Host "Installing floti $version for Windows $cpu."
  $floti = Install-Floti $version "floti-$version-$target.exe" $sums[$target] $release
  if (-not $floti) { return }
  Write-Host "floti $version is at $floti."

  # The folder goes on the user's own Path as it is written, kept an
  # expandable string, as floti install-self puts it there: .NET's
  # SetEnvironmentVariable would write the expanded value, freezing every
  # %VARIABLE% in it.
  $folder = Split-Path -Parent $floti
  $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment')
  try {
    $written = [string]$key.GetValue('Path', '', 'DoNotExpandEnvironmentNames')
    $system = [string](Get-ItemProperty -ErrorAction SilentlyContinue -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment').Path
    $onPath = [Environment]::ExpandEnvironmentVariables("$system;$written") -split ';' | ForEach-Object { $_.Trim().TrimEnd('\') }
    if ($onPath -notcontains $folder) {
      $key.SetValue('Path', (($written.TrimEnd(';'), $folder) -join ';').TrimStart(';'), 'ExpandString')
      # Removing a variable that is not there tells Explorer the environment
      # changed, so a terminal started from now on finds floti.
      [Environment]::SetEnvironmentVariable('FLOTI_INSTALL_ANNOUNCES_PATH', $null, 'User')
      Write-Host "Put $folder on your PATH, for terminals started from now on."
    }
  } finally {
    $key.Close()
  }
  if (($env:Path -split ';') -notcontains $folder) { $env:Path = "$($env:Path.TrimEnd(';'));$folder" }

  & $floti setup
}

Get-Floti
