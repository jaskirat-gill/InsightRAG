import { useState, useEffect } from 'react';
import { Zap, BookOpen, BarChart3 } from 'lucide-react';
import Layout from './components/Layout';
import Login from './pages/Login';
import { authService, UserResponse } from './services/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to get user data:', error);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If not authenticated, show Login page
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen text-white font-sans antialiased selection:bg-primary/30">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // If authenticated, show Layout with main content
  return (
    <Layout onLogout={handleLogout}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Welcome message with user data */}
        <div className="col-span-full mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.email || 'User'}
          </h1>
          <p className="text-secondary text-lg">
            Here is what's happening in your workspace today.
          </p>
          
          {/* Show user roles */}
          {user && user.roles.length > 0 && (
            <div className="mt-3 flex gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
            <Zap size={20} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Placeholder 1</h3>
          <p className="text-secondary text-sm">lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.</p>
        </div>

        <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-10 w-10 bg-accent/20 rounded-lg flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
            <BookOpen size={20} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Placeholder 2</h3>
          <p className="text-secondary text-sm">lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.</p>
        </div>

        <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
            <BarChart3 size={20} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Placeholder 3</h3>
          <p className="text-secondary text-sm">lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quod.</p>
        </div>
      </div>
    </Layout>
  );
}

export default App;