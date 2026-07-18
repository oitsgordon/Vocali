import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateSupabaseRequest: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  decryptAppleRefreshToken: vi.fn((value: string) => `decrypted:${value}`),
  revokeAppleRefreshToken: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  authenticateSupabaseRequest: mocks.authenticateSupabaseRequest,
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("@/lib/appleTokens", () => ({
  decryptAppleRefreshToken: mocks.decryptAppleRefreshToken,
  revokeAppleRefreshToken: mocks.revokeAppleRefreshToken,
}));

import { DELETE } from "./route";

function createDeleteRequest() {
  return new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
}

function createAdmin(token: string | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: token ? { encrypted_refresh_token: token } : null,
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const deleteUser = vi.fn().mockResolvedValue({ error: null });

  return {
    auth: { admin: { deleteUser } },
    from: vi.fn(() => ({ select })),
    test: { deleteUser },
  };
}

function authenticatedUser(provider = "email") {
  return {
    ok: true,
    auth: {
      user: {
        id: "user-1",
        identities: [{ provider }],
      },
    },
  };
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hard-deletes an email account", async () => {
    const admin = createAdmin();
    mocks.authenticateSupabaseRequest.mockResolvedValue(authenticatedUser());
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const response = await DELETE(createDeleteRequest());

    expect(response.status).toBe(200);
    expect(admin.test.deleteUser).toHaveBeenCalledWith("user-1", false);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      manualAppleRevocationRequired: false,
    });
  });

  it("revokes a stored Apple token before deletion", async () => {
    const admin = createAdmin("encrypted-token");
    mocks.authenticateSupabaseRequest.mockResolvedValue(
      authenticatedUser("apple"),
    );
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const response = await DELETE(createDeleteRequest());

    expect(mocks.revokeAppleRefreshToken).toHaveBeenCalledWith(
      "decrypted:encrypted-token",
    );
    expect(admin.test.deleteUser).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      manualAppleRevocationRequired: false,
    });
  });

  it("still deletes legacy Apple accounts without a stored token", async () => {
    const admin = createAdmin();
    mocks.authenticateSupabaseRequest.mockResolvedValue(
      authenticatedUser("apple"),
    );
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const response = await DELETE(createDeleteRequest());

    expect(admin.test.deleteUser).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      manualAppleRevocationRequired: true,
    });
  });

  it("requires the destructive confirmation value", async () => {
    mocks.authenticateSupabaseRequest.mockResolvedValue(authenticatedUser());

    const response = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "delete" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
