import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  Language,
  AutoAwesome,
  Settings,
  Message,
  Schema as Sitemap,
  Dashboard as DashboardIcon,
  Insights,
  KeyboardArrowRight,
  TrendingUp,
  Fingerprint,
  Security
} from '@mui/icons-material';
import confetti from 'canvas-confetti';

import getTheme from './theme';
import Sidebar from './components/Sidebar';
import SettingsPanel, { DEFAULT_GEMINI_MODEL, DEFAULT_SETTINGS } from './features/Settings';
import CrawlProgress from './features/CrawlProgress';
import ChatArea from './features/ChatArea';
import Dashboard from './features/Dashboard';
import SitemapVisualizer from './features/SitemapVisualizer';
import AnalyticsPanel from './features/AnalyticsPanel';
import api from './services/api';
import type { CrawlSettings, CrawlStatus, SavedWebsite, AnalyticsData, ChatMessage } from './services/api';

export const App: React.FC = () => {
  const normalizeSettings = (value: CrawlSettings): CrawlSettings => {
    if (value.provider === 'gemini' && value.modelName?.startsWith('gemini-1.5-')) {
      return { ...value, modelName: DEFAULT_GEMINI_MODEL };
    }
    return value;
  };

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sitemind_theme') !== 'light';
  });
  
  // Settings & API Keys state
  const [settings, setSettings] = useState<CrawlSettings>(() => {
    const saved = localStorage.getItem('sitemind_settings');
    return saved ? normalizeSettings(JSON.parse(saved)) : DEFAULT_SETTINGS;
  });
  
  const [apiKeys, setApiKeys] = useState<{ openai?: string; groq?: string; gemini?: string }>(() => {
    const saved = localStorage.getItem('sitemind_api_keys');
    return saved ? JSON.parse(saved) : {};
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('sitemind_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Application workflow states
  const [websites, setWebsites] = useState<SavedWebsite[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Chat, 1: Analytics, 2: Sitemap, 3: Dashboard
  
  const [urlInput, setUrlInput] = useState('');
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pollingRef = useRef<number | null>(null);
  const activeTaskRef = useRef<string | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('sitemind_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('sitemind_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('sitemind_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('sitemind_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Load crawled websites lists
  const fetchWebsites = async () => {
    try {
      const list = await api.listWebsites();
      setWebsites(list);
    } catch (err) {
      console.error("Failed to load websites list:", err);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  // Polling hook to query crawl status
  const startPollingStatus = (taskId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    activeTaskRef.current = taskId;
    
    pollingRef.current = window.setInterval(async () => {
      try {
        const status = await api.getCrawlStatus(taskId);
        setCrawlStatus(status);
        
        if (status.status === 'completed') {
          stopPollingStatus();
          // Play confetti!
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          
          // Fetch analytics, reload listings
          const apiKey = apiKeys[settings.provider as keyof typeof apiKeys];
          const analytics = await api.getAnalytics(taskId, settings.provider, apiKey);
          setAnalyticsData(analytics);
          
          await fetchWebsites();
          setMessages([]); // Clear chat for new crawl
          setActiveTab(0); // Jump directly to Chat area
        } else if (status.status === 'failed') {
          stopPollingStatus();
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        stopPollingStatus();
        setErrorText(err.message || "Failed to retrieve status updates.");
      }
    }, 1500);
  };

  const stopPollingStatus = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPollingStatus();
  }, []);

  // Initiate crawler workflow
  const handleStartIndexing = async () => {
    setErrorText(null);
    setCrawlStatus(null);
    setAnalyticsData(null);
    setMessages([]);
    
    let url = urlInput.trim();
    if (!url) {
      setErrorText("Website URL is required.");
      return;
    }
    
    // Quick URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const apiKey = apiKeys[settings.provider as keyof typeof apiKeys];
      const res = await api.startCrawl(url, settings, apiKey);
      setActiveTaskId(res.task_id);
      
      // Seed stub status
      setCrawlStatus({
        task_id: res.task_id,
        status: 'checking',
        pages_discovered: 0,
        pages_indexed_count: 0,
        pages_indexed: [],
        current_action: 'Contacting host server...',
        errors: [],
        logs: ['Initializing SiteMind API agent...'],
        chunks_count: 0,
        embeddings_count: 0,
        processing_time_sec: 0.0,
        start_url: url
      });
      
      // Start polling
      startPollingStatus(res.task_id);
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred while starting crawler.");
    }
  };

  // Swapping between previously indexed websites
  const handleSelectWebsite = async (taskId: string) => {
    stopPollingStatus();
    setErrorText(null);
    setActiveTaskId(taskId);
    setMessages([]);
    setCrawlStatus(null);
    
    try {
      const apiKey = apiKeys[settings.provider as keyof typeof apiKeys];
      const analytics = await api.getAnalytics(taskId, settings.provider, apiKey);
      setAnalyticsData(analytics);
      
      // Simulate completed crawl status values for dashboard compatibility
      setCrawlStatus({
        task_id: taskId,
        status: 'completed',
        pages_discovered: analytics.stats.total_pages,
        pages_indexed_count: analytics.stats.total_pages,
        pages_indexed: [], // details inside analytics
        current_action: 'Ready to chat.',
        errors: [],
        logs: [],
        chunks_count: analytics.stats.total_chunks,
        embeddings_count: analytics.stats.total_chunks,
        processing_time_sec: analytics.stats.processing_time,
        start_url: analytics.sitemap?.url || taskId
      });
      
      setActiveTab(0); // go to chat
    } catch (err: any) {
      setErrorText(`Failed to load indexed site files: ${err.message || err}`);
    }
  };

  // Chat conversation managers
  const handleSendMessage = async (text: string) => {
    if (!activeTaskId || isChatLoading) return;
    
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsChatLoading(true);
    
    // Add stub assistant message that will be populated by chunk streams
    const aiMsgIndex = updatedMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);
    
    const apiKey = apiKeys[settings.provider as keyof typeof apiKeys];
    
    await api.streamChat(
      activeTaskId,
      text,
      messages,
      settings,
      apiKey,
      (sources) => {
        // Yield Perplexity grounding references
        setMessages(prev => {
          const next = [...prev];
          next[aiMsgIndex].sources = sources;
          return next;
        });
      },
      (token) => {
        // Stream text token-by-token
        setMessages(prev => {
          const next = [...prev];
          next[aiMsgIndex].content += token;
          return next;
        });
      },
      (err) => {
        // Stream error handler
        setIsChatLoading(false);
        setMessages(prev => {
          const next = [...prev];
          next[aiMsgIndex].content = `**Error**: ${err}`;
          return next;
        });
      },
      () => {
        // Stream completion handler
        setIsChatLoading(false);
      }
    );
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;
    // Find last user message
    const historyCopy = [...messages];
    let lastUserIndex = -1;
    for (let i = historyCopy.length - 1; i >= 0; i--) {
      if (historyCopy[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    
    if (lastUserIndex !== -1) {
      const lastUserQuery = historyCopy[lastUserIndex].content;
      // Slice messages up to the user message
      const choppedHistory = historyCopy.slice(0, lastUserIndex);
      setMessages(choppedHistory);
      // Resend
      onSendMessageTextDirect(lastUserQuery, choppedHistory);
    }
  };

  const onSendMessageTextDirect = async (text: string, currentHistory: ChatMessage[]) => {
    if (!activeTaskId || isChatLoading) return;
    
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...currentHistory, userMsg];
    setMessages(updatedMessages);
    setIsChatLoading(true);
    
    const aiMsgIndex = updatedMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);
    
    const apiKey = apiKeys[settings.provider as keyof typeof apiKeys];
    
    await api.streamChat(
      activeTaskId,
      text,
      currentHistory,
      settings,
      apiKey,
      (sources) => {
        setMessages(prev => {
          const next = [...prev];
          next[aiMsgIndex].sources = sources;
          return next;
        });
      },
      (token) => {
        setMessages(prev => {
          const next = [...prev];
          next[aiMsgIndex].content += token;
          return next;
        });
      },
      (err) => {
        setIsChatLoading(false);
        setMessages(prev => {
          const next = [...prev];
          next[aiMsgIndex].content = `**Error**: ${err}`;
          return next;
        });
      },
      () => {
        setIsChatLoading(false);
      }
    );
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleNewChat = () => {
    stopPollingStatus();
    setActiveTaskId(null);
    setCrawlStatus(null);
    setAnalyticsData(null);
    setMessages([]);
    setUrlInput('');
    setErrorText(null);
  };

  const handleToggleFavorite = (taskId: string) => {
    setFavorites(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleDeleteWebsite = async (taskId: string) => {
    if (activeTaskId === taskId) {
      handleNewChat();
    }
    try {
      await api.deleteWebsite(taskId);
      await fetchWebsites();
    } catch (err: any) {
      console.error("Failed to delete website:", err);
      setErrorText(err.message || "Failed to delete website");
    }
  };

  // Rendering conditions
  const isCrawlRunning = crawlStatus && ['checking', 'crawling', 'cleaning', 'building_db'].includes(crawlStatus.status);
  const isCrawlFailed = crawlStatus && crawlStatus.status === 'failed';
  const isCrawlFinished = crawlStatus && crawlStatus.status === 'completed';

  const muiTheme = getTheme(isDarkMode ? 'dark' : 'light');

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box display="flex" height="100vh" width="100vw" overflow="hidden">
        {/* Sidebar */}
        <Sidebar
          websites={websites}
          activeTaskId={activeTaskId}
          onSelectWebsite={handleSelectWebsite}
          onNewChat={handleNewChat}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isDarkMode={isDarkMode}
          onOpenSettings={() => setSettingsOpen(true)}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onDeleteWebsite={handleDeleteWebsite}
        />

        {/* Main Content Workspace Container */}
        <Box 
          display="flex" 
          flexDirection="column" 
          flexGrow={1} 
          height="100%" 
          sx={{ backgroundColor: 'background.default', overflow: 'hidden' }}
        >
          {/* Main Display routing */}
          {!activeTaskId ? (
            // 1. Landing Input screen
            <Box flexGrow={1} overflow="auto" display="flex" flexDirection="column" justifyContent="center">
              <Container maxWidth="md" sx={{ py: 6 }}>
                {/* Logo & Headline */}
                <Box textAlign="center" mb={6}>
                  <Box 
                    display="inline-flex" 
                    justifyContent="center" 
                    alignItems="center"
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 4,
                      background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      color: (theme) => theme.palette.primary.contrastText,
                      boxShadow: (theme) => theme.palette.mode === 'light'
                        ? '0 8px 30px rgba(217, 0, 0, 0.3)'
                        : '0 8px 30px rgba(141, 179, 85, 0.3)',
                      mb: 2.5
                    }}
                  >
                    <Language sx={{ fontSize: 38 }} />
                  </Box>
                  <Typography variant="h2" fontWeight="800" sx={{ letterSpacing: '-0.03em' }} gutterBottom>
                    Chat with Any Website
                  </Typography>
                  <Typography variant="h5" color="text.secondary" fontWeight="normal" sx={{ opacity: 0.85 }}>
                    Paste a URL, automatically extract content, and perform conversational semantic search.
                  </Typography>
                </Box>

                {/* Input Bar */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 1.5, 
                    borderRadius: 5, 
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
                    mb: 4
                  }}
                >
                  <Language sx={{ color: 'text.secondary', mx: 1.5 }} />
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Paste website URL (e.g., wikipedia.org/wiki/Artificial_intelligence)..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartIndexing()}
                    InputProps={{ disableUnderline: true }}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<KeyboardArrowRight />}
                    onClick={handleStartIndexing}
                    sx={{ borderRadius: 4, px: 3, height: 48 }}
                  >
                    Scrape & Chat
                  </Button>
                </Paper>

                {/* Alert displays */}
                {errorText && (
                  <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
                    <AlertTitle>Crawler Error</AlertTitle>
                    {errorText}
                  </Alert>
                )}

                {/* Quick suggestions layout grid */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                          Sitemap Trees
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Automatically resolves relative path domains to construct linked site visualizers.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold" color="secondary" gutterBottom>
                          No Hallucinations
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Chat queries search vector stores using strict cosine similarities, skipping headers/styles.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold" color="success.main" gutterBottom>
                          Metadata Reports
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Instantly extracts FAQs, company info profiles, and email/phone directories.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Container>
            </Box>
          ) : isCrawlRunning ? (
            // 2. Crawler status checklist screen
            <Box flexGrow={1} overflow="auto" display="flex" alignItems="center" px={2}>
              <CrawlProgress statusData={crawlStatus!} />
            </Box>
          ) : isCrawlFailed ? (
            // 3. Failed scrape notice screen
            <Box flexGrow={1} overflow="auto" display="flex" alignItems="center" justifyContent="center">
              <Container maxWidth="sm" sx={{ py: 6 }}>
                <Alert severity="error" sx={{ borderRadius: 4, p: 3 }}>
                  <AlertTitle sx={{ fontWeight: 'bold', fontSize: 18 }}>Scraping and Indexing Failed</AlertTitle>
                  <Typography variant="body2" paragraph mt={1}>
                    The crawler encountered an issue scanning this website.
                  </Typography>
                  <Box 
                    component="pre" 
                    p={2} 
                    sx={{ 
                      backgroundColor: 'rgba(0,0,0,0.05)', 
                      borderRadius: 2, 
                      fontSize: 12, 
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}
                  >
                    {crawlStatus?.errors.join('\n') || 'Unknown crawler exceptions.'}
                  </Box>
                  <Box display="flex" gap={2} mt={3}>
                    <Button variant="contained" color="error" onClick={handleNewChat}>
                      Try Another URL
                    </Button>
                    <Button variant="outlined" onClick={() => setSettingsOpen(true)}>
                      Adjust Scraper Settings
                    </Button>
                  </Box>
                </Alert>
              </Container>
            </Box>
          ) : (
            // 4. Completed chat panel dashboard
            <Box display="flex" flexDirection="column" height="100%" overflow="hidden" p={3}>
              {/* Site Details & View Controller Tabs */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {analyticsData?.analysis?.company_details?.name || "Scanned Website"}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    component="a" 
                    href={crawlStatus?.start_url} 
                    target="_blank" 
                    rel="noreferrer"
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {crawlStatus?.start_url}
                  </Typography>
                </Box>
                
                {/* Router view switcher tabs */}
                <Tabs 
                  value={activeTab} 
                  onChange={(_, val) => setActiveTab(val)}
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{ minHeight: 40 }}
                >
                  <Tab icon={<Message sx={{ fontSize: 18 }} />} iconPosition="start" label="Chat" sx={{ py: 1 }} />
                  <Tab icon={<Insights sx={{ fontSize: 18 }} />} iconPosition="start" label="Analytics" sx={{ py: 1 }} />
                  <Tab icon={<Sitemap sx={{ fontSize: 18 }} />} iconPosition="start" label="Sitemap" sx={{ py: 1 }} />
                  <Tab icon={<DashboardIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dashboard" sx={{ py: 1 }} />
                </Tabs>
              </Box>

              {/* Tab Panes */}
              <Box flexGrow={1} overflow="hidden" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, backgroundColor: 'background.paper' }}>
                {activeTab === 0 && (
                  <ChatArea
                    taskId={activeTaskId!}
                    messages={messages}
                    isLoading={isChatLoading}
                    onSendMessage={handleSendMessage}
                    onClearChat={handleClearChat}
                    onRegenerate={handleRegenerate}
                    settings={settings}
                    analyticsData={analyticsData}
                  />
                )}
                {activeTab === 1 && (
                  <Box p={3} height="100%" sx={{ overflowY: 'auto' }}>
                    <AnalyticsPanel analytics={analyticsData} />
                  </Box>
                )}
                {activeTab === 2 && (
                  <Box p={3} height="100%" sx={{ overflowY: 'auto' }}>
                    <SitemapVisualizer sitemap={analyticsData?.sitemap || null} />
                  </Box>
                )}
                {activeTab === 3 && (
                  <Box p={3} height="100%" sx={{ overflowY: 'auto' }}>
                    <Dashboard 
                      analytics={analyticsData} 
                      url={crawlStatus?.start_url || ""} 
                      status={crawlStatus?.status || "completed"} 
                    />
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Configuration Settings Modal */}
          <Dialog 
            open={settingsOpen} 
            onClose={() => setSettingsOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
          >
            <DialogTitle fontWeight="bold">Global System Settings</DialogTitle>
            <DialogContent dividers sx={{ border: 'none' }}>
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
                apiKeys={apiKeys}
                onApiKeysChange={setApiKeys}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSettingsOpen(false)} variant="contained" sx={{ px: 3 }}>
                Apply & Save Settings
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
export default App;
