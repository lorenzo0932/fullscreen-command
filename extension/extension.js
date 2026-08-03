import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';

export default class FullscreenCommandExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._running = false;
        this._stopTimer = null;
        this._rescanTimer = null;
        this._evalId = null;
        this._winConns = new Map();

        this._displaySignals = [];
        this._displaySignals.push(global.display.connect('window-created',
            (_d, win) => this._onWindowAdded(win)));
        for (const sig of ['window-entered-monitor', 'window-left-monitor'])
            this._displaySignals.push(global.display.connect(sig,
                () => this._scheduleEval()));

        for (const actor of global.get_window_actors())
            this._onWindowAdded(actor.meta_window);

        const interval = this._settings.get_int('rescan-interval-s');
        if (interval > 0) {
            // Keep the recurring source alive even if one pass fails.
            this._rescanTimer = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT, interval, () => {
                    try {
                        this._evaluate();
                    } catch (e) {
                        console.error(`[fullscreen-command] rescan: ${e}`);
                    }
                    return GLib.SOURCE_CONTINUE;
                });
        }

        this._scheduleEval();
    }

    disable() {
        if (this._evalId) {
            GLib.source_remove(this._evalId);
            this._evalId = null;
        }
        if (this._stopTimer) {
            GLib.source_remove(this._stopTimer);
            this._stopTimer = null;
        }
        if (this._rescanTimer) {
            GLib.source_remove(this._rescanTimer);
            this._rescanTimer = null;
        }
        for (const [win, conns] of this._winConns) {
            for (const id of conns)
                win.disconnect(id);
        }
        this._winConns.clear();
        for (const id of this._displaySignals)
            global.display.disconnect(id);
        this._displaySignals = [];

        if (this._running)
            this._run('stop-command');
        this._running = false;
        this._settings = null;
    }

    _onWindowAdded(win) {
        if (!win || this._winConns.has(win))
            return;
        const conns = [];
        // Window signals differ across Mutter versions (e.g. 'destroy' and
        // 'state-changed' do not exist on every release), so guard each one.
        try {
            conns.push(win.connect('unmanaged',
                () => this._onWindowDestroyed(win)));
        } catch (e) {
            this._log(`no unmanaged: ${e}`);
        }
        try {
            conns.push(win.connect('notify::fullscreen',
                () => this._scheduleEval()));
        } catch (e) {
            this._log(`no notify::fullscreen: ${e}`);
        }
        try {
            conns.push(win.connect('size-changed',
                () => this._scheduleEval()));
        } catch (e) {
            this._log(`no size-changed: ${e}`);
        }
        this._winConns.set(win, conns);
        this._scheduleEval();
    }

    _onWindowDestroyed(win) {
        if (win) {
            const conns = this._winConns.get(win);
            if (conns) {
                for (const id of conns)
                    win.disconnect(id);
                this._winConns.delete(win);
            }
        }
        this._scheduleEval();
    }

    _scheduleEval() {
        if (this._evalId)
            return;
        this._evalId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._evalId = null;
            try {
                this._evaluate();
            } catch (e) {
                console.error(`[fullscreen-command] eval: ${e}`);
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _evaluate() {
        const fullscreen = this._anyFullscreen();
        if (fullscreen) {
            if (this._stopTimer) {
                GLib.source_remove(this._stopTimer);
                this._stopTimer = null;
            }
            if (!this._running) {
                this._running = true;
                this._run('start-command');
            }
        } else if (this._running && !this._stopTimer) {
            const delay = Math.max(0, this._settings.get_int('stop-delay-ms'));
            this._stopTimer = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT, delay, () => {
                    this._stopTimer = null;
                    if (this._anyFullscreen())
                        return GLib.SOURCE_REMOVE;
                    if (this._shouldBlockStop())
                        return GLib.SOURCE_REMOVE;
                    this._running = false;
                    this._run('stop-command');
                    return GLib.SOURCE_REMOVE;
                });
        } else if (this._stopTimer) {
            GLib.source_remove(this._stopTimer);
            this._stopTimer = null;
        }
    }

    _anyFullscreen() {
        const monitor = this._settings.get_int('monitor');
        const onlyFocused = this._settings.get_boolean('only-focused');
        const focused = global.display.focus_window;

        for (const actor of global.get_window_actors()) {
            const win = actor.meta_window;
            if (!win || win.is_override_redirect())
                continue;
            if (onlyFocused && win !== focused)
                continue;
            if (monitor >= 0 && win.get_monitor() !== monitor)
                continue;
            if (this._windowIsFullscreen(win))
                return true;
        }
        return false;
    }

    _windowIsFullscreen(win) {
        if (win.is_fullscreen())
            return true;
        if (!this._settings.get_boolean('detect-borderless'))
            return false;
        const geo = win.get_frame_rect();
        const mon = global.display.get_monitor_geometry(win.get_monitor());
        return geo.width === mon.width && geo.height === mon.height;
    }

    _shouldBlockStop() {
        if (!this._settings.get_boolean('gamemode-guard'))
            return false;
        try {
            // gamemoded -s exits 0 both when a session is active and when
            // it is not (0 means "daemon reachable"); the actual state is
            // only in the output text, so parse it.
            const [ok, out] = GLib.spawn_command_line_sync('gamemoded -s');
            if (!ok)
                return false;
            const text = new TextDecoder().decode(out);
            return text.includes('active') && !text.includes('inactive');
        } catch (e) {
            this._log(`gamemoded check failed: ${e}`);
            return false;
        }
    }

    _run(key) {
        const cmd = this._settings.get_string(key);
        if (!cmd) {
            this._log(`empty ${key}, nothing to run`);
            return;
        }
        this._log(`running ${key}: ${cmd}`);
        Util.spawnCommandLine(cmd, ok => {
            if (!ok)
                console.error(
                    `[fullscreen-command] failed to run ${key}: ${cmd}`);
        });
    }

    _log(msg) {
        if (this._settings && this._settings.get_boolean('debug'))
            console.log(`[fullscreen-command] ${msg}`);
    }
}
