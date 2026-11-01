// Builds stats.svg and languages.svg from the GitHub GraphQL API.
// Usage: GITHUB_TOKEN=xxx node scripts/build-stats.mjs <username> <outDir>
//        node scripts/build-stats.mjs <username> <outDir> --mock   (preview with fake data)
import { writeFileSync, mkdirSync } from "node:fs";

const [, , USER = "RameshwariS", OUT = "dist"] = process.argv;
const MOCK = process.argv.includes("--mock");
const TOKEN = process.env.GITHUB_TOKEN;

const C = {
  bg: "#0d1117", card: "#161b22", line: "#30363d",
  text: "#e6edf3", muted: "#8b949e",
  a1: "#7aa2f7", a2: "#bb9af7", a3: "#2ac3de", a4: "#9ece6a", a5: "#ff9e64", a6: "#f7768e",
};
const FONT = `'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif`;

async function gql(query, variables) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

async function fetchData() {
  const base = await gql(`query($u:String!){ user(login:$u){
    name createdAt followers{totalCount}
    pullRequests{totalCount} issues{totalCount}
    contributionsCollection{ contributionYears totalCommitContributions }
    repositories(ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, first:100){
      totalCount
      nodes{ stargazerCount languages(first:10, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } } }
    }
  }}`, { u: USER });
  const u = base.user;

  // Contribution calendar for every year, so streaks and totals are all-time.
  const days = [];
  for (const y of u.contributionsCollection.contributionYears) {
    const d = await gql(`query($u:String!,$f:DateTime!,$t:DateTime!){ user(login:$u){
      contributionsCollection(from:$f,to:$t){ contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      { u: USER, f: `${y}-01-01T00:00:00Z`, t: `${y}-12-31T23:59:59Z` });
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const day of w.contributionDays) days.push(day);
  }

  const langs = {};
  for (const r of u.repositories.nodes)
    for (const e of r.languages.edges) {
      langs[e.node.name] ??= { size: 0, color: e.node.color || C.muted };
      langs[e.node.name].size += e.size;
    }

  return {
    name: u.name || USER,
    stars: u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
    repos: u.repositories.totalCount,
    prs: u.pullRequests.totalCount,
    issues: u.issues.totalCount,
    followers: u.followers.totalCount,
    commitsThisYear: u.contributionsCollection.totalCommitContributions,
    days, langs,
  };
}

function mockData() {
  const days = [];
  const start = new Date("2023-11-25");
  for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1))
    days.push({ date: d.toISOString().slice(0, 10), contributionCount: Math.random() < 0.45 ? Math.floor(Math.random() * 6) : 0 });
  for (let i = 1; i <= 7; i++) days[days.length - i].contributionCount = 2;
  return {
    name: "Rameshwari", stars: 24, repos: 18, prs: 41, issues: 9, followers: 32, commitsThisYear: 260, days,
    langs: { Go: { size: 420, color: "#00ADD8" }, Python: { size: 300, color: "#3572A5" }, JavaScript: { size: 260, color: "#f1e05a" },
      Java: { size: 150, color: "#b07219" }, "C++": { size: 90, color: "#f34b7d" }, HTML: { size: 50, color: "#e34c26" } },
  };
}

function streaks(days) {
  days = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().slice(0, 10);
  let longest = 0, run = 0, runStart = null, best = [null, null];
  for (const d of days) {
    if (d.date > today) break;
    if (d.contributionCount > 0) {
      if (run === 0) runStart = d.date;
      run++;
      if (run > longest) { longest = run; best = [runStart, d.date]; }
    } else run = 0;
  }
  // Current streak: today counts if active, but a quiet "today" doesn't break it yet.
  let i = days.findLastIndex((d) => d.date <= today);
  if (i >= 0 && days[i].contributionCount === 0 && days[i].date === today) i--;
  let current = 0, curStart = null;
  while (i >= 0 && days[i].contributionCount > 0) { current++; curStart = days[i].date; i--; }
  const total = days.reduce((s, d) => s + d.contributionCount, 0);
  return { current, curStart, longest, best, total, since: days[0]?.date };
}

const fmt = (s) => s ? new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "";
const fmtY = (s) => s ? new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : "";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Small line icons (24x24 viewBox)
const ICON = {
  commit: `<circle cx="12" cy="12" r="4"/><path d="M2 12h6M16 12h6"/>`,
  pr: `<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M6 7.5v9M18 16.5V10a3 3 0 0 0-3-3h-4M13 4.5 10.5 7 13 9.5"/>`,
  star: `<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>`,
  repo: `<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15ZM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>`,
  issue: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/>`,
  people: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>`,
};

function statsSvg(d) {
  const s = streaks(d.days);
  const W = 860, H = 300;
  const tiles = [
    ["commit", "Commits (12 mo)", d.commitsThisYear, C.a1],
    ["pr", "Pull requests", d.prs, C.a2],
    ["star", "Stars earned", d.stars, C.a5],
    ["repo", "Public repos", d.repos, C.a3],
    ["issue", "Issues opened", d.issues, C.a4],
    ["people", "Followers", d.followers, C.a6],
  ];
  const R = 62, circ = 2 * Math.PI * R;
  const pct = Math.min(1, s.longest ? s.current / s.longest : 0);
  const tx = 330, tw = 152, th = 92, gap = 14;

  const tileSvg = tiles.map(([ic, label, val, col], k) => {
    const x = tx + (k % 3) * (tw + gap), y = 34 + Math.floor(k / 3) * (th + gap);
    return `<g class="fade" style="animation-delay:${0.15 + k * 0.08}s" transform="translate(${x},${y})">
      <rect width="${tw}" height="${th}" rx="12" fill="${C.bg}" stroke="${C.line}"/>
      <rect width="3" height="${th - 32}" x="0" y="16" rx="1.5" fill="${col}"/>
      <g transform="translate(18,18)" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="scale(0.75)">${ICON[ic]}</g></g>
      <text x="18" y="66" fill="${C.text}" font-size="28" font-weight="700">${esc(val.toLocaleString("en-US"))}</text>
      <text x="44" y="31" fill="${C.muted}" font-size="12.5">${esc(label)}</text>
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-label="GitHub stats for ${esc(USER)}">
  <style>
    .fade{opacity:0;animation:up .6s ease forwards}
    @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1}}
    .ring{stroke-dasharray:${circ};stroke-dashoffset:${circ};animation:draw 1.4s .3s ease-out forwards}
    @keyframes draw{to{stroke-dashoffset:${circ * (1 - pct)}}}
    @media (prefers-reduced-motion:reduce){.fade{animation:none;opacity:1}.ring{animation:none;stroke-dashoffset:${circ * (1 - pct)}}}
  </style>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.a1}"/><stop offset="1" stop-color="${C.a2}"/></linearGradient>
    <radialGradient id="glow" cx=".2" cy=".2" r=".9"><stop offset="0" stop-color="${C.a1}" stop-opacity=".16"/><stop offset="1" stop-color="${C.a1}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="${C.card}" stroke="${C.line}"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#glow)"/>

  <g class="fade" transform="translate(40,34)">
    <rect width="262" height="198" rx="14" fill="${C.bg}" stroke="${C.line}"/>
    <g transform="translate(131,96)">
      <circle r="${R}" fill="none" stroke="${C.line}" stroke-width="10"/>
      <circle class="ring" r="${R}" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round" transform="rotate(-90)"/>
      <text y="6" text-anchor="middle" fill="${C.text}" font-size="40" font-weight="800">${s.current}</text>
      <text y="28" text-anchor="middle" fill="${C.muted}" font-size="12">day streak</text>
    </g>
    <text x="131" y="186" text-anchor="middle" fill="${C.muted}" font-size="12">${s.current ? `since ${fmt(s.curStart)}` : "start one today"}</text>
  </g>

  ${tileSvg}

  <g class="fade" style="animation-delay:.7s" font-size="13">
    <line x1="40" x2="${W - 40}" y1="252" y2="252" stroke="${C.line}"/>
    <text x="40" y="278" fill="${C.muted}"><tspan fill="${C.text}" font-weight="700">${s.total.toLocaleString("en-US")}</tspan> contributions since ${fmtY(s.since)}</text>
    <text x="${W - 40}" y="278" text-anchor="end" fill="${C.muted}">Longest streak <tspan fill="${C.text}" font-weight="700">${s.longest} days</tspan>${s.longest ? ` · ${fmt(s.best[0])} – ${fmt(s.best[1])}` : ""}</text>
  </g>
</svg>`;
}

function langSvg(d) {
  const all = Object.entries(d.langs).sort((a, b) => b[1].size - a[1].size);
  const top = all.slice(0, 6);
  const rest = all.slice(6).reduce((s, [, v]) => s + v.size, 0);
  if (rest) top.push(["Other", { size: rest, color: C.muted }]);
  const total = top.reduce((s, [, v]) => s + v.size, 0) || 1;
  const W = 860, H = 150, bx = 40, bw = W - 80;
  let x = bx;
  const bar = top.map(([n, v], k) => {
    const w = (v.size / total) * bw;
    const r = `<rect class="grow" style="animation-delay:${0.1 + k * 0.08}s" x="${x.toFixed(1)}" y="62" width="${Math.max(w - 3, 1).toFixed(1)}" height="12" rx="3" fill="${v.color}"/>`;
    x += w; return r;
  }).join("");
  const colW = bw / Math.min(top.length, 4);
  const legend = top.map(([n, v], k) => {
    const lx = bx + (k % 4) * colW, ly = 102 + Math.floor(k / 4) * 24;
    return `<g class="fade" style="animation-delay:${0.4 + k * 0.06}s"><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${v.color}"/>
      <text x="${lx + 18}" y="${ly}" fill="${C.text}" font-size="13">${esc(n)} <tspan fill="${C.muted}">${((v.size / total) * 100).toFixed(1)}%</tspan></text></g>`;
  }).join("");
  const h = top.length > 4 ? 160 : 136;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" font-family="${FONT}" role="img" aria-label="Most used languages">
  <style>
    .fade{opacity:0;animation:in .5s ease forwards}@keyframes in{to{opacity:1}}
    .grow{transform-box:fill-box;transform-origin:left;transform:scaleX(0);animation:g .7s ease-out forwards}@keyframes g{to{transform:scaleX(1)}}
    @media (prefers-reduced-motion:reduce){.fade,.grow{animation:none;opacity:1;transform:none}}
  </style>
  <rect width="${W}" height="${h}" rx="18" fill="${C.card}" stroke="${C.line}"/>
  <text x="40" y="40" fill="${C.text}" font-size="16" font-weight="700">Most used languages</text>
  <text x="${W - 40}" y="40" text-anchor="end" fill="${C.muted}" font-size="12">by bytes of code in public repos</text>
  <rect x="${bx}" y="62" width="${bw}" height="12" rx="3" fill="${C.bg}"/>
  ${bar}${legend}
</svg>`;
}

const data = MOCK ? mockData() : await fetchData();
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/stats.svg`, statsSvg(data));
writeFileSync(`${OUT}/languages.svg`, langSvg(data));
console.log(`wrote ${OUT}/stats.svg and ${OUT}/languages.svg`);
