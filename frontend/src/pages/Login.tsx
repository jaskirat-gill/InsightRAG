import { FC, useState } from 'react';
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_35%),linear-gradient(160deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.45)_100%)] p-4">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[8%] top-[12%] h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute bottom-[10%] right-[12%] h-56 w-56 rounded-full bg-status-success/10 blur-3xl" />
            </div>

            <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_460px]">
                <Effect slide="right" blur className="hidden lg:block">
                    <div className="max-w-xl space-y-6">
                        <div className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
                            InsightRAG Workspace
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-5xl font-semibold tracking-tight text-foreground">
                                Search, sync, and explore your team knowledge with less friction.
                            </h1>
                            <p className="max-w-lg text-base leading-7 text-muted-foreground">
                                Connect storage plugins, monitor document health, and query your knowledge bases through a cleaner, faster workspace.
                            </p>
                        </div>
                        <Effects className="grid gap-3 sm:grid-cols-2">
                            <Effect
                                slide="up"
                                whileHover={{ y: -4, scale: 1.01 }}
                                className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-lg shadow-black/5 backdrop-blur"
                            >
                                <div className="text-sm font-medium text-foreground">Live sync controls</div>
                                <div className="mt-1 text-sm text-muted-foreground">Manage ingestion and refresh storage-backed KBs from one place.</div>
                            </Effect>
                            <Effect
                                slide="up"
                                delay={0.08}
                                whileHover={{ y: -4, scale: 1.01 }}
                                className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-lg shadow-black/5 backdrop-blur"
                            >
                                <div className="text-sm font-medium text-foreground">Chat with MCP tools</div>
                                <div className="mt-1 text-sm text-muted-foreground">Route prompts through OpenWebUI with model and MCP selection built in.</div>
                            </Effect>
                        </Effects>
                    </div>
                </Effect>

                <Effect slide="up" blur zoom className="w-full">
                <Card className="w-full max-w-md border-border/70 bg-background/90 shadow-2xl shadow-black/10 ring-1 ring-white/10 backdrop-blur">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-semibold text-foreground">
                        {isRegisterMode ? 'Create Account' : 'Welcome Back'}
                    </CardTitle>
                    <CardDescription>
                        {isRegisterMode 
                            ? 'Sign up to get started' 
                            : 'Sign in to continue to your workspace'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Effects className="space-y-6">
                    {error && (
                        <Effect slide="down">
                        <div className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                        </Effect>
                    )}

                    {registerSuccess && (
                        <Effect slide="down">
                        <Alert className="border-status-success/50 bg-status-success/10 text-status-success">
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
                            />
                            {isRegisterMode && (
                                <p className="text-xs text-muted-foreground">
                                    Minimum 8 characters
                                </p>
                            )}
                        </Effect>

                        <Effect slide="up" delay={0.12}>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full shadow-lg shadow-primary/20"
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

                    <Effect slide="up" delay={0.16} className="text-center text-sm text-muted-foreground">
                        {isRegisterMode ? (
                            <>
                                Already have an account?{' '}
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-normal"
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
                                    className="p-0 h-auto font-normal"
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
