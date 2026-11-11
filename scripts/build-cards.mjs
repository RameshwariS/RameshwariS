// Builds the banner, the animated project cards and the section divider in assets/.
// Usage: node scripts/build-cards.mjs
// The SVGs are committed, so this only needs re-running after you edit it.
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = new URL("../assets/", import.meta.url);
mkdirSync(new URL("cards/", OUT), { recursive: true });

const C = {
  bg: "#0d1117", card: "#161b22", line: "#30363d",
  text: "#e6edf3", muted: "#8b949e",
  blue: "#7aa2f7", violet: "#bb9af7", cyan: "#2ac3de", green: "#9ece6a", orange: "#ff9e64", red: "#f7768e", amber: "#e0af68",
};
const W = 420, H = 240;
const r2 = (n) => Math.round(n * 100) / 100;

// Keyframes from [[percent, "css"], ...]
const kf = (name, stops) => `@keyframes ${name}{${stops.map(([p, css]) => `${r2(p)}%{${css}}`).join("")}}`;
// Hidden, fades in at tIn seconds, fades out at tOut seconds, in a loop of T seconds.
const vis = (name, T, tIn, tOut, fade = 0.3) => {
  const p = (t) => (t / T) * 100;
  return kf(name, [[0, "opacity:0"], [p(tIn), "opacity:0"], [p(tIn + fade), "opacity:1"], [p(tOut), "opacity:1"], [p(tOut + fade), "opacity:0"], [100, "opacity:0"]]);
};

function card({ label, title, tag, accent, css, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
  <style>
    text{font-family:'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace}
    .t{fill:${C.text}}.m{fill:${C.muted}}
    ${css.join("\n    ")}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
  <defs>
    <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="${accent}" stroke-opacity=".05"/></pattern>
  </defs>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="${C.bg}" stroke="${C.line}"/>
  <rect x="1" y="45" width="${W - 2}" height="${H - 46}" fill="url(#g)"/>
  <rect x="20" y="17" width="12" height="12" rx="3.5" fill="${accent}"/>
  <text x="42" y="28" class="t" font-size="14" font-weight="700">${title}</text>
  <text x="${W - 20}" y="28" class="m" font-size="11" text-anchor="end">${tag}</text>
  <line x1="1" x2="${W - 1}" y1="44.5" y2="44.5" stroke="${C.line}"/>
${body}
</svg>
`;
}

// ── GoProxyX: six requests hit a four-token bucket. Four pass, two get a 429. ──
function gateway() {
  const T = 8, GATE = 11; // percent of the loop at which a request reaches the gateway
  const css = [
    `.rq{animation:${T}s linear infinite}`,
    kf("pass", [[0, `transform:translateX(0);opacity:0;fill:${C.blue}`], [1.5, "opacity:1"], [GATE, `fill:${C.blue}`], [GATE + 0.1, `fill:${C.green}`],
      [24, `transform:translateX(270px);opacity:1`], [25, `transform:translateX(274px);opacity:0;fill:${C.green}`], [100, `transform:translateX(274px);opacity:0;fill:${C.green}`]]),
    kf("drop", [[0, `transform:translate(0,0);opacity:0;fill:${C.blue}`], [1.5, "opacity:1"], [GATE, `transform:translate(154px,0);fill:${C.red}`],
      [17, "transform:translate(154px,50px);opacity:1"], [20, `transform:translate(154px,62px);opacity:0`], [100, `transform:translate(154px,62px);opacity:0;fill:${C.red}`]]),
    `.pip{animation:${T}s linear infinite}`,
    kf("flash", [[0, "opacity:.35"], [48, "opacity:.35"], [50, "opacity:1"], [56, "opacity:.35"], [57.5, "opacity:.35"], [59.5, "opacity:1"], [66, "opacity:.35"], [100, "opacity:.35"]]),
    `.f{animation:flash ${T}s linear infinite}`,
    `.pulse{animation:pulse 2.4s ease-in-out infinite}`,
    kf("pulse", [[0, "opacity:.15"], [50, "opacity:.6"], [100, "opacity:.15"]]),
  ];
  const gap = 0.7; // seconds between requests
  const dots = [0, 1, 2, 3, 4, 5].map((i) =>
    `<circle class="rq" cx="66" cy="140" r="4" fill="${C.blue}" style="animation-name:${i < 4 ? "pass" : "drop"};animation-delay:${r2(i * gap)}s"/>`).join("\n    ");
  // Token i is spent when request i reaches the gate, and comes back during the refill.
  const refill = [93.75, 87.5, 81.25, 75];
  const pips = [0, 1, 2, 3].map((i) => {
    const out = ((i * gap) / T) * 100 + GATE;
    css.push(kf(`pip${i}`, [[0, "opacity:1"], [out, "opacity:1"], [out + 0.5, "opacity:0"], [refill[i], "opacity:0"], [refill[i] + 2, "opacity:1"], [100, "opacity:1"]]));
    return `<rect class="pip" style="animation-name:pip${i}" x="203" y="${64 + i * 10}" width="34" height="7" rx="2" fill="${C.amber}"/>`;
  }).join("\n    ");
  const body = `  <g font-size="11">
    <path d="M66 140H186M254 140H338" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 5"/>
    <path d="M220 164V200" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 5"/>
    ${dots}
    <rect x="20" y="124" width="44" height="32" rx="7" fill="${C.card}" stroke="${C.line}"/>
    <text x="42" y="144" text-anchor="middle" class="m">req</text>
    <path d="M198 58V106H242V58" fill="${C.card}" stroke="${C.line}" stroke-width="1.5" stroke-linejoin="round"/>
    ${pips}
    <text x="190" y="86" text-anchor="end" class="m" font-size="10">tokens</text>
    <path d="M220 106V118" stroke="${C.line}" stroke-width="1.5"/>
    <rect x="186" y="118" width="68" height="44" rx="9" fill="${C.card}" stroke="${C.blue}"/>
    <rect x="186" y="118" width="68" height="44" rx="9" fill="none" stroke="${C.blue}" stroke-width="3" class="pulse"/>
    <text x="220" y="138" text-anchor="middle" fill="${C.blue}" font-weight="700">gateway</text>
    <text x="220" y="152" text-anchor="middle" class="m" font-size="9">jwt · limit</text>
    <rect x="340" y="124" width="60" height="32" rx="7" fill="${C.card}" stroke="${C.line}"/>
    <text x="370" y="144" text-anchor="middle" class="m">service</text>
    <text x="370" y="114" text-anchor="middle" fill="${C.green}" font-weight="700">200</text>
    <text x="234" y="200" fill="${C.red}" font-weight="700" class="f">429</text>
    <text x="20" y="222" class="m" font-size="10">token bucket · burst of 6, room for 4</text>
  </g>`;
  return card({ label: "GoProxyX: requests pass through a gateway with a token-bucket rate limiter. Four pass, two are rejected with 429.", title: "GoProxyX", tag: "api gateway", accent: C.blue, css, body });
}

// ── DSV: a dataset moves through three tracked versions. ──
function dsv() {
  const T = 9, END = 8.3;
  const xs = [72, 204, 340];
  const steps = [
    { label: "raw dataset", w: 84, color: C.cyan, node: 0.3, chip: 0.7 },
    { label: "+ preprocessing", w: 108, color: C.violet, node: 2.3, chip: 2.8 },
    { label: "+ params · metrics", w: 124, color: C.green, node: 4.4, chip: 4.9 },
  ];
  const p = (t) => (t / T) * 100;
  const css = [`.a{animation:${T}s linear infinite}`];
  const draw = (name, t0, t1) => kf(name, [[0, "stroke-dashoffset:100"], [p(t0), "stroke-dashoffset:100"], [p(t1), "stroke-dashoffset:0"], [p(END), "stroke-dashoffset:0;opacity:1"], [p(END + 0.3), "stroke-dashoffset:0;opacity:0"], [100, "stroke-dashoffset:0;opacity:0"]]);
  css.push(draw("l1", 1.6, 2.3), draw("l2", 3.7, 4.4));
  css.push(vis("head", T, 0.3, END));
  css.push(kf("move", [[0, "transform:translateX(0)"], [p(2.3), "transform:translateX(0)"], [p(2.7), `transform:translateX(${xs[1] - xs[0]}px)`], [p(4.4), `transform:translateX(${xs[1] - xs[0]}px)`], [p(4.8), `transform:translateX(${xs[2] - xs[0]}px)`], [100, `transform:translateX(${xs[2] - xs[0]}px)`]]));
  css.push(vis("ok", T, 5.7, END));
  const nodes = steps.map((s, i) => {
    css.push(vis(`n${i}`, T, s.node, END), vis(`c${i}`, T, s.chip, END));
    const x = xs[i];
    return `<g class="a" style="animation-name:n${i}">
      <circle cx="${x}" cy="112" r="14" fill="${C.card}" stroke="${s.color}" stroke-width="1.5"/>
      <text x="${x}" y="116" text-anchor="middle" fill="${s.color}" font-weight="700">v${i + 1}</text>
    </g>
    <g class="a" style="animation-name:c${i}">
      <path d="M${x} 126V140" stroke="${C.line}" stroke-width="1.5"/>
      <rect x="${x - s.w / 2}" y="140" width="${s.w}" height="22" rx="6" fill="${C.card}" stroke="${C.line}"/>
      <text x="${x}" y="155" text-anchor="middle" class="t" font-size="10">${s.label}</text>
    </g>`;
  }).join("\n    ");
  const body = `  <g font-size="11">
    <path d="M${xs[0] + 14} 112H${xs[2] - 14}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 5"/>
    <path class="a" style="animation-name:l1" d="M${xs[0] + 14} 112H${xs[1] - 14}" pathLength="100" stroke-dasharray="100" stroke="${C.cyan}" stroke-width="2"/>
    <path class="a" style="animation-name:l2" d="M${xs[1] + 14} 112H${xs[2] - 14}" pathLength="100" stroke-dasharray="100" stroke="${C.violet}" stroke-width="2"/>
    ${nodes}
    <g class="a" style="animation-name:head"><g class="a" style="animation-name:move;animation-timing-function:ease-in-out">
      <rect x="${xs[0] - 22}" y="66" width="44" height="18" rx="9" fill="${C.orange}"/>
      <text x="${xs[0]}" y="79" text-anchor="middle" fill="${C.bg}" font-size="10" font-weight="700">HEAD</text>
      <path d="M${xs[0] - 4} 84L${xs[0]} 90L${xs[0] + 4} 84Z" fill="${C.orange}"/>
    </g></g>
    <g class="a" style="animation-name:ok">
      <circle cx="27" cy="208" r="7" fill="none" stroke="${C.green}" stroke-width="1.5"/>
      <path d="M23.5 208L26 210.5L30.5 205.5" fill="none" stroke="${C.green}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="42" y="212" fill="${C.green}">every run reproducible</text>
    </g>
    <text x="400" y="212" text-anchor="end" class="m" font-size="10">file-first · no heavy infra</text>
  </g>`;
  return card({ label: "DSV: a dataset moves through versions v1, v2 and v3, each tracking data, preprocessing, params and metrics.", title: "DSV", tag: "dataset versioning", accent: C.violet, css, body });
}

// ── OpenSourceCompanion: an issue moves across the contribution board until it is merged. ──
function companion() {
  const T = 9, END = 8.3, CW = 88, GAP = 8, X0 = 22, STEP = CW + GAP;
  const cols = ["find", "work", "PR", "merged"];
  const p = (t) => (t / T) * 100;
  const at = (i) => `transform:translateX(${i * STEP}px)`;
  const css = [
    `.a{animation:${T}s linear infinite}`,
    vis("card", T, 0.4, END),
    kf("go", [[0, at(0)], [p(1.6), at(0)], [p(2.1), at(1)], [p(3.3), at(1)], [p(3.8), at(2)], [p(5.0), at(2)], [p(5.5), at(3)], [100, at(3)]]),
    kf("edge", [[0, `stroke:${C.blue}`], [p(5.5), `stroke:${C.blue}`], [p(5.7), `stroke:${C.green}`], [100, `stroke:${C.green}`]]),
    vis("done", T, 5.6, END, 0.2),
  ];
  // Highlight the column the card is in.
  const stops = [0.4, 2.1, 3.8, 5.5, END];
  cols.forEach((_, i) => css.push(kf(`col${i}`, [[0, "opacity:0"], [p(stops[i]), "opacity:0"], [p(stops[i] + 0.2), "opacity:1"], [p(stops[i + 1] - (i < 3 ? 0.5 : 0)), "opacity:1"], [p(stops[i + 1] - (i < 3 ? 0.5 : 0) + 0.3), "opacity:0"], [100, "opacity:0"]])));
  const ghost = (c, row, color) => {
    const x = X0 + c * STEP + 6, y = 86 + row * 36;
    return `<rect x="${x}" y="${y}" width="${CW - 12}" height="28" rx="6" fill="${C.card}" stroke="${C.line}"/><circle cx="${x + 10}" cy="${y + 10}" r="3" fill="${color}" opacity=".7"/><rect x="${x + 18}" y="${y + 8}" width="${42 - row * 6}" height="4" rx="2" fill="${C.line}"/><rect x="${x + 7}" y="${y + 18}" width="${30 + c * 5}" height="4" rx="2" fill="${C.line}"/>`;
  };
  const columns = cols.map((name, i) => {
    const x = X0 + i * STEP;
    return `<rect x="${x}" y="56" width="${CW}" height="140" rx="9" fill="${C.bg}" stroke="${C.line}"/>
    <rect class="a" style="animation-name:col${i}" x="${x}" y="56" width="${CW}" height="140" rx="9" fill="none" stroke="${i === 3 ? C.green : C.blue}" stroke-opacity=".7"/>
    <text x="${x + CW / 2}" y="74" text-anchor="middle" class="m" font-size="10">${name}</text>`;
  }).join("\n    ");
  const cx = X0 + 6;
  const body = `  <g>
    ${columns}
    ${ghost(0, 1, C.green)}
    ${ghost(0, 2, C.amber)}
    ${ghost(1, 1, C.amber)}
    ${ghost(3, 1, C.green)}
    <g class="a" style="animation-name:card"><g class="a" style="animation-name:go;animation-timing-function:ease-in-out">
      <rect class="a" style="animation-name:edge" x="${cx}" y="86" width="${CW - 12}" height="28" rx="6" fill="${C.card}" stroke="${C.green}" stroke-width="1.5"/>
      <circle cx="${cx + 10}" cy="96" r="3" fill="${C.green}"/>
      <rect x="${cx + 18}" y="94" width="40" height="4" rx="2" fill="${C.text}" opacity=".8"/>
      <rect x="${cx + 7}" y="104" width="34" height="4" rx="2" fill="${C.muted}" opacity=".7"/>
      <g class="a" style="animation-name:done">
        <circle cx="${cx + CW - 22}" cy="105" r="6" fill="${C.green}"/>
        <path d="M${cx + CW - 25} 105l2.2 2.2l3.8-4.2" fill="none" stroke="${C.bg}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g></g>
    <text x="20" y="222" class="m" font-size="10">first issue to merged PR · GitHub-verified</text>
  </g>`;
  return card({ label: "OpenSourceCompanion: an issue card moves across a board from find, to work, to PR, to merged.", title: "OpenSourceCompanion", tag: "first contributions", accent: C.orange, css, body });
}

// ── More: a short directory listing. ──
function more() {
  const css = [
    `.l{opacity:0;animation:show .01s forwards}`, kf("show", [[100, "opacity:1"]]),
    `.cur{animation:blink 1s steps(1) infinite}`, kf("blink", [[50, "opacity:0"]]),
    `@media (prefers-reduced-motion:reduce){.l{opacity:1}}`,
  ];
  const rows = [["experiments/", C.cyan], ["coursework/", C.violet], ["open-source/", C.green]];
  const body = `  <g font-size="13">
    <text x="24" y="84" class="l" style="animation-delay:.3s"><tspan fill="${C.green}">$</tspan> <tspan class="t">ls</tspan> <tspan fill="${C.violet}">~/more</tspan></text>
    ${rows.map(([name, color], i) => `<g class="l" style="animation-delay:${r2(0.9 + i * 0.4)}s"><path d="M24 ${101 + i * 28}h7l3 3h10v11h-20z" fill="${color}" opacity=".85"/><text x="54" y="${114 + i * 28}" fill="${color}">${name}</text></g>`).join("\n    ")}
    <text x="24" y="206" class="l" style="animation-delay:2.3s"><tspan fill="${C.green}">$</tspan> <tspan class="t cur">█</tspan></text>
  </g>`;
  return card({ label: "More: experiments, coursework and open-source contributions.", title: "More", tag: "all repositories", accent: C.green, css, body });
}

// ── Divider: a packet travelling along a wire. ──
function divider() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="12" viewBox="0 0 860 12" role="presentation">
  <style>@media (prefers-reduced-motion:reduce){.pk{display:none}}</style>
  <defs>
    <linearGradient id="w" x1="0" x2="1"><stop offset="0" stop-color="${C.blue}" stop-opacity="0"/><stop offset=".5" stop-color="${C.blue}" stop-opacity=".55"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>
    <linearGradient id="p" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
  </defs>
  <rect x="0" y="5.5" width="860" height="1" fill="url(#w)"/>
  <g class="pk">
    <rect y="4.5" width="46" height="3" rx="1.5" fill="url(#p)"><animate attributeName="x" from="-60" to="880" dur="5s" repeatCount="indefinite"/></rect>
    <rect y="4.5" width="30" height="3" rx="1.5" fill="url(#p)" opacity=".6"><animate attributeName="x" from="-60" to="880" dur="5s" begin="2.2s" repeatCount="indefinite"/></rect>
  </g>
</svg>
`;
}

// ── Banner: a greeting over a dusk sky with mountains, stars and a moon. ──
function banner() {
  const BW = 860, BH = 240;
  let seed = 23;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const stars = Array.from({ length: 70 }, () => {
    const x = r2(rnd() * BW), y = r2(rnd() * 135), r = r2(0.5 + rnd() * 1.1);
    return `<circle class="tw" style="animation-delay:${r2(-rnd() * 4)}s;animation-duration:${r2(2.5 + rnd() * 3)}s" cx="${x}" cy="${y}" r="${r}"/>`;
  }).join("");

  // Jagged ridge for far mountains, rolling curve for near hills.
  const ridge = (base, amp, step, jag) => {
    let d = `M0 ${BH}V${base}`;
    for (let x = 0; x <= BW + step; x += step) {
      const y = r2(base - rnd() * amp);
      d += jag ? `L${x} ${y}` : `Q${x - step / 2} ${r2(y - amp * 0.35 * (rnd() - 0.3))} ${x} ${y}`;
    }
    return d + `V${BH}Z`;
  };
  const far = ridge(178, 62, 54, true), midR = ridge(198, 40, 66, true), near = ridge(222, 20, 120, false);

  const trees = Array.from({ length: 16 }, () => {
    const x = r2(430 + rnd() * 410), h = r2(10 + rnd() * 10), y = 226 - rnd() * 6;
    return `<path d="M${x} ${r2(y - h)}l${r2(h * 0.32)} ${h}h-${r2(h * 0.64)}z"/>`;
  }).join("");

  const bird = (x, y, sc, delay, dur) =>
    `<g transform="translate(${x} ${y}) scale(${sc})"><path class="bird" style="animation-delay:${delay}s;animation-duration:${dur}s" d="M-7 0q3.5-5 7 0q3.5-5 7 0" fill="none" stroke="#c0caf5" stroke-width="1.4" stroke-linecap="round"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}" viewBox="0 0 ${BW} ${BH}" role="img" aria-label="Hello, I am Rameshwari">
  <style>
    text{font-family:'Segoe UI',Ubuntu,'Helvetica Neue',Arial,sans-serif}
    .tw{fill:#fff;animation:tw 4s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:.95}}
    .rise{opacity:0;animation:rise 1s ease-out forwards}
    @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .bird{animation:fly 26s linear infinite}
    @keyframes fly{from{transform:translateX(-60px)}to{transform:translateX(960px)}}
    .cloud{animation:drift 60s linear infinite alternate}
    @keyframes drift{from{transform:translateX(-30px)}to{transform:translateX(50px)}}
    .shoot{opacity:0;animation:shoot 9s ease-in infinite}
    @keyframes shoot{0%,86%{opacity:0;transform:translate(0,0)}88%{opacity:1}96%{opacity:0;transform:translate(-130px,58px)}100%{opacity:0;transform:translate(-130px,58px)}}
    .halo{animation:halo 5s ease-in-out infinite}
    @keyframes halo{0%,100%{opacity:.55}50%{opacity:1}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.rise{opacity:1}.tw{opacity:.7}.bird{transform:translateX(300px)}}
  </style>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b1026"/><stop offset=".45" stop-color="#1f1d4d"/><stop offset=".72" stop-color="#553a78"/><stop offset=".9" stop-color="#c06a7e"/><stop offset="1" stop-color="#ffab70"/>
    </linearGradient>
    <radialGradient id="moonGlow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".5"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
    <linearGradient id="trail" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="crescent"><rect width="${BW}" height="${BH}" fill="#fff"/><circle cx="716" cy="50" r="22" fill="#000"/></mask>
    <clipPath id="clip"><rect width="${BW}" height="${BH}" rx="16"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="${BW}" height="${BH}" fill="url(#sky)"/>
    ${stars}
    <g transform="translate(560 30) rotate(-24)"><rect class="shoot" width="46" height="1.6" rx=".8" fill="url(#trail)"/></g>
    <circle class="halo" cx="704" cy="58" r="64" fill="url(#moonGlow)"/>
    <circle cx="704" cy="58" r="25" fill="#fff3c4" mask="url(#crescent)"/>
    <g class="cloud" fill="#c0caf5" opacity=".13">
      <ellipse cx="520" cy="112" rx="70" ry="9"/><ellipse cx="560" cy="104" rx="40" ry="9"/>
      <ellipse cx="800" cy="128" rx="60" ry="7"/><ellipse cx="250" cy="150" rx="80" ry="7"/>
    </g>
    ${bird(0, 40, 1, 0, 26)}${bird(-22, 50, 0.8, 0.6, 26)}${bird(-10, 28, 0.7, 1.1, 26)}
    <path d="${far}" fill="#6b4a8a" opacity=".75"/>
    <path d="${midR}" fill="#3a2d5f"/>
    <path d="${near}" fill="#141530"/>
    <g fill="#141530">${trees}</g>
  </g>
  <rect x=".5" y=".5" width="${BW - 1}" height="${BH - 1}" rx="16" fill="none" stroke="${C.line}"/>
  <text x="48" y="84" class="rise" style="animation-delay:.3s" fill="#c0caf5" font-size="22" letter-spacing=".5">Hello, I am</text>
  <text x="46" y="136" class="rise" style="animation-delay:.8s" fill="#fff" font-size="52" font-weight="700" letter-spacing="-.5">Rameshwari</text>
</svg>
`;
}

const files = { "cards/goproxyx.svg": gateway(), "cards/dsv.svg": dsv(), "cards/companion.svg": companion(), "cards/more.svg": more(), "divider.svg": divider(), "banner.svg": banner() };
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), svg);
  console.log(`wrote assets/${name} (${svg.length} bytes)`);
}
