# Open browser tabs on active desktop/workspace

This is an extension which utilizes D-Bus message bus on Linux desktop to handle opening of web links on the active
 workspace/desktop, instead of browser default, which is usually the last window on which a new tab was opened.
 
https://github.com/Janhouse/tab-in-workspace/assets/1036439/28fd8e2f-e067-4c4d-a523-d9ef10e833bd

It consists of:
* **browser extension**, 
* browser **native messaging** program (written in Python),
* **Gnome extension** to handle window management,
* **xdg handler program** for web links (written in Python)
* **desktop file** to allow setting the handler as "default browser"

Initial implementation is made for Firefox and Gnome on wayland, but it is possible to make it work with
 other Wayland and X11 desktop environments while keeping most parts shared.

## Dependencies

Python 3, python-pydbus

## Setup guide

Until I provide proper packaging, you have to set it up manually:

* Copy `browser-extension/lv.janhouse.tabinworkspace.json` to `~/.mozilla/native-messaging-hosts/` and adjust the path in it to `tab-in-workspace-service.py`.
* Install Browser extension https://addons.mozilla.org/en-US/firefox/addon/open-on-active-desktop/
* Install gnome-shell extension `make build && make install` and restart gnome-shell.
* Copy `gnome-extension/tab-in-workspace.desktop` to `~/.local/share/applications/` and adjust the path in it to `xdg-browser-proxy.py`
* Set `tab-in-workspace` as the default browser in `~/.config/mimeapps.list`:
```
[Added Associations]
x-scheme-handler/http=tab-in-workspace.desktop;firefox.desktop;
x-scheme-handler/https=tab-in-workspace.desktop;firefox.desktop;
[Default Applications]
x-scheme-handler/http=tab-in-workspace.desktop
x-scheme-handler/https=tab-in-workspace.desktop
```
