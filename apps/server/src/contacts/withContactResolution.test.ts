import { fixtureContacts } from "@mahmood/contacts";
import fc from "fast-check";
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

  it("sends the message to the matched contact by its stored name", async () => {
    const { tools, calls } = setup();

    const result = await tools.send_message.execute({ contact: "بابا", text: "سلام" });

    expect(result).toEqual({ ok: true, output: { contact: "حسین احمدی" } });
    expect(calls).toEqual([
      { tool: "send_message", input: { contact: "حسین احمدی", text: "سلام" } },
    ]);
  });

  it("reports applied false without dialing when nobody in the address book matches", async () => {
    const { tools, calls } = setup();

    const result = await tools.call_contact.execute({ contact: "Zebediah" });

    expect(result).toEqual({
      ok: true,
      output: {
        applied: false,
        reason: "No contact matched",
        closest: expect.any(Array),
      },
    });
    const output = result.ok ? (result.output as { closest: string[] }) : { closest: [] };
    expect(output.closest.length).toBeLessThanOrEqual(3);
    expect(calls).toEqual([]);
  });

  it("reports applied false without dialing and lists the candidates when the name is ambiguous", async () => {
    const { tools, calls } = setup();

    const result = await tools.call_contact.execute({ contact: "احمدی" });

    expect(result).toEqual({
      ok: true,
      output: {
        applied: false,
        reason: "Several contacts matched",
        closest: ["حسین احمدی", "حسن احمدی"],
      },
    });
    expect(calls).toEqual([]);
  });
});

describe("withContactResolution misses as data", () => {
  it("returns applied false with a reason and closest names for an unknown contact", async () => {
    const { tools, calls } = setup();

    const result = await tools.send_message.execute({ contact: "mio cugino", text: "ciao" });

    expect(result.ok).toBe(true);
    const output = result.ok ? (result.output as Record<string, unknown>) : {};
    expect(output.applied).toBe(false);
    expect(String(output.reason).length).toBeGreaterThan(0);
    expect((output.closest as string[]).length).toBeLessThanOrEqual(3);
    expect(calls).toEqual([]);
  });

  it("returns applied false naming the two Ahmadi contacts when the name is ambiguous", async () => {
    const { tools, calls } = setup();

    const result = await tools.call_contact.execute({ contact: "احمدی" });

    expect(result.ok).toBe(true);
    const output = result.ok ? (result.output as Record<string, unknown>) : {};
    expect(output.applied).toBe(false);
    expect(output.closest).toEqual(expect.arrayContaining(["حسین احمدی", "حسن احمدی"]));
    expect((output.closest as string[]).length).toBeLessThanOrEqual(3);
    expect(calls).toEqual([]);
  });

  it("either calls the tool once with a stored name or returns applied false untouched", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (query) => {
        const { tools, calls } = setup();

        const result = await tools.call_contact.execute({ contact: query });

        expect(result.ok).toBe(true);
        const output = result.ok ? (result.output as Record<string, unknown>) : {};
        if (output.applied === false) {
          expect(calls).toEqual([]);
          expect((output.closest as string[]).length).toBeLessThanOrEqual(3);
        } else {
          const storedNames = fixtureContacts.map((contact) => contact.name);
          expect(calls).toHaveLength(1);
          expect(storedNames).toContain((calls[0]?.input as { contact: string }).contact);
        }
      }),
    );
  });
});
