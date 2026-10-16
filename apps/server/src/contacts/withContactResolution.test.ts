import { fixtureContacts } from "@mahmood/contacts";
import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { withContactResolution } from "./withContactResolution";

function setup() {
  const stub = createStubTools();
  const tools = withContactResolution(stub.tools, fixtureContacts);
  return { tools, calls: stub.calls };
}

describe("withContactResolution", () => {
  it("calls the matched contact by its stored name when the user said an alias", async () => {
    const { tools, calls } = setup();

    const result = await tools.call_contact.execute({ contact: "مامان" });

    expect(result).toEqual({ ok: true, output: { contact: "فاطمه" } });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "فاطمه" } }]);
  });

  it("fails without dialing when nobody in the address book matches", async () => {
    const { tools, calls } = setup();

    const result = await tools.call_contact.execute({ contact: "Zebediah" });

    expect(result).toEqual({ ok: false, error: 'No contact matches "Zebediah"' });
    expect(calls).toEqual([]);
  });

  it("fails without dialing and lists the candidates when the name is ambiguous", async () => {
    const { tools, calls } = setup();

    const result = await tools.call_contact.execute({ contact: "احمدی" });

    expect(result).toEqual({
      ok: false,
      error: 'Several contacts match "احمدی": حسین احمدی, حسن احمدی',
    });
    expect(calls).toEqual([]);
  });
});
