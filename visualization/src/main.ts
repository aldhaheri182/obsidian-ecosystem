// ============================================================================
// visualization/src/main.ts
// Entry point. Wires NATS WS client, PixiJS city renderer, and sidebar UI.
// ============================================================================

import { CityView } from "./lib/pixi/CityView";
import { NatsBridge } from "./lib/nats-client";
import { TapeFeed } from "./lib/tape-feed";

const cityEl = document.getElementById("city") as HTMLDivElement;
const logEl = document.getElementById("log") as HTMLDivElement;
const natsStateEl = document.getElementById("nats-state") as HTMLSpanElement;
const agentCountEl = document.getElementById("agent-count") as HTMLSpanElement;
const agentsEl = document.getElementById("agents") as HTMLUListElement;
const emergencyBtn = document.getElementById("emergency-stop") as HTMLButtonElement;
const pauseBtn = document.getElementById("pause-trading") as HTMLButtonElement;

const NATS_URL =
  (import.meta as any).env?.VITE_NATS_WS_URL ?? "ws://localhost:18080";

const city = new CityView(cityEl);
const tape = new TapeFeed(30);
const heartbeats = new Map<string, number>();

function renderAgents() {
  const now = Date.now();
  const rows = [...heartbeats.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, ts]) => {
      const age = now - ts;
      const cls = age < 3000 ? "active" : age < 10000 ? "stale" : "error";
      return `<li><span><span class="dot ${cls}"></span>${id}</span>
              <span>${(age / 1000).toFixed(1)}s</span></li>`;
    });
  agentsEl.innerHTML = rows.join("");
  const live = [...heartbeats.values()].filter((ts) => now - ts < 5000).length;
  agentCountEl.textContent = String(live);
}
setInterval(renderAgents, 500);

function renderLog() {
  logEl.innerHTML = tape
    .entries()
    .map(
      (e) =>
        `<div class="entry"><span style="color:#888">${e.topic}</span> ${e.summary}</div>`,
    )
    .join("");
}

const nats = new NatsBridge(NATS_URL, {
  onState: (s) => (natsStateEl.textContent = s),
  onMessage: (msg) => {
    tape.push(msg);
    renderLog();
    if (msg.topic.startsWith("system.heartbeat.")) {
      const agentId = msg.topic.split(".").slice(2).join(".");
      heartbeats.set(agentId, Date.now());
    }
    city.onMessage(msg);
  },
});
nats.connect();

emergencyBtn.onclick = async () => {
  if (!confirm("Publish FLATTEN_ALL on risk.override.all?")) return;
  await nats.publishRaw("risk.override.all", new Uint8Array(0));
  tape.push({ topic: "risk.override.all", type: "RISK_OVERRIDE", summary: "OWNER: emergency stop", ts: Date.now() });
  renderLog();
};

pauseBtn.onclick = async () => {
  if (!confirm("Pause trading?")) return;
  await nats.publishRaw("risk.override.all", new Uint8Array(0));
  tape.push({ topic: "risk.override.all", type: "RISK_OVERRIDE", summary: "OWNER: pause", ts: Date.now() });
  renderLog();
};
