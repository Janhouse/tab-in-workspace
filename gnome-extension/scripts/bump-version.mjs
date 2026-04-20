#!/usr/bin/env node
// Adds a new shell-version to metadata.json's shell-version array and
// bumps the top-level `version` field by 0.1. Preserves JSON formatting
// (indentation, trailing newline) so the diff stays minimal.
//
// Usage: node scripts/bump-version.mjs <new-gnome-major>
//   e.g. node scripts/bump-version.mjs 50

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const METADATA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'metadata.json');

function main() {
    const newVersion = process.argv[2];
    if (!newVersion || !/^\d+$/.test(newVersion)) {
        console.error('Usage: bump-version.mjs <new-gnome-major-integer>');
        process.exit(1);
    }

    const raw = readFileSync(METADATA_PATH, 'utf8');
    const data = JSON.parse(raw);

    const shellVersions = new Set((data['shell-version'] || []).map(String));
    if (shellVersions.has(newVersion)) {
        console.log(`metadata.json already declares shell-version ${newVersion}, nothing to do.`);
        return;
    }
    shellVersions.add(newVersion);
    data['shell-version'] = Array.from(shellVersions)
        .map(v => parseInt(v, 10))
        .sort((a, b) => a - b)
        .map(String);

    const oldExtVersion = Number(data.version);
    if (Number.isNaN(oldExtVersion)) {
        console.error(`metadata.json version field is not a number: ${data.version}`);
        process.exit(1);
    }
    const newExtVersion = Math.round((oldExtVersion + 0.1) * 10) / 10;
    data.version = newExtVersion;

    const trailingNewline = raw.endsWith('\n') ? '\n' : '';
    writeFileSync(METADATA_PATH, `${JSON.stringify(data, null, 2)}${trailingNewline}`);

    console.log(`Added GNOME ${newVersion} to shell-version.`);
    console.log(`Bumped extension version ${oldExtVersion} -> ${newExtVersion}.`);
}

main();
