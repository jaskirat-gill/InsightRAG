import { useState, useEffect } from 'react';
import { Database, MessageSquare } from 'lucide-react';
import Layout from './components/Layout';
import Login from './pages/Login';
import KnowledgeBases from './pages/KnowledgeBases';
import KBHealthDashboard from './pages/KBHealthDashboard';
import Chat from './pages/Chat';
import DocumentDetails from './pages/DocumentDetails';
import { authService, UserResponse } from './services/auth';
import { KnowledgeBase, Document } from './services/kb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Page = 'home' | 'kb' | 'kb-health' | 'doc' | 'chat';
type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'openwebui-theme';

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
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
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
    if (p !== 'kb-health' && p !== 'doc') {
      setSelectedKB(null);
      setSelectedDoc(null);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

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
      <div className="text-muted-foreground">No KB selected. Go back to Knowledge Bases.</div>
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
        <div className="text-muted-foreground">No document selected. Go back.</div>
      );
  } else if (currentPage === 'chat') {
    content = <Chat />;
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

const HomePage = ({
  user,
  onNavigate,
}: {
  user: UserResponse | null;
  onNavigate?: (page: string) => void;
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.full_name || user?.email || 'User'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is what's happening in your workspace today.
        </p>
        {user && user.roles.length > 0 && (
          <div className="mt-3 flex gap-2">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer transition-colors hover:border-primary/50"
          onClick={() => onNavigate?.('kb')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Knowledge Bases</CardTitle>
                <CardDescription>
                  Manage your document collections and cloud sync integrations.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-primary/50"
          onClick={() => onNavigate?.('chat')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Chat Interface</CardTitle>
                <CardDescription>
                  Query with OpenWebUI streaming and MCP-backed tools.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default App;
