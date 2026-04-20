version=`cat metadata.json | grep version | tail --lines=1 | awk -e '{print $$2}' | tr -d ',' `


all: build

build: extension.js metadata.json tab-in-workspace-service.js tab-in-workspace.desktop xdg-browser-proxy.js lv.janhouse.tabinworkspace.json
	zip "tab-in-workspace@janhouse.lv-gnome-v$(version).zip" extension.js metadata.json tab-in-workspace-service.js tab-in-workspace.desktop xdg-browser-proxy.js lv.janhouse.tabinworkspace.json
	
install: build
	gnome-extensions install "tab-in-workspace@janhouse.lv-gnome-v$(version).zip" --force

version:
	echo $(version)

test: install
	SHELL_DEBUG=backtrace-warnings dbus-run-session -- gnome-shell --nested --wayland

pack:
	gnome-extensions pack --force --out-dir . \
		--extra-source=tab-in-workspace-service.js \
		--extra-source=tab-in-workspace.desktop \
		--extra-source=xdg-browser-proxy.js \
		--extra-source=lv.janhouse.tabinworkspace.json \
		.

lint:
	npm ci --legacy-peer-deps
	npx eslint extension.js
	npx tsc --noEmit

clean:
	rm "tab-in-workspace@janhouse.lv-gnome-v$(version).zip"
