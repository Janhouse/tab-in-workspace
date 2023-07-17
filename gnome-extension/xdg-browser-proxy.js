#!/usr/bin/env gjs

/* 
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
'use strict';

const {
    Gio,
    GLib
} = imports.gi;
const System = imports.system;

const WM_INTERFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.TabInWorkspace">
      <method name="OpenUrl">
         <arg type="s" direction="in" name="url" />
         <arg type="b" direction="out" name="result" />
      </method>
   </interface>
</node>`;

const loop = GLib.MainLoop.new(null, false);
const url = System.programArgs[0];
const BrowserProxy = Gio.DBusProxy.makeProxyWrapper(WM_INTERFACE);

try {
    BrowserProxy(Gio.DBus.session, 'org.gnome.Shell', '/org/gnome/Shell/Extensions/TabInWorkspace',
        (proxy, error) => {
            if (error !== null) {
                openUrl(url);
            }
            let response;
            try {
                response = proxy.OpenUrlSync(url)[0];
            } catch (e) {}
            if (response != true) {
                openUrl(url);
            } else {
                loop.quit();
            }
        }
    );
} catch (e) {
    logError(e);
    openUrl(url);
}

function openUrl(url) {
    try {
        let proc = Gio.Subprocess.new(['gtk-launch', 'firefox.desktop', url], Gio.SubprocessFlags.NONE);
        proc.wait_async(null, (proc, result) => {
            try {
                proc.wait_finish(result);
            } catch (e) {
                logError(e);
            } finally {
                loop.quit();
            }
        });
    } catch (e) {
        logError(e);
    } finally {
        loop.quit();
    }
}

loop.run();