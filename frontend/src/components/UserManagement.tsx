import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type MeResponse = {
  user_id: string;
  email: string;
  roles: string[];
  permissions: string[];
};

type RoleDetail = {
  role_id: string;
  role_name: string;
  description: string | null;
  is_system: boolean;
  can_be_created_by: string[];
  can_be_modified_by: string[];
  permissions: string[];
};

type PermissionDef = {
  permission_id: string;
  permission_name: string;
  resource: string;
  action: string;
  description: string | null;
};

type AdminUserRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  roles: string[];
};

type KnowledgeBaseSummary = {
  kb_id: string;
  owner_id: string;
  name: string;
  description: string | null;
};

type UserKBAccessResponse = {
  user_id: string;
  kb_ids: string[];
  knowledge_bases: KnowledgeBaseSummary[];
};

type ToastState = { type: "ok" | "err"; msg: string } | null;

// ─── API ─────────────────────────────────────────────────────────────────────

function getAccessToken() {
  return localStorage.getItem("access_token");
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated.");
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const b = await res.json();
      msg = b?.detail || b?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

function normalizeMe(raw: any): MeResponse {
  const u = raw.user ?? raw;
  const user_id = (u.user_id ?? u.id ?? "") as string;
  const email = (u.email ?? "") as string;
  const roles = [...new Set([
    ...(Array.isArray(u.roles) ? u.roles : []),
    ...(u.role ? [u.role] : []),
  ])] as string[];
  const permissions = Array.isArray(u.permissions) ? (u.permissions as string[]) : [];
  if (!user_id || !email) throw new Error("auth/me response missing user_id or email");
  return { user_id, email, roles: roles.length ? roles : ["end_user"], permissions };
}

const fetchMe = () => apiFetch<any>("/api/v1/auth/me").then(normalizeMe);
const adminListUsers = () => apiFetch<AdminUserRow[]>("/api/v1/admin/users");
const adminListRoles = () => apiFetch<RoleDetail[]>("/api/v1/admin/roles");
const adminListPermissions = () => apiFetch<PermissionDef[]>("/api/v1/admin/permissions");

const adminSetUserRole = (userId: string, roleName: string) =>
  apiFetch<AdminUserRow>(`/api/v1/admin/users/${userId}/role`, {
    method: "POST",
    body: JSON.stringify({ role_name: roleName }),
  });

const adminListKnowledgeBases = () =>
  apiFetch<KnowledgeBaseSummary[]>("/api/v1/admin/knowledge-bases");

const adminGetUserKBAccess = (userId: string) =>
  apiFetch<UserKBAccessResponse>(`/api/v1/admin/users/${userId}/kb-access`);

const adminSetUserKBAccess = (userId: string, kbIds: string[]) =>
  apiFetch<UserKBAccessResponse>(`/api/v1/admin/users/${userId}/kb-access`, {
    method: "PUT",
    body: JSON.stringify({ kb_ids: kbIds }),
  });

const adminDeleteUser = (userId: string) =>
  apiFetch<void>(`/api/v1/users/${userId}`, { method: "DELETE" });

const adminCreateRole = (payload: {
  role_name: string;
  description?: string;
  can_be_created_by: string[];
  can_be_modified_by: string[];
  permission_names: string[];
}) =>
  apiFetch<RoleDetail>("/api/v1/admin/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });

const adminUpdateRole = (
  roleId: string,
  payload: {
    description?: string;
    can_be_created_by: string[];
    can_be_modified_by: string[];
    permission_names: string[];
  }
) =>
  apiFetch<RoleDetail>(`/api/v1/admin/roles/${roleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

const adminDeleteRole = (roleId: string) =>
  apiFetch<void>(`/api/v1/admin/roles/${roleId}`, { method: "DELETE" });

const createUser = (payload: {
  email: string;
  password: string;
  full_name?: string;
  role: string;
  kb_ids?: string[];
}) =>
  apiFetch("/api/v1/users", { method: "POST", body: JSON.stringify(payload) });

// ─── Shared helpers ───────────────────────────────────────────────────────────

function creatableRoles(allRoles: RoleDetail[], creatorRoles: string[]): RoleDetail[] {
  return allRoles.filter((r) =>
    r.can_be_created_by.some((allowed) => creatorRoles.includes(allowed))
  );
}

function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = useCallback((type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  }, []);
  return { toast, showToast };
}

function ToastAlert({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
        toast.type === "ok"
          ? "border-status-success/50 bg-status-success/10 text-status-success"
          : "border-destructive/50 bg-destructive/10 text-destructive"
      }`}
    >
      {toast.type === "ok" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
      <span>{toast.msg}</span>
    </div>
  );
}

// ─── RoleManagement ───────────────────────────────────────────────────────────

const RoleManagement: FC<{
  me: MeResponse;
  allRoles: RoleDetail[];
  onRolesChange: () => void;
}> = ({ me, allRoles, onRolesChange }) => {
  const canManageRoles = me.permissions.includes("role_management.access");
  const { toast, showToast } = useToast();

  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canBeCreatedBy, setCanBeCreatedBy] = useState<string[]>([]);
  const [canBeModifiedBy, setCanBeModifiedBy] = useState<string[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadPerms = async () => {
    setLoadingPerms(true);
    try {
      setPermissions(await adminListPermissions());
    } catch (e: any) {
      showToast("err", e.message || "Failed to load permissions");
    } finally {
      setLoadingPerms(false);
    }
  };

  const openDialog = async (role?: RoleDetail) => {
    if (!permissions.length) await loadPerms();
    if (role) {
      setEditingRole(role);
      setName(role.role_name);
      setDescription(role.description || "");
      setCanBeCreatedBy([...role.can_be_created_by]);
      setCanBeModifiedBy([...role.can_be_modified_by]);
      setSelectedPerms([...role.permissions]);
    } else {
      setEditingRole(null);
      setName("");
      setDescription("");
      setCanBeCreatedBy([]);
      setCanBeModifiedBy([]);
      setSelectedPerms([]);
    }
    setDialogOpen(true);
  };


  const save = async () => {
    if (!name.trim()) {
      showToast("err", "Role name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await adminUpdateRole(editingRole.role_id, {
          description: description || undefined,
          can_be_created_by: canBeCreatedBy,
          can_be_modified_by: canBeModifiedBy,
          permission_names: selectedPerms,
        });
        showToast("ok", "Role updated");
      } else {
        await adminCreateRole({
          role_name: name.trim(),
          description: description || undefined,
          can_be_created_by: canBeCreatedBy,
          can_be_modified_by: canBeModifiedBy,
          permission_names: selectedPerms,
        });
        showToast("ok", `Role "${name.trim()}" created`);
      }
      setDialogOpen(false);
      onRolesChange();
    } catch (e: any) {
      showToast("err", e.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    setDeletingId(roleId);
    try {
      await adminDeleteRole(roleId);
      onRolesChange();
      showToast("ok", "Role deleted");
    } catch (e: any) {
      showToast("err", e.message || "Failed to delete role");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (!canManageRoles) return null;

  const SECTION_ORDER = [
    'knowledge_base', 'document', 'query', 'analytics',
    'sync', 'role_management', 'user_management', 'user', 'api_key',
  ];

  const displayGroup = (p: PermissionDef): string => {
    if (p.permission_name === 'role_management.access') return 'role_management';
    if (p.permission_name === 'user_management.access') return 'user_management';
    return p.resource;
  };

  const permsByResource = permissions.reduce(
    (acc, p) => {
      const group = displayGroup(p);
      if (!acc[group]) acc[group] = [];
      acc[group].push(p);
      return acc;
    },
    {} as Record<string, PermissionDef[]>
  );

  const sortedResourceEntries = Object.entries(permsByResource).sort(([a], [b]) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>
              Create and configure roles. Set who can create or modify users of each role, and
              which operations the role can perform.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus size={15} className="mr-1" />
            New Role
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {allRoles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No roles found.</p>
          )}
          {allRoles.map((r) => (
            <div
              key={r.role_id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{r.role_name}</Badge>
                  {r.is_system && (
                    <span className="text-[11px] text-muted-foreground italic">system</span>
                  )}
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  <span>
                    Can create:{" "}
                    <span className="text-foreground">
                      {r.can_be_created_by.length ? r.can_be_created_by.join(", ") : "—"}
                    </span>
                  </span>
                  <span>
                    Can modify:{" "}
                    <span className="text-foreground">
                      {r.can_be_modified_by.length ? r.can_be_modified_by.join(", ") : "—"}
                    </span>
                  </span>
                  <span>
                    <span className="text-foreground">{r.permissions.length}</span> permissions
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openDialog(r)}>
                  <Pencil size={13} className="mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={r.is_system}
                  title={r.is_system ? "System roles cannot be deleted" : "Delete role"}
                  onClick={() => setConfirmDeleteId(r.role_id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
          <ToastAlert toast={toast} />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {(() => {
        const roleToDelete = allRoles.find((r) => r.role_id === confirmDeleteId);
        return (
          <Dialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-foreground">
                  Are you sure you want to delete the role{" "}
                  <span className="font-semibold">{roleToDelete?.role_name}</span>?
                </p>
                <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <Trash2 size={16} className="shrink-0 mt-0.5" />
                  <span>All users assigned this role will lose access. This action cannot be undone.</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={!!deletingId}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!!deletingId}
                  onClick={() => confirmDeleteId && deleteRole(confirmDeleteId)}
                >
                  {deletingId ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Delete Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* overflow-y-auto on DialogContent avoids inner scroll containers
            that create pointer-event-blocking stacking contexts */}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Edit Role: ${editingRole.role_name}` : "Create Role"}
            </DialogTitle>
          </DialogHeader>

          {loadingPerms ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!editingRole?.is_system}
                  placeholder="e.g. analyst, viewer, manager"
                />
                {editingRole?.is_system && (
                  <p className="text-xs text-muted-foreground">
                    System role names cannot be changed.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>
                  Description{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this role"
                />
              </div>

              {/* Can be created by */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Who can create users with this role?</p>
                <p className="text-xs text-muted-foreground">
                  Users whose role is checked can assign this role when creating new users.
                </p>
                <div className="rounded-lg border p-3 grid grid-cols-2 gap-2">
                  {allRoles.map((r) => (
                    <div
                      key={r.role_name}
                      onClick={() =>
                        setCanBeCreatedBy((prev) =>
                          prev.includes(r.role_name)
                            ? prev.filter((x) => x !== r.role_name)
                            : [...prev, r.role_name]
                        )
                      }
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={canBeCreatedBy.includes(r.role_name)}
                        className="h-4 w-4 accent-primary pointer-events-none"
                      />
                      <span className="text-sm">{r.role_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Can be modified by */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Who can modify users with this role?</p>
                <p className="text-xs text-muted-foreground">
                  Users whose role is checked can change or manage users who hold this role.
                </p>
                <div className="rounded-lg border p-3 grid grid-cols-2 gap-2">
                  {allRoles.map((r) => (
                    <div
                      key={r.role_name}
                      onClick={() =>
                        setCanBeModifiedBy((prev) =>
                          prev.includes(r.role_name)
                            ? prev.filter((x) => x !== r.role_name)
                            : [...prev, r.role_name]
                        )
                      }
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={canBeModifiedBy.includes(r.role_name)}
                        className="h-4 w-4 accent-primary pointer-events-none"
                      />
                      <span className="text-sm">{r.role_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Operations / Permissions</p>
                <p className="text-xs text-muted-foreground">
                  Check the operations users with this role can perform.
                </p>
                <div className="rounded-lg border divide-y">
                  {sortedResourceEntries.map(([resource, perms]) => (
                    <div key={resource} className="p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide">
                        {resource}
                      </p>
                      <div className="space-y-2">
                        {perms.map((p) => (
                          <div
                            key={p.permission_name}
                            onClick={() =>
                              setSelectedPerms((prev) =>
                                prev.includes(p.permission_name)
                                  ? prev.filter((x) => x !== p.permission_name)
                                  : [...prev, p.permission_name]
                              )
                            }
                            className="flex items-start gap-2 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={selectedPerms.includes(p.permission_name)}
                              className="h-4 w-4 accent-primary pointer-events-none mt-0.5 shrink-0"
                            />
                            <div>
                              <div className="text-sm font-medium">{p.permission_name}</div>
                              {p.description && (
                                <div className="text-xs text-muted-foreground">
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loadingPerms}>
              {saving && <Loader2 size={16} className="animate-spin mr-1" />}
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── UserGroupPanel ───────────────────────────────────────────────────────────

const UserGroupPanel: FC<{
  me: MeResponse;
  allRoles: RoleDetail[];
  availableKBs: KnowledgeBaseSummary[];
  refreshTrigger?: number;
}> = ({
  me,
  allRoles,
  availableKBs,
  refreshTrigger,
}) => {
  const isAdmin = me.permissions.includes("user_management.access");
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [deletePermError, setDeletePermError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editDialogUser, setEditDialogUser] = useState<AdminUserRow | null>(null);
  const [editRoleName, setEditRoleName] = useState<string>("");
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [loadingUserEdit, setLoadingUserEdit] = useState(false);
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setUsers((await adminListUsers()) ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, refreshTrigger]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const openUserEditDialog = async (user: AdminUserRow) => {
    setEditDialogUser(user);
    setEditRoleName(user.roles?.[0] ?? "end_user");
    setLoadingUserEdit(true);
    try {
      const result = await adminGetUserKBAccess(user.user_id);
      setSelectedKbIds(result.kb_ids);
    } catch (e: any) {
      setSelectedKbIds([]);
      showToast("err", e?.message || "Failed to load KB access");
    } finally {
      setLoadingUserEdit(false);
    }
  };

  const saveUserChanges = async () => {
    if (!editDialogUser) return;
    setSavingUserEdit(true);
    try {
      let updatedUser = editDialogUser;
      const currentRole = editDialogUser.roles?.[0] ?? "end_user";

      if (editRoleName && editRoleName !== currentRole) {
        updatedUser = await adminSetUserRole(editDialogUser.user_id, editRoleName);
      }

      await adminSetUserKBAccess(editDialogUser.user_id, selectedKbIds);
      setUsers((prev) => prev.map((u) => (u.user_id === editDialogUser.user_id ? updatedUser : u)));
      showToast("ok", "User updated");
      setEditDialogUser(null);
    } catch (e: any) {
      showToast("err", e?.message || "Failed to update user");
    } finally {
      setSavingUserEdit(false);
    }
  };

  const toggleKb = (kbId: string) => {
    setSelectedKbIds((prev) =>
      prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId]
    );
  };

  const handleDeleteClick = (u: AdminUserRow) => {
    const targetRoleName = u.roles?.[0];
    const targetRole = allRoles.find((r) => r.role_name === targetRoleName);
    const isAdmin = me.roles.includes("admin");
    const hasDeletePerm = me.permissions.includes("user.delete");
    const inModifiedBy = targetRole
      ? targetRole.can_be_modified_by.some((r) => me.roles.includes(r))
      : false;

    if (!isAdmin && (!hasDeletePerm || !inModifiedBy)) {
      setDeletePermError(
        `You do not have permission to delete users with the "${targetRoleName ?? "unknown"}" role. ` +
        `Your role must be listed in that role's "Who can modify users with this role" setting.`
      );
      return;
    }
    setConfirmDeleteUserId(u.user_id);
  };

  const deleteUser = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      showToast("ok", "User deleted");
    } catch (e: any) {
      showToast("err", e?.message || "Failed to delete user");
    } finally {
      setBusyUserId(null);
      setConfirmDeleteUserId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Admin-only panel. View all users and change their role.
          </CardDescription>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name"
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} users
          </span>
        </div>

        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">User</TableHead>
                  <TableHead className="w-[20%]">Current Role</TableHead>
                  <TableHead className="w-[20%]">KB Access</TableHead>
                  <TableHead className="w-[25%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((u) => {
                    const cur = u.roles?.[0] ?? "end_user";
                    const busy = busyUserId === u.user_id;
                    const isSelf = u.user_id === me.user_id;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="text-sm text-foreground">{u.email}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {u.full_name ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cur}</Badge>
                          {isSelf && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              This is you
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            Managed in user editor
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUserEditDialog(u)}
                              disabled={busy}
                            >
                              <Pencil size={14} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelf || busy}
                              title={isSelf ? "Cannot delete your own account" : "Delete user"}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(u)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <ToastAlert toast={toast} />
      </CardContent>

      {/* Permission denied dialog */}
      <Dialog open={!!deletePermError} onOpenChange={(open) => { if (!open) setDeletePermError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Permission Denied</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{deletePermError}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDeletePermError(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDialogUser} onOpenChange={(open) => { if (!open) setEditDialogUser(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit User{editDialogUser ? `: ${editDialogUser.email}` : ""}
            </DialogTitle>
          </DialogHeader>
          {loadingUserEdit ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRoleName} onValueChange={setEditRoleName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allRoles.map((r) => (
                      <SelectItem key={r.role_name} value={r.role_name}>
                        {r.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Select the knowledge bases this user can read and query.
              </p>
              {availableKBs.length === 0 ? (
                <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
                  No assignable knowledge bases are available.
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-3 space-y-2">
                  {availableKBs.map((kb) => (
                    <div
                      key={kb.kb_id}
                      onClick={() => toggleKb(kb.kb_id)}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={selectedKbIds.includes(kb.kb_id)}
                        className="h-4 w-4 mt-0.5 accent-primary pointer-events-none"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{kb.name}</div>
                        <div className="text-xs text-muted-foreground break-words">
                          {kb.description || "No description"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogUser(null)} disabled={savingUserEdit}>
              Cancel
            </Button>
            <Button onClick={saveUserChanges} disabled={loadingUserEdit || savingUserEdit}>
              {savingUserEdit ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation dialog */}
      {(() => {
        const userToDelete = users.find((u) => u.user_id === confirmDeleteUserId);
        return (
          <Dialog open={!!confirmDeleteUserId} onOpenChange={(open) => { if (!open) setConfirmDeleteUserId(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-foreground">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{userToDelete?.email}</span>?
                </p>
                <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <Trash2 size={16} className="shrink-0 mt-0.5" />
                  <span>This will permanently delete the account. This action cannot be undone.</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDeleteUserId(null)} disabled={!!busyUserId}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!!busyUserId}
                  onClick={() => confirmDeleteUserId && deleteUser(confirmDeleteUserId)}
                >
                  {busyUserId ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Delete User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </Card>
  );
};

// ─── UserManagement (main) ────────────────────────────────────────────────────

const UserManagement: FC = () => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [allRoles, setAllRoles] = useState<RoleDetail[]>([]);
  const [availableKBs, setAvailableKBs] = useState<KnowledgeBaseSummary[]>([]);
  const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [selectedCreateKbIds, setSelectedCreateKbIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const loadRoles = useCallback(async () => {
    try {
      setAllRoles(await adminListRoles());
    } catch {
      // non-critical
    }
  }, []);

  const loadManageableKBs = useCallback(async () => {
    try {
      setAvailableKBs(await adminListKnowledgeBases());
    } catch {
      setAvailableKBs([]);
    }
  }, []);

  const loadMe = async () => {
    setLoadingMe(true);
    setMeError(null);
    try {
      setMe(await fetchMe());
    } catch (e: any) {
      setMe(null);
      setMeError(e?.message || "Failed to load current user");
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => {
    if (getAccessToken()) {
      void loadMe();
      void loadRoles();
      void loadManageableKBs();
    }
  }, []);

  const allowedRoles = useMemo(() => {
    if (!me) return [];
    if (!allRoles.length) return [];
    return creatableRoles(allRoles, me.roles);
  }, [me, allRoles]);

  // Keep selected role valid
  useEffect(() => {
    if (allowedRoles.length && !allowedRoles.find((r) => r.role_name === role)) {
      setRole(allowedRoles[allowedRoles.length - 1].role_name);
    }
  }, [allowedRoles]);

  const onSubmit = async () => {
    if (!me) { showToast("err", "Please load your account first."); return; }
    if (!email.trim() || !password.trim()) { showToast("err", "Email and password are required."); return; }
    if (password.length < 8) { showToast("err", "Password must be at least 8 characters."); return; }
    if (!allowedRoles.find((r) => r.role_name === role)) { showToast("err", "You don't have permission to create that role."); return; }

    setSubmitting(true);
    try {
      await createUser({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
        role,
        kb_ids: selectedCreateKbIds,
      });
      showToast("ok", `Created user ${email} (${role}).`);
      setEmail("");
      setFullName("");
      setPassword("");
      setSelectedCreateKbIds([]);
      setUserRefreshTrigger((n) => n + 1);
    } catch (e: any) {
      showToast("err", e?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCreateKb = (kbId: string) => {
    setSelectedCreateKbIds((prev) =>
      prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId]
    );
  };

  return (
    <div>
      {/* Role Management — before Create User */}
      {me && (
        <RoleManagement
        me={me}
        allRoles={allRoles}
        onRolesChange={() => { void loadRoles(); setUserRefreshTrigger((n) => n + 1); }}
      />
      )}

      {/* Create User */}
      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Create users with role-based permissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!getAccessToken() ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              <span>You're not signed in. Please login first.</span>
            </div>
          ) : meError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              <span>{meError}</span>
            </div>
          ) : me ? (
            <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Signed in as <span className="text-foreground">{me.email}</span> • roles:{" "}
              <span className="text-foreground">{me.roles.join(", ")}</span>
            </div>
          ) : loadingMe ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Loading account…
            </div>
          ) : null}

          <div className="grid gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="newuser@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name (optional)</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a password"
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={!me || !allowedRoles.length}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r.role_name} value={r.role_name}>
                      {r.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {me && allowedRoles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  You can create:{" "}
                  <span className="text-foreground">
                    {allowedRoles.map((r) => r.role_name).join(", ")}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Initial KB Access</Label>
              {availableKBs.length === 0 ? (
                <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
                  No knowledge bases available to assign.
                </div>
              ) : (
                <div className="rounded-lg border p-3 grid gap-2 max-h-56 overflow-y-auto">
                  {availableKBs.map((kb) => (
                    <div
                      key={kb.kb_id}
                      onClick={() => toggleCreateKb(kb.kb_id)}
                      className="flex items-start gap-2 cursor-pointer select-none rounded-md px-2 py-1.5 hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={selectedCreateKbIds.includes(kb.kb_id)}
                        className="h-4 w-4 mt-0.5 accent-primary pointer-events-none"
                      />
                      <div>
                        <div className="text-sm text-foreground">{kb.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {kb.description || "No description"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedCreateKbIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCreateKbIds.length} KB{selectedCreateKbIds.length === 1 ? "" : "s"} selected.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button onClick={onSubmit} disabled={!me || submitting || !allowedRoles.length}>
                {submitting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                Create user
              </Button>
            </div>

            <ToastAlert toast={toast} />
          </div>
        </CardContent>
      </Card>

      {/* User list table */}
      {me && (
        <UserGroupPanel
          me={me}
          allRoles={allRoles}
          availableKBs={availableKBs}
          refreshTrigger={userRefreshTrigger}
        />
      )}
    </div>
  );
};

export default UserManagement;
