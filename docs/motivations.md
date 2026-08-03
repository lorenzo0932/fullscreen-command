# Motivations

This extension exists because, on modern GNOME, there is **no other way**
to react to the fullscreen state of windows — and because nothing
maintained covered the "run command on fullscreen" niche.

## Why an extension is required

External (non-shell) processes cannot watch the fullscreen state on
GNOME 45+:

- **`org.gnome.Shell.Eval`** — the classic escape hatch to evaluate
  JavaScript inside the shell — is **disabled** since GNOME 45. Calling it
  returns `false`; there is no way to enable it.
- **`org.gnome.Shell.Introspect`** — moved from `/org/gnome/Shell` to
  `/org/gnome/Shell/Introspect`, and every method (`GetWindows`,
  `GetRunningApplications`) answers **`AccessDenied`** to external DBus
  callers. It exists for GNOME Shell's own debugging tooling only.
- **X11-only tools** (`wmctrl`, `xdotool`) do not work on Wayland, where
  clients cannot inspect or control windows they do not own.

The remaining option is a GNOME Shell extension running inside the
compositor, using the internal Mutter API — event-driven, zero polling.

## Why not the alternatives

- **Feral GameMode hooks** (`gamemoded` `[custom]` start/end): session
  based, requires launching games through `gamemoderun`, and knows nothing
  about fullscreen — the ambilight daemon started even for windowed
  sessions.
- **`gamemoded -s` polling**: only tells you a GameMode session exists,
  not whether the screen is actually fullscreen.
- **`xrandr`/`wlr` heuristics**: no standard Wayland protocol exposes the
  fullscreen state of windows to a client.

## Why not an existing extension

An audit of extensions.gnome.org (and GitHub) found:

| Extension | What it does | Status |
| --- | --- | --- |
| Fullscreen Button | Toggles fullscreen from the panel | maintained, but no command hooks |
| Auto Fullscreen | Opens new windows fullscreen | abandoned (GNOME 3.32) |
| Fullscreen On New Workspace | Moves fullscreen windows to another workspace | different purpose |
| Custom Command Toggle | Runs custom commands from Quick Settings | manual trigger, not fullscreen-driven |
| disable-unredirect / fullscreen-avoider | Compositor / panel behavior | different purpose |

Nothing runs **arbitrary commands on fullscreen transitions** — the niche
this extension fills.

## Design decisions

- **Generic by design**: only two configurable command strings + a few
  toggles. The ambilight scenario is the documented default use case, not
  part of the code.
- **Event-driven, with a safety net**: window signals (`window-created`,
  `window-destroyed`, `state-changed`/`notify::fullscreen`,
  `size-changed`, monitor events) cover every transition; a low-frequency
  rescan (default 10 s, configurable, off-able) catches anything the
  signals miss — e.g. a borderless window resized while unfocused.
- **Debounced stop**: leaving fullscreen is flaky (window switches,
  tooltips, multi-monitor moves), so the stop command runs only after
  `stop-delay-ms` without any fullscreen window.
- **GameMode guard**: games often switch briefly to the desktop; with
  `gamemode-guard` the session keeps running while a GameMode session is
  active, so the daemon never restarts mid-game.
- **systemd as supervisor, not trigger**: the defaults call
  `systemctl --user start/stop`, giving idempotency, deterministic
  process cleanup, `Restart=on-failure`, and journal logging — the
  extension itself stays stateless and simple.
