#!/usr/bin/env node
// Detects the highest STABLE GNOME Shell major version by parsing the
// release.gnome.org ICS calendar, and compares with metadata.json.
//
// A version N is considered stable iff any of:
//   - An event whose summary matches "GNOME N.0 ... release" has DTSTART <= today.
//   - Any event referencing "GNOME N" or "GNOME N.m" has DTSTART <= today
//     (implies maintenance or already-released; upcoming versions only show
//     future alpha/beta/rc events).
//
// Outputs (when run in GitHub Actions):
//   bump_needed=true|false
//   new_versions=<comma-separated list>  (only if bump_needed)
//   highest_new=<int>                    (only if bump_needed; the highest new version)
//   release_date=<ISO date>              (only if bump_needed; the .0 date of highest_new)
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
    const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Aggregate per-version info:
 *   - earliestEvent: earliest date any event for this version appears
 *   - stableReleaseDate: date of the ".0 ... release" event, if present
 *   - hasPastEvent: true if any event has date <= today
 */
function collectVersionInfo(events) {
    const today = new Date().toISOString().slice(0, 10);
    const byVersion = new Map();

    for (const ev of events) {
        const summary = ev.SUMMARY || '';
        const match = summary.match(/GNOME\s+(\d+)(?:\.(\d+|alpha|beta|rc))?\b/i);
        if (!match) continue;
        const version = parseInt(match[1], 10);
        const suffix = match[2];
        const date = parseIcsDate(ev.DTSTART || '');
        if (!date) continue;

        let info = byVersion.get(version);
        if (!info) {
            info = {
                earliestEvent: date,
                stableReleaseDate: null,
                hasPastEvent: false,
            };
            byVersion.set(version, info);
        }
        if (date < info.earliestEvent) info.earliestEvent = date;
        if (date <= today) info.hasPastEvent = true;

        if (suffix === '0' && /\brelease\b/i.test(summary)) {
            if (!info.stableReleaseDate || date < info.stableReleaseDate) {
                info.stableReleaseDate = date;
            }
        }
    }
    return byVersion;
}

function isStable(info, today) {
    if (info.stableReleaseDate && info.stableReleaseDate <= today) return true;
    // Fallback: if any event for this version is in the past, the version
    // is already released (older stables only appear via maintenance events
    // after their .0 release falls out of the calendar window).
    return info.hasPastEvent;
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
    const byVersion = collectVersionInfo(events);

    if (byVersion.size === 0) {
        console.error('No GNOME version events found in calendar.');
        emit('bump_needed', 'false');
        return;
    }

    const metadata = JSON.parse(readFileSync(METADATA_PATH, 'utf8'));
    const currentMax = Math.max(
        ...(metadata['shell-version'] || []).map(v => parseInt(v, 10)).filter(v => !isNaN(v)),
    );

    const today = new Date().toISOString().slice(0, 10);
    const stable = [...byVersion.entries()]
        .filter(([, info]) => isStable(info, today))
        .map(([v]) => v)
        .sort((a, b) => a - b);
    const upcoming = [...byVersion.entries()]
        .filter(([, info]) => !isStable(info, today))
        .map(([v]) => v)
        .sort((a, b) => a - b);

    console.log(`Current metadata shell-version max: ${currentMax}`);
    console.log(`Stable GNOME versions seen in calendar:  [${stable.join(', ')}]`);
    console.log(`Upcoming (not yet released):             [${upcoming.join(', ')}]`);

    if (stable.length === 0) {
        console.error('No stable GNOME versions detected; refusing to bump.');
        emit('bump_needed', 'false');
        return;
    }

    const targetMax = Math.max(...stable);
    if (targetMax <= currentMax) {
        console.log('Up to date with latest stable GNOME.');
        emit('bump_needed', 'false');
        return;
    }

    // Include every missing version from currentMax+1 through targetMax.
    const newVersions = [];
    for (let v = currentMax + 1; v <= targetMax; v++) newVersions.push(v);

    const targetInfo = byVersion.get(targetMax);
    const releaseDate =
        targetInfo?.stableReleaseDate || targetInfo?.earliestEvent || '(unknown)';

    emit('bump_needed', 'true');
    emit('new_versions', newVersions.join(','));
    emit('highest_new', String(targetMax));
    emit('release_date', releaseDate);
    writeReleaseDate(releaseDate);
}

main().catch(err => {
    console.error(err);
    emit('bump_needed', 'false');
    process.exit(0);
});
