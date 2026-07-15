import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  Layers,
  Memory,
  Timer,
  Info,
  Http,
  CheckCircle,
  BarChart,
  Analytics
} from '@mui/icons-material';
import type { AnalyticsData } from '../services/api';

interface DashboardProps {
  analytics: AnalyticsData | null;
  url: string;
  status: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ analytics, url, status }) => {
  // If no stats, render default placeholder values
  const stats = analytics?.stats || {
    total_pages: 0,
    total_chunks: 0,
    total_characters: 0,
    crawl_depth: 0,
    processing_time: 0
  };

  const cards = [
    {
      title: 'Pages Scanned',
      value: stats.total_pages,
      subtitle: 'Unique HTML urls matched',
      icon: <Http sx={{ fontSize: 28, color: '#3B82F6' }} />,
      bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.15) 100%)'
    },
    {
      title: 'Chunks Created',
      value: stats.total_chunks,
      subtitle: 'Recursive text splits',
      icon: <Layers sx={{ fontSize: 28, color: '#818CF8' }} />,
      bg: 'linear-gradient(135deg, rgba(129, 140, 248, 0.05) 0%, rgba(129, 140, 248, 0.15) 100%)'
    },
    {
      title: 'Embeddings Index',
      value: stats.total_chunks, // same as chunks count
      subtitle: '1536-dim vector transforms',
      icon: <Memory sx={{ fontSize: 28, color: '#06B6D4' }} />,
      bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0.15) 100%)'
    },
    {
      title: 'Processing Time',
      value: `${stats.processing_time.toFixed(1)}s`,
      subtitle: 'Crawl + build duration',
      icon: <Timer sx={{ fontSize: 28, color: '#10B981' }} />,
      bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.15) 100%)'
    }
  ];

  return (
    <Box sx={{ py: 1 }}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="bold">Site Indexing Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Crawled namespace properties for <strong>{url}</strong>
          </Typography>
        </Box>
        <Box 
          display="flex" 
          alignItems="center" 
          gap={1} 
          sx={{ 
            px: 2, 
            py: 0.75, 
            borderRadius: 3, 
            backgroundColor: status === 'completed' ? 'success.light' : 'warning.light',
            color: status === 'completed' ? 'success.dark' : 'warning.dark' 
          }}
        >
          <CheckCircle sx={{ fontSize: 16 }} />
          <Typography variant="caption" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
            {status}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} mb={4}>
        {cards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ background: card.bg, height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="medium">
                    {card.title}
                  </Typography>
                  {card.icon}
                </Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Detail statistics */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={3} display="flex" alignItems="center" gap={1}>
                <BarChart color="primary" /> Database Distribution
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={3}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">Scraped Size</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.total_characters ? `${(stats.total_characters / 1024).toFixed(1)} KB` : '0 KB'}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={100} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
                
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">Relative Density</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.total_pages ? `${(stats.total_chunks / stats.total_pages).toFixed(1)} chunks/page` : '0'}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" color="secondary" value={75} sx={{ height: 6, borderRadius: 3 }} />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">Crawl Depth</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      Level {stats.crawl_depth} / 5
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    color="success" 
                    value={(stats.crawl_depth / 5) * 100} 
                    sx={{ height: 6, borderRadius: 3 }} 
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Database Index Meta */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" mb={3} display="flex" alignItems="center" gap={1}>
                <Analytics color="secondary" /> System Meta
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Vector Index Storage</Typography>
                  <Typography variant="body2" fontWeight="semibold">FAISS-Simple Fallback Disk Store</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Embedding Vector Length</Typography>
                  <Typography variant="body2" fontWeight="semibold">384 (Local LM) / 1536 (API)</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Token Cleanup Policy</Typography>
                  <Typography variant="body2" fontWeight="semibold">Ignored Nav / Foot / Duplicates</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
export default Dashboard;
