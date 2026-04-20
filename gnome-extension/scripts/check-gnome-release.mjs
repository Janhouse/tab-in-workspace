#!/usr/bin/env node
// Detects the highest stable GNOME Shell major version from
// release.gnome.org's ICS calendar and compares with metadata.json.
//
// Outputs (when run in GitHub Actions):
//   bump_needed=true|false
//   new_version=<int>       (only if bump_needed)
//   release_date=<ISO date> (only if bump_needed)
//
// Exit code is always 0 so the workflow can read outputs even when no bump.

import {readFileSync, writeFileSync, appendFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ICS_URL = 'https://release.gnome.org/calendar/schedule.ics';
const METADATA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'metadata.json');

function emit(key, value) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    }
}

function writeReleaseDate(date) {
    try {
        writeFileSync('/tmp/release_date', date);
    } catch {
        // Non-CI environment may not allow /tmp writes; ignore.
    }
}

function parseIcs(text) {
    // Unfold folded lines per RFC 5545: any line starting with space/tab
    // continues the previous line.
    const unfolded = text.replace(/\r?\n[ \t]/g, '');
    const events = [];
    let current = null;
    for (const line of unfolded.split(/\r?\n/)) {
        if (line === 'BEGIN:VEVENT') {
            current = {};
        } else if (line === 'END:VEVENT') {
            if (current) events.push(current);
            current = null;
        } else if (current) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            const rawKey = line.slice(0, idx);
            const value = line.slice(idx + 1);
            const key = rawKey.split(';')[0];
            current[key] = value;
        }
    }
    return events;
}

function parseIcsDate(value) {
    // YYYYMMDD or YYYYMMDDTHHMMSSZ
    const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Extract all GNOME major-release versions mentioned in event summaries,
 * along with the earliest date each appears.
 * Looks for patterns like "GNOME 50", "GNOME 50.0", "GNOME 50.rc", "GNOME 50.beta".
 */
function extractGnomeVersions(events) {
    const byVersion = new Map();
    for (const ev of events) {
        const summary = ev.SUMMARY || '';
        const match = summary.match(/GNOME\s+(\d+)\b/i);
        if (!match) continue;
        const version = parseInt(match[1], 10);
        const date = parseIcsDate(ev.DTSTART || '');
        if (!date) continue;
        const existing = byVersion.get(version);
        if (!existing || date < existing.earliest) {
            byVersion.set(version, {earliest: date, summary});
        }
    }
    return byVersion;
}

async function main() {
    const res = await fetch(ICS_URL);
    if (!res.ok) {
        console.error(`Failed to fetch ${ICS_URL}: ${res.status}`);
        emit('bump_needed', 'false');
        return;
    }
    const ics = await res.text();
    const events = parseIcs(ics);
    const versions = extractGnomeVersions(events);

    if (versions.size === 0) {
        console.error('No GNOME version events found in calendar.');
        emit('bump_needed', 'false');
        return;
    }

    const metadata = JSON.parse(readFileSync(METADATA_PATH, 'utf8'));
    const currentMax = Math.max(
        ...(metadata['shell-version'] || []).map(v => parseInt(v, 10)).filter(v => !isNaN(v)),
    );

    const calendarMax = Math.max(...versions.keys());
    console.log(`Current metadata shell-version max: ${currentMax}`);
    console.log(`Highest version in GNOME calendar:  ${calendarMax}`);

    if (calendarMax <= currentMax) {
        emit('bump_needed', 'false');
        return;
    }

    // Bump one version at a time. If calendarMax > currentMax+1, GNOME
    // (currentMax+1) is already in the past and likely absent from the
    // calendar, so fall back to a placeholder date.
    const target = currentMax + 1;
    const info = versions.get(target);
    const releaseDate = info ? info.earliest : '(already released; not in upcoming calendar)';

    emit('bump_needed', 'true');
    emit('new_version', String(target));
    emit('release_date', releaseDate);
    writeReleaseDate(releaseDate);
}

main().catch(err => {
    console.error(err);
    emit('bump_needed', 'false');
    process.exit(0);
});
