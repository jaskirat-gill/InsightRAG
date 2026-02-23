import { useState, useEffect } from 'react';
import { BookOpen, BarChart3, Database } from 'lucide-react';
import Layout from './components/Layout';
import Login from './pages/Login';
import KnowledgeBases from './pages/KnowledgeBases';
import KBHealthDashboard from './pages/KBHealthDashboard';
import Chat from './pages/Chat';
import DocumentDetails from './pages/DocumentDetails';
import { authService, UserResponse } from './services/auth';
import { KnowledgeBase, Document } from './services/kb';

type Page = 'home' | 'kb' | 'kb-health' | 'doc' | 'chat';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

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
    setCurrentPage('home');
    setSelectedKB(null);
    setSelectedDoc(null);
  };

  const handleNavigate = (page: string) => {
    const p = page as Page;

    // if leaving KB area, clear selections
    if (p !== 'kb-health' && p !== 'doc') {
      setSelectedKB(null);
      setSelectedDoc(null);
    }

    // if leaving doc, clear doc
    if (p !== 'doc') setSelectedDoc(null);

    setCurrentPage(p);
  };

  const handleSelectKB = (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    setSelectedDoc(null);
    setCurrentPage('kb-health');
  };

  const handleSelectDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setCurrentPage('doc');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen text-white font-sans antialiased selection:bg-primary/30">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // ✅ Choose what to render — never blank
  let content: React.ReactNode = null;

  if (currentPage === 'home') {
    content = <HomePage user={user} onNavigate={handleNavigate} />;
  } else if (currentPage === 'kb') {
    content = <KnowledgeBases onSelectKB={handleSelectKB} />;
  } else if (currentPage === 'kb-health') {
    content = selectedKB ? (
      <KBHealthDashboard
        kb={selectedKB}
        onBack={() => {
          setCurrentPage('kb');
          setSelectedDoc(null);
        }}
        onSelectDocument={handleSelectDoc}
      />
    ) : (
      <div className="text-white">No KB selected. Go back to Knowledge Bases.</div>
    );
  } else if (currentPage === 'doc') {
      content =
        selectedKB && selectedDoc ? (
          <DocumentDetails
            kb={selectedKB}
            doc={selectedDoc}
            onBack={() => {
              setCurrentPage('kb-health');
              setSelectedDoc(null);
            }}
          />
        ) : (
          <div className="text-white">No document selected. Go back.</div>
        );
    } else if (currentPage === 'chat') {
      content = <Chat />;
    } else {
      content = (
        <div className="text-white">
          No page matched: <span className="text-primary">{String(currentPage)}</span>
        </div>
      );
    }

    return (
      <Layout onLogout={handleLogout} onNavigate={handleNavigate} currentPage={currentPage}>
        {content}
      </Layout>
    );
}

// Home Page Component
const HomePage = ({
  user,
  onNavigate,
}: {
  user: UserResponse | null;
  onNavigate?: (page: string) => void;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="col-span-full mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back, {user?.full_name || user?.email || 'User'}
        </h1>
        <p className="text-secondary text-lg">
          Here is what's happening in your workspace today.
        </p>

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

      <div
        onClick={() => onNavigate?.('kb')}
        className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer"
      >
        <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
          <Database size={20} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Knowledge Bases</h3>
        <p className="text-secondary text-sm">
          Manage your document collections and cloud sync integrations.
        </p>
      </div>


        <div
          onClick={() => onNavigate?.('chat')}
          className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer"
        >
        <div className="h-10 w-10 bg-accent/20 rounded-lg flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
          <BookOpen size={20} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Chat Interface</h3>
        <p className="text-secondary text-sm">
          Query with OpenWebUI streaming and MCP-backed tools.
        </p>
      </div>

      <div
        onClick={() => onNavigate?.('kb')}
        className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/50 transition-colors group cursor-pointer"
      >
        <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
          <BarChart3 size={20} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Analytics</h3>
        <p className="text-secondary text-sm">
          View retrieval metrics and document health scores — click a KB card to open.
        </p>
      </div>
    </div>
  );
};

export default App;