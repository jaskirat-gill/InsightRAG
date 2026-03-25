import { FC, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
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
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {registerSuccess && (
                        <Alert className="border-status-success/50 bg-status-success/10 text-status-success">
                            <AlertDescription>
                                Account created successfully! Redirecting to login...
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
                        {isRegisterMode && (
                            <div className="space-y-2">
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
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
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
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11"
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
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
