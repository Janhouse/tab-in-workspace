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
    GLib,
    GObject
} = imports.gi;
const System = imports.system;

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
  <method name='reset' />
</interface>
</node>`;

const NativeMessagingHost = GObject.registerClass({
    GTypeName: 'TabInWorkspaceNativeMessagingHost',
}, class NativeMessagingHost extends Gio.Application {

    _init() {
        printerr(`Starting native message host`);
        super._init({
            application_id: 'lv.janhouse.TabInWorkspace.Browser',
            flags: Gio.ApplicationFlags.NON_UNIQUE,
        });
    }

    vfunc_activate() {
        super.vfunc_activate();
    }

    vfunc_startup() {
        super.vfunc_startup();
        this.hold();

        this._stdin = new Gio.DataInputStream({
            base_stream: new Gio.UnixInputStream({
                fd: 0
            }),
            byte_order: Gio.DataStreamByteOrder.HOST_ENDIAN,
        });

        this._stdout = new Gio.DataOutputStream({
            base_stream: new Gio.UnixOutputStream({
                fd: 1
            }),
            byte_order: Gio.DataStreamByteOrder.HOST_ENDIAN,
        });

        const source = this._stdin.base_stream.create_source(null);
        source.set_callback(this.receive.bind(this));
        source.attach(null);

        this._dbus = Gio.DBusExportedObject.wrapJSObject(BROWSER_INTERFACE, this);
        this._impl = this._dbus;
        this._dbus.export(Gio.DBus.session, '/lv/janhouse/TabInWorkspace/Browser');

        Gio.DBus.session.own_name('lv.janhouse.TabInWorkspace.Browser',
            Gio.BusNameOwnerFlags.REPLACE,
            null, null);
    }

    send(message) {
        try {
            const data = JSON.stringify(message);
            this._stdout.put_int32(data.length, null);
            this._stdout.put_string(data, null);
        } catch (e) {
            this.quit();
        }
    }

    receive() {
        try {
            const length = this._stdin.read_int32(null);
            const bytes = this._stdin.read_bytes(length, null).toArray();
            const message = JSON.parse(imports.byteArray.toString(bytes));

            if (message.action === 'windowsAdded') {
                printerr(`windowsAdded ${message.windowIds}`);
                this.windowsAdded(message.windowIds);
            }
            return GLib.SOURCE_CONTINUE;
        } catch (e) {
            this.quit();
        }
    }

    windowsAdded(windowIds) {
        try {
            this._dbus.emit_signal('windowsAdded', new GLib.Variant('(at)', [
                [].concat(windowIds)
            ]));
        } catch (e) {
            printerr(`Failed to send event: ${e}`);
        }
    }

    idLinked(windowId) {
        const message = {
            action: 'idLinked',
            windowId: windowId
        }
        this.send(message)
    }

    openUrl(windowId, url) {
        const message = {
            action: 'openUrl',
            windowId: windowId,
            url: url
        }
        this.send(message)
    }

    reset() {
        const message = {
            action: 'reset'
        }
        this.send(message)
    }

});

(new NativeMessagingHost()).run([System.programInvocationName]);