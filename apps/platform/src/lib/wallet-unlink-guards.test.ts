import { describe, expect, it } from "vitest";
import { readBodyWithLimit } from "./wallet-unlink-guards";

describe("readBodyWithLimit", () => {
  it("reads a body within the byte limit", async () => {
    const request = new Request("https://fanova.test/api/wallet/unlink", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"message":'));
          controller.enqueue(new TextEncoder().encode('"ok"}'));
          controller.close();
        }
      }),
      duplex: "half"
    } as RequestInit & { duplex: "half" });
    await expect(readBodyWithLimit(request, 32)).resolves.toBe('{"message":"ok"}');
  });

  it("rejects a declared oversized body before reading it", async () => {
    const request = new Request("https://fanova.test/api/wallet/unlink", {
      method: "POST",
      headers: { "content-length": "33" },
      body: "x".repeat(33)
    });
    await expect(readBodyWithLimit(request, 32)).rejects.toThrow("BODY_TOO_LARGE");
  });

  it("rejects a streamed body that exceeds the limit without buffering the remainder", async () => {
    let cancelled = false;
    const request = new Request("https://fanova.test/api/wallet/unlink", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(20));
          controller.enqueue(new Uint8Array(20));
        },
        cancel() { cancelled = true; }
      }),
      duplex: "half"
    } as RequestInit & { duplex: "half" });
    await expect(readBodyWithLimit(request, 32)).rejects.toThrow("BODY_TOO_LARGE");
    expect(cancelled).toBe(true);
  });
});
