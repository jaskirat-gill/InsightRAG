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
type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'openwebui-theme';
const THEME_VARS: Record<Theme, Record<string, string>> = {
  dark: {
    '--color-primary': '59 130 246',
    '--color-secondary': '100 116 139',
    '--color-accent': '139 92 246',
    '--color-background': '15 23 42',
    '--color-surface': '30 41 59',
    '--color-foreground': '248 250 252',
    '--grid-dot-color': 'rgba(255, 255, 255, 0.1)',
    '--ring-track-stroke': 'rgba(148, 163, 184, 0.22)',
    '--ring-progress-stroke': 'rgba(34, 197, 94, 0.95)',
  },
  light: {
    '--color-primary': '30 41 59',
    '--color-secondary': '55 65 81',
    '--color-accent': '51 65 85',
    '--color-background': '255 255 255',
    '--color-surface': '255 255 255',
    '--color-foreground': '15 23 42',
    '--grid-dot-color': 'rgba(15, 23, 42, 0.06)',
    '--ring-track-stroke': 'rgba(71, 85, 105, 0.24)',
    '--ring-progress-stroke': 'rgba(22, 163, 74, 0.95)',
  },
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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

  useEffect(() => {
    const root = document.documentElement;
    const vars = THEME_VARS[theme];

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.classList.toggle('light', theme === 'light');
    root.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'light' ? '#ffffff' : '#0f172a';
    document.body.style.color = theme === 'light' ? '#0f172a' : '#f8fafc';
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
          color: theme === 'light' ? '#0f172a' : '#f8fafc',
        }}
      >
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="relative min-h-screen font-sans antialiased selection:bg-primary/30"
        style={{
          backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
          color: theme === 'light' ? '#0f172a' : '#f8fafc',
        }}
      >
        <Login onLogin={handleLogin} />
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn absolute top-4 left-4 z-20 px-2.5 py-1.5 rounded-lg border text-xs transition-colors"
          style={{
            backgroundColor: theme === 'light' ? 'rgba(241, 245, 249, 0.95)' : 'rgba(51, 65, 85, 0.75)',
            color: theme === 'light' ? '#0f172a' : '#f8fafc',
            borderColor: theme === 'light' ? 'rgba(148, 163, 184, 0.55)' : 'rgba(148, 163, 184, 0.35)',
          }}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
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
      <Layout
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentPage={currentPage}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
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
                className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full"
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
        <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
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
        <div className="h-10 w-10 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4 text-violet-500 group-hover:scale-110 transition-transform">
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
