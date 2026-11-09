#!/usr/bin/env node
'use strict';
// Builds manifest.json from the stable manifest of every plugin in plugins.json.
//
// To add a plugin, add a line to plugins.json. Only a stable manifest belongs there:
// everything listed is offered to everyone on this link as an upgrade.
//
// Any failure exits non-zero before manifest.json is written, so a failed run leaves the
// current file in place.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RETRIES = 10;

function compareVersions(a, b) {
    const x = a.split('.').map(Number);
    const y = b.split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const d = (x[i] || 0) - (y[i] || 0);
        if (d) return d;
    }
    return 0;
}

// One version per targetAbi, not one version overall. Jellyfin drops any version whose
// targetAbi is above the server's before it looks at what is left, so if the only entry
// were a 12.0 build, a 10.11 server would be left with nothing and lose the plugin from
// its catalog (InstallationManager.GetAvailablePackages, release-10.11.z).
function newestPerAbi(versions) {
    const best = new Map();
    versions.forEach(function (v) {
        const held = best.get(v.targetAbi);
        if (!held || compareVersions(v.version, held.version) > 0) best.set(v.targetAbi, v);
    });
    return Array.from(best.values()).sort(function (a, b) {
        return compareVersions(b.version, a.version);
    });
}

async function fetchOk(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(url + ' answered ' + res.status);
    return res;
}

async function readPackage(source, expectVersion, retryMs) {
    // The source's CDN can serve the old file for minutes after a release, and a dispatch
    // arrives seconds after it. Without the wait, a run would see nothing new, succeed,
    // and leave the feed one release behind with nothing to retry it.
    for (let attempt = 1; ; attempt++) {
        const res = await fetchOk(source.manifest + '?cb=' + Date.now(), {
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        const list = await res.json();
        const pkg = list.find(function (p) { return p.guid === source.guid; });
        if (!pkg) throw new Error(source.name + ': its manifest has no plugin with guid ' + source.guid);
        if (!expectVersion || pkg.versions.some(function (v) { return v.version === expectVersion; })) return pkg;
        if (attempt >= RETRIES) throw new Error(source.name + ': ' + expectVersion + ' never appeared in its manifest');
        await new Promise(function (done) { setTimeout(done, retryMs); });
    }
}

// Download each listed file and compare it with its checksum. A placeholder checksum or
// a replaced asset would make the install fail on every server using this link.
async function verify(name, version) {
    if (!/^[0-9a-f]{32}$/i.test(version.checksum)) {
        throw new Error(name + ' ' + version.version + ': checksum is a placeholder (' + version.checksum + ')');
    }
    const res = await fetchOk(version.sourceUrl, { redirect: 'follow' });
    const md5 = crypto.createHash('md5').update(Buffer.from(await res.arrayBuffer())).digest('hex');
    if (md5 !== version.checksum.toLowerCase()) {
        throw new Error(name + ' ' + version.version + ': download is ' + md5 + ', manifest says ' + version.checksum);
    }
}

async function build(sources, expect, retryMs) {
    const feed = [];
    for (const source of sources) {
        const wanted = expect && expect.plugin === source.name ? expect.version : null;
        const pkg = await readPackage(source, wanted, retryMs);
        const versions = newestPerAbi(pkg.versions);
        for (const version of versions) await verify(source.name, version);
        feed.push(Object.assign({}, pkg, { versions: versions }));
        console.log(source.name + ': ' + versions.map(function (v) { return v.version + ' (' + v.targetAbi + ')'; }).join(', '));
    }
    return feed;
}

async function main() {
    const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins.json'), 'utf8'));
    const version = process.env.EXPECT_VERSION;
    if (version && !/^\d+\.\d+\.\d+\.\d+$/.test(version)) throw new Error('EXPECT_VERSION is not a version: ' + version);
    const expect = version ? { plugin: process.env.EXPECT_PLUGIN, version: version } : null;
    if (expect && !sources.some(function (s) { return s.name === expect.plugin; })) {
        throw new Error('EXPECT_PLUGIN is not in plugins.json: ' + expect.plugin);
    }
    const feed = await build(sources, expect, 30000);
    fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(feed, null, 2) + '\n');
}

module.exports = { build: build, newestPerAbi: newestPerAbi };

if (require.main === module) {
    main().catch(function (err) {
        console.error(err.message);
        process.exit(1);
    });
}
