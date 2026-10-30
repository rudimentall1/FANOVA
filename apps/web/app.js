import { publishStory, submitContribution, reviewContribution } from "./domain.js";
import { captureStoryIntegrity, captureContributionIntegrity } from "./content-integrity.js";
const KEY = "fanova.local.v2", META_KEY = "fanova.onchain.v1", CREATOR = "creator-demo", FAN = "fan-demo";
const root = document.querySelector("#app"), notice = document.querySelector("#notice");
let role = "creator", state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.contributions)) return saved;
  } catch {}
  return { story: null, contributions: [] };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function readOnchainMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || { stories: {}, contributions: {} }; }
  catch { return { stories: {}, contributions: {} }; }
}
function shortAddress(address) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }
function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function msg(value, error = false) {
  notice.hidden = false;
  notice.className = "notice " + (error ? "error" : "success");
  notice.textContent = value;
}
function clearMsg() { notice.hidden = true; notice.textContent = ""; }
function label(value) {
  return ({ pending: "Awaiting review", approved: "Approved", rejected: "Not approved" })[value] || value;
}

function render() {
  document.querySelectorAll("[data-role]").forEach(button => {
    button.classList.toggle("active", button.dataset.role === role);
    button.setAttribute("aria-pressed", String(button.dataset.role === role));
  });
  if (!state.story) {
    root.innerHTML = role === "creator"
      ? `<div class="card"><div class="card-kicker">01 / SOURCE STORY</div><h3>Publish the first story</h3><p class="muted">Use original material. Permission rules are shown to every contributor.</p><form id="story-form" class="form"><label>Story title<input name="title" required maxlength="100" placeholder="The Glass City"></label><label>Story text<textarea name="body" required maxlength="10000" rows="5"></textarea></label><label>Permitted-use rules<textarea name="permissions" required maxlength="1500" rows="3" placeholder="What may fans submit? What is prohibited?"></textarea></label><button class="primary">Publish story ↗</button></form></div>`
      : `<div class="empty-state"><h3>No story published yet</h3><p>Switch to Creator to publish the source story first.</p></div>`;
    bindStory();
    return;
  }

  const story = state.story;
  const meta = readOnchainMeta();
  const storyRecord = meta.stories?.[story.id];
  const creatorAttribution = storyRecord?.txHash && storyRecord?.blockNumber && storyRecord?.creatorAddress
    ? `<span>On-chain creator wallet</span><code title="${esc(storyRecord.creatorAddress)}">${esc(shortAddress(storyRecord.creatorAddress))}</code>`
    : `<span>Creator label is local and simulated; no on-chain wallet is recorded.</span>`;
  root.innerHTML = `<article class="story-card"><div class="story-meta"><span class="chip">SOURCE · v${story.version}</span><span class="muted">Demo label: ${esc(story.creatorName)} (simulated)</span></div><h3>${esc(story.title)}</h3><p class="story-body">${esc(story.body).replace(/\n/g, "<br>")}</p><div class="permission-box"><strong>Permitted-use rules · v${story.permissionVersion}</strong><p>${esc(story.permissions).replace(/\n/g, "<br>")}</p></div><div class="source-ref"><span>Source ID</span><code>${esc(story.id)}</code><span>v${story.version}</span>${creatorAttribution}</div></article>`
    + (role === "creator" ? reviewQueue() : fanForm());
  bindContribution();
  bindReviews();
}

function bindStory() {
  const form = document.querySelector("#story-form");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const story = publishStory({
        creatorId: CREATOR,
        creatorName: "Demo Creator",
        title: data.get("title"),
        body: data.get("body"),
        permissions: data.get("permissions")
      });
      story.integrityCommitment = await captureStoryIntegrity(story);
      state.story = story;
      state.contributions = [];
      save();
      render();
      msg("Story published locally. A local SHA-256 checksum was captured. No blockchain transaction was sent.");
    } catch (error) {
      msg(error.message, true);
    }
  });
}

function reviewQueue() {
  if (!state.contributions.length) {
    return `<div class="card"><div class="card-kicker">02 / REVIEW QUEUE</div><h3>Waiting for contributions</h3><p class="muted">Switch to Fan to submit a continuation under these rules.</p></div>`;
  }
  return `<div class="review-header"><div><p class="eyebrow">02 / REVIEW QUEUE</p><h3>Fan contributions</h3></div></div><div class="contribution-list">${state.contributions.map(card).join("")}</div>`;
}

function card(contribution) {
  const meta = readOnchainMeta();
  const record = meta.contributions?.[contribution.id];
  const storyRecord = meta.stories?.[state.story?.id];
  const contributorAttribution = record?.txHash && record?.blockNumber && record?.contributorAddress
    ? `<span>On-chain contributor wallet</span><code title="${esc(record.contributorAddress)}">${esc(shortAddress(record.contributorAddress))}</code>`
    : `<span>Contributor label is local and simulated; no on-chain wallet is recorded.</span>`;
  const reviewerAttribution = record?.decisionTxHash && record?.decisionBlockNumber && storyRecord?.creatorAddress
    ? `<span>On-chain reviewer wallet</span><code title="${esc(storyRecord.creatorAddress)}">${esc(shortAddress(storyRecord.creatorAddress))}</code>`
    : "";
  const reviewerLabel = contribution.decision
    ? `Local reviewer label: ${esc(state.story.creatorName)} (simulated)`
    : "";
  const reason = contribution.decision?.reason
    ? `<p>${esc(contribution.decision.reason)}</p>`
    : "";
  const decision = contribution.decision
    ? `<div class="decision-note"><strong>Decision: ${esc(contribution.decision.outcome)}</strong><p class="muted">${reviewerLabel}</p>${reviewerAttribution}${reason}</div>`
    : "";
  return `<article class="contribution-card"><div class="contribution-top"><span class="chip ${esc(contribution.status)}">${label(contribution.status)}</span><span class="muted">Demo label: ${esc(contribution.contributorName)} (simulated)</span></div><h4>${esc(contribution.title)}</h4><p class="story-body">${esc(contribution.body).replace(/\n/g, "<br>")}</p><div class="source-ref"><span>Source</span><code>${esc(contribution.storyId)}</code><span>source v${contribution.sourceVersion} · permissions v${contribution.permissionVersion}</span>${contributorAttribution}</div>${decision}${role === "creator" && contribution.status === "pending" ? `<div class="review-actions"><input data-reason="${esc(contribution.id)}" maxlength="300" placeholder="Decision note (optional)"><button class="primary small" data-review="approved" data-id="${esc(contribution.id)}">Approve</button><button class="secondary small" data-review="rejected" data-id="${esc(contribution.id)}">Reject</button></div>` : ""}</article>`;
}

function fanForm() {
  const mine = state.contributions.filter(contribution => contribution.contributorId === FAN);
  return `<div class="card"><div class="card-kicker">02 / YOUR CONTRIBUTION</div><h3>Add to the story</h3><p class="muted">Your submission references source version ${state.story.version} and awaits creator review.</p><form id="contribution-form" class="form"><label>Contribution title<input name="title" required maxlength="100"></label><label>Your contribution<textarea name="body" required maxlength="5000" rows="5"></textarea></label><label class="check-row"><input name="acknowledged" type="checkbox" required><span>I have read and accept the creator's permitted-use rules.</span></label><button class="primary">Submit contribution ↗</button></form>${mine.length ? `<div class="submitted-list"><p class="eyebrow">YOUR SUBMISSIONS</p>${mine.map(card).join("")}</div>` : ""}<div class="failure-test"><div><strong>Failure-path check</strong><p>Try to approve a pending contribution as a fan.</p></div><button class="secondary" id="unauthorized-test" type="button">Try unauthorized approval</button></div></div>`;
}

function bindContribution() {
  const form = document.querySelector("#contribution-form");
  if (form) form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const contribution = submitContribution({
        story: state.story,
        contributorId: FAN,
        contributorName: "Demo Fan",
        title: data.get("title"),
        body: data.get("body"),
        permissionAcknowledged: data.get("acknowledged") === "on"
      });
      contribution.integrityCommitment = await captureContributionIntegrity(contribution);
      state.contributions.push(contribution);
      save();
      render();
      msg("Contribution saved locally with a SHA-256 checksum and linked to source v" + contribution.sourceVersion + ".");
    } catch (error) {
      msg(error.message, true);
    }
  });

  const button = document.querySelector("#unauthorized-test");
  if (button) button.addEventListener("click", () => {
    const contribution = state.contributions.find(item => item.status === "pending");
    if (!contribution) { msg("Submit a contribution first.", true); return; }
    try {
      reviewContribution({ story: state.story, contribution, actorId: FAN, outcome: "approved" });
      msg("Unexpected: unauthorized approval was not blocked.", true);
    } catch (error) {
      msg(error.message, true);
    }
  });
}

function bindReviews() {
  document.querySelectorAll("[data-review]").forEach(button => button.addEventListener("click", () => {
    const contribution = state.contributions.find(item => item.id === button.dataset.id);
    const input = document.querySelector(`[data-reason="${CSS.escape(button.dataset.id)}"]`);
    try {
      const next = reviewContribution({
        story: state.story,
        contribution,
        actorId: CREATOR,
        outcome: button.dataset.review,
        reason: input?.value || ""
      });
      state.contributions = state.contributions.map(item => item.id === next.id ? next : item);
      save();
      render();
      msg("Decision saved locally. Nothing was written to Soneium.");
    } catch (error) {
      msg(error.message, true);
    }
  }));
}

document.querySelectorAll("[data-role]").forEach(button => button.addEventListener("click", () => {
  role = button.dataset.role;
  clearMsg();
  render();
}));
document.querySelector("#reset").addEventListener("click", () => {
  if (!confirm("Delete locally saved demo data?")) return;
  localStorage.removeItem(KEY);
  state = { story: null, contributions: [] };
  render();
  msg("Local demo data reset.");
});
render();
