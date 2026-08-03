# Configuration

All settings live in the GSettings schema
`org.gnome.shell.extensions.fullscreen-command`. Change them from the
preferences window (`gnome-extensions prefs fullscreen-command@lorenzo0932`
or the GNOME Extensions app), or with `gsettings`:

## Keys

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `start-command` | string | *(empty)* | Command run when a window becomes fullscreen |
| `stop-command` | string | *(empty)* | Command run when no window is fullscreen anymore (after the debounce) |
| `detect-borderless` | bool | `true` | Treat a window covering the whole monitor as fullscreen |
| `only-focused` | bool | `true` | Trigger only when the fullscreen window has focus |
| `monitor` | int | `-1` | Monitor index to watch; `-1` = any monitor |
| `stop-delay-ms` | int | `400` | Debounce for the stop command, in milliseconds |
| `gamemode-guard` | bool | `true` | Do not run the stop command while a GameMode session is active |
| `rescan-interval-s` | int | `10` | Safety rescan of all windows; `0` disables it |
| `debug` | bool | `false` | Log debug messages to the journal |

Both commands are empty by default: the extension does nothing until you
set them.

## Fullscreen detection

A window counts as fullscreen if **either**:

1. `window.is_fullscreen()` is true (the classic fullscreen state, e.g.
   `F11` or a video player's fullscreen button), **or**
2. `detect-borderless` is enabled and the window's frame covers the whole
   monitor — this catches "borderless windowed" games and video players
   that size themselves to the screen without setting the fullscreen
   state.

A window on a different workspace than the current one is not an actor,
so it is not counted — leaving fullscreen (switching to the desktop) runs
the stop command.

With `only-focused` (default `true`) the window must also be the focused
one: a fullscreen window in the background does not trigger anything, and
switching focus away from a fullscreen window runs the stop command after
the debounce.

## Behavior details

- **Entering fullscreen** cancels any pending stop and runs
  `start-command` immediately (once).
- **Leaving fullscreen** starts a `stop-delay-ms` debounce. The stop
  command runs only if, after the delay, no window is fullscreen and the
  GameMode guard (if enabled) does not block it.
- If the extension is disabled while it has started a session, it runs
  `stop-command` to leave a clean state.
- The commands are executed through the shell (`GLib.spawn_command_line`),
  so quoting and environment expansion behave like a terminal command.

## Examples

### A simple script

```sh
gsettings set ... start-command "/usr/local/bin/start-fullscreen.sh"
gsettings set ... stop-command  "/usr/local/bin/leave-fullscreen.sh"
```

### Ambilight (the original use case)

```sh
gsettings set org.gnome.shell.extensions.fullscreen-command \
  start-command "systemctl --user start ambilight.service"
gsettings set org.gnome.shell.extensions.fullscreen-command \
  stop-command "systemctl --user stop ambilight.service"
```

### Brightness control with an external tool

```sh
gsettings set ... start-command "brightnessctl set 50%"
gsettings set ... stop-command  "brightnessctl set 100%"
```

### GameMode without gamemoderun

```sh
gsettings set ... start-command "systemctl --user start gamemode-session"
gsettings set ... stop-command  "systemctl --user stop gamemode-session"
gsettings set ... gamemode-guard false
```

### Multi-monitor: only the external monitor

```sh
gsettings set ... monitor 1
```

## GameMode guard

When `gamemode-guard` is `true`, the extension checks
`gamemoded -s` before running the stop command and skips it while a
GameMode session is active (games often drop fullscreen briefly — alt-tab,
menus, dialogs). If `gamemoded` is not installed the check fails
harmlessly and the stop runs normally.

## Debugging

```sh
gsettings set org.gnome.shell.extensions.fullscreen-command debug true
journalctl -f -o cat | grep fullscreen-command
```

You should see transitions like:

```
[fullscreen-command] running start-command: systemctl --user start ambilight.service
[fullscreen-command] running stop-command: systemctl --user stop ambilight.service
```
