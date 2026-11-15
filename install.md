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
description: One command installs Floti on a Mac, a Windows PC or a Linux computer, with no admin rights. What it installs, where it goes, and how to update or remove it.
lede: One command installs Floti on a Mac, a Windows PC or a Linux computer. It needs no admin rights, and updating it is one command too.
notice: Floti is not released yet. The commands below go live with the first stable release, which puts the install scripts on floti.dev. Until then they have nothing to download.
---

## What you need

- **Claude Code, installed and signed in,** on each computer your agents run on. Floti starts it the way you would. Other agents are coming.
- **A computer Floti runs on:** a Mac with Apple Silicon, a Windows PC or a Linux computer, on x64 or Arm. WSL counts as Linux.
- **For a computer you use remotely, SSH access to it.** `ssh` followed by its name should log you in from a terminal without asking for a password, because Floti uses your own SSH and types nothing into it.

Nothing needs admin rights. If Claude Code is missing, or is a version Floti was not tested with, setup says so and gives you the line to run.

## What each computer gets

The same command works everywhere. What it leaves behind depends on the computer.

| Computer | What it gets |
| --- | --- |
| A desktop: a Mac, PC or Linux computer with a screen | The Floti app, the host and `floti`. Setup asks before it installs the app. |
| A server, or any computer with no screen | The host and `floti`, with no window. On a Linux server the host keeps running with nobody signed in. |
| Each WSL distro | A Linux host of its own, apart from the one on Windows. The Floti app on Windows reaches it through `wsl.exe`. |
| A computer you only use from a terminal | `floti` and its commands, such as `floti doctor` and `floti agent`, and the host they talk to. Add the app later with `floti add desktop`. |

The host holds your sessions, so they keep running when the window closes. On a Mac and on Linux it starts at each sign-in. On Windows it starts when the Floti app or a connection needs it.

The app is built for Windows on x64, Macs with Apple Silicon and Linux on x64. Other computers get the host and `floti`, and you use them from the app on another computer.

## Run the command

Open a terminal and run the command at the top of this page: Terminal on a Mac, PowerShell on Windows. For a WSL distro, open that distro's terminal and use the macOS and Linux command. Run it once in each distro you want a host in.

You can also let the Floti app do it. In Settings > Hosts it installs `floti` on a computer you reach over SSH, or on a WSL distro, after it tells you what it will do and you say yes.

## What the command does

1. It picks the `floti` build for your system and CPU. On a system Floti has no build for, it stops there and says so.
2. It downloads that build from Floti's [release on GitHub](https://github.com/floti-dev/floti/releases) and checks it against the SHA-256 written into the script at release. Only a file that matches is put in place, so a `floti` you already have keeps working if anything fails.
3. It puts `floti` in your own folder: `~/.local/bin` on a Mac and Linux, `%LOCALAPPDATA%\Programs\Floti\bin` on Windows. On Windows it also adds that folder to your Path.
4. It runs `floti setup`, which:
   - checks that Claude Code is installed;
   - on a Mac and Linux, adds `~/.local/bin` to your PATH if it is not there: one line, ending `# added by floti`, at the end of the startup file your shell reads (`~/.zshenv` for zsh), and it tells you which file;
   - makes Floti's data folder and the host's key;
   - sets the host to start: at each sign-in on a Mac and Linux, when it is needed on Windows. On a Linux server it turns on lingering, so the host runs from boot.
5. On a computer with a screen, setup asks: `Install the Floti desktop app as well? [Y/n]`. Yes runs `floti add desktop`, which downloads the app from the same release, checks its signature and SHA-256, and installs it in your own folder.

The whole script is one function, called on its last line, so a download cut off halfway runs nothing. To read the script before you run it:

```sh
curl -fsSL https://floti.dev/install.sh
```

```powershell
irm https://floti.dev/install.ps1
```

## Where Floti puts things

Everything goes in your own user folders. Nothing asks for sudo or a Windows admin prompt. The one exception: on a Linux server where your account may not turn on lingering, setup stops and says that an administrator can run `sudo loginctl enable-linger` with your user name.

### macOS

- `floti`: `~/.local/bin/floti`
- The app: `~/Applications/Floti.app`
- Floti's data and logs: `~/Library/Application Support/Floti`
- Your own files, such as templates, themes and the plugins you write: `~/.config/floti`
- What starts the host at sign-in: `~/Library/LaunchAgents/dev.floti.host.plist`

### Linux

- `floti`: `~/.local/bin/floti`
- The app: `~/Applications/Floti.AppImage`, with a menu entry in `~/.local/share/applications`
- Floti's data: `~/.local/share/floti`, and its logs in `~/.local/state/floti`
- Your own files: `~/.config/floti`
- What starts the host at sign-in: `~/.config/systemd/user/floti.service`

### Windows

- `floti`: `%LOCALAPPDATA%\Programs\Floti\bin\floti.exe`
- The app: `%LOCALAPPDATA%\Programs\Floti\desktop`, with a Start menu entry
- Floti's data and logs: `%LOCALAPPDATA%\Floti`
- Your own files: `%USERPROFILE%\.config\floti`
- Nothing starts at sign-in.

## Update

```sh
floti update
```

It replaces `floti` with the newest stable release, and the host restarts on the new one without ending your sessions. If the app is installed and older, it is updated too, once you quit it. Every file is checked against Floti's signing key, which is built into `floti`, and against its SHA-256 before anything is replaced. If a check fails, nothing changes.

You rarely need to run it. The host checks for a new `floti` once a day and updates it by itself; turn that off in the app under Settings > Updates. The app shows when a new release is out, and its Update button does what `floti update` does.

## Uninstall

```sh
floti uninstall
```

It closes the app, stops the host, and removes what installing put there: what starts the host at sign-in, the app, the PATH entry and `floti` itself. Stopping the host ends every session it runs. It says what it removed and what it kept, one line each.

Your data, logs and own files stay. To remove those as well:

```sh
floti uninstall --purge
```

Neither touches your agent's own settings, `~/.ssh` or any repository. On Linux, lingering stays on, since other services may rely on it; `loginctl disable-linger` turns it off.

## Install by hand

If you would rather not pipe a script to a shell, download and check `floti` yourself. Every file in a release has a minisign signature beside it, named after the file with `.minisig` added, and a GitHub build attestation.

1. On the [releases page](https://github.com/floti-dev/floti/releases/latest), note the version and pick your file:

   | Computer | File |
   | --- | --- |
   | Mac with Apple Silicon | `floti-<version>-macos-arm64` |
   | Linux on x64 | `floti-<version>-linux-x64` |
   | Linux on Arm | `floti-<version>-linux-arm64` |
   | Windows on x64 | `floti-<version>-windows-x64.exe` |
   | Windows on Arm | `floti-<version>-windows-arm64.exe` |

2. Download it and its signature. On a Mac or Linux, with your version and file in the first two lines:

   ```sh
   v=X.Y.Z
   f=floti-$v-linux-x64
   curl -fLO "https://github.com/floti-dev/floti/releases/download/v$v/$f"
   curl -fLO "https://github.com/floti-dev/floti/releases/download/v$v/$f.minisig"
   ```

3. Check the signature with [minisign](https://jedisct1.github.io/minisign/) and Floti's public key, the one `floti update` trusts:

   ```sh
   minisign -Vm "$f" -P RWQ/o61pdxmFyI55RlxfVyDfWyZA9LYcMXYoJgwGOrZH60Ymqo7DurFT
   ```

   It must say the signature is verified, with the trusted comment `floti X.Y.Z floti-X.Y.Z-linux-x64`: your version and file name. Or check GitHub's attestation with the GitHub CLI: `gh attestation verify "$f" --repo floti-dev/floti`. The SHA-256 of every `floti` is also listed in `floti-<version>-SHA256SUMS` in the same release.

4. Put it in your own folder and run setup, which does the rest of what the script would, PATH and app included:

   ```sh
   mkdir -p ~/.local/bin
   mv "$f" ~/.local/bin/floti
   chmod 755 ~/.local/bin/floti
   ~/.local/bin/floti setup
   ```

On Windows, the same steps in PowerShell:

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

Homebrew and winget install `floti` on its own, without the app. Run `floti setup` after either one.

On a Mac or Linux, trust Floti's tap first, because Homebrew loads no formula from a tap you have not trusted:

```sh
brew trust floti-dev/tap && brew install floti-dev/tap/floti
```

On Windows:

```powershell
winget install FlotiDev.Floti
```

Update it with `brew upgrade` or `winget upgrade`. `floti uninstall` removes everything else and leaves `floti` to the package manager that installed it.

## On the network

From Floti's packaging notes:

> The host's update check, at most once a day to floti.dev and to the GitHub release it names, is the only request Floti makes on its own initiative; the app itself contacts nothing. Everything else on the network happens because you asked for it: Check now and Update ask the host to check or to update, the browser pane fetches the page you navigate to, a plugin you added reaches the hosts its manifest names, and a host you added on another computer is reached through your own ssh, or the command you gave.

There is no telemetry and no crash reporting. Floti listens only on your own computer.
