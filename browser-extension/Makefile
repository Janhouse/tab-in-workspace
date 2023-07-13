version=`sed -n 's/.*"version": "\(.*\)",/\1/p' manifest.json`

all: build

build: background.js manifest.json
	zip "tab-in-workspace@janhouse.lv-browser-v$(version).zip" background.js manifest.json

version:
	echo $(version)

clean:
	rm "tab-in-workspace@janhouse.lv-browser-v$(version).zip"
