import { FC, useState, useEffect } from 'react';
import { Database, Search, Loader2, Plus, AlertCircle } from 'lucide-react';
import { kbService, KnowledgeBase } from '../services/kb';

const KnowledgeBases: FC = () => {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadKBs();
  }, []);

  const loadKBs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kbService.listKnowledgeBases();
      setKbs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  // Filter KBs by search query
  const filteredKBs = kbs.filter(kb =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <AlertCircle size={18} />
          {error}
        </div>
        <div>
          <button
            onClick={loadKBs}
            className="text-sm text-secondary hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Knowledge Bases</h1>
          <p className="text-secondary text-lg">
            Manage your document collections and sync settings.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
          <Plus size={18} />
          Create New
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge bases..."
          className="w-full pl-12 pr-4 py-3 bg-surface/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all"
        />
      </div>

      {/* KB Cards Grid */}
      {filteredKBs.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Database size={28} className="text-secondary" />
          </div>
          <p className="text-secondary text-sm">
            {searchQuery ? 'No knowledge bases found' : 'No knowledge bases yet'}
          </p>
          {!searchQuery && (
            <p className="text-secondary/60 text-xs mt-1">
              Click "Create New" to get started
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredKBs.map((kb) => (
            <KBCard key={kb.kb_id} kb={kb} />
          ))}
        </div>
      )}
    </div>
  );
};

// KB Card Component
interface KBCardProps {
  kb: KnowledgeBase;
}

const KBCard: FC<KBCardProps> = ({ kb }) => {
  // Health status color
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Warning';
    return 'Critical';
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      syncing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      paused: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  return (
    <div className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/30 transition-all group cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-primary transition-colors">
            {kb.name}
          </h3>
          {kb.description && (
            <p className="text-sm text-secondary line-clamp-2">{kb.description}</p>
          )}
        </div>
      </div>

      {/* Health Badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1.5 ${getHealthColor(kb.health_score)}`}>
          <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
          <span className="text-xs font-medium">
            Health: {getHealthLabel(kb.health_score)}
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusBadge(kb.status)}`}>
          {kb.status}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-secondary uppercase tracking-wider mb-1">Documents</div>
          <div className="text-2xl font-bold text-white">
            {kb.total_documents.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary uppercase tracking-wider mb-1">Size</div>
          <div className="text-2xl font-bold text-white">
            {kbService.formatFileSize(kb.total_size_bytes)}
          </div>
        </div>
      </div>

      {/* Last Synced */}
      <div className="text-xs text-secondary mb-4">
        Last synced: {kbService.formatRelativeTime(kb.last_synced_at)}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-white/5">
        <button className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors">
          View
        </button>
        <button className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors">
          Configure
        </button>
        <button className="flex-1 px-3 py-2 bg-white/5 hover:bg-red-500/10 text-white hover:text-red-400 text-sm font-medium rounded-lg transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
};

export default KnowledgeBases;