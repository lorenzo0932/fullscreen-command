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

## Requirements

- GNOME Shell 45 – 49 (tested on 49 / Wayland)
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

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `start-command` | string | `systemctl --user start ambilight.service` | Command run on fullscreen enter |
| `stop-command` | string | `systemctl --user stop ambilight.service` | Command run on fullscreen leave (after the debounce) |
| `detect-borderless` | bool | `true` | Treat windows covering the whole monitor as fullscreen |
| `only-focused` | bool | `false` | Only consider the focused window |
| `monitor` | int | `-1` | Monitor index to watch, `-1` = any |
| `stop-delay-ms` | int | `400` | Debounce before running the stop command |
| `gamemode-guard` | bool | `true` | Keep running while a GameMode session is active |
| `rescan-interval-s` | int | `10` | Safety rescan, `0` = off |
| `debug` | bool | `false` | Log debug messages to the journal |

Example — point it at anything:

```sh
gsettings set org.gnome.shell.extensions.fullscreen-command \
  start-command "my-startup-script"
gsettings set org.gnome.shell.extensions.fullscreen-command \
  stop-command "my-cleanup-script"
```

Full reference: [docs/configuration.md](docs/configuration.md).

## Ambilight use case

The defaults assume an "ambilight" setup: a daemon that samples the screen
color and drives an LED strip behind the monitor, managed as a systemd user
service:

```sh
systemctl --user start ambilight.service   # fullscreen enter
systemctl --user stop ambilight.service    # fullscreen leave
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
