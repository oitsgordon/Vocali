import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateSupabaseRequest, createSupabaseAdminClient, deleteUser } = vi.hoisted(() => ({
  authenticateSupabaseRequest: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  authenticateSupabaseRequest,
  createSupabaseAdminClient,
}));

import { DELETE } from "./route";

describe("DELETE /api/guest-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseAdminClient.mockReturnValue({ auth: { admin: { deleteUser } } });
    deleteUser.mockResolvedValue({ error: null });
  });

  it("deletes only the authenticated anonymous user", async () => {
    authenticateSupabaseRequest.mockResolvedValue({
      ok: true,
      auth: { user: { id: "guest-1", is_anonymous: true } },
    });

    const response = await DELETE(new Request("http://localhost/api/guest-session", { method: "DELETE" }));

    expect(response.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith("guest-1");
  });

  it("refuses to delete a permanent account", async () => {
    authenticateSupabaseRequest.mockResolvedValue({
      ok: true,
      auth: { user: { id: "user-1", is_anonymous: false } },
    });

    const response = await DELETE(new Request("http://localhost/api/guest-session", { method: "DELETE" }));

    expect(response.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
