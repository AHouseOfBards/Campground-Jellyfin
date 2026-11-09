#!/usr/bin/env node
'use strict';
// Runs the builder against a stubbed network. The workflow runs this first, so a broken
// builder cannot publish.

const crypto = require('crypto');
const { build, newestPerAbi } = require('./build-manifest.js');

const GUID = '11111111-1111-1111-1111-111111111111';
const SOURCE = { name: 'Plugin', guid: GUID, manifest: 'https://example.test/manifest.json' };
const bytes = function (s) { return Buffer.from(s); };
const md5 = function (s) { return crypto.createHash('md5').update(bytes(s)).digest('hex'); };
const entry = function (version, abi, file, checksum) {
    return { version: version, targetAbi: abi, sourceUrl: 'https://example.test/' + file, checksum: checksum || md5(file) };
};
const pkg = function (versions) { return [{ guid: GUID, name: 'Plugin', versions: versions }]; };

let manifests = [];
global.fetch = async function (url) {
    if (String(url).indexOf('manifest.json') !== -1) {
        const body = manifests.length > 1 ? manifests.shift() : manifests[0];
        return { ok: true, status: 200, json: async function () { return body; } };
    }
    const name = String(url).split('/').pop();
    if (name === 'missing') return { ok: false, status: 404 };
    return { ok: true, status: 200, arrayBuffer: async function () { return bytes(name); } };
};
const quiet = console.log;

let pass = 0;
const fails = [];
function ok(name, value) {
    if (value) { pass++; quiet('  ok  ' + name); } else { fails.push(name); quiet('  FAIL ' + name); }
}
async function refuses(name, setup, expect, pattern) {
    manifests = setup;
    console.log = function () {};
    let message = null;
    try { await build([SOURCE], expect, 1); } catch (err) { message = err.message; }
    console.log = quiet;
    ok(name, !!message && pattern.test(message));
}
async function run(setup, expect) {
    manifests = setup;
    console.log = function () {};
    try { return await build([SOURCE], expect, 1); } finally { console.log = quiet; }
}

(async function () {
    const kept = newestPerAbi([entry('1.0.0.0', '10.11.0.0', 'a'), entry('1.10.0.0', '10.11.0.0', 'b'), entry('1.9.0.0', '10.11.0.0', 'c')]);
    ok('compares versions as numbers, not text', kept.length === 1 && kept[0].version === '1.10.0.0');

    const both = await run([pkg([entry('1.0.0.0', '10.11.0.0', 'a'), entry('1.1.0.0', '10.11.0.0', 'b'), entry('2.0.0.0', '12.0.0.0', 'c')])]);
    ok('keeps the newest for each Jellyfin version, so older servers keep the plugin',
        both[0].versions.map(function (v) { return v.version; }).join() === '2.0.0.0,1.1.0.0');
    ok('keeps the rest of the plugin entry', both[0].name === 'Plugin' && both[0].guid === GUID);

    await refuses('refuses a placeholder checksum', [pkg([entry('1.0.0.0', '10.11.0.0', 'a', '0')])], null, /placeholder/);
    await refuses('refuses a download that does not match', [pkg([entry('1.0.0.0', '10.11.0.0', 'a', md5('other'))])], null, /manifest says/);
    await refuses('refuses a missing download', [pkg([entry('1.0.0.0', '10.11.0.0', 'missing', md5('missing'))])], null, /404/);
    await refuses('refuses a manifest without the plugin', [[{ guid: 'other', versions: [] }]], null, /no plugin with guid/);

    const stale = pkg([entry('1.0.0.0', '10.11.0.0', 'a')]);
    const fresh = pkg([entry('1.1.0.0', '10.11.0.0', 'b'), entry('1.0.0.0', '10.11.0.0', 'a')]);
    const waited = await run([stale, stale, fresh], { plugin: 'Plugin', version: '1.1.0.0' });
    ok('waits for a just-released version to reach the source', waited[0].versions[0].version === '1.1.0.0');
    await refuses('gives up if that version never arrives', [stale], { plugin: 'Plugin', version: '1.1.0.0' }, /never appeared/);

    quiet('');
    if (fails.length) {
        quiet(pass + ' passed, ' + fails.length + ' failed');
        process.exit(1);
    }
    quiet(pass + ' passed, 0 failed');
})();
