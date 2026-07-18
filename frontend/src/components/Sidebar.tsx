import React from 'react';
import {
  Box,
  Drawer,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Paper,
  useTheme,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add,
  History,
  Settings,
  Brightness4,
  Brightness7,
  Star,
  StarBorder,
  Storage,
  Language,
  AutoAwesome,
  Delete
} from '@mui/icons-material';
import type { SavedWebsite } from '../services/api';

interface SidebarProps {
  websites: SavedWebsite[];
  activeTaskId: string | null;
  onSelectWebsite: (taskId: string) => void;
  onNewChat: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onOpenSettings: () => void;
  favorites: string[];
  onToggleFavorite: (taskId: string) => void;
  onDeleteWebsite?: (taskId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  websites,
  activeTaskId,
  onSelectWebsite,
  onNewChat,
  onToggleTheme,
  isDarkMode,
  onOpenSettings,
  favorites,
  onToggleFavorite,
  onDeleteWebsite
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: 280, flexShrink: 0, height: '100%' }}>
      <Box 
        display="flex" 
        flexDirection="column" 
        height="100%"
        sx={{
          backgroundColor: (theme) => theme.palette.mode === 'light' ? 'rgba(243, 244, 246, 0.7)' : 'rgba(9, 9, 11, 0.4)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid',
          borderColor: 'divider',
          p: 2
        }}
      >
        {/* Title Logo Section */}
        <Box display="flex" alignItems="center" gap={1.5} mb={3} px={1}>
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: '#09090b',
              boxShadow: (theme) => theme.palette.mode === 'light'
                ? '0 4px 12px rgba(13, 148, 136, 0.2)'
                : '0 4px 15px rgba(0, 242, 254, 0.35)'
            }}
          >
            <AutoAwesome sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ letterSpacing: '-0.02em', lineHeight: 1.1, color: 'text.primary' }}>
              SiteMind AI
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              fontWeight="bold"
              sx={{ 
                fontFamily: 'monospace', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em', 
                fontSize: '0.65rem',
                opacity: 0.8
              }}
            >
              Neural Web Scraper
            </Typography>
          </Box>
        </Box>

        {/* New Chat Action Button */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Add />}
          onClick={onNewChat}
          sx={{
            py: 1.25,
            mb: 3,
            fontWeight: 'bold',
            borderRadius: '12px',
            borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(13, 148, 136, 0.3)' : 'rgba(0, 242, 254, 0.25)',
            backgroundColor: (theme) => theme.palette.mode === 'light' ? 'rgba(13, 148, 136, 0.05)' : 'rgba(0, 242, 254, 0.08)',
            color: 'primary.main',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            borderWidth: '1.5px',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: (theme) => theme.palette.mode === 'light' ? 'rgba(13, 148, 136, 0.1)' : 'rgba(0, 242, 254, 0.15)',
              borderWidth: '1.5px',
              boxShadow: (theme) => theme.palette.mode === 'light' ? 'none' : '0 0 15px rgba(0, 242, 254, 0.15)'
            }
          }}
        >
          New Site Chat
        </Button>

        {/* Saved & Scanned Websites List */}
        <Typography 
          variant="caption" 
          fontWeight="bold" 
          color="text.secondary" 
          px={1} 
          sx={{ 
            letterSpacing: 1.2, 
            textTransform: 'uppercase', 
            mb: 1.5,
            fontSize: '0.7rem' 
          }}
        >
          Indexed Websites
        </Typography>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
          <List disablePadding>
            {websites.map((web) => {
              const isActive = web.task_id === activeTaskId;
              const isFavorite = favorites.includes(web.task_id);
              
              return (
                <ListItem
                  key={web.task_id}
                  disablePadding
                  secondaryAction={
                    <Box display="flex" gap={0.25}>
                      <IconButton 
                        edge="end" 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(web.task_id);
                        }}
                      >
                        {isFavorite ? (
                          <Star fontSize="small" sx={{ color: '#F59E0B' }} />
                        ) : (
                          <StarBorder fontSize="small" />
                        )}
                      </IconButton>
                      {onDeleteWebsite && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWebsite(web.task_id);
                          }}
                          sx={{ opacity: 0.3, '&:hover': { opacity: 1, color: 'error.main' } }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  }
                  sx={{
                    mb: 0.5,
                    borderRadius: '10px',
                    backgroundColor: isActive 
                      ? (isDarkMode ? 'rgba(0, 242, 254, 0.08)' : 'rgba(13, 148, 136, 0.06)')
                      : 'transparent',
                    border: '1px solid',
                    borderColor: isActive 
                      ? (isDarkMode ? 'rgba(0, 242, 254, 0.25)' : 'rgba(13, 148, 136, 0.25)')
                      : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: isActive 
                        ? (isDarkMode ? 'rgba(0, 242, 254, 0.12)' : 'rgba(13, 148, 136, 0.1)')
                        : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)')
                    }
                  }}
                >
                  <ListItemButton 
                    onClick={() => onSelectWebsite(web.task_id)}
                    sx={{ py: 0.75, px: 1.5, borderRadius: '10px' }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Language sx={{ color: isActive ? 'primary.main' : 'text.secondary', fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={web.url.replace('https://', '').replace('http://', '').split('/')[0]}
                      secondary={`${web.pages_count} pages`}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isActive ? 'bold' : 'normal',
                        noWrap: true,
                        color: isActive ? 'primary.main' : 'text.primary'
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        noWrap: true
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}

            {websites.length === 0 && (
              <Box p={2} textAlign="center">
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No websites indexed yet.
                </Typography>
              </Box>
            )}
          </List>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Footer Actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" px={1}>
          <Tooltip title="Configure Settings">
            <IconButton onClick={onOpenSettings} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
              <Settings fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Toggle light/dark mode">
              <IconButton onClick={onToggleTheme} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                {isDarkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Version status tag */}
        <Box textAlign="center" mt={2}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontFamily: 'monospace', 
              fontSize: '9px', 
              fontWeight: 'bold', 
              letterSpacing: '0.22em', 
              color: (theme) => theme.palette.mode === 'light' ? 'rgba(13, 148, 136, 0.7)' : 'rgba(0, 242, 254, 0.6)',
              opacity: 0.8
            }}
          >
            V2.4 ENGINE ACTIVE
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
export default Sidebar;
