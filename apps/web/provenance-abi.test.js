import assert from "node:assert/strict";
import { test } from "node:test";
import { Interface } from "ethers";
import { PROVENANCE_ABI } from "./provenance-abi.js";

const iface = new Interface(PROVENANCE_ABI);

test("provenance ABI parses and exposes the contract workflow", () => {
  for (const name of [
    "computeStoryId",
    "getStory",
    "getStoryVersion",
    "getContribution",
    "registerStoryVersion",
    "registerContribution",
    "decideContribution"
  ]) {
    assert.ok(iface.getFunction(name), `missing ABI function: ${name}`);
  }
});

test("contribution getter exposes the deployed struct field order", () => {
  const fragment = iface.getFunction("getContribution");
  const fields = fragment.outputs[0].components.map(component => component.name);
  assert.deepEqual(fields, [
    "storyId",
    "contributionHash",
    "permissionHash",
    "contributor",
    "reviewer",
    "sourceVersion",
    "permissionVersion",
    "decidedAt",
    "exists",
    "decided",
    "approved"
  ]);
});

test("provenance event definitions are parseable", () => {
  for (const name of [
    "StoryVersionRegistered",
    "ContributionRegistered",
    "ContributionDecided"
  ]) {
    assert.ok(iface.getEvent(name), `missing ABI event: ${name}`);
  }
});
