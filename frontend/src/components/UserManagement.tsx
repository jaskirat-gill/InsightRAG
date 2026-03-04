import { FC, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";

type Role = "admin" | "developer" | "end_user";

/**
 * /api/v1/auth/me can vary by implementation.
 * This type is flexible and we normalize into roles[] below.
 */
type AuthMeRaw = {
  user_id?: string;
  id?: string;
  email?: string;

  // could be one of these depending on backend:
  role?: Role;
  roles?: Role[];
  user?: {
    user_id?: string;
    id?: string;
    email?: string;
    role?: Role;
    roles?: Role[];
  };

  // sometimes people return "permissions" etc, safe to ignore
  [k: string]: any;
};

type MeResponse = {
  user_id: string;
  email: string;
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

  // fallback: if backend doesn't return roles, keep it safe
  const safeRoles = roles.length ? roles : (["end_user"] as Role[]);

  if (!user_id || !email) {
    // still allow the UI to show something, but this helps debugging
    // you can remove this throw if you prefer silent fallback
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

const UserManagement: FC = () => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("end_user");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">User Management</h3>
          <p className="text-sm text-secondary mt-1">
            Create users with role-based permissions.
          </p>
        </div>

        <button
          onClick={loadMe}
          disabled={!isAuthed || loadingMe}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                     bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50"
        >
          {loadingMe ? <Loader2 className="animate-spin" size={16} /> : null}
          Load my account
        </button>
      </div>

      <div className="mt-4">
        {!isAuthed ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle size={16} className="mt-0.5" />
            <div>You’re not signed in. Please login first (missing access token).</div>
          </div>
        ) : meError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle size={16} className="mt-0.5" />
            <div>{meError}</div>
          </div>
        ) : me ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-secondary">
            Signed in as <span className="text-white">{me.email}</span> • roles:{" "}
            <span className="text-white">{me.roles.join(", ")}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-secondary">
            Click <span className="text-white">Load my account</span> to enable user creation.
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <div>
          <label className="text-xs text-secondary">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="newuser@example.com"
            className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white
                       placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div>
          <label className="text-xs text-secondary">Full name (optional)</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white
                       placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div>
          <label className="text-xs text-secondary">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Set a password"
            className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white
                       placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div>
          <label className="text-xs text-secondary">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={!me}
            className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white
                       focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {me ? (
            <p className="mt-2 text-xs text-secondary">
              You can create: <span className="text-white">{allowedRoles.join(", ")}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onSubmit}
            disabled={!me || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                       bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
            Create user
          </button>
        </div>

        {toast ? (
          <div
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
              toast.type === "ok"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                : "border-red-500/20 bg-red-500/10 text-red-200"
            }`}
          >
            {toast.type === "ok" ? (
              <CheckCircle2 size={16} className="mt-0.5" />
            ) : (
              <AlertCircle size={16} className="mt-0.5" />
            )}
            <div>{toast.msg}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserManagement;