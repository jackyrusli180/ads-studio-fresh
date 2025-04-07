import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Divider, 
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  MonetizationOn as TokenIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Article as ArticleIcon,
  Code as CodeIcon
} from '@mui/icons-material';

const IdeaBankTokenListings = () => {
  const [lyzrListings, setLyzrListings] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);
  const [completeResponse, setCompleteResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('processed');

  // Get auth token from localStorage
  const getAuthToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access_token;
  };

  // Fetch token listings from Lyzr agent
  const fetchLyzrTokenListings = async (useStored = true) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      
      // Build request options
      const options = {
        params: { use_stored: useStored }
      };
      
      // Only add auth header if token is available
      if (token) {
        options.headers = {
          'Authorization': `Bearer ${token}`
        };
      }

      const response = await axios.get('/api/integrations/lyzr/token-listings/', options);
      
      // Save the raw response
      if (response.data.raw_response) {
        setRawResponse(response.data.raw_response);
        
        // Parse the raw response to extract tokens
        const parsedTokens = parseTokensFromResponse(response.data.raw_response);
        
        console.log('Parsed tokens:', parsedTokens);
        
        // Create a compatible data structure with our UI
        setLyzrListings({
          analyses: [{
            processed: { tokens: parsedTokens },
            raw_content: response.data.raw_response.response || JSON.stringify(response.data.raw_response),
            timestamp: new Date().toISOString()
          }],
          source: response.data.source
        });
      } else if (response.data.analyses) {
        // Handle stored analyses - ensure they have processed tokens
        const updatedAnalyses = response.data.analyses.map(analysis => {
          // If analysis has raw_content but no processed tokens, parse the raw content
          if (analysis.raw_content && (!analysis.processed || !analysis.processed.tokens || analysis.processed.tokens.length === 0)) {
            const rawResponseObj = { response: analysis.raw_content };
            const parsedTokens = parseTokensFromResponse(rawResponseObj);
            
            return {
              ...analysis,
              processed: { tokens: parsedTokens }
            };
          }
          return analysis;
        });
        
        setLyzrListings({
          ...response.data,
          analyses: updatedAnalyses
        });
      } else {
        setError('No valid token data found in the response');
      }
      
      // Save complete response if available
      if (response.data?.complete_response) {
        setCompleteResponse(response.data.complete_response);
      }
    } catch (err) {
      console.error('Error fetching Lyzr token listings:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch token listings');
    } finally {
      setLoading(false);
    }
  };

  // Trigger sync of token listings from Lyzr agent
  const syncLyzrTokenListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      
      // Build request options
      const options = {};
      
      // Only add auth header if token is available
      if (token) {
        options.headers = {
          'Authorization': `Bearer ${token}`
        };
      }

      const response = await axios.post('/api/integrations/lyzr/token-listings/', {}, options);
      
      // After sync, fetch the updated data
      fetchLyzrTokenListings(true);
    } catch (err) {
      console.error('Error syncing Lyzr token listings:', err);
      setError(err.response?.data?.error || err.message || 'Failed to sync token listings');
      setLoading(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    await fetchLyzrTokenListings(false); // Force live data
  };

  // Handle tab change
  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  // Add a function to parse tokens from the raw response
  const parseTokensFromResponse = (rawResponse) => {
    try {
      // Extract the content from the response
      let content = '';
      if (rawResponse.response && typeof rawResponse.response === 'string') {
        content = rawResponse.response;
      } else if (rawResponse.response && rawResponse.response.content) {
        content = rawResponse.response.content;
      } else {
        console.warn('Could not find content in raw response');
        return [];
      }
      
      const tokens = [];
      
      // Try to find token sections using regex - improved pattern to catch more token formats
      const tokenSectionRegex = /###\s*Token\s*\d+:\s*(?:\*\*)?([^(*\n]+)(?:\(([^)]+)\))?(?:\*\*)?/g;
      let match;
      const sections = [];
      
      // First, find all token sections and their positions
      while ((match = tokenSectionRegex.exec(content)) !== null) {
        sections.push({
          index: match.index,
          name: match[1].trim(),
          symbol: match[2] ? match[2].trim() : null,
          startPos: match.index + match[0].length
        });
      }
      
      console.log('Found token sections:', sections);
      
      // Now process each section with correct start/end positions
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const endPos = i < sections.length - 1 ? sections[i + 1].index : content.length;
        const sectionText = content.substring(section.startPos, endPos).trim();
        
        // Extract key data from the section text
        const token = {
          name: section.name,
          symbol: section.symbol,
          listing_date: extractValueByLabel(sectionText, 'Listing Date'),
          category: extractValueByLabel(sectionText, 'Category'),
          key_points: extractBulletPoints(sectionText, 'Key Selling Points'),
          target_audience: extractBulletPoints(sectionText, 'Target Audience'),
          visual_concepts: extractVisualConcepts(sectionText)
        };
        
        // If no visual concepts were found using the standard pattern, try alternative patterns
        if (token.visual_concepts.length === 0) {
          token.visual_concepts = extractAlternativeVisualConcepts(sectionText);
        }
        
        console.log('Processed token:', token);
        tokens.push(token);
      }
      
      // If no tokens found, fall back to a simpler approach
      if (tokens.length === 0) {
        console.warn('No tokens found with primary method, trying fallback');
        // Find text like **TOKEN (SYMBOL)**
        const simpleBoldTokenRegex = /\*\*([^*]+?)\s*\(([^)]+)\)\*\*/g;
        while ((match = simpleBoldTokenRegex.exec(content)) !== null) {
          const name = match[1].trim();
          const symbol = match[2].trim();
          
          // Skip common labels
          if (['listing date', 'category', 'key points', 'target audience'].includes(name.toLowerCase())) {
            continue;
          }
          
          tokens.push({
            name,
            symbol,
            listing_date: null,
            category: null,
            key_points: [],
            visual_concepts: []
          });
        }
      }
      
      return tokens;
    } catch (error) {
      console.error('Error parsing tokens from response:', error);
      return [];
    }
  };

  // Helper function to extract values by label
  const extractValueByLabel = (text, label) => {
    const regex = new RegExp(`\\*\\*${label}\\*\\*:\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  // Helper function to extract bullet points
  const extractBulletPoints = (text, section) => {
    // Find the section
    const sectionRegex = new RegExp(`\\*\\*${section}\\*\\*:([\\s\\S]*?)(?=\\*\\*|####|$)`, 'i');
    const sectionMatch = text.match(sectionRegex);
    
    if (!sectionMatch) return [];
    
    const sectionText = sectionMatch[1].trim();
    const bulletPoints = [];
    
    // Extract bullet points (lines starting with -)
    const bulletRegex = /-\s*([^\n]+)/g;
    let bulletMatch;
    
    while ((bulletMatch = bulletRegex.exec(sectionText)) !== null) {
      const point = bulletMatch[1].replace(/\*\*|\*/g, '').trim();
      if (point) {
        bulletPoints.push(point);
      }
    }
    
    // If no bullet points found but there's content, treat the whole text as one item
    if (bulletPoints.length === 0 && sectionText.length > 0) {
      const cleanText = sectionText.replace(/\*\*|\*/g, '').trim();
      if (cleanText) {
        // If there are line breaks, split by line
        if (cleanText.includes('\n')) {
          const lines = cleanText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          if (lines.length > 0) {
            bulletPoints.push(...lines);
          }
        } else {
          bulletPoints.push(cleanText);
        }
      }
    }
    
    return bulletPoints;
  };

  // Helper function to extract visual concepts
  const extractVisualConcepts = (text) => {
    const concepts = [];
    const conceptRegex = /####\s*Visual Concept\s*(\d+):([\s\S]*?)(?=####|$)/g;
    let conceptMatch;
    
    while ((conceptMatch = conceptRegex.exec(text)) !== null) {
      const number = conceptMatch[1];
      const conceptText = conceptMatch[2].trim();
      
      const concept = {
        title: `Visual Concept ${number}`,
        headline: extractValueByLabel(conceptText, 'Headline')?.replace(/"/g, ''),
        subheadline: extractValueByLabel(conceptText, 'Subheadline')?.replace(/"/g, ''),
        description: extractValueByLabel(conceptText, 'Description')
      };
      
      concepts.push(concept);
    }
    
    return concepts;
  };

  // Additional helper to extract visual concepts using alternative patterns
  const extractAlternativeVisualConcepts = (text) => {
    const concepts = [];
    
    // Try alternative pattern: sections starting with **Visual Concept**
    const altConceptRegex = /\*\*Visual Concept\s*(\d+|\w+)\*\*([\s\S]*?)(?=\*\*Visual Concept|\*\*Target Audience|\*\*Key Selling Points|$)/g;
    let conceptMatch;
    
    while ((conceptMatch = altConceptRegex.exec(text)) !== null) {
      const number = conceptMatch[1];
      const conceptText = conceptMatch[2].trim();
      
      // For this pattern, we might need to look for different labeling
      const headline = extractValueByRegex(conceptText, /Headline[:\s]*([^\n]+)/i);
      const subheadline = extractValueByRegex(conceptText, /Subheadline[:\s]*([^\n]+)/i);
      const description = extractMultilineText(conceptText, /Description[:\s]*([\s\S]+?)(?=\*\*|$)/i);
      
      const concept = {
        title: `Visual Concept ${number}`,
        headline: headline?.replace(/"/g, ''),
        subheadline: subheadline?.replace(/"/g, ''),
        description: description
      };
      
      concepts.push(concept);
    }
    
    return concepts;
  };
  
  // Helper for alternative pattern matching
  const extractValueByRegex = (text, regex) => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };
  
  // Helper for multiline text extraction
  const extractMultilineText = (text, regex) => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  // Initial data load
  useEffect(() => {
    fetchLyzrTokenListings(true); // Default to stored data
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TokenIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5">New Token Listings</Typography>
            <AIIcon sx={{ ml: 1, color: 'secondary.main' }} />
          </Box>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={handleRefresh}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AIIcon />} 
              onClick={syncLyzrTokenListings}
              disabled={loading}
              color="secondary"
            >
              Analyze New Tokens
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            AI-powered token listings analysis using Lyzr
          </Typography>
          <Tooltip title="Lyzr uses AI to analyze new token listings from OKX and provide recommendations">
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : (
          <Box>
            {lyzrListings?.analyses?.length > 0 ? (
              <Box>
                <Tabs 
                  value={viewMode} 
                  onChange={handleViewModeChange} 
                  sx={{ mb: 2 }}
                  textColor="secondary"
                  indicatorColor="secondary"
                >
                  <Tab value="processed" label="Processed View" icon={<TokenIcon />} iconPosition="start" />
                  <Tab value="raw" label="Raw Analysis" icon={<ArticleIcon />} iconPosition="start" />
                  {completeResponse && (
                    <Tab value="complete" label="Complete Response" icon={<CodeIcon />} iconPosition="start" />
                  )}
                </Tabs>
                
                {viewMode === 'processed' ? (
                  <Grid container spacing={2}>
                    {lyzrListings.analyses.map((analysis, index) => {
                      // Check if there are processed tokens
                      const hasProcessedTokens = analysis.processed?.tokens && analysis.processed.tokens.length > 0;
                      
                      return hasProcessedTokens ? (
                        // Map and render each token as a card
                        analysis.processed.tokens.map((token, tokenIndex) => (
                          <Grid item xs={12} md={12} lg={6} key={`${index}-${tokenIndex}`}>
                            <Card sx={{ 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column',
                              borderTop: '3px solid #6200EA'
                            }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Box>
                                    <Typography variant="h5" component="div" gutterBottom>
                                      {token.name}
                                    </Typography>
                                    {token.symbol && (
                                      <Chip 
                                        label={token.symbol} 
                                        size="small" 
                                        color="primary" 
                                        sx={{ mt: 0.5, mr: 1 }}
                                      />
                                    )}
                                    {token.listing_date && (
                                      <Chip 
                                        label={`Listed: ${token.listing_date}`} 
                                        size="small" 
                                        color="secondary" 
                                        sx={{ mt: 0.5 }}
                                      />
                                    )}
                                  </Box>
                                  <Tooltip title="AI-powered analysis">
                                    <AIIcon color="secondary" />
                                  </Tooltip>
                                </Box>
                                
                                <Divider sx={{ my: 1.5 }} />
                                
                                {/* Token Analysis Section */}
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="subtitle1" color="primary.dark" gutterBottom>
                                    <strong>Token Analysis</strong>
                                  </Typography>
                                  
                                  {token.category && (
                                    <Typography variant="body2" gutterBottom>
                                      <strong>Category:</strong> {token.category}
                                    </Typography>
                                  )}
                                  
                                  {token.key_points && token.key_points.length > 0 && (
                                    <>
                                      <Typography variant="body2" gutterBottom>
                                        <strong>Key Selling Points:</strong>
                                      </Typography>
                                      <List dense sx={{ pl: 2, mb: 1 }}>
                                        {token.key_points.map((point, idx) => (
                                          <ListItem key={idx} sx={{ py: 0 }}>
                                            <ListItemText 
                                              primary={`• ${point}`}
                                              primaryTypographyProps={{ variant: 'body2' }}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </>
                                  )}
                                  
                                  {/* Render target audience - handle both string and array formats */}
                                  {token.target_audience && (
                                    <>
                                      <Typography variant="body2" gutterBottom>
                                        <strong>Target Audience:</strong>
                                      </Typography>
                                      {Array.isArray(token.target_audience) && token.target_audience.length > 0 ? (
                                        <List dense sx={{ pl: 2, mb: 1 }}>
                                          {token.target_audience.map((audience, idx) => (
                                            <ListItem key={idx} sx={{ py: 0 }}>
                                              <ListItemText 
                                                primary={`• ${audience}`}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                              />
                                            </ListItem>
                                          ))}
                                        </List>
                                      ) : (
                                        <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
                                          {token.target_audience}
                                        </Typography>
                                      )}
                                    </>
                                  )}
                                </Box>
                                
                                {/* Visual Concepts Section */}
                                {token.visual_concepts && token.visual_concepts.length > 0 && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle1" color="primary.dark" gutterBottom>
                                      <strong>Marketing Concepts</strong>
                                    </Typography>
                                    
                                    {token.visual_concepts.map((concept, idx) => (
                                      <Card key={idx} variant="outlined" sx={{ mb: 2, bgcolor: '#f8f7ff' }}>
                                        <CardContent sx={{ pb: 1 }}>
                                          <Typography variant="subtitle2" color="secondary.dark" gutterBottom>
                                            {concept.title || `Concept ${idx + 1}`}
                                          </Typography>
                                          
                                          {concept.headline && (
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                              "{concept.headline}"
                                            </Typography>
                                          )}
                                          
                                          {concept.subheadline && (
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                              {concept.subheadline}
                                            </Typography>
                                          )}
                                          
                                          {concept.description && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                              {concept.description}
                                            </Typography>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </Box>
                                )}
                                
                                {/* Generate Button */}
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                  <Button 
                                    variant="contained" 
                                    size="small" 
                                    startIcon={<AIIcon />} 
                                    color="secondary"
                                  >
                                    Generate Ad
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      ) : (
                        // Display message when no tokens are found in the processed data
                        <Grid item xs={12} key={`empty-${index}`}>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            No processed tokens found for this analysis. The data format may not match the expected pattern.
                          </Alert>
                        </Grid>
                      );
                    })}
                  </Grid>
                ) : viewMode === 'raw' ? (
                  <Box>
                    {lyzrListings.analyses.map((analysis, index) => (
                      <Card key={index} sx={{ mb: 3, bgcolor: '#f5f0ff', borderLeft: '4px solid #6200EA' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" sx={{ color: 'secondary.dark', display: 'flex', alignItems: 'center' }}>
                              <AIIcon sx={{ mr: 1 }} /> Token Analysis
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {analysis.timestamp ? new Date(analysis.timestamp).toLocaleString() : 'Live Data'}
                            </Typography>
                          </Box>
                          <Divider sx={{ mb: 2 }} />
                          <Box sx={{ whiteSpace: 'pre-wrap' }}>
                            {analysis.raw_content || 'No content available'}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  // Complete JSON Response view
                  <Card sx={{ mb: 3, bgcolor: '#f0f8ff', border: '1px solid #ccc' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.dark', display: 'flex', alignItems: 'center' }}>
                        <CodeIcon sx={{ mr: 1 }} /> Complete Lyzr Response
                      </Typography>
                      <Box 
                        component="pre" 
                        sx={{ 
                          overflowX: 'auto', 
                          backgroundColor: '#1e1e1e',
                          color: '#f8f8f8',
                          p: 2,
                          borderRadius: 1,
                          fontSize: '0.8rem',
                          maxHeight: '500px',
                          overflowY: 'auto'
                        }}
                      >
                        {JSON.stringify(completeResponse, null, 2)}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No token listings analysis available yet.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AIIcon />} 
                  onClick={syncLyzrTokenListings}
                  color="secondary"
                  sx={{ mt: 2 }}
                >
                  Generate Now
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default IdeaBankTokenListings; 