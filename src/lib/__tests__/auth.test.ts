// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieStore = { set: mockCookieSet };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession } from "../auth";

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets an httpOnly cookie named auth-token", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieSet.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
  });

  it("sets the cookie with lax sameSite and root path", async () => {
    await createSession("user-1", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets cookie expiry approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieSet.mock.calls[0];
    const expires: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("signs a valid JWT containing userId and email", async () => {
    await createSession("user-42", "hello@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const secret = new TextEncoder().encode("development-secret-key");
    const { payload } = await jwtVerify(token, secret);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  it("signs the JWT with HS256", async () => {
    await createSession("user-1", "test@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const header = JSON.parse(atob(token.split(".")[0]));
    expect(header.alg).toBe("HS256");
  });
});
