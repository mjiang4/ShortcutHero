import assert from "node:assert/strict";
import test from "node:test";

import { detectSystem } from "./launch-compatibility";

const MAC_PREFIX = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ";

test("supports the launch browsers on a Mac with a physical keyboard", () => {
  const agents = [
    `${MAC_PREFIX}AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36`,
    `${MAC_PREFIX}AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15`,
    `${MAC_PREFIX}Gecko/20100101 Firefox/142.0`,
  ];

  for (const userAgent of agents) {
    const system = detectSystem(userAgent);
    assert.equal(system.operatingSystem, "macOS");
    assert.equal(system.browserSupported, true);
    assert.equal(system.launchSupport, "supported");
  }
});

test("labels Windows as a Mac-layout preview", () => {
  const system = detectSystem(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/149.0.0.0 Safari/537.36",
  );
  assert.equal(system.operatingSystem, "Windows");
  assert.equal(system.launchSupport, "mac-layout");
});

test("blocks touch-first phones and iPads from keyboard gameplay", () => {
  const phone = detectSystem(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) Mobile/15E148 Safari/604.1",
    { maxTouchPoints: 5, coarsePointer: true, viewportWidth: 390 },
  );
  const ipad = detectSystem(
    `${MAC_PREFIX}AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15`,
    { maxTouchPoints: 5, coarsePointer: true, viewportWidth: 820 },
  );

  assert.equal(phone.launchSupport, "mobile");
  assert.equal(phone.likelyPhysicalKeyboard, false);
  assert.equal(ipad.operatingSystem, "iOS");
  assert.equal(ipad.launchSupport, "mobile");
});

test("warns before launching an unknown desktop browser", () => {
  const system = detectSystem(`${MAC_PREFIX}ExampleBrowser/1.0`);
  assert.equal(system.browser, "your browser");
  assert.equal(system.launchSupport, "untested");
});
