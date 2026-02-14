import { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // If not authenticated, show Login page
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen text-white font-sans antialiased selection:bg-primary/30">
        <Login onLogin={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  // If authenticated, show Layout with main content
  return (
    <Layout onLogout={() => setIsAuthenticated(false)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards to demonstrate layout */}
        <div className="col-span-full mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, User</h1>
          <p className="text-secondary text-lg">Here is what's happening in your workspace today.</p>
        </div>

        <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <h3 className="text-xl font-semibold mb-2">Quick Action</h3>
          <p className="text-secondary text-sm">Start a new chat or resume where you left off.</p>
        </div>

        <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-10 w-10 bg-accent/20 rounded-lg flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
            📚
          </div>
          <h3 className="text-xl font-semibold mb-2">Knowledge Base</h3>
          <p className="text-secondary text-sm">Manage your documents and sources.</p>
        </div>

        <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
            📊
          </div>
          <h3 className="text-xl font-semibold mb-2">Analytics</h3>
          <p className="text-secondary text-sm">View usage stats and performance metrics.</p>
        </div>
      </div>
    </Layout>
  );
}

export default App;
