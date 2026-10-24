import { fixtureContacts } from "@mahmood/contacts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { withContactResolution } from "./withContactResolution";

const spokenForms: Array<[string, string]> = [
  ["علی رضایی", "علی رضایی"],
  ["حسین احمدی", "حسین احمدی"],
  ["مریم کریمی", "مریم کریمی"],
  ["فاطمه", "فاطمه"],
  ["علی کریمی", "علي كريمي"],
  ["Sara Johnson", "Sara Johnson"],
  ["David Miller", "David Miller"],
  ["بابا", "حسین احمدی"],
  ["Dad", "حسین احمدی"],
  ["مامان", "فاطمه"],
  ["Mom", "فاطمه"],
  ["آقا جون", "علي كريمي"],
];

describe("unique matches", () => {
  it("calls call_contact once with the stored name and reports it", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...spokenForms), async ([query, name]) => {
        const stub = createStubTools();
        const tools = withContactResolution(stub.tools, fixtureContacts);

        const result = await tools.call_contact.execute({ contact: query });

        expect(result).toEqual({ ok: true, output: { contact: name } });
        expect(stub.calls).toEqual([{ tool: "call_contact", input: { contact: name } }]);
      }),
    );
  });

  it("keeps the message text and sends once to the stored name", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...spokenForms),
        fc.string({ minLength: 1 }),
        async ([query, name], text) => {
          const stub = createStubTools();
          const tools = withContactResolution(stub.tools, fixtureContacts);

          const result = await tools.send_message.execute({ contact: query, text });

          expect(result).toEqual({ ok: true, output: { contact: name } });
          expect(stub.calls).toEqual([{ tool: "send_message", input: { contact: name, text } }]);
        },
      ),
    );
  });
});

describe("underlying tool errors", () => {
  it("passes an ok false result through unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...spokenForms),
        fc.string({ minLength: 1 }),
        async ([query], error) => {
          const stub = createStubTools({ failures: { call_contact: error } });
          const tools = withContactResolution(stub.tools, fixtureContacts);

          const result = await tools.call_contact.execute({ contact: query });

          expect(result).toEqual({ ok: false, error });
        },
      ),
    );
  });

  it("lets a throwing tool reject with the same error", async () => {
    const stub = createStubTools();
    const boom = new Error("device shell down");
    const tools = withContactResolution(
      {
        ...stub.tools,
        send_message: {
          name: "send_message",
          execute: async () => {
            throw boom;
          },
        },
      },
      fixtureContacts,
    );

    await expect(tools.send_message.execute({ contact: "مامان", text: "سلام" })).rejects.toBe(boom);
  });
});

describe("other tools", () => {
  it("leaves every non-contact tool untouched", () => {
    const stub = createStubTools();
    const tools = withContactResolution(stub.tools, fixtureContacts);

    for (const name of Object.keys(stub.tools) as Array<keyof typeof stub.tools>) {
      if (name === "call_contact" || name === "send_message") continue;
      expect(tools[name]).toBe(stub.tools[name]);
    }
  });
});
