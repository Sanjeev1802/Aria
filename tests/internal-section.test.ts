import test from "node:test";
import assert from "node:assert/strict";
import {
  internalSectionEyebrow,
  internalSectionHref,
  internalSectionLabel,
  parseInternalSection,
} from "../components/internal/internal-section";

test("console sections round-trip through the section query", () => {
  assert.equal(parseInternalSection(null), "overview");
  assert.equal(parseInternalSection("customers"), "customers");
  assert.equal(parseInternalSection("workspaces"), "customers");
  assert.equal(parseInternalSection("not-real"), "overview");
  assert.equal(internalSectionHref("overview"), "/internal/");
  assert.equal(internalSectionHref("settings"), "/internal/?section=settings");
  assert.equal(internalSectionEyebrow("activity"), "Governance");
  assert.equal(internalSectionEyebrow("customers"), "Platform operations");
  assert.equal(internalSectionLabel("activity"), "Audit activity");
});
