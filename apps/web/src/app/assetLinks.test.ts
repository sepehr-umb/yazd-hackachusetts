import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = () =>
  JSON.parse(
    readFileSync(new URL("../../public/.well-known/assetlinks.json", import.meta.url), "utf8"),
  );

describe("digital asset links", () => {
  it("lets the Android app app.yazd.companion open every yazd URL, with the fingerprint still to fill", () => {
    expect(read()).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "app.yazd.companion",
          sha256_cert_fingerprints: ["TO-BE-FILLED-AT-PACKAGING"],
        },
      },
    ]);
  });
});
