const fs = require('node:fs');
const assert = require('node:assert/strict');

const text = fs.readFileSync('cfg/Custom_Clash.ini', 'utf8').replace(/\r\n/g, '\n');
const mainland = fs.readFileSync('cfg/Custom_Clash_Mainland.ini', 'utf8').replace(/\r\n/g, '\n');
assert.equal(text, mainland, 'Mainland must match the standard template');
const lines = text.split('\n');
const rules = lines.filter(line => line.startsWith('ruleset='));
const groups = lines.filter(line => line.startsWith('custom_proxy_group='));
const requireOnce = line => assert.equal(lines.filter(value => value === line).length, 1, `Missing or duplicate: ${line}`);
const claudeDomains = ['anthropic.com', 'claude.ai', 'claude.com', 'clau.de', 'claudeusercontent.com', 'claudemcpclient.com', 'claudemcpcontent.com'];
const protectedRules = [
  ...claudeDomains.map(domain => `ruleset=🤖 Claude,[]DOMAIN-SUFFIX,${domain}`),
  'ruleset=🤖 Claude,[]DOMAIN,servd-anthropic-website.b-cdn.net',
  'ruleset=🤖 Claude,[]GEOSITE,anthropic',
  'ruleset=🤖 Gemini,[]GEOSITE,google-gemini',
];
assert.deepEqual(rules.slice(0, protectedRules.length), protectedRules, 'AI rules must precede all other rules');
for (const line of protectedRules) requireOnce(line);
requireOnce('custom_proxy_group=🤖 Claude`select`[]REJECT`.*');
const us = groups.filter(line => line.startsWith('custom_proxy_group=🇺🇸 美国节点`'));
assert.equal(us.length, 1, 'Expected one US group');
const usParts = us[0].split('`');
assert.equal(usParts.length, 6, 'Unexpected US group structure');
assert.equal(usParts[1], 'url-test');
assert.equal(usParts[3], '[]REJECT', 'Empty US groups must contain REJECT');
assert(!usParts[2].includes('[]'), 'US group must not reference another group');
assert(groups.some(line => line.startsWith('custom_proxy_group=🤖 Gemini`select`')), 'Gemini group missing');
requireOnce('ruleset=🤖 AI服务,[]GEOSITE,bing');
requireOnce('ruleset=🎮 游戏下载,[]GEOSITE,category-game-platforms-download');
requireOnce('ruleset=🎯 全球直连,[]GEOSITE,apple');
requireOnce('ruleset=🎯 全球直连,[]GEOSITE,apple-tvplus');
for (const category of ['tiktok', 'netflix', 'disney', 'hbo', 'primevideo', 'category-emby', 'spotify', 'bahamut', 'category-ecommerce']) {
  requireOnce(`ruleset=🚀 手动选择,[]GEOSITE,${category}`);
}
requireOnce('ruleset=🚀 手动选择,[]GEOIP,netflix,no-resolve');
const steamCdn = rules.findIndex(line => line.startsWith('ruleset=🎯 全球直连,') && line.includes('/Steam_CDN_Domain.yaml'));
assert(steamCdn >= 0 && steamCdn < rules.indexOf('ruleset=🎮 游戏下载,[]GEOSITE,category-game-platforms-download'), 'Steam CDN rules must precede the download group');
const regionOrder = ['🚀 手动选择', '🇸🇬 新加坡节点', '🇯🇵 日本节点', '🇭🇰 香港节点', '🇺🇸 美国节点', '🇼🇸 台湾节点'];
assert.deepEqual(groups.slice(0, regionOrder.length).map(line => line.slice('custom_proxy_group='.length).split('`')[0]), regionOrder, 'Personal region group ordering changed');
assert(!groups.some(line => /custom_proxy_group=(🤖 Copilot|🎶 TikTok|🎥 Netflix|🎥 DisneyPlus|🎥 HBO|🎥 PrimeVideo|🎥 AppleTV\+|🎥 Emby|🎻 Spotify|📺 Bahamut|🛒 国外电商|🍎 苹果服务|♻️ 自动选择)`/.test(line)), 'An unwanted group returned');
const groupNames = new Set(groups.map(line => line.slice('custom_proxy_group='.length).split('`')[0]));
assert.equal(groupNames.size, groups.length, 'Duplicate group names');
for (const rule of rules) {
  const target = rule.slice('ruleset='.length).split(',')[0];
  assert(groupNames.has(target) || ['DIRECT', 'REJECT'].includes(target), `Undefined rule target: ${target}`);
}
for (const group of groups) {
  const parts = group.split('`');
  for (const ref of parts.slice(2).filter(part => part.startsWith('[]'))) {
    const target = ref.slice(2);
    assert(groupNames.has(target) || ['DIRECT', 'REJECT'].includes(target), `Undefined group reference: ${target}`);
  }
}
console.log('Personal template invariants passed.');
