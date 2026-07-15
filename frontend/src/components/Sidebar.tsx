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
          backgroundColor: isDarkMode ? '#000000' : '#F3F4F6',
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
              color: (theme) => theme.palette.primary.contrastText,
              boxShadow: (theme) => theme.palette.mode === 'light'
                ? '0 4px 12px rgba(217, 0, 0, 0.25)'
                : '0 4px 12px rgba(141, 179, 85, 0.25)'
            }}
          >
            <AutoAwesome sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: '-0.02em', lineHeight: 1 }}>
              SiteMind AI
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              Web RAG Scraper
            </Typography>
          </Box>
        </Box>

        {/* New Chat Action Button */}
        <Button
          fullWidth
          variant="contained"
          startIcon={<Add />}
          onClick={onNewChat}
          sx={{
            py: 1.25,
            mb: 3,
            fontWeight: 'bold',
            borderRadius: 3
          }}
        >
          New Site Chat
        </Button>

        {/* Saved & Scanned Websites List */}
        <Typography variant="caption" fontWeight="bold" color="text.secondary" px={1} sx={{ letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
          INDEXED WEBSITES
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
                    borderRadius: 2.5,
                    backgroundColor: isActive 
                      ? (isDarkMode ? 'rgba(141, 179, 85, 0.15)' : 'rgba(217, 0, 0, 0.08)')
                      : 'transparent',
                    border: isActive ? '1px solid' : '1px solid transparent',
                    borderColor: isActive ? 'primary.light' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive 
                        ? (isDarkMode ? 'rgba(141, 179, 85, 0.2)' : 'rgba(217, 0, 0, 0.12)')
                        : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)')
                    }
                  }}
                >
                  <ListItemButton 
                    onClick={() => onSelectWebsite(web.task_id)}
                    sx={{ py: 1, px: 1.5, borderRadius: 2.5 }}
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
            <IconButton onClick={onOpenSettings} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Settings fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Toggle light/dark mode">
              <IconButton onClick={onToggleTheme} sx={{ border: '1px solid', borderColor: 'divider' }}>
                {isDarkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
export default Sidebar;
