version=`cat metadata.json | grep version | tail --lines=1 | awk -e '{print $$2}' | tr -d ',' `


all: build

build: extension.js metadata.json
	zip "tab-in-workspace@janhouse.lv-gnome-v$(version).zip" extension.js metadata.json
	
install: build
	gnome-extensions install "tab-in-workspace@janhouse.lv-gnome-v$(version).zip" --force

version:
	echo $(version)

test: install
	SHELL_DEBUG=backtrace-warnings dbus-run-session -- gnome-shell --nested --wayland

clean:
	rm "tab-in-workspace@janhouse.lv-gnome-v$(version).zip"
