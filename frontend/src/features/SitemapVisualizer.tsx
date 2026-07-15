import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Tooltip,
  Paper,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Schema,
  FolderOpen,
  InsertDriveFile,
  ChevronRight,
  ExpandMore,
  OpenInNew,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import type { SitemapNode } from '../services/api';

interface SitemapVisualizerProps {
  sitemap: SitemapNode | null;
}

// Recursive component for Collapsible Directory List View
const DirectoryNode: React.FC<{ node: SitemapNode; depth: number }> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box sx={{ ml: depth * 2.5 }}>
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 0.75,
          borderRadius: 1.5,
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' },
          px: 1
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          <IconButton size="small" sx={{ p: 0.25, mr: 0.5 }}>
            {isOpen ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 28 }} />
        )}
        
        {hasChildren ? (
          <FolderOpen sx={{ mr: 1, color: '#F59E0B', fontSize: 18 }} />
        ) : (
          <InsertDriveFile sx={{ mr: 1, color: '#3B82F6', fontSize: 16 }} />
        )}
        
        <Typography 
          variant="body2" 
          noWrap 
          sx={{ fontWeight: hasChildren ? 600 : 400, flexGrow: 1 }}
        >
          {node.name}
        </Typography>
        
        <Tooltip title="Open in browser">
          <IconButton 
            size="small" 
            href={node.url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}
          >
            <OpenInNew fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Box>

      {hasChildren && isOpen && (
        <Box>
          {node.children.map((child, idx) => (
            <DirectoryNode key={idx} node={child} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export const SitemapVisualizer: React.FC<SitemapVisualizerProps> = ({ sitemap }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'directory'>('visual');
  const [zoom, setZoom] = useState(1);
  const theme = useTheme();

  if (!sitemap) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="text.secondary">No sitemap data available.</Typography>
      </Box>
    );
  }

  // Pre-calculate positions for a simplified SVG graph tree
  const listNodesWithCoords = (
    node: SitemapNode,
    x: number,
    y: number,
    levelHeight: number,
    siblingSpacing: number,
    level: number
  ): { nodes: any[]; links: any[] } => {
    let nodes: any[] = [];
    let links: any[] = [];
    
    // Assign coordinate
    const currentNode = {
      name: node.name,
      url: node.url,
      x,
      y,
      level
    };
    nodes.push(currentNode);
    
    if (node.children && node.children.length > 0) {
      const childCount = node.children.length;
      const totalWidth = (childCount - 1) * siblingSpacing;
      const startX = x - totalWidth / 2;
      
      node.children.forEach((child, idx) => {
        const childX = startX + idx * siblingSpacing;
        const childY = y + levelHeight;
        
        // Add link
        links.push({
          x1: x,
          y1: y,
          x2: childX,
          y2: childY
        });
        
        // Recurse
        const childData = listNodesWithCoords(
          child,
          childX,
          childY,
          levelHeight,
          siblingSpacing * 0.6, // decrease spacing as depth increases
          level + 1
        );
        nodes = nodes.concat(childData.nodes);
        links = links.concat(childData.links);
      });
    }
    
    return { nodes, links };
  };

  const levelHeight = 120;
  const siblingSpacing = 240;
  const { nodes, links } = listNodesWithCoords(sitemap, 500, 50, levelHeight, siblingSpacing, 0);

  // SVG viewBox size bounds
  const xCoords = nodes.map(n => n.x);
  const minX = Math.min(...xCoords, 100) - 100;
  const maxX = Math.max(...xCoords, 900) + 100;
  const maxY = Math.max(...nodes.map(n => n.y), 400) + 100;
  const viewWidth = maxX - minX;

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Sitemap Visualization</Typography>
          <Typography variant="body2" color="text.secondary">
            Hierarchical directory maps parsed from crawled path structures.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={viewMode === 'visual' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('visual')}
            startIcon={<Schema />}
          >
            Visual Tree
          </Button>
          <Button
            size="small"
            variant={viewMode === 'directory' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('directory')}
            startIcon={<FolderOpen />}
          >
            Directory View
          </Button>
        </Box>
      </Box>

      {viewMode === 'visual' ? (
        <Card sx={{ position: 'relative' }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 12, 
              right: 12, 
              display: 'flex', 
              gap: 0.5, 
              zIndex: 2, 
              backgroundColor: 'background.paper', 
              borderRadius: 2, 
              p: 0.5, 
              opacity: 0.8 
            }}
          >
            <IconButton size="small" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
              <ZoomOut fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ alignSelf: 'center', px: 1 }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton size="small" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
              <ZoomIn fontSize="small" />
            </IconButton>
          </Box>
          
          <CardContent sx={{ overflow: 'auto', p: 1, display: 'flex', justifyContent: 'center' }}>
            <Box 
              sx={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.2s',
                width: '100%',
                maxWidth: '100%',
                height: maxY,
                minWidth: Math.min(viewWidth, 1000)
              }}
            >
              <svg 
                width="100%" 
                height="100%" 
                viewBox={`${minX} 0 ${viewWidth} ${maxY}`} 
                style={{ overflow: 'visible' }}
              >
                {/* Draw Connecting Links */}
                {links.map((link, idx) => {
                  const dy = link.y2 - link.y1;
                  // Draw beautiful smooth curves
                  const pathD = `M ${link.x1} ${link.y1} C ${link.x1} ${link.y1 + dy/2}, ${link.x2} ${link.y2 - dy/2}, ${link.x2} ${link.y2}`;
                  return (
                    <path
                      key={idx}
                      d={pathD}
                      fill="none"
                      stroke="#818CF8"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                  );
                })}

                {/* Draw Nodes */}
                {nodes.map((node, idx) => {
                  const isRoot = node.level === 0;
                  return (
                    <g key={idx} transform={`translate(${node.x}, ${node.y})`}>
                      <Tooltip 
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>{node.name}</Typography>
                            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{node.url}</Typography>
                          </Box>
                        }
                        arrow
                      >
                        <circle
                          r={isRoot ? 14 : 10}
                          fill={isRoot ? theme.palette.primary.main : theme.palette.secondary.main}
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                          onClick={() => window.open(node.url, '_blank')}
                        />
                      </Tooltip>
                      <text
                        y={24}
                        textAnchor="middle"
                        fill="currentColor"
                        style={{
                          fontSize: '11px',
                          fontFamily: '"Outfit", sans-serif',
                          fontWeight: isRoot ? 'bold' : 'normal',
                          pointerEvents: 'none'
                        }}
                      >
                        {node.name.length > 20 ? node.name.slice(0, 17) + '...' : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxHeight: 500, overflowY: 'auto' }}>
              <DirectoryNode node={sitemap} depth={0} />
            </Paper>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
export default SitemapVisualizer;
