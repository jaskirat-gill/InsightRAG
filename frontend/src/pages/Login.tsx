import { FC, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth';

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
            
            // Switch to login mode after 2 seconds
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
            <div className="w-full max-w-md p-8 bg-surface/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                        {isRegisterMode ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-secondary">
                        {isRegisterMode 
                            ? 'Sign up to get started' 
                            : 'Sign in to continue to your workspace'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {registerSuccess && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-sm text-green-400">
                            ✓ Account created successfully! Redirecting to login...
                        </p>
                    </div>
                )}

                <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
                    {/* Full Name (Register only) */}
                    {isRegisterMode && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-secondary ml-1">
                                Full Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all hover:bg-background/80"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all hover:bg-background/80"
                            placeholder="name@example.com"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full px-4 py-3 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all hover:bg-background/80"
                            placeholder="••••••••"
                        />
                        {isRegisterMode && (
                            <p className="text-xs text-secondary/60 ml-1">
                                Minimum 8 characters
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
                            </>
                        ) : (
                            isRegisterMode ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                {/* Toggle Register/Login */}
                <div className="mt-6 text-center text-sm text-secondary">
                    {isRegisterMode ? (
                        <>
                            Already have an account?{' '}
                            <button
                                onClick={() => {
                                    setIsRegisterMode(false);
                                    setError(null);
                                    setRegisterSuccess(false);
                                }}
                                className="text-primary hover:underline"
                            >
                                Sign in
                            </button>
                        </>
                    ) : (
                        <>
                            Don't have an account?{' '}
                            <button
                                onClick={() => {
                                    setIsRegisterMode(true);
                                    setError(null);
                                }}
                                className="text-primary hover:underline"
                            >
                                Create one
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;