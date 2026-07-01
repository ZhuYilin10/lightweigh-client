import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const indexPath = join(root, "src/pages/index.astro");
const privacyPath = join(root, "src/pages/privacy.astro");
const supportPath = join(root, "src/pages/support.astro");
const packagePath = join(root, "package.json");
const analyticsComponentPath = join(root, "src/components/VercelAnalytics.astro");
const cssPath = join(root, "src/styles/global.css");
const screenshotDir = join(root, "public/screenshots");

const forbiddenTerms = [
  String.fromCharCode(0x4c, 0x69, 0x67, 0x68, 0x74, 0x77, 0x65, 0x69, 0x67, 0x68),
  String.fromCharCode(0x6311, 0x6218),
  String.fromCharCode(0x6253, 0x5361),
  String.fromCharCode(0x71c3, 0x8102),
  String.fromCharCode(0x5931, 0x8d25),
  String.fromCharCode(0x53cd, 0x5f39),
  String.fromCharCode(0x76d1, 0x7763),
  String.fromCharCode(0x5956, 0x6c60),
  String.fromCharCode(0x5151, 0x6362, 0x4e2d, 0x5fc3)
];
const removedDownloadTerm = String.fromCharCode(0x4e0b, 0x8f7d);

const expectedScreenshots = [
  "route-overview.png",
  "station-detail.png",
  "records-trend.png",
  "today-dashboard.png",
  "arrival-ticket.png",
  "first-station.png"
];

const removedHeroClasses = [
  ["route", "paper"].join("-"),
  ["hero", "path"].join("-"),
  ["hero", "ticket"].join("-")
];

function readSiteSource() {
  const files = [indexPath, cssPath].filter(existsSync);
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

describe("轻量官网内容约束", () => {
  it("uses only the Chinese brand and avoids forbidden positioning terms", () => {
    assert.ok(existsSync(indexPath), "src/pages/index.astro should exist");
    const source = readSiteSource();

    assert.match(source, /轻量/);
    for (const term of forbiddenTerms) {
      assert.equal(source.includes(term), false, `unexpected forbidden term: ${term}`);
    }
  });

  it("keeps screenshots out of the hero section and reveals them later", () => {
    const source = readFileSync(indexPath, "utf8");
    const heroStart = source.search(/<section\s+class="[^"]*\bhero\b[^"]*"/);
    const routeStart = source.search(/<section\s+class="[^"]*\broute-reveal\b[^"]*"/);

    assert.notEqual(heroStart, -1, "hero section should exist");
    assert.notEqual(routeStart, -1, "route reveal section should exist");
    assert.ok(routeStart > heroStart, "route reveal should come after hero");

    const heroMarkup = source.slice(heroStart, routeStart);
    assert.equal(heroMarkup.includes("/screenshots/"), false, "hero should not contain screenshot paths");
    assert.match(source.slice(routeStart), /\/screenshots\/route-overview\.png/);
  });

  it("removes download entry points and links to privacy and support pages", () => {
    const source = readFileSync(indexPath, "utf8");

    assert.equal(source.includes(removedDownloadTerm), false, "homepage should not include removed app acquisition copy");
    assert.match(source, /href="\/privacy"/);
    assert.match(source, /href="\/support"/);
  });

  it("keeps the hero and screenshot heading free of extra CTA labels", () => {
    const source = readFileSync(indexPath, "utf8");
    const heroStart = source.search(/<section\s+class="[^"]*\bhero\b[^"]*"/);
    const routeStart = source.search(/<section\s+class="[^"]*\broute-reveal\b[^"]*"/);
    const heroMarkup = source.slice(heroStart, routeStart);

    assert.equal(heroMarkup.includes("hero-actions"), false, "hero should not render CTA buttons");
    assert.equal(heroMarkup.includes("<nav>"), false, "hero header should not render top navigation links");
    assert.equal(source.includes("App 截图"), false, "screenshot section should not show the eyebrow label");
  });

  it("uses the quieter app icon hero instead of the old decorative landing layout", () => {
    const source = readFileSync(indexPath, "utf8");

    assert.match(source, /class="[^"]*\bhero-art\b[^"]*"/);
    assert.match(source, /\/app-icon\.png/);
    for (const className of removedHeroClasses) {
      assert.equal(source.includes(className), false, `old hero class should be removed: ${className}`);
    }
  });

  it("declares every required screenshot asset", () => {
    for (const filename of expectedScreenshots) {
      const path = join(screenshotDir, filename);
      assert.ok(existsSync(path), `missing screenshot asset: ${filename}`);
    }

    assert.ok(existsSync(join(root, "public/app-icon.png")), "missing app icon asset");
  });

  it("provides privacy and support pages", () => {
    assert.ok(existsSync(privacyPath), "src/pages/privacy.astro should exist");
    assert.ok(existsSync(supportPath), "src/pages/support.astro should exist");

    const privacySource = readFileSync(privacyPath, "utf8");
    const supportSource = readFileSync(supportPath, "utf8");

    assert.match(privacySource, /隐私政策/);
    assert.match(privacySource, /Apple Health/);
    assert.match(supportSource, /需要帮忙/);
    assert.match(supportSource, /mailto:/);
  });

  it("includes Vercel Analytics on every public page", () => {
    assert.ok(existsSync(analyticsComponentPath), "src/components/VercelAnalytics.astro should exist");

    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    assert.ok(packageJson.dependencies?.["@vercel/analytics"], "@vercel/analytics should be a runtime dependency");

    const analyticsSource = readFileSync(analyticsComponentPath, "utf8");
    assert.match(analyticsSource, /@vercel\/analytics\/astro/);
    assert.match(analyticsSource, /<Analytics\s*\/>/);

    for (const pagePath of [indexPath, privacyPath, supportPath]) {
      const source = readFileSync(pagePath, "utf8");
      assert.match(source, /import VercelAnalytics from "\.\.\/components\/VercelAnalytics\.astro";/);
      assert.match(source, /<VercelAnalytics\s*\/>/);
    }
  });
});
