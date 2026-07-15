export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface CrawlSettings {
  maxDepth: number;
  maxPages: number;
  chunkSize: number;
  chunkOverlap: number;
  provider: string; // openai, groq, gemini
  modelName?: string;
  temperature: number;
  topK: number;
}

export interface CrawlStatus {
  task_id: string;
  status: 'idle' | 'checking' | 'crawling' | 'cleaning' | 'building_db' | 'completed' | 'failed';
  pages_discovered: number;
  pages_indexed_count: number;
  pages_indexed: string[];
  current_action: string;
  errors: string[];
  logs: string[];
  chunks_count: number;
  embeddings_count: number;
  processing_time_sec: number;
  start_url: string;
}

export interface SavedWebsite {
  task_id: string;
  url: string;
  status: string;
  pages_count: number;
  chunks_count: number;
  processing_time: number;
}

export interface SourceCitation {
  url: string;
  title: string;
  snippet: string;
}

export interface CompanyDetails {
  name: string;
  industry: string;
  mission: string;
  description: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ContactDetails {
  emails: string[];
  phones: string[];
  address: string;
  social_links: string[];
}

export interface SitemapNode {
  name: string;
  url: string;
  children: SitemapNode[];
}

export interface AnalyticsData {
  stats: {
    total_pages: number;
    total_chunks: number;
    total_characters: number;
    crawl_depth: number;
    processing_time: number;
  };
  sitemap: SitemapNode;
  analysis: {
    summary: string;
    company_details: CompanyDetails;
    key_insights: string[];
    faqs: FAQ[];
    contact_details: ContactDetails;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    if (err instanceof TypeError || (err.message && err.message.includes('Failed to fetch'))) {
      throw new Error("Connection error: The SiteMind backend server is offline or unreachable. Please ensure the backend server is running on http://127.0.0.1:8000.");
    }
    throw err;
  }
}

export const api = {
  async startCrawl(url: string, settings: CrawlSettings, apiKey?: string): Promise<{ task_id: string; status: string; message: string }> {
    const res = await safeFetch(`${API_BASE_URL}/crawl/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        max_depth: settings.maxDepth,
        max_pages: settings.maxPages,
        chunk_size: settings.chunkSize,
        chunk_overlap: settings.chunkOverlap,
        embedding_provider: 'local',
        api_key: apiKey || undefined,
      }),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start crawler' }));
      throw new Error(err.detail || 'Failed to start crawler');
    }
    
    return res.json();
  },

  async getCrawlStatus(taskId: string): Promise<CrawlStatus> {
    const res = await safeFetch(`${API_BASE_URL}/crawl/status/${taskId}`);
    if (!res.ok) {
      throw new Error('Failed to fetch status');
    }
    return res.json();
  },

  async listWebsites(): Promise<SavedWebsite[]> {
    const res = await safeFetch(`${API_BASE_URL}/crawl/list`);
    if (!res.ok) {
      throw new Error('Failed to list websites');
    }
    return res.json();
  },

  async deleteWebsite(taskId: string): Promise<{ status: string; message: string }> {
    const res = await safeFetch(`${API_BASE_URL}/crawl/${taskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete website' }));
      throw new Error(err.detail || 'Failed to delete website');
    }
    return res.json();
  },

  async getAnalytics(taskId: string, provider: string, apiKey?: string): Promise<AnalyticsData> {
    const url = new URL(`${API_BASE_URL}/analytics/${taskId}`);
    url.searchParams.append('provider', provider);
    if (apiKey) {
      url.searchParams.append('api_key', apiKey);
    }
    
    const res = await safeFetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to retrieve analytics' }));
      throw new Error(err.detail || 'Failed to retrieve analytics');
    }
    return res.json();
  },

  async streamChat(
    taskId: string,
    message: string,
    history: ChatMessage[],
    settings: CrawlSettings,
    apiKey: string | undefined,
    onSources: (sources: SourceCitation[]) => void,
    onToken: (token: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): Promise<void> {
    try {
      const response = await safeFetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          message,
          history: history.map(h => ({ role: h.role, content: h.content })),
          provider: settings.provider,
          model_name: settings.modelName || undefined,
          api_key: apiKey || undefined,
          temperature: settings.temperature,
          top_k: settings.topK,
        }),
      });

      if (!response.ok) {
        const errText = await response.json().catch(() => ({ detail: 'Unknown network error' }));
        throw new Error(errText.detail || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No readable stream available in response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE parses by double newlines or single newlines depending on structure
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim();
            try {
              if (currentEvent === 'sources') {
                const parsedSources = JSON.parse(dataStr);
                onSources(parsedSources);
              } else if (currentEvent === 'token') {
                const parsedToken = JSON.parse(dataStr);
                onToken(parsedToken.text);
              } else if (currentEvent === 'error') {
                const parsedErr = JSON.parse(dataStr);
                onError(parsedErr.message);
              } else if (currentEvent === 'end') {
                onEnd();
              }
            } catch (jsonErr) {
              console.error('Error parsing SSE data:', jsonErr, dataStr);
            }
          }
        }
      }
      
      // Complete any remaining buffer processing
      if (buffer.trim().startsWith('event: end') || currentEvent === 'end') {
        onEnd();
      }
    } catch (err: any) {
      onError(err.message || 'Streaming failed');
    }
  }
};
export default api;
