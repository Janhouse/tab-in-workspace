# Open browser tabs on active desktop/workspace

This is an extension which utilizes D-Bus message bus on Linux desktop to handle opening of web links on the active
 workspace/desktop, instead of browser default, which is usually the last window on which a new tab was opened.

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

TODO