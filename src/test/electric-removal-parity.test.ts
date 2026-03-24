import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const QUERY_COLLECTIONS_DIR = path.resolve("src/db-collections");

/** Verify query-backed collections exist and don't import Electric */
const getQueryCollectionFiles = () => {
  const files = fs.readdirSync(QUERY_COLLECTIONS_DIR);
  return files.filter(
    (f) => f.endsWith(".collection.ts") && (f.includes("query") || f === "commands.ts"),
  );
};

const getFileContent = (filename: string) =>
  fs.readFileSync(path.join(QUERY_COLLECTIONS_DIR, filename), "utf-8");

describe("electric removal parity", () => {
  it("query-backed collections cover all authenticated surfaces", () => {
    const queryFiles = getQueryCollectionFiles();
    const names = queryFiles.map((f) => f.replace(".collection.ts", "").replace(".ts", ""));

    // All authenticated surfaces have query-backed replacements
    expect(names).toContain("workspace-query");
    expect(names).toContain("form-listing-query");
    // form-detail-query merged into form-listing-query (single collection)
    expect(names).toContain("version-query");
    expect(names).toContain("submission-query");
  });

  it("new query-backed collections have no Electric imports", () => {
    const queryFiles = getQueryCollectionFiles();

    for (const file of queryFiles) {
      const content = getFileContent(file);
      expect(content).not.toContain("electric-db-collection");
      expect(content).not.toContain("@electric-sql");
      expect(content).not.toContain("getElectricUrl");
    }
  });

  it("commands module has no Electric imports", () => {
    const content = fs.readFileSync(path.join(QUERY_COLLECTIONS_DIR, "commands.ts"), "utf-8");
    expect(content).not.toContain("electric");
    expect(content).not.toContain("Electric");
  });

  it("new collections use queryCollectionOptions not electricCollectionOptions", () => {
    const queryFiles = getQueryCollectionFiles();

    for (const file of queryFiles) {
      const content = getFileContent(file);
      // All query collections should never use electricCollectionOptions
      expect(content).not.toContain("electricCollectionOptions");
    }
  });
});
