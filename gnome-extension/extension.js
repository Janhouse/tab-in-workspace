/* extension.js
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

/* exported init */
const {
    Gio,
    GLib
} = imports.gi;

const WM_INTERFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.TabInWorkspace">
      <method name="OpenUrl">
         <arg type="s" direction="in" name="url" />
         <arg type="b" direction="out" name="result" />
      </method>
   </interface>
</node>`;

const BROWSER_INTERFACE = `
<node>
<interface name='lv.janhouse.TabInWorkspace.Browser'>
  <method name='openUrl'>
    <arg type='t' name='windowId' direction='in'/>
    <arg type='s' name='url' direction='in'/>
  </method>
  <method name='idLinked'>
    <arg type='t' name='windowId' direction='in'/>
  </method>
  <signal name='windowsAdded'>
    <arg type='at' name='windowIds' direction='out' />
  </signal>
  <method name='getAllWindows'>
    <arg type='at' name='windowIds' direction='out'/>
  </method>
</interface>
</node>`;

class Extension {
    enable() {
        this._dbus = Gio.DBusExportedObject.wrapJSObject(WM_INTERFACE, this);
        this._dbus.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/TabInWorkspace');
        this._proxy = null;
        this.BrowserProxy = Gio.DBusProxy.makeProxyWrapper(BROWSER_INTERFACE);
        this._createDbusProxy();
        this._windowMap = {};
        this._timers = [];
    }

    disable() {
        this._dbus.flush();
        this._dbus.unexport();
        delete this._dbus;
        if (this._proxy && this._signal) {
            this._proxy.disconnectSignal(this._signal);
            delete this._proxy;
            delete this._signal;
        }
        this._timers.forEach(timerId => GLib.Source.remove(timerId));
    }

    _createDbusProxy(cancellable = null, flags = Gio.DBusProxyFlags.NONE) {
        this.BrowserProxy(
            Gio.DBus.session,
            'lv.janhouse.TabInWorkspace.Browser',
            '/lv/janhouse/TabInWorkspace/Browser',
            (proxy, error) => {
                if (error === null) {
                    this._proxy = proxy;
                    global.prox = this._proxy;
                    this._signal = this._proxy.connectSignal('windowsAdded', (p, nameOwner, args) => {
                        this._windowsAdded(args);
                    });
                    this._proxy.getAllWindowsAsync((returnValue, errorObj, fdList) => {
                        if (errorObj === null) {
                            this._windowsAdded(returnValue);
                        } else {
                            logError(errorObj);
                        }
                    });
                } else {
                    logError(error, 'Failed constructing proxy');
                }
            },
            cancellable,
            flags
        );
    }

    _windowsAdded(args) {
        let allWindows = global.get_window_actors();
        args[0].toString().split(',').forEach(windowId => {
            this._findWindow(windowId, allWindows);
        });
    }

    _findWindow(windowId, allWindows, iter = 0) {
        if (Object.values(this._windowMap).includes(windowId)) {
            this._proxy.idLinkedRemote(windowId, function () {
                return;
            });
            return false;
        }

        let win = allWindows.find(w => {
            if (w.meta_window.get_title() == null) {
                return false;
            }
            return w.meta_window.get_title().startsWith(`wid:${windowId}:`);
        })

        if (win === undefined) {
            log(`Unable to link ${windowId}, possibly window not ready`);
            if (iter < 2) {
                let loop = imports.mainloop.timeout_add(500, () => this._findWindow(windowId, allWindows, ++iter));
                this._timers.push(loop);
            }
            return false;
        }

        let wmId = win.meta_window.get_id();
        this._windowMap[wmId] = windowId;
        this._proxy.idLinkedRemote(windowId, function () {
            return;
        });
        return false;
    }

    _removeClosedWindows(allWindows) {
        this._windowMap = Object.keys(this._windowMap)
            .filter(key => allWindows.find(w => w.meta_window.get_id() == key))
            .reduce((obj, key) => {
                obj[key] = this._windowMap[key];
                return obj;
            }, {});
    }

    OpenUrl(url) {
        if (this._proxy == undefined) {
            logError("Unable to open URL, proxy not connected.");
            return false;
        }
        let allWindows = global.get_window_actors();
        this._removeClosedWindows(allWindows);

        let winId = 0;
        let targetWindow = allWindows
            .filter(w => w.meta_window.get_id() in this._windowMap) // Filter only browser windows
            .find(w => w.meta_window.located_on_workspace(global.workspaceManager.get_active_workspace())); // Find one in active workspace

        if (targetWindow !== undefined) {
            winId = this._windowMap[targetWindow.meta_window.get_id()];
        }

        this._proxy.openUrlRemote(winId, url, function () {
            if (winId != 0) {
                targetWindow.meta_window.activate(0); // Raises, makes active
                //targetWindow.meta_window.activate(1); // Keeps in background, notifies user
            }
            return;
        });
        return true;
    }
}

function init() {
    return new Extension();
}