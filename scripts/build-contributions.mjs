// Rewrites the open-source contributions list in README.md from the user's
// public pull requests to repos they don't own.
// Usage: GITHUB_TOKEN=xxx node scripts/build-contributions.mjs <username> [readme]
//
// Only the text between <!-- OSS:START --> and <!-- OSS:END --> is replaced.
// scripts/oss-notes.json holds optional per-PR descriptions ("notes", keyed by
// PR URL; falls back to the PR title) and PR URLs to leave out ("exclude").
import { readFileSync, writeFileSync } from "node:fs";

const [, , USER = "RameshwariS", README = "README.md"] = process.argv;
const TOKEN = process.env.GITHUB_TOKEN;
const START = "<!-- OSS:START -->";
const END = "<!-- OSS:END -->";

const { notes = {}, exclude = [] } = JSON.parse(
  readFileSync(new URL("./oss-notes.json", import.meta.url), "utf8"),
);

async function searchPRs() {
  const items = [];
  const q = encodeURIComponent(`author:${USER} type:pr -user:${USER}`);
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(
      `https://api.github.com/search/issues?q=${q}&per_page=100&page=${page}`,
      { headers: { Accept: "application/vnd.github+json", ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }) } },
    );
    if (!r.ok) throw new Error(`GitHub search failed: ${r.status} ${await r.text()}`);
    const j = await r.json();
    items.push(...j.items);
    if (items.length >= j.total_count || j.items.length < 100) break;
  }
  return items;
}

const repoOf = (pr) => pr.repository_url.replace("https://api.github.com/repos/", "");
const line = (pr, withRepo = false) =>
  `- [${withRepo ? repoOf(pr) : ""}#${pr.number}](${pr.html_url}) ${notes[pr.html_url] ?? pr.title}`;

const prs = (await searchPRs()).filter((pr) => !exclude.includes(pr.html_url));
const merged = prs
  .filter((pr) => pr.pull_request?.merged_at)
  .sort((a, b) => b.pull_request.merged_at.localeCompare(a.pull_request.merged_at));
const open = prs
  .filter((pr) => pr.state === "open")
  .sort((a, b) => b.created_at.localeCompare(a.created_at));

// Group merged PRs by repo; repos ordered by their most recent merge.
const groups = new Map();
for (const pr of merged) {
  const repo = repoOf(pr);
  if (!groups.has(repo)) groups.set(repo, []);
  groups.get(repo).push(pr);
}

const orgs = [...new Set(merged.map((pr) => repoOf(pr).split("/")[0]))];
const badge = (label, msg, color, logo, alt) =>
  `<img src="https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(msg.replace(/-/g, "--"))}-${color}?style=flat-square&logo=${logo}&logoColor=white" alt="${alt}">`;

const out = [
  "<p>",
  `  ${badge("Merged PRs", String(merged.length), "2ea44f", "github", `${merged.length} merged PRs`)}`,
  `  ${badge("Orgs", orgs.join(" · "), "326CE5", "kubernetes", `Organizations: ${orgs.join(", ")}`)}`,
  "</p>",
  "",
];
for (const [repo, list] of groups) {
  out.push(`**${repo}**`, ...list.map((pr) => line(pr)), "");
}
if (open.length) out.push("**In review**", ...open.map((pr) => line(pr, true)), "");
out.push(`<sub>Updated automatically every day from GitHub.</sub>`);

const readme = readFileSync(README, "utf8");
const s = readme.indexOf(START);
const e = readme.indexOf(END);
if (s < 0 || e < s) throw new Error(`Markers ${START} / ${END} not found in ${README}`);
const next = readme.slice(0, s + START.length) + "\n" + out.join("\n") + "\n" + readme.slice(e);

if (next === readme) console.log("Contributions unchanged.");
else {
  writeFileSync(README, next);
  console.log(`Wrote ${merged.length} merged and ${open.length} open PRs to ${README}.`);
}
