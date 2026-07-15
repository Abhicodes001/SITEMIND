import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import {
  Send,
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  ContentCopy,
  Replay,
  Delete,
  PictureAsPdf,
  Download,
  Info,
  Keyboard,
  Link,
  ExpandMore,
  Check
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

import type { ChatMessage, SourceCitation, CrawlSettings } from '../services/api';
import { useSpeech } from '../hooks/useSpeech';
import { useShortcuts } from '../hooks/useShortcuts';

interface ChatAreaProps {
  taskId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onRegenerate: () => void;
  settings: CrawlSettings;
  analyticsData: any;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  taskId,
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  onRegenerate,
  settings,
  analyticsData
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isListening,
    transcript,
    speechSupported,
    startListening,
    stopListening,
    isSpeaking,
    speak,
    stopSpeaking
  } = useSpeech();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Sync speech input transcript to state
  useEffect(() => {
    if (transcript) {
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
    }
  }, [transcript]);

  // Register keyboard shortcuts
  const keyboardShortcuts = [
    {
      key: 'Enter',
      ctrlKey: true,
      action: () => {
        if (input.trim() && !isLoading) {
          handleSend();
        }
      }
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => onClearChat()
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => setShortcutOpen(prev => !prev)
    }
  ];
  useShortcuts(keyboardShortcuts);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeechToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // PDF Export using Browser Print Formatting
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const chatHtml = messages.map(msg => `
      <div style="margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
        <h4 style="margin: 0 0 5px 0; color: ${msg.role === 'user' ? '#D90000' : '#8DB355'}">
          ${msg.role === 'user' ? 'User' : 'SiteMind AI'}
        </h4>
        <div style="font-size: 14px; line-height: 1.6;">${msg.content.replace(/\n/g, '<br/>')}</div>
        ${msg.sources && msg.sources.length > 0 ? `
          <div style="margin-top: 10px; font-size: 12px; color: #666;">
            <strong>Sources cited:</strong>
            <ul style="margin: 5px 0 0 0; padding-left: 20px;">
              ${msg.sources.map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a></li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>SiteMind AI Chat Log - ${taskId}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
            h1 { text-align: center; color: #D90000; }
            .header { margin-bottom: 40px; text-align: center; border-bottom: 2px solid #D90000; padding-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SiteMind AI</h1>
            <p>Conversation Transcript for: ${analyticsData?.sitemap?.url || taskId}</p>
            <small>Exported on: ${new Date().toLocaleDateString()}</small>
          </div>
          <div>${chatHtml}</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export database vectors/scrapes as JSON
  const handleExportJSON = () => {
    if (!analyticsData) return;
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sitemind-analytics-${taskId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" sx={{ position: 'relative' }}>
      {/* Top Header Actions Bar */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ 
          py: 1.5, 
          px: 2, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">Conversational RAG Chat</Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Keyboard Shortcuts (Ctrl+/)">
            <IconButton size="small" onClick={() => setShortcutOpen(true)}>
              <Keyboard />
            </IconButton>
          </Tooltip>
          
          {messages.length > 0 && (
            <>
              <Tooltip title="Export PDF Transcript">
                <IconButton size="small" onClick={handleExportPDF} color="primary">
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Scraped JSON Data">
                <IconButton size="small" onClick={handleExportJSON} color="secondary">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear Chat History (Ctrl+K)">
                <IconButton size="small" onClick={onClearChat} color="error">
                  <Delete />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Messages Listing Pane */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.length === 0 ? (
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" textAlign="center" color="text.secondary" p={4}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56, mb: 2 }}>
              <Info sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
              SiteMind Chat Engine Active
            </Typography>
            <Typography variant="body2" maxWidth={400} paragraph>
              Ask any question about the website content. SiteMind AI will query its vector database to provide accurate, grounded answers with citations.
            </Typography>
          </Box>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <Box 
                key={index}
                display="flex" 
                flexDirection="column"
                alignItems={isUser ? 'flex-end' : 'flex-start'}
              >
                <Box 
                  display="flex" 
                  gap={1.5} 
                  maxWidth="85%" 
                  flexDirection={isUser ? 'row-reverse' : 'row'}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: isUser ? 'primary.main' : 'secondary.main',
                      width: 32,
                      height: 32,
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {isUser ? 'U' : 'AI'}
                  </Avatar>
                  
                  <Box>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        backgroundColor: isUser ? 'primary.main' : 'background.paper',
                        color: isUser ? 'primary.contrastText' : 'text.primary',
                        border: isUser ? 'none' : '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      {isUser ? (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                      ) : (
                        <Box sx={{ '& p': { mt: 0, mb: 1.5 }, '& pre': { overflowX: 'auto', p: 1.5, backgroundColor: 'action.hover', borderRadius: 2 } }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </Box>
                      )}
                    </Paper>

                    {/* Citations block for Assistant responses */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <Box mt={1.5} width="100%">
                        <Accordion sx={{ '&::before': { display: 'none' }, boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: '10px !important', overflow: 'hidden' }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="caption" fontWeight="bold" display="flex" alignItems="center" gap={0.5} color="secondary">
                              <Link sx={{ fontSize: 14 }} /> Grounding References ({msg.sources.length})
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {msg.sources.map((src, idx) => (
                              <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'background.default' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                  <Typography 
                                    variant="caption" 
                                    fontWeight="bold" 
                                    component="a" 
                                    href={src.url} 
                                    target="_blank" 
                                    rel="noopener"
                                    sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                  >
                                    [{idx + 1}] {src.title || 'Referenced Page'}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', lineHeight: 1.4 }}>
                                  "{src.snippet}"
                                </Typography>
                              </Paper>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                    )}

                    {/* Action buttons (copy, TTS, regenerate) */}
                    {!isUser && (
                      <Box display="flex" gap={0.5} mt={0.5} ml={1}>
                        <Tooltip title="Copy to clipboard">
                          <IconButton size="small" onClick={() => handleCopy(msg.content, index)}>
                            {copiedId === index ? <Check sx={{ fontSize: 16, color: 'green' }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={isSpeaking ? "Mute audio" : "Text to Speech"}>
                          <IconButton size="small" onClick={() => isSpeaking ? stopSpeaking() : speak(msg.content)}>
                            {isSpeaking ? <VolumeOff sx={{ fontSize: 16, color: 'secondary.main' }} /> : <VolumeUp sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>

                        {index === messages.length - 1 && (
                          <Tooltip title="Regenerate answer">
                            <IconButton size="small" onClick={onRegenerate} disabled={isLoading}>
                              <Replay sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
        
        {/* Loading Bubble */}
        {isLoading && (
          <Box display="flex" gap={1.5} maxWidth="85%" alignItems="flex-start">
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>AI</Avatar>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={16} color="secondary" />
              <Typography variant="body2" color="text.secondary">SiteMind is searching and thinking...</Typography>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Speech Listening Pulse wave Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              zIndex: 3
            }}
          >
            <Paper 
              elevation={4} 
              sx={{ 
                px: 3, 
                py: 1.5, 
                borderRadius: 4, 
                backgroundColor: 'secondary.main', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box display="flex" gap={0.5}>
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, 20, 8] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    style={{ width: 3, backgroundColor: 'white', borderRadius: 2 }}
                  />
                ))}
              </Box>
              <Typography variant="body2" fontWeight="bold">Listening for voice...</Typography>
              <IconButton size="small" onClick={stopListening} sx={{ color: 'white' }}>
                <MicOff fontSize="small" />
              </IconButton>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input panel container */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
        <Box display="flex" gap={1}>
          {speechSupported && (
            <Tooltip title={isListening ? "Stop voice recognition" : "Voice message input"}>
              <IconButton 
                color={isListening ? "error" : "primary"}
                onClick={handleSpeechToggle}
                sx={{ border: '1px solid', borderColor: 'divider', height: 48, width: 48 }}
              >
                {isListening ? <MicOff /> : <Mic />}
              </IconButton>
            </Tooltip>
          )}
          <TextField
            fullWidth
            placeholder={isListening ? "Listening..." : "Ask anything about this website... (Ctrl+Enter to send)"}
            value={input}
            disabled={isLoading || isListening}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                // Let normal enter key do standard input multiline, unless they press ctrl+enter to send
                // Or let single enter do send on desktop if we prefer.
                // Let's do standard send on Enter (if not shifting) for standard chat UX!
                e.preventDefault();
                handleSend();
              }
            }}
            InputProps={{
              endAdornment: (
                <IconButton 
                  color="primary" 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading}
                  sx={{ height: 36, width: 36 }}
                >
                  <Send />
                </IconButton>
              )
            }}
          />
        </Box>
      </Box>

      {/* Keyboard shortcuts helper dialog */}
      <Dialog open={shortcutOpen} onClose={() => setShortcutOpen(false)}>
        <DialogTitle fontWeight="bold">Keyboard Shortcuts</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} py={1}>
            <Grid item xs={6}><Typography variant="body2" fontWeight="bold">Ctrl + Enter</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">Send Message</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">Ctrl + K</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">Clear Chat History</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">Ctrl + /</Typography></Grid>
            <Grid item xs={6}><Typography variant="body2">Toggle Shortcuts Panel</Typography></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShortcutOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default ChatArea;
