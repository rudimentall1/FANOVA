import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.FANOVA_PLATFORM_URL ?? "http://127.0.0.1:3000";

test("published work and approved public contribution survive an application-process restart", { timeout: 30_000 }, async () => {
  const searchUrl = new URL("/api/works", baseUrl);
  searchUrl.searchParams.set("q", "E2E Story Revised");

  const worksResponse = await fetch(searchUrl);
  const worksBody = await worksResponse.text();
  assert.equal(worksResponse.status, 200, `public works search failed: ${worksResponse.status} ${worksBody}`);

  const worksPayload = JSON.parse(worksBody);
  const persistedWork = worksPayload.works?.find((item) => item.title === "E2E Story Revised");
  assert.ok(persistedWork, "the latest published work version must be readable after the server restart");

  const pageResponse = await fetch(new URL(`/works/${encodeURIComponent(persistedWork.slug)}`, baseUrl));
  assert.equal(pageResponse.status, 200, `public work page failed: ${pageResponse.status}`);

  const pageHtml = await pageResponse.text();
  assert.ok(pageHtml.includes("E2E Story Revised"), "the latest work version must render after the restart");
  assert.ok(pageHtml.includes("E2E Fan Art Submission"), "the approved public contribution must remain attached to the work after the restart");
});
