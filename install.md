---
# The install guide, floti.dev/install/.
#
# How to edit it: this file is Markdown. Change the words, save, and rebuild
# (npm run build, or npm run dev to watch it change). The page sets them in its
# own layout, between the site's bar and its footer.
#
# - The four entries below go at the top of the page. title is the big
#   headline (and the browser tab's title), lede the paragraph under it,
#   notice the box saying Floti is not released yet (shown only while
#   released is false in copy.yaml), and description the summary search
#   engines and link previews show. Each one is required.
# - The install command box comes after the notice. It is not in this file:
#   its labels are under install_box in copy.yaml.
# - Everything after the second --- line is the guide. A line starting "## "
#   starts a section, and each section is listed as a link under the command
#   box. "### " is a smaller heading inside a section.
# - Leave an empty line between paragraphs. "- " starts a list item and "1. "
#   a numbered step. **Two stars** make words bold, [text](address) a link,
#   and `backticks` a command or a path. Three backticks on a line of their
#   own open and close a block of commands; "sh" or "powershell" after the
#   opening ones says which shell it is for.
# - A table is rows of | cells |, with | --- | --- | as its second row. On a
#   phone each row shows as a card.
# - Lines starting > are a quotation.
#
# Every claim here is checked against Floti's code (the install scripts,
# floti setup, update and uninstall, and docs/PACKAGING.md in the floti
# repository). When the code changes, change this to match.
title: Install Floti
description: Install Floti on macOS, Windows or Linux with one command. Requirements, file locations, updating and uninstalling.
lede: Run this in a terminal, or in PowerShell on Windows.
notice: Floti isn't released yet. These commands start working with the first stable release.
---

## What gets installed

- **`floti`**, the command-line tool.
- **The host**, which runs your sessions in the background so they keep going when the app is closed. It starts at sign-in on macOS and Linux, and when it's needed on Windows. On a Linux server it runs from boot (setup tells you if that needs an admin).
- **The desktop app**, on computers with a screen (macOS on Apple Silicon, Windows and Linux on x64). Setup asks first, and you can add it later with `floti add desktop`.

Setup also adds `floti` to your PATH. On macOS and Linux that's one line, marked `# added by floti`, at the end of your shell's startup file.

The install script downloads `floti` from the [GitHub release](https://github.com/floti-dev/floti/releases), checks its SHA-256 and runs `floti setup`. To read the script first:

```sh
curl -fsSL https://floti.dev/install.sh
```

```powershell
irm https://floti.dev/install.ps1
```

## Set up a remote host

A remote host is another computer, such as a server, a second PC or a WSL distro, whose sessions show up in your Floti window.

1. Check that `ssh <name>` logs you in from a terminal without a password or host-key prompt. Floti connects with your own SSH and can't answer prompts.
2. Install Claude Code on that computer and sign in.
3. In Floti, open Settings > Hosts and click **Add a host…**. Pick the computer from your SSH config or type its target, such as `you@build-box`. WSL distros on this PC are listed there too.
4. Floti checks the computer, offers to install `floti` there if it's missing, and connects. The host's sessions appear in your sidebar under its name.

To install by hand instead, run the install command on that computer, then add it in the app.

## File locations

### macOS

- `floti`: `~/.local/bin/floti`
- App: `~/Applications/Floti.app`
- Data and logs: `~/Library/Application Support/Floti`
- Config, themes, templates and plugins: `~/.config/floti`
- Autostart: `~/Library/LaunchAgents/dev.floti.host.plist`

### Linux

- `floti`: `~/.local/bin/floti`
- App: `~/Applications/Floti.AppImage`
- Data: `~/.local/share/floti`
- Logs: `~/.local/state/floti`
- Config, themes, templates and plugins: `~/.config/floti`
- Autostart: `~/.config/systemd/user/floti.service`

### Windows

- `floti`: `%LOCALAPPDATA%\Programs\Floti\bin\floti.exe`
- App: `%LOCALAPPDATA%\Programs\Floti\desktop`
- Data and logs: `%LOCALAPPDATA%\Floti`
- Config, themes, templates and plugins: `%USERPROFILE%\.config\floti`
- Autostart: none

## Update

```sh
floti update
```

This updates `floti` and the host to the newest stable release without ending your sessions. If the app is installed, it updates the next time you quit it. Every download is checked against Floti's signing key before anything is replaced.

The host also checks for a new release once a day and updates `floti` on its own. You can turn that off in Settings > Updates.

## Uninstall

```sh
floti uninstall
```

This removes `floti`, the app, the host's autostart and the PATH entry. It stops the host, which ends any running sessions. Your data and config stay; add `--purge` to remove them too.

On Linux, lingering stays on. Turn it off with `loginctl disable-linger`.

## Install by hand

Every release file has a minisign signature next to it, named `<file>.minisig`.

1. Find your file on the [latest release](https://github.com/floti-dev/floti/releases/latest):

   | Computer | File |
   | --- | --- |
   | Mac with Apple Silicon | `floti-<version>-macos-arm64` |
   | Linux on x64 | `floti-<version>-linux-x64` |
   | Linux on Arm | `floti-<version>-linux-arm64` |
   | Windows on x64 | `floti-<version>-windows-x64.exe` |
   | Windows on Arm | `floti-<version>-windows-arm64.exe` |

2. Download it and its signature:

   ```sh
   v=X.Y.Z
   f=floti-$v-linux-x64
   curl -fLO "https://github.com/floti-dev/floti/releases/download/v$v/$f"
   curl -fLO "https://github.com/floti-dev/floti/releases/download/v$v/$f.minisig"
   ```

3. Verify it with [minisign](https://jedisct1.github.io/minisign/):

   ```sh
   minisign -Vm "$f" -P RWQ/o61pdxmFyI55RlxfVyDfWyZA9LYcMXYoJgwGOrZH60Ymqo7DurFT
   ```

   Or with the GitHub CLI: `gh attestation verify "$f" --repo floti-dev/floti`.

4. Install it and run setup:

   ```sh
   mkdir -p ~/.local/bin
   mv "$f" ~/.local/bin/floti
   chmod 755 ~/.local/bin/floti
   ~/.local/bin/floti setup
   ```

On Windows:

```powershell
$v = 'X.Y.Z'
$f = "floti-$v-windows-x64.exe"
$url = "https://github.com/floti-dev/floti/releases/download/v$v/$f"
Invoke-WebRequest $url -OutFile $f
Invoke-WebRequest "$url.minisig" -OutFile "$f.minisig"
minisign -Vm $f -P RWQ/o61pdxmFyI55RlxfVyDfWyZA9LYcMXYoJgwGOrZH60Ymqo7DurFT
$bin = "$env:LOCALAPPDATA\Programs\Floti\bin"
New-Item -ItemType Directory -Force $bin | Out-Null
Move-Item $f "$bin\floti.exe"
& "$bin\floti.exe" setup
```

## Homebrew and winget

Both install `floti` without the app. Run `floti setup` afterwards.

```sh
brew trust floti-dev/tap && brew install floti-dev/tap/floti
```

```powershell
winget install FlotiDev.Floti
```

Update with `brew upgrade` or `winget upgrade`. `floti uninstall` leaves `floti` itself for the package manager to remove.

## Privacy

Floti has no telemetry or crash reporting. The only request it makes on its own is the daily update check, to floti.dev and GitHub. The host only accepts connections from its own computer, and other computers reach it over SSH.
