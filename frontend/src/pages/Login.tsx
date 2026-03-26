import { FC, useMemo, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Effect, Effects } from '@/components/ui/animate';

interface LoginProps {
    onLogin: () => void;
}

const Login: FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [fullName, setFullName] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [pointer, setPointer] = useState({ x: 72, y: 38, active: false });

    const heroTitle = useMemo(
        () =>
            isRegisterMode
                ? 'Create an account to manage your workspace with less friction.'
                : 'Search and sync your team knowledge in one calm workspace.',
        [isRegisterMode],
    );

    const heroDescription = useMemo(
        () =>
            isRegisterMode
                ? 'Connect storage plugins, monitor ingestion, and start querying knowledge bases from a simpler operational UI.'
                : 'Monitor ingestion, review document health, and query knowledge bases from a cleaner operational surface.',
        [isRegisterMode],
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await authService.login({ email, password });
            onLogin();
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await authService.register({ 
                email, 
                password, 
                full_name: fullName || undefined 
            });
            setRegisterSuccess(true);
            setError(null);
            
            setTimeout(() => {
                setIsRegisterMode(false);
                setRegisterSuccess(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f5] p-4 text-slate-950"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setPointer({ x, y, active: true });
            }}
            onMouseLeave={() => setPointer((prev) => ({ ...prev, active: false }))}
            style={
                {
                    backgroundImage: `
                      radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(148,163,184,${pointer.active ? 0.16 : 0.08}) 0%, rgba(148,163,184,0.05) 18%, rgba(148,163,184,0) 36%),
                      radial-gradient(circle at 14% 18%, rgba(203,213,225,0.18) 0%, rgba(203,213,225,0) 28%),
                      radial-gradient(circle at 86% 82%, rgba(226,232,240,0.28) 0%, rgba(226,232,240,0) 24%),
                      linear-gradient(180deg, #fafaf9 0%, #f3f4f6 100%)
                    `,
                } as React.CSSProperties
            }
        >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[11%] top-[16%] h-40 w-40 rounded-full bg-slate-200/45 blur-3xl" />
                <div className="absolute bottom-[12%] right-[10%] h-48 w-48 rounded-full bg-zinc-200/55 blur-3xl" />
            </div>

            <div className="relative grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_460px]">
                <Effect slide="right" blur className="hidden lg:block">
                    <div className="max-w-2xl space-y-8">
                        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-slate-500 shadow-sm backdrop-blur">
                            InsightRAG Workspace
                        </div>
                        <div className="space-y-5">
                            <h1 className="max-w-[12ch] text-6xl font-semibold tracking-[-0.06em] text-slate-950">
                                {heroTitle}
                            </h1>
                            <p className="max-w-xl text-lg leading-8 text-slate-500">
                                {heroDescription}
                            </p>
                        </div>
                        <Effects className="grid gap-4 sm:grid-cols-2">
                            <Effect
                                slide="up"
                                whileHover={{ y: -3 }}
                                className="rounded-3xl border border-slate-200/55 bg-white/70 p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.14)] backdrop-blur"
                            >
                                <div className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Live sync controls</div>
                                <div className="mt-2 text-sm leading-7 text-slate-500">Refresh storage-backed knowledge bases from one focused control surface.</div>
                            </Effect>
                            <Effect
                                slide="up"
                                delay={0.08}
                                whileHover={{ y: -3 }}
                                className="rounded-3xl border border-slate-200/55 bg-white/70 p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.14)] backdrop-blur"
                            >
                                <div className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Chat with MCP tools</div>
                                <div className="mt-2 text-sm leading-7 text-slate-500">Route prompts through OpenWebUI with model and MCP selection built in.</div>
                            </Effect>
                        </Effects>
                    </div>
                </Effect>

                <Effect slide="up" blur zoom className="w-full">
                <Card className="w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_28px_90px_-38px_rgba(30,41,59,0.22)]">
                <CardHeader className="space-y-2 pb-4 text-center">
                    <CardTitle className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">
                        {isRegisterMode ? 'Create Account' : 'Welcome Back'}
                    </CardTitle>
                    <CardDescription className="text-base leading-7 text-slate-500">
                        {isRegisterMode 
                            ? 'Sign up to get started' 
                            : 'Sign in to continue to your workspace'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Effects className="space-y-6">
                    {error && (
                        <Effect slide="down">
                        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                        </Effect>
                    )}

                    {registerSuccess && (
                        <Effect slide="down">
                        <Alert className="rounded-2xl border-status-success/30 bg-emerald-50 text-status-success">
                            <AlertDescription>
                                Account created successfully! Redirecting to login...
                            </AlertDescription>
                        </Alert>
                        </Effect>
                    )}

                    <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
                        {isRegisterMode && (
                            <Effect slide="up" className="space-y-2">
                                <Label htmlFor="fullName" className="text-muted-foreground">
                                    Full Name (Optional)
                                </Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 px-4 shadow-none focus-visible:bg-white focus-visible:ring-sky-400/60"
                                />
                            </Effect>
                        )}

                        <Effect slide="up" delay={0.04} className="space-y-2">
                            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@example.com"
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 px-4 shadow-none focus-visible:bg-white focus-visible:ring-sky-400/60"
                            />
                        </Effect>

                        <Effect slide="up" delay={0.08} className="space-y-2">
                            <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="••••••••"
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 px-4 shadow-none focus-visible:bg-white focus-visible:ring-sky-400/60"
                            />
                            {isRegisterMode && (
                                <p className="text-xs text-slate-400">
                                    Minimum 8 characters
                                </p>
                            )}
                        </Effect>

                        <Effect slide="up" delay={0.12}>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 w-full rounded-2xl bg-slate-950 text-white shadow-[0_18px_36px_-22px_rgba(15,23,42,0.6)] transition-colors hover:bg-sky-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
                                </>
                            ) : (
                                isRegisterMode ? 'Create Account' : 'Sign In'
                            )}
                        </Button>
                        </Effect>
                    </form>

                    <Effect slide="up" delay={0.16} className="text-center text-sm text-slate-500">
                        {isRegisterMode ? (
                            <>
                                Already have an account?{' '}
                                <Button
                                    variant="link"
                                    className="h-auto p-0 font-medium text-slate-900 hover:text-sky-700"
                                    onClick={() => {
                                        setIsRegisterMode(false);
                                        setError(null);
                                        setRegisterSuccess(false);
                                    }}
                                >
                                    Sign in
                                </Button>
                            </>
                        ) : (
                            <>
                                Don't have an account?{' '}
                                <Button
                                    variant="link"
                                    className="h-auto p-0 font-medium text-slate-900 hover:text-sky-700"
                                    onClick={() => {
                                        setIsRegisterMode(true);
                                        setError(null);
                                    }}
                                >
                                    Create one
                                </Button>
                            </>
                        )}
                    </Effect>
                    </Effects>
                </CardContent>
            </Card>
            </Effect>
            </div>
        </div>
    );
};

export default Login;
