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
    const args = process.argv.slice(2);
    if (args.length === 0 || !args.every(a => /^\d+$/.test(a))) {
        console.error('Usage: bump-version.mjs <new-gnome-major> [<more-gnome-majors>...]');
        console.error('  e.g. bump-version.mjs 48 49 50');
        process.exit(1);
    }

    const raw = readFileSync(METADATA_PATH, 'utf8');
    const data = JSON.parse(raw);

    const shellVersions = new Set((data['shell-version'] || []).map(String));
    const added = [];
    for (const v of args) {
        if (!shellVersions.has(v)) {
            shellVersions.add(v);
            added.push(v);
        }
    }
    if (added.length === 0) {
        console.log('metadata.json already declares all requested shell-versions, nothing to do.');
        return;
    }

    data['shell-version'] = Array.from(shellVersions)
        .map(v => parseInt(v, 10))
        .sort((a, b) => a - b)
        .map(String);

    const oldExtVersion = Number(data.version);
    if (Number.isNaN(oldExtVersion)) {
        console.error(`metadata.json version field is not a number: ${data.version}`);
        process.exit(1);
    }
    // Single 0.1 bump regardless of how many shell-versions we added: this
    // is one coherent compatibility release, not one per GNOME version.
    const newExtVersion = Math.round((oldExtVersion + 0.1) * 10) / 10;
    data.version = newExtVersion;

    const trailingNewline = raw.endsWith('\n') ? '\n' : '';
    writeFileSync(METADATA_PATH, `${JSON.stringify(data, null, 2)}${trailingNewline}`);

    console.log(`Added GNOME ${added.join(', ')} to shell-version.`);
    console.log(`Bumped extension version ${oldExtVersion} -> ${newExtVersion}.`);
}

main();
