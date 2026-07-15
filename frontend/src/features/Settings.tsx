import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Button,
  Paper
} from '@mui/material';
import { RotateLeft } from '@mui/icons-material';
import type { CrawlSettings } from '../services/api';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

interface SettingsProps {
  settings: CrawlSettings;
  onChange: (settings: CrawlSettings) => void;
  apiKeys: { openai?: string; groq?: string; gemini?: string };
  onApiKeysChange: (keys: { openai?: string; groq?: string; gemini?: string }) => void;
}

export const DEFAULT_SETTINGS: CrawlSettings = {
  maxDepth: 3,
  maxPages: 25,
  chunkSize: 1000,
  chunkOverlap: 200,
  provider: 'gemini',
  modelName: DEFAULT_GEMINI_MODEL,
  temperature: 0.2,
  topK: 5
};

export const SettingsPanel: React.FC<SettingsProps> = ({
  settings,
  onChange,
  apiKeys,
  onApiKeysChange
}) => {

  const handleSettingChange = (key: keyof CrawlSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    
    // Auto-update default model if provider changes
    if (key === 'provider') {
      if (value === 'openai') newSettings.modelName = 'gpt-4o-mini';
      else if (value === 'groq') newSettings.modelName = 'llama-3.3-70b-versatile';
      else if (value === 'gemini') newSettings.modelName = DEFAULT_GEMINI_MODEL;
      else newSettings.modelName = '';
    }
    
    onChange(newSettings);
  };

  const handleKeyChange = (provider: 'openai' | 'groq' | 'gemini', value: string) => {
    onApiKeysChange({ ...apiKeys, [provider]: value });
  };

  const resetToDefault = () => {
    onChange({ ...DEFAULT_SETTINGS });
    onApiKeysChange({});
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Configuration Settings</Typography>
        <Button 
          variant="outlined" 
          size="small" 
          color="warning" 
          startIcon={<RotateLeft />} 
          onClick={resetToDefault}
        >
          Reset Defaults
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {/* Model Configurations */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2} color="primary">
              AI Chat Settings
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Active AI Provider</InputLabel>
                <Select
                  value={settings.provider}
                  label="Active AI Provider"
                  onChange={(e) => handleSettingChange('provider', e.target.value)}
                >
                  <MenuItem value="gemini">Google Gemini</MenuItem>
                  <MenuItem value="groq">Groq Llama 3.3</MenuItem>
                  <MenuItem value="openai">OpenAI GPT-4</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Model Name</InputLabel>
                <Select
                  value={settings.modelName || ''}
                  label="Model Name"
                  onChange={(e) => handleSettingChange('modelName', e.target.value)}
                >
                  {settings.provider === 'openai' && [
                    <MenuItem key="gpt4om" value="gpt-4o-mini">gpt-4o-mini (Recommended)</MenuItem>,
                    <MenuItem key="gpt4o" value="gpt-4o">gpt-4o</MenuItem>
                  ]}
                  {settings.provider === 'groq' && [
                    <MenuItem key="llama70" value="llama-3.3-70b-versatile">llama-3.3-70b (Recommended)</MenuItem>,
                    <MenuItem key="llama8" value="llama3-8b-8192">llama3-8b-8192</MenuItem>
                  ]}
                  {settings.provider === 'gemini' && [
                    <MenuItem key="gemini35f" value="gemini-3.5-flash">gemini-3.5-flash (Recommended)</MenuItem>,
                    <MenuItem key="gemini25f" value="gemini-2.5-flash">gemini-2.5-flash</MenuItem>,
                    <MenuItem key="geminiflashlatest" value="gemini-flash-latest">gemini-flash-latest</MenuItem>
                  ]}
                </Select>
              </FormControl>
              
              <Box mt={1}>
                <Typography variant="body2" gutterBottom>
                  Temperature: <strong>{settings.temperature}</strong>
                </Typography>
                <Slider
                  value={settings.temperature}
                  min={0}
                  max={1.0}
                  step={0.1}
                  onChange={(_, val) => handleSettingChange('temperature', val)}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box mt={1}>
                <Typography variant="body2" gutterBottom>
                  Top K Chunks Retrieved: <strong>{settings.topK}</strong>
                </Typography>
                <Slider
                  value={settings.topK}
                  min={1}
                  max={15}
                  step={1}
                  onChange={(_, val) => handleSettingChange('topK', val)}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Crawling Configurations */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2} color="primary">
              Web Crawler & Indexing Settings
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Max Crawl Depth: <strong>{settings.maxDepth}</strong>
                </Typography>
                <Slider
                  value={settings.maxDepth}
                  min={1}
                  max={5}
                  step={1}
                  marks
                  onChange={(_, val) => handleSettingChange('maxDepth', val)}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  How many links deep to follow from the landing page.
                </Typography>
              </Box>

              <Box mt={1}>
                <Typography variant="body2" gutterBottom>
                  Max Pages Scanned: <strong>{settings.maxPages}</strong>
                </Typography>
                <Slider
                  value={settings.maxPages}
                  min={5}
                  max={100}
                  step={5}
                  onChange={(_, val) => handleSettingChange('maxPages', val)}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Upper limit on the number of individual HTML pages scraped.
                </Typography>
              </Box>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Chunk Size (chars)"
                    size="small"
                    type="number"
                    value={settings.chunkSize}
                    onChange={(e) => handleSettingChange('chunkSize', parseInt(e.target.value) || 500)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Chunk Overlap (chars)"
                    size="small"
                    type="number"
                    value={settings.chunkOverlap}
                    onChange={(e) => handleSettingChange('chunkOverlap', parseInt(e.target.value) || 0)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
export default SettingsPanel;
