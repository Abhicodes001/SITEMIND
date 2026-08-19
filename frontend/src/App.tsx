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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface CanvasBackgroundProps {
  isDarkMode: boolean;
}

const CanvasBackground: React.FC<CanvasBackgroundProps> = ({ isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 18000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 2.5 + 1.5, // Thicker particles (originally 0.8 - 2.6)
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Determine colors based on active theme
      const particleColor = isDarkMode ? 'rgba(0, 242, 254, 0.45)' : 'rgba(13, 148, 136, 0.5)';
      const lineColor = isDarkMode ? 'rgba(0, 242, 254, 0.12)' : 'rgba(13, 148, 136, 0.16)';
      
      ctx.fillStyle = particleColor;
      ctx.strokeStyle = lineColor;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = isDarkMode 
              ? `rgba(0, 242, 254, ${0.16 * (1 - dist / 120)})` 
              : `rgba(13, 148, 136, ${0.22 * (1 - dist / 120)})`;
            ctx.lineWidth = isDarkMode ? 1.0 : 1.3;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Mouse hover interaction
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 150) {
          ctx.beginPath();
          ctx.strokeStyle = isDarkMode 
            ? `rgba(0, 242, 254, ${0.35 * (1 - mdist / 150)})` 
            : `rgba(13, 148, 136, ${0.42 * (1 - mdist / 150)})`;
          ctx.lineWidth = isDarkMode ? 1.4 : 1.8;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export const App: React.FC = () => {
  const normalizeSettings = (value: CrawlSettings): CrawlSettings => {
    if (
      value.provider === 'gemini' &&
      (value.modelName === 'gemini-3.5-flash' || value.modelName === 'gemini-2.5-flash' || value.modelName === 'gemini-flash-latest' || !value.modelName)
    ) {
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
          sx={{ backgroundColor: 'background.default', overflow: 'hidden', position: 'relative' }}
        >
          <CanvasBackground isDarkMode={isDarkMode} />

          {/* Main Display routing */}
          {!activeTaskId ? (
            // 1. Landing Input screen
            <Box 
              flexGrow={1} 
              overflow="auto" 
              display="flex" 
              flexDirection="column" 
              justifyContent="center"
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Container maxWidth="md" sx={{ py: 6 }}>
                {/* Logo & Headline */}
                <Box textAlign="center" mb={5}>
                  <Typography 
                    variant="h1" 
                    fontWeight="800" 
                    sx={{ 
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      letterSpacing: '-0.04em',
                      background: (theme) => theme.palette.mode === 'light'
                        ? 'linear-gradient(135deg, #111827 0%, #0d9488 100%)'
                        : 'linear-gradient(135deg, #ffffff 10%, #f4f4f5 50%, #00f2fe 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 2.5
                    }}
                  >
                    Chat with Any Website
                  </Typography>
                  <Typography 
                    variant="h5" 
                    color="text.secondary" 
                    fontWeight="normal" 
                    sx={{ 
                      maxWidth: '600px', 
                      mx: 'auto', 
                      lineHeight: 1.6,
                      opacity: 0.8,
                      fontSize: { xs: '1.05rem', md: '1.2rem' } 
                    }}
                  >
                    Paste a URL, automatically extract content, and perform conversational semantic search.
                  </Typography>
                </Box>

                {/* Input Bar */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 1, 
                    borderRadius: '20px', 
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: (theme) => theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(24, 24, 27, 0.4)',
                    backdropFilter: 'blur(16px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'none',
                    maxWidth: '620px',
                    width: '100%',
                    mx: 'auto',
                    mb: 5,
                    '&:focus-within': {
                      borderColor: 'primary.main',
                      boxShadow: (theme) => theme.palette.mode === 'light'
                        ? '0 0 25px rgba(13, 148, 136, 0.15)'
                        : '0 0 25px rgba(0, 242, 254, 0.25)',
                    }
                  }}
                >
                  <Language sx={{ color: 'text.secondary', mx: 2 }} />
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Paste website URL (e.g., wikipedia.org/wiki/Artificial_intelligence)..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartIndexing()}
                    InputProps={{ disableUnderline: true }}
                    sx={{ 
                      flexGrow: 1,
                      input: {
                        fontSize: '0.95rem',
                        py: 1.5
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<KeyboardArrowRight />}
                    onClick={handleStartIndexing}
                    sx={{ 
                      borderRadius: '14px', 
                      px: 4, 
                      height: 48,
                      fontWeight: 'bold',
                      boxShadow: (theme) => theme.palette.mode === 'light' ? 'none' : '0 4px 15px rgba(0, 242, 254, 0.2)'
                    }}
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
                      <CardContent sx={{ p: '24px !important' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Sitemap Trees
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85 }}>
                          Automatically resolves relative path domains to construct linked site visualizers.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ p: '24px !important' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="secondary.main" gutterBottom>
                          No Hallucinations
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85 }}>
                          Chat queries search vector stores using strict cosine similarities, skipping headers/styles.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ p: '24px !important' }}>
                        <Typography 
                          variant="subtitle1" 
                          fontWeight="bold" 
                          sx={{ color: (theme) => theme.palette.mode === 'light' ? '#0d9488' : '#10b981' }} 
                          gutterBottom
                        >
                          Metadata Reports
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85 }}>
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
            <Box 
              flexGrow={1} 
              overflow="auto" 
              display="flex" 
              alignItems="center" 
              px={2}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <CrawlProgress statusData={crawlStatus!} />
            </Box>
          ) : isCrawlFailed ? (
            // 3. Failed scrape notice screen
            <Box 
              flexGrow={1} 
              overflow="auto" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              sx={{ position: 'relative', zIndex: 1 }}
            >
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
            <Box 
              display="flex" 
              flexDirection="column" 
              height="100%" 
              overflow="hidden" 
              p={3}
              sx={{ position: 'relative', zIndex: 1 }}
            >
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
