import { authService } from './auth';
import { API_URL } from '../config';

export interface KnowledgeBase {
  kb_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  storage_provider: string;
  storage_config?: Record<string, any>;
  processing_strategy: string;
  status: string;
  health_score: number;
  total_documents: number;
  total_size_bytes: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  document_id: string;
  kb_id: string;
  source_path: string;
  document_type: string | null;
  title: string | null;
  file_size_bytes: number | null;
  processing_status: string;
  total_chunks: number;
  health_score: number;
  retrieval_count: number;
  last_retrieved_at: string | null;
  avg_chunk_size_tokens?: number | null;
  avg_chunk_size_chars?: number | null;
  created_at: string;
  uploaded_at: string | null;
  processing_strategy?: string | null;
}

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  kb_id: string;
  chunk_index: number;
  chunk_text: string;
  chunk_tokens: number | null;
  vector_id: string | null;
  section_title: string | null;
  page_number: number | null;
  retrieval_count: number;
  last_retrieved_at: string | null;
  created_at: string;
}

export interface DocumentRetrievalDay {
  date: string;
  retrieval_count: number;
}

export interface DocumentRetrievalHistory {
  days: number;
  series: DocumentRetrievalDay[];
  total_retrievals: number;
  peak_day: string | null;
  peak_count: number;
  avg_daily_retrievals: number;
  trend_pct: number;
  last7_total: number;
  prev7_total: number;
}

export interface KBHealthStats {
  total_docs: number;
  completed_docs: number;
  failed_docs: number;
  avg_health_score: number;
  total_chunks: number;
  total_retrievals: number;
}

export interface ReassignItem {
  document_id: string;
  to_kb_id: string;
}

export interface ReassignResult {
  reassigned: number;
}

export interface CreateKBRequest {
  name: string;
  description?: string;
  storage_provider?: string;
  storage_config?: Record<string, any>;
  processing_strategy?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface DocumentStrategyOption {
  key: string;
  label: string;
  description: string;
}

export interface DocumentStrategyDetails {
  current_strategy: string | null;
  current_strategy_label: string;
  options: DocumentStrategyOption[];
}

export interface UpdateKBRequest {
  name?: string;
  description?: string;
  status?: string;
  processing_strategy?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  storage_config?: Record<string, any>;
}

class KBService {
  private readonly API_URL = API_URL;

    // Get a presigned S3 URL for a document (View in S3)
    async getDocumentS3Url(kbId: string, docId: string): Promise<{ url: string }> {
      const response = await fetch(
        `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}/s3-url`,
        {
          headers: {
            ...authService.getAuthHeader(),
          },
        },
      );
  
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to fetch S3 URL');
      }
  
      return await response.json();
    }
  
    // Delete a single document (S3 + SQL + Qdrant handled by backend)
    async deleteDocument(kbId: string, docId: string): Promise<void> {
      const response = await fetch(
        `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}`,
        {
          method: 'DELETE',
          headers: {
            ...authService.getAuthHeader(),
          },
        },
      );
  
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to delete document');
      }
    }

  // List all KBs
  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch knowledge bases');
    }

    return await response.json();
  }

  // Get single KB
  async getKnowledgeBase(kbId: string): Promise<KnowledgeBase> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases/${kbId}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch knowledge base');
    }

    return await response.json();
  }

  // List documents in KB
  async listDocuments(kbId: string): Promise<Document[]> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    return await response.json();
  }

  // Get one document details
  async getDocumentDetails(kbId: string, docId: string): Promise<Document> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}`,
      {
        headers: {
          ...authService.getAuthHeader(),
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch document details');
    }

    return await response.json();
  }

  // List chunks for one document
  async listDocumentChunks(kbId: string, docId: string): Promise<DocumentChunk[]> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}/chunks`,
      {
        headers: {
          ...authService.getAuthHeader(),
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch document chunks');
    }

    return await response.json();
  }

  async getDocumentStrategy(kbId: string, docId: string): Promise<DocumentStrategyDetails> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}/strategy`,
      {
        headers: {
          ...authService.getAuthHeader(),
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch document strategy');
    }

    return await response.json();
  }

  async overrideDocumentStrategy(
    kbId: string,
    docId: string,
    strategy: string,
  ): Promise<{ message: string; strategy: string; status: string }> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}/strategy/override`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({ strategy }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to override strategy');
    }

    return await response.json();
  }

  async getDocumentViewUrl(
    kbId: string,
    docId: string,
  ): Promise<{ url: string; page_count?: number | null }> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}/view-url`,
      {
        headers: {
          ...authService.getAuthHeader(),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to fetch document view URL');
    }

    return await response.json();
  }

  // Get per-document retrieval history and summary metrics
  async getDocumentRetrievalHistory(
    kbId: string,
    docId: string,
    days: number = 30,
  ): Promise<DocumentRetrievalHistory> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${kbId}/documents/${docId}/retrieval-history?days=${days}`,
      {
        headers: {
          ...authService.getAuthHeader(),
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch document retrieval history');
    }

    return await response.json();
  }

  // Reassign documents to different KBs
  async reassignDocuments(fromKbId: string, items: ReassignItem[]): Promise<ReassignResult> {
    const response = await fetch(
      `${this.API_URL}/api/v1/knowledge-bases/${fromKbId}/reassign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify(items),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to reassign documents');
    }

    return await response.json();
  }

  // Trigger manual sync for all active plugins
  async triggerSync(): Promise<{ message: string }> {
    const response = await fetch(`${this.API_URL}/sync`, {
      method: 'POST',
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to trigger sync');
    }

    return await response.json();
  }

  // Reset sync state (synced_file cache and optional download cache)
  async resetSyncState(pluginId?: number | null): Promise<{ message: string; deleted_rows: number }> {
    const response = await fetch(`${this.API_URL}/sync/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify({
        plugin_id: pluginId ?? null,
        clear_download_cache: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to reset sync state');
    }

    return await response.json();
  }

  // Get KB health stats (documents + chunk retrieval metrics)
  async getKBHealth(kbId: string): Promise<KBHealthStats> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases/${kbId}/health`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch KB health');
    }

    return await response.json();
  }

  // Delete KB (removes from SQL + Qdrant)
  async deleteKnowledgeBase(kbId: string): Promise<void> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases/${kbId}`, {
      method: 'DELETE',
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to delete knowledge base');
    }
  }

  // Create new KB
  async createKnowledgeBase(data: CreateKBRequest): Promise<KnowledgeBase> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create knowledge base');
    }

    return await response.json();
  }

  // Update KB configuration
  async updateKnowledgeBase(kbId: string, data: UpdateKBRequest): Promise<KnowledgeBase> {
    const response = await fetch(`${this.API_URL}/api/v1/knowledge-bases/${kbId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to update knowledge base');
    }

    return await response.json();
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Format relative time
  formatRelativeTime(dateString: string | null): string {
    if (!dateString) return 'Never';
    const normalizeDate = (raw: string): Date => {
      // Handle PostgreSQL naive timestamps consistently as UTC.
      const hasExplicitTz = /(?:Z|[+-]\d{2}:\d{2})$/.test(raw);
      if (hasExplicitTz) return new Date(raw);

      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) {
        return new Date(raw.replace(' ', 'T') + 'Z');
      }
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
        return new Date(raw + 'Z');
      }
      return new Date(raw);
    };

    const date = normalizeDate(dateString);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds >= 0) {
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
      return date.toLocaleDateString();
    }

    const future = Math.abs(seconds);
    if (future < 60) return 'Just now';
    if (future < 3600) return `in ${Math.floor(future / 60)} minutes`;
    if (future < 86400) return `in ${Math.floor(future / 3600)} hours`;
    if (future < 604800) return `in ${Math.floor(future / 86400)} days`;
    return date.toLocaleDateString();
  }
}

export const kbService = new KBService();
