# Fullscreen Command

Run a command when a window enters fullscreen, and another when it leaves.

A GNOME Shell extension for anyone who needs an event-driven trigger on the
fullscreen state of their windows: start a background service, toggle a
hardware effect, pause syncing, whatever. The commands are fully
configurable via GSettings.

## Why

GNOME 45+ blocks every external route to watch the fullscreen state:

- `org.gnome.Shell.Eval` is disabled on the session bus
- `org.gnome.Shell.Introspect.GetWindows` returns `AccessDenied` for
  external callers
- `wmctrl`/`xdotool` do not work on Wayland

A shell extension is the only clean, event-driven path left, and no
maintained extension on extensions.gnome.org covered "run command on
fullscreen enter/exit" — see [docs/motivations.md](docs/motivations.md).

## Origin

This project started as a **personal need**: an *ambilight* setup that
samples the screen color with a daemon and drives an LED strip behind the
monitor through Home Assistant. The daemon was triggered by a `gamemoderun`
hook, and when that approach was dropped it needed a clean trigger on the
fullscreen state of any window — which, as explained above, only a shell
extension could provide.

So this is first of all a **personal project built to scratch an itch**,
released as a generic tool: the ambilight daemon is not part of the
extension, only two configurable command strings are. If you run into the
same need, it may be useful to you too — the [Ambilight use
case](#ambilight-use-case) section shows how the original setup was wired.

## Requirements

- GNOME Shell 47 – 49 (tested on 49 / Wayland)
- The binaries referenced by your commands (the default commands need
  `systemd` user services; the optional GameMode guard needs `gamemoded`)

## Installation

```sh
./install.sh
```

Then **log out and back in** (GNOME Shell must restart to load the
extension). On X11 you can instead press `Alt+F2`, type `r`, and press
`Enter`.

To remove:

```sh
./uninstall.sh
```

## Configuration

Open the preferences from the GNOME Extensions app, or from a terminal:

```sh
gnome-extensions prefs fullscreen-command@lorenzo0932
```

Everything can also be set from the command line — the keys map 1:1 to
the preferences UI:

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `start-command` | string | *(empty)* | Command run on fullscreen enter |
| `stop-command` | string | *(empty)* | Command run on fullscreen leave (after the debounce) |
| `detect-borderless` | bool | `true` | Treat windows covering the whole monitor as fullscreen |
| `only-focused` | bool | `true` | Trigger only when the fullscreen window has focus |
| `monitor` | int | `-1` | Monitor index to watch, `-1` = any |
| `stop-delay-ms` | int | `400` | Debounce before running the stop command |
| `gamemode-guard` | bool | `true` | Keep running while a GameMode session is active |
| `rescan-interval-s` | int | `10` | Safety rescan, `0` = off |
| `debug` | bool | `false` | Log debug messages to the journal |

Both commands are empty by default: the extension does nothing until you
set them.

### Getting started

Point it at anything — a script, a service, a command:

```sh
gsettings set org.gnome.shell.extensions.fullscreen-command \
  start-command "/usr/local/bin/start-fullscreen.sh"
gsettings set org.gnome.shell.extensions.fullscreen-command \
  stop-command "/usr/local/bin/leave-fullscreen.sh"
```

Full reference: [docs/configuration.md](docs/configuration.md).

## Ambilight use case

The original use case this extension was built for: an "ambilight" setup
where a daemon samples the screen color and drives an LED strip behind the
monitor, managed as a systemd user service:

```sh
gsettings set org.gnome.shell.extensions.fullscreen-command \
  start-command "systemctl --user start ambilight.service"   # fullscreen enter
gsettings set org.gnome.shell.extensions.fullscreen-command \
  stop-command "systemctl --user stop ambilight.service"     # fullscreen leave
```

`systemd` is used deliberately as the *supervisor* (idempotent start,
deterministic stop, `Restart=on-failure`, journal logging) while the
extension is only the *trigger*. The daemon itself is not part of this
project — the commands are just strings, so the extension stays generic.

## Debugging

```sh
gsettings set org.gnome.shell.extensions.fullscreen-command debug true
journalctl -f -o cat | grep fullscreen-command
```

## License

MIT — see [LICENSE](LICENSE).
