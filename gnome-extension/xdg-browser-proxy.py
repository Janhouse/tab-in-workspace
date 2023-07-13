#!/usr/bin/env python3
import sys
import subprocess
from pydbus import SessionBus

try:
    bus = SessionBus()
    proxy = bus.get("org.gnome.Shell", "/org/gnome/Shell/Extensions/TabInWorkspace")
    proxy.OpenUrl(sys.argv[1])
except Exception as e:
    subprocess.run(['gtk-launch', 'firefox.desktop', sys.argv[1]])