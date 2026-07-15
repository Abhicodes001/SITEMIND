import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Button,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  Business,
  Mail,
  Phone,
  LocationOn,
  Share,
  Info,
  Lightbulb,
  HelpOutline,
  Assignment,
  ContentCopy,
} from '@mui/icons-material';
import type { AnalyticsData } from '../services/api';

interface AnalyticsPanelProps {
  analytics: AnalyticsData | null;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ analytics }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!analytics || !analytics.analysis) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="text.secondary">No analytics reports generated yet.</Typography>
      </Box>
    );
  }

  const { analysis } = analytics;
  const company = analysis.company_details || { name: 'Website', industry: 'Unspecified', mission: '', description: '' };
  const insights = analysis.key_insights || [];
  const faqs = analysis.faqs || [];
  const contacts = analysis.contact_details || { emails: [], phones: [], address: '', social_links: [] };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box sx={{ py: 1 }}>
      <Box mb={2}>
        <Typography variant="h5" fontWeight="bold">AI Analysis & Insights</Typography>
        <Typography variant="body2" color="text.secondary">
          Automated summaries, company profiling, FAQs, and business contact extraction.
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_, val) => setActiveTab(val)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab icon={<Assignment />} iconPosition="start" label="Summary & Insights" />
        <Tab icon={<HelpOutline />} iconPosition="start" label="FAQ Generator" />
        <Tab icon={<Business />} iconPosition="start" label="Company & Contacts" />
      </Tabs>

      {/* Tab 1: Summary & Insights */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2} color="primary" display="flex" alignItems="center" gap={1}>
                  <Info fontSize="small" /> Executive Summary
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
                  {analysis.summary || 'Summary could not be extracted.'}
                </Typography>
                
                {company.mission && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 3, borderLeft: 4, borderLeftColor: 'primary.main', backgroundColor: 'background.default' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" gutterBottom>
                      MISSION STATEMENT
                    </Typography>
                    <Typography variant="body2" fontStyle="italic" color="text.primary">
                      "{company.mission}"
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2} color="secondary" display="flex" alignItems="center" gap={1}>
                  <Lightbulb fontSize="small" /> Key Insights
                </Typography>
                <List>
                  {insights.map((insight, idx) => (
                    <ListItem key={idx} alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                        <Chip size="small" label={idx + 1} color="secondary" sx={{ height: 18, width: 18, fontSize: 10 }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={insight} 
                        primaryTypographyProps={{ variant: 'body2', sx: { lineHeight: 1.5 } }} 
                      />
                    </ListItem>
                  ))}
                  {insights.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No insights found.</Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: FAQ Generator */}
      {activeTab === 1 && (
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3} color="primary" display="flex" alignItems="center" gap={1}>
                <HelpOutline fontSize="small" /> Generated Accordion FAQs
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={1.5}>
                {faqs.map((faq, idx) => (
                  <Accordion key={idx} sx={{ '&::before': { display: 'none' }, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2" fontWeight="bold">{faq.question}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{faq.answer}</Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
                {faqs.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No FAQs generated.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 3: Company & Contacts */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Company details */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={3} color="primary" display="flex" alignItems="center" gap={1}>
                  <Business fontSize="small" /> Organization Profile
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={2.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">COMPANY NAME</Typography>
                    <Typography variant="body1" fontWeight="bold">{company.name || 'Not Scanned'}</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">INDUSTRY</Typography>
                    <Chip label={company.industry || 'Unknown'} color="secondary" size="small" sx={{ mt: 0.5 }} />
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">CORE PROFILE</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ lineHeight: 1.6 }}>
                      {company.description || 'No profile description found.'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Contact Details */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={3} color="secondary" display="flex" alignItems="center" gap={1}>
                  <Mail fontSize="small" /> Extract Contacts
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={3}>
                  {/* Emails */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>EMAILS</Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {contacts.emails && contacts.emails.length > 0 ? (
                        contacts.emails.map((email, idx) => (
                          <Tooltip title="Click to Copy" key={idx}>
                            <Chip
                              icon={<Mail sx={{ fontSize: 14 }} />}
                              label={email}
                              variant="outlined"
                              onClick={() => copyToClipboard(email)}
                              onDelete={() => copyToClipboard(email)}
                              deleteIcon={<ContentCopy sx={{ fontSize: 12 }} />}
                              sx={{ cursor: 'pointer' }}
                            />
                          </Tooltip>
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">No emails discovered.</Typography>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Phones */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>PHONE NUMBERS</Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {contacts.phones && contacts.phones.length > 0 ? (
                        contacts.phones.map((phone, idx) => (
                          <Tooltip title="Click to Copy" key={idx}>
                            <Chip
                              icon={<Phone sx={{ fontSize: 14 }} />}
                              label={phone}
                              variant="outlined"
                              onClick={() => copyToClipboard(phone)}
                              onDelete={() => copyToClipboard(phone)}
                              deleteIcon={<ContentCopy sx={{ fontSize: 12 }} />}
                              sx={{ cursor: 'pointer' }}
                            />
                          </Tooltip>
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">No phone numbers discovered.</Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Address */}
                  {contacts.address && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">OFFICE ADDRESS</Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <LocationOn sx={{ color: 'text.secondary', fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                          {contacts.address}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Socials */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>SOCIAL NETWORKS</Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {contacts.social_links && contacts.social_links.length > 0 ? (
                        contacts.social_links.map((link, idx) => {
                          const domain = new URL(link).hostname.replace('www.', '');
                          return (
                            <Button
                              key={idx}
                              variant="outlined"
                              size="small"
                              startIcon={<Share sx={{ fontSize: 12 }} />}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ borderRadius: 4, py: 0.25, px: 1, fontSize: '0.75rem' }}
                            >
                              {domain}
                            </Button>
                          );
                        })
                      ) : (
                        <Typography variant="caption" color="text.secondary">No social media links indexed.</Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
export default AnalyticsPanel;
