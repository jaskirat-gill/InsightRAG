import { FC, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

type Role = "admin" | "developer" | "end_user";

type AuthMeRaw = {
  user_id?: string;
  id?: string;
  email?: string;

  role?: Role;
  roles?: Role[];
  user?: {
    user_id?: string;
    id?: string;
    email?: string;
    role?: Role;
    roles?: Role[];
  };

  [k: string]: any;
};

type MeResponse = {
  user_id: string;
  email: string;
  roles: Role[];
};

type AdminUserRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  roles: Role[];
};

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated. Please sign in again.");

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.detail || body?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}

function normalizeMe(raw: AuthMeRaw): MeResponse {
  const u = raw.user ?? raw;

  const user_id = (u.user_id ?? u.id ?? "") as string;
  const email = (u.email ?? "") as string;

  const rolesFromArray = Array.isArray(u.roles) ? (u.roles as Role[]) : [];
  const rolesFromSingle = u.role ? ([u.role] as Role[]) : [];

  const roles = [...new Set([...rolesFromArray, ...rolesFromSingle])];
  const safeRoles = roles.length ? roles : (["end_user"] as Role[]);

  if (!user_id || !email) {
    throw new Error("auth/me response missing user_id or email");
  }

  return { user_id, email, roles: safeRoles };
}

async function fetchMe(): Promise<MeResponse> {
  const raw = await apiFetch<AuthMeRaw>("/api/v1/auth/me");
  return normalizeMe(raw);
}

async function createUser(payload: {
  email: string;
  password: string;
  full_name?: string;
  role: Role;
}): Promise<any> {
  return apiFetch("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function allowedRolesForCreator(creatorRoles: Role[]): Role[] {
  if (creatorRoles.includes("admin")) return ["admin", "developer", "end_user"];
  if (creatorRoles.includes("developer")) return ["developer", "end_user"];
  return ["end_user"];
}

async function adminListUsers(): Promise<AdminUserRow[]> {
  return apiFetch<AdminUserRow[]>("/api/v1/admin/users");
}

async function adminSetUserRole(userId: string, roleName: Role): Promise<AdminUserRow> {
  return apiFetch<AdminUserRow>(`/api/v1/admin/users/${userId}/role`, {
    method: "POST",
    body: JSON.stringify({ role_name: roleName }),
  });
}

function primaryRole(u: AdminUserRow): Role {
  const roles = Array.isArray(u.roles) ? u.roles : [];
  return (roles[0] ?? "end_user") as Role;
}

const ROLE_OPTIONS: { key: Role; label: string }[] = [
  { key: "end_user", label: "End User" },
  { key: "developer", label: "Developer" },
  { key: "admin", label: "Admin" },
];

const UserGroupPanel: FC<{ me: MeResponse }> = ({ me }) => {
  const isAdmin = me.roles.includes("admin");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminListUsers();
      setUsers(res ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = (u.full_name ?? "").toLowerCase();
      return email.includes(q) || name.includes(q);
    });
  }, [users, query]);

  const setRole = async (userId: string, roleName: Role) => {
    setBusyUserId(userId);
    try {
      const updated = await adminSetUserRole(userId, roleName);
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? updated : u)));
      showToast("ok", "Role updated");
    } catch (e: any) {
      showToast("err", e?.message || "Failed to update role");
    } finally {
      setBusyUserId(null);
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

        {err ? (
          <Alert variant="destructive">
            <AlertCircle size={16} />
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">User</TableHead>
                  <TableHead className="w-[25%]">Current Role</TableHead>
                  <TableHead className="w-[35%]">Set Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((u) => {
                    const cur = primaryRole(u);
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
                          {isSelf ? (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              This is you
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={cur}
                              onValueChange={(v) => setRole(u.user_id, v as Role)}
                              disabled={busy}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((r) => (
                                  <SelectItem key={r.key} value={r.key}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {busy ? (
                              <Loader2 size={18} className="animate-spin text-primary" />
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No users match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {toast ? (
          <Alert
            variant={toast.type === "ok" ? "default" : "destructive"}
            className={
              toast.type === "ok"
                ? "border-status-success/50 bg-status-success/10 text-status-success"
                : undefined
            }
          >
            {toast.type === "ok" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <AlertDescription>{toast.msg}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
};

const UserManagement: FC = () => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("end_user");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const allowedRoles = useMemo(() => {
    if (!me) return ["end_user"] as Role[];
    return allowedRolesForCreator(me.roles);
  }, [me]);

  const loadMe = async () => {
    setLoadingMe(true);
    setMeError(null);
    try {
      const u = await fetchMe();
      setMe(u);

      const allowed = allowedRolesForCreator(u.roles);
      if (!allowed.includes(role)) setRole(allowed[allowed.length - 1]);
    } catch (e: any) {
      setMe(null);
      setMeError(e?.message || "Failed to load current user");
    } finally {
      setLoadingMe(false);
    }
  };

  const onSubmit = async () => {
    setToast(null);

    if (!me) {
      setToast({ type: "err", msg: "Please load your account first." });
      return;
    }

    if (!email.trim() || !password.trim()) {
      setToast({ type: "err", msg: "Email and password are required." });
      return;
    }

    if (!allowedRoles.includes(role)) {
      setToast({ type: "err", msg: "You don't have permission to create that role." });
      return;
    }

    setSubmitting(true);
    try {
      await createUser({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
        role,
      });

      setToast({ type: "ok", msg: `Created user ${email} (${role}).` });
      setEmail("");
      setFullName("");
      setPassword("");
      setRole(allowedRoles[allowedRoles.length - 1]);
    } catch (e: any) {
      setToast({ type: "err", msg: e?.message || "Failed to create user" });
    } finally {
      setSubmitting(false);
    }
  };

  const isAuthed = !!getAccessToken();

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Create User</CardTitle>
            <CardDescription>
              Create users with role-based permissions.
            </CardDescription>
          </div>
          <Button
            onClick={loadMe}
            disabled={!isAuthed || loadingMe}
            variant="outline"
            size="sm"
          >
            {loadingMe ? <Loader2 className="animate-spin" size={16} /> : null}
            Load my account
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthed ? (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertDescription>
                You're not signed in. Please login first (missing access token).
              </AlertDescription>
            </Alert>
          ) : meError ? (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertDescription>{meError}</AlertDescription>
            </Alert>
          ) : me ? (
            <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Signed in as <span className="text-foreground">{me.email}</span> • roles:{" "}
              <span className="text-foreground">{me.roles.join(", ")}</span>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Click <span className="text-foreground">Load my account</span> to enable user
              creation.
            </div>
          )}

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
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={!me}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_OPTIONS.find((o) => o.key === r)?.label ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {me ? (
                <p className="text-xs text-muted-foreground">
                  You can create: <span className="text-foreground">{allowedRoles.join(", ")}</span>
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button onClick={onSubmit} disabled={!me || submitting}>
                {submitting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                Create user
              </Button>
            </div>

            {toast ? (
              <Alert
                variant={toast.type === "ok" ? "default" : "destructive"}
                className={
                  toast.type === "ok"
                    ? "border-status-success/50 bg-status-success/10 text-status-success"
                    : undefined
                }
              >
                {toast.type === "ok" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <AlertDescription>{toast.msg}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {me ? <UserGroupPanel me={me} /> : null}
    </div>
  );
};

export default UserManagement;
