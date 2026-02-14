import { FC } from 'react';

interface LoginProps {
    onLogin: () => void;
}

const Login: FC<LoginProps> = ({ onLogin }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md p-8 bg-surface/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-secondary">Sign in to continue to your workspace</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary ml-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all hover:bg-background/80"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary ml-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all hover:bg-background/80"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-secondary">
                    Don't have an account? <a href="#" className="text-primary hover:underline">Create one</a>
                </div>
            </div>
        </div>
    );
};

export default Login;
