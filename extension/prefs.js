import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class FullscreenCommandPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const commandsPage = new Adw.PreferencesPage({
            title: 'Commands',
            icon_name: 'utilities-terminal-symbolic',
        });
        window.add(commandsPage);

        const commandsGroup = new Adw.PreferencesGroup({
            description: 'Run when a window enters or leaves fullscreen. ' +
                'Leave empty to do nothing.',
        });
        commandsPage.add(commandsGroup);

        const startRow = new Adw.EntryRow({
            title: 'Start command',
        });
        startRow.set_placeholder_text('/usr/local/bin/myscript.sh');
        settings.bind('start-command', startRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);
        commandsGroup.add(startRow);

        const stopRow = new Adw.EntryRow({
            title: 'Stop command',
        });
        stopRow.set_placeholder_text('/usr/local/bin/myscript.sh');
        settings.bind('stop-command', stopRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);
        commandsGroup.add(stopRow);

        const detectionPage = new Adw.PreferencesPage({
            title: 'Fullscreen detection',
            icon_name: 'video-display-symbolic',
        });
        window.add(detectionPage);

        const detectionGroup = new Adw.PreferencesGroup({
            description: 'When is a window considered fullscreen?',
        });
        detectionPage.add(detectionGroup);

        const borderlessRow = new Adw.ActionRow({
            title: 'Detect borderless windows',
            subtitle: 'Treat windows covering the whole monitor as fullscreen',
        });
        const borderlessToggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        settings.bind('detect-borderless', borderlessToggle, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        borderlessRow.add_suffix(borderlessToggle);
        borderlessRow.set_activatable_widget(borderlessToggle);
        detectionGroup.add(borderlessRow);

        const focusedRow = new Adw.ActionRow({
            title: 'Only when focused',
            subtitle: 'Trigger only if the fullscreen window has focus',
        });
        const focusedToggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        settings.bind('only-focused', focusedToggle, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        focusedRow.add_suffix(focusedToggle);
        focusedRow.set_activatable_widget(focusedToggle);
        detectionGroup.add(focusedRow);

        const monitorRow = new Adw.SpinRow({
            title: 'Monitor',
            subtitle: 'Monitor index to watch, -1 for any',
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: 10,
                step_increment: 1,
            }),
        });
        settings.bind('monitor', monitorRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        detectionGroup.add(monitorRow);

        const delayRow = new Adw.SpinRow({
            title: 'Stop delay',
            subtitle: 'Debounce before running the stop command, in ms',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 10000,
                step_increment: 100,
            }),
        });
        settings.bind('stop-delay-ms', delayRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        detectionGroup.add(delayRow);

        const rescanRow = new Adw.SpinRow({
            title: 'Safety rescan interval',
            subtitle: 'Seconds between rescans, 0 to disable',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 300,
                step_increment: 1,
            }),
        });
        settings.bind('rescan-interval-s', rescanRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        detectionGroup.add(rescanRow);

        const advancedPage = new Adw.PreferencesPage({
            title: 'Advanced',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(advancedPage);

        const advancedGroup = new Adw.PreferencesGroup({
            description: 'Extra behavior for special setups.',
        });
        advancedPage.add(advancedGroup);

        const gamemodeRow = new Adw.ActionRow({
            title: 'GameMode guard',
            subtitle: 'Keep the session running while a GameMode session is active',
        });
        const gamemodeToggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        settings.bind('gamemode-guard', gamemodeToggle, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        gamemodeRow.add_suffix(gamemodeToggle);
        gamemodeRow.set_activatable_widget(gamemodeToggle);
        advancedGroup.add(gamemodeRow);

        const debugRow = new Adw.ActionRow({
            title: 'Debug logging',
            subtitle: 'Log debug messages to the journal',
        });
        const debugToggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        settings.bind('debug', debugToggle, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        debugRow.add_suffix(debugToggle);
        debugRow.set_activatable_widget(debugToggle);
        advancedGroup.add(debugRow);
    }
}
