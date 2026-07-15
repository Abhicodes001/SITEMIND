import React, { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  ErrorOutline,
  Terminal,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { CrawlStatus } from '../services/api';

interface CrawlProgressProps {
  statusData: CrawlStatus;
}

export const CrawlProgress: React.FC<CrawlProgressProps> = ({ statusData }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [statusData.logs]);

  const steps = [
    { key: 'checking', label: 'Validating host URL...' },
    { key: 'crawling', label: 'Discovering and fetching internal links...' },
    { key: 'cleaning', label: 'Extracting and cleaning HTML content...' },
    { key: 'building_db', label: 'Generating embeddings and building vector index...' },
    { key: 'completed', label: 'Database ready. Launching chat!' },
  ];

  const getStepStatus = (stepKey: string) => {
    const jobStatus = statusData.status;
    
    if (jobStatus === 'failed') {
      // If failed, identify where it stopped
      if (stepKey === 'checking' && statusData.pages_discovered === 0) return 'error';
      if (stepKey === 'crawling' && statusData.pages_indexed_count === 0) return 'error';
      if (stepKey === 'cleaning' && statusData.chunks_count === 0) return 'error';
      if (stepKey === 'building_db' && statusData.embeddings_count === 0) return 'error';
      return 'unstarted';
    }

    if (stepKey === 'checking') {
      if (['checking', 'crawling', 'cleaning', 'building_db', 'completed'].includes(jobStatus)) {
        return jobStatus === 'checking' ? 'loading' : 'completed';
      }
    }
    if (stepKey === 'crawling') {
      if (['crawling', 'cleaning', 'building_db', 'completed'].includes(jobStatus)) {
        return jobStatus === 'crawling' ? 'loading' : 'completed';
      }
    }
    if (stepKey === 'cleaning') {
      if (['cleaning', 'building_db', 'completed'].includes(jobStatus)) {
        return jobStatus === 'cleaning' ? 'loading' : 'completed';
      }
    }
    if (stepKey === 'building_db') {
      if (['building_db', 'completed'].includes(jobStatus)) {
        return jobStatus === 'building_db' ? 'loading' : 'completed';
      }
    }
    if (stepKey === 'completed') {
      return jobStatus === 'completed' ? 'completed' : 'unstarted';
    }
    
    return 'unstarted';
  };

  const getStepIcon = (status: 'unstarted' | 'loading' | 'completed' | 'error') => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'loading':
        return <CircularProgress size={20} color="secondary" />;
      case 'error':
        return <ErrorOutline color="error" />;
      default:
        return <RadioButtonUnchecked color="disabled" />;
    }
  };

  const activeStep = steps.find(s => getStepStatus(s.key) === 'loading') || 
                     (statusData.status === 'completed' ? steps[4] : steps[0]);

  return (
    <Box sx={{ maxWidth: 650, width: '100%', mx: 'auto', mt: 4 }}>
      <Card sx={{ backdropFilter: 'blur(20px)', borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
            Indexing Site Mind
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" mb={3}>
            Analyzing {statusData.task_id.split('_')[0].replace(/_/g, '.')}...
          </Typography>
          
          {/* Active Action Progress Bar */}
          <Box mb={4}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight="medium" color="secondary">
                {statusData.current_action || 'Preparing crawl...'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {statusData.pages_indexed_count} pages indexed ({statusData.processing_time_sec}s)
              </Typography>
            </Box>
            <LinearProgress 
              variant={statusData.status === 'completed' ? 'determinate' : 'indeterminate'}
              value={statusData.status === 'completed' ? 100 : undefined}
              color={statusData.status === 'failed' ? 'error' : 'primary'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
          
          {/* Steps Checklist */}
          <List sx={{ mb: 3 }}>
            {steps.map((step, idx) => {
              const stepStatus = getStepStatus(step.key);
              const isActive = stepStatus === 'loading';
              return (
                <ListItem 
                  key={step.key}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    backgroundColor: isActive ? 'action.selected' : 'transparent',
                    transition: 'background-color 0.3s'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getStepIcon(stepStatus)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={step.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 'bold' : 'normal',
                      color: stepStatus === 'unstarted' ? 'text.secondary' : 'text.primary'
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Log Window Terminal */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Terminal sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1 }}>
                CRAWLER TERMINAL LOGS
              </Typography>
            </Box>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                maxHeight: 180, 
                overflowY: 'auto', 
                backgroundColor: '#0F172A', // Deep slate
                borderColor: '#1E293B',
                color: '#38BDF8', // Cyan
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5
              }}
            >
              {statusData.logs && statusData.logs.length > 0 ? (
                statusData.logs.map((log, idx) => (
                  <Box key={idx} sx={{ wordBreak: 'break-all' }}>
                    <span style={{ color: '#64748B' }}>&gt;</span> {log}
                  </Box>
                ))
              ) : (
                <Box color="text.secondary">Initializing terminal queue...</Box>
              )}
              {statusData.errors.map((err, idx) => (
                <Box key={`err-${idx}`} sx={{ color: '#EF4444' }}>
                  <span style={{ color: '#EF4444' }}>[ERROR]</span> {err}
                </Box>
              ))}
              <div ref={terminalEndRef} />
            </Paper>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default CrawlProgress;
