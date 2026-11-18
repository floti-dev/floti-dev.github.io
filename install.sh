# floti.dev's install script for macOS, Linux and WSL:
#
#   curl -fsSL https://floti.dev/install.sh | sh
#
# It installs floti 3.1.1 in your own folder, ~/.local/bin, with no admin
# rights, then runs `floti setup`, which starts the Floti host at each sign-in
# and, when ~/.local/bin is not on your PATH, adds the one line that puts it
# there to the startup file your shell reads, and says which file.
# It picks the floti for this computer's OS and CPU, downloads it from the
# release, and checks it against the SHA-256 written below before it is put in
# place. The whole script is one function called on its last line, so a
# script cut off halfway runs nothing.
#
# Written by Floti's release workflow from scripts/floti.dev/install.sh.template
# (packages/desktop/scripts/floti-dev.mjs); the install steps inside are
# scripts/install/install.sh, the same ones the desktop app sends a computer it
# installs floti on.

floti_get() {
  floti_install() {
    version=$1
    file=$2
    sha256=$3
    from=$4
    say() { echo "floti install: $1" >&2; }
    if [ -z "$version" ] || [ -z "$file" ] || [ -z "$sha256" ] || [ -z "$from" ]; then
      say "usage: floti_install <version> <file name> <sha256> <release folder URL | ->"
      return 2
    fi
    if [ -z "$HOME" ]; then
      say "HOME is not set, so there is no folder of yours to put floti in."
      return 1
    fi
    dir="$HOME/.local/bin"
    if ! mkdir -p "$dir"; then
      say "could not make $dir."
      return 1
    fi
    tmp="$dir/.floti-$version.$$"
    rm -f "$tmp"
    if [ "$from" = "-" ]; then
      if ! cat >"$tmp"; then
        rm -f "$tmp"
        say "could not write $tmp."
        return 1
      fi
    elif command -v curl >/dev/null 2>&1; then
      if ! curl -fsSL -o "$tmp" "$from/$file"; then
        rm -f "$tmp"
        say "could not download $from/$file."
        return 1
      fi
    elif command -v wget >/dev/null 2>&1; then
      # -nv rather than -q: a failure then says why (GNU wget's "ERROR 404: Not
      # Found."), and what it wrote is shown only when the download fails.
      wgetlog="$tmp.wget"
      if wget -nv -O "$tmp" "$from/$file" 2>"$wgetlog"; then
        rm -f "$wgetlog"
      else
        cat "$wgetlog" >&2
        rm -f "$tmp" "$wgetlog"
        say "could not download $from/$file."
        return 1
      fi
    else
      say "neither curl nor wget is installed, so $file cannot be downloaded."
      return 1
    fi
    if command -v sha256sum >/dev/null 2>&1; then
      got=$(sha256sum "$tmp" | cut -d " " -f 1)
    elif command -v shasum >/dev/null 2>&1; then
      got=$(shasum -a 256 "$tmp" | cut -d " " -f 1)
    elif command -v openssl >/dev/null 2>&1; then
      got=$(openssl dgst -sha256 -r "$tmp" | cut -d " " -f 1)
    else
      rm -f "$tmp"
      say "there is no sha256sum, shasum or openssl to check $file with."
      return 1
    fi
    if [ "$got" != "$sha256" ]; then
      rm -f "$tmp"
      say "$file did not match its SHA-256, so it was not installed."
      return 1
    fi
    if ! chmod 755 "$tmp" || ! mv -f "$tmp" "$dir/floti"; then
      rm -f "$tmp"
      say "could not put floti in $dir."
      return 1
    fi
    echo "$dir/floti"
  }

  version='3.1.1'
  release='https://github.com/floti-dev/floti/releases/download/v3.1.1'

  system=$(uname -s)
  machine=$(uname -m)
  case "$system" in
    Darwin) os=macos ;;
    Linux) os=linux ;;
    *) os=$system ;;
  esac
  case "$machine" in
    x86_64 | amd64) cpu=x64 ;;
    arm64 | aarch64) cpu=arm64 ;;
    *) cpu=$machine ;;
  esac
  # A shell running under Rosetta says x86_64 on Apple Silicon.
  if [ "$os-$cpu" = macos-x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = 1 ]; then
    cpu=arm64
  fi
  case "$os-$cpu" in
    macos-arm64) sha256='0f65de1bac7d6318a343d662dba4f8c95f13289bf7b260f1c42de475858257f3' ;;
    linux-x64) sha256='9daf4a9fbf3dfbadc8d84273668d8bd7432add85715b5e17b2895500859fae58' ;;
    linux-arm64) sha256='39c81de8578f22b288ca533a36c65a84b87a02c7c62954a2ccc8e66f20903ada' ;;
    *)
      echo "floti install: Floti has no build for $system $machine; it runs on macOS on Apple Silicon, Linux on x64 and arm64, and Windows on x64 and arm64." >&2
      return 1
      ;;
  esac

  echo "Installing floti $version for $os $cpu."
  floti=$(floti_install "$version" "floti-$version-$os-$cpu" "$sha256" "$release") || return 1
  echo "floti $version is at $floti."

  # Setup reads the terminal, never the rest of this script: under
  # `curl | sh` standard input is the download. With the terminal, setup asks
  # whether to install the desktop app as well; with none, it says how.
  if (exec </dev/tty) 2>/dev/null; then
    "$floti" setup </dev/tty
  else
    "$floti" setup </dev/null
  fi
}

floti_get
