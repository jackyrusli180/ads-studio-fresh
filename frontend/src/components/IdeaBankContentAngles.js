import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  Button,
  TextField,
  IconButton,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  OutlinedInput,
  Checkbox,
  ListItemText
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  ContentCopy as ContentCopyIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

const IdeaBankContentAngles = () => {
  const [favorites, setFavorites] = useState({});
  const [sourceFilter, setSourceFilter] = useState([]);
  const [marketFilter, setMarketFilter] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Data sources as defined by the user
  const dataSources = [
    "Local Market Feedback",
    "Token Listings",
    "Trending Topics",
    "Campaigns",
    "User Ad Comments",
    "Abnormal Events",
    "Price Tracker",
    "Ad Libraries",
    "Evergreen Content"
  ];

  const markets = [
    "Global", 
    "APAC", 
    "Americas", 
    "Europe", 
    "Singapore", 
    "Vietnam", 
    "Thailand"
  ];

  // Sample data - would be fetched from API in real implementation
  const contentIdeas = [
    {
      id: 1,
      title: "NFT Utility Beyond Digital Art",
      angle: "How NFTs are transforming access to real-world assets and experiences",
      keyPoints: [
        "NFTs as keys to exclusive events",
        "Real estate tokenization via NFTs",
        "NFT-powered loyalty programs"
      ],
      markets: ["Global", "APAC"],
      category: "Blockchain Innovation",
      generated: "2023-04-05",
      source: "Token Listings",
      aiGenerated: true
    },
    {
      id: 2,
      title: "DeFi Education Series",
      angle: "Breaking down complex DeFi concepts into simple, understandable terms",
      keyPoints: [
        "Explaining yield farming for beginners",
        "How to assess DeFi protocol security",
        "Comparing CeFi and DeFi solutions"
      ],
      markets: ["Americas", "Europe"],
      category: "Education",
      generated: "2023-04-03",
      source: "Evergreen Content",
      aiGenerated: false  
    },
    {
      id: 3,
      title: "Local Crypto Communities",
      angle: "Highlighting grassroots crypto adoption through local community stories",
      keyPoints: [
        "Community-led crypto education initiatives",
        "Local merchants accepting crypto payments",
        "Regional crypto meetups and events"
      ],
      markets: ["Singapore", "Vietnam", "Thailand"],
      category: "Community",
      generated: "2023-04-04",
      source: "Local Market Feedback",
      aiGenerated: true
    },
    {
      id: 4,
      title: "Price Alert Campaign",
      angle: "Leverage significant price movements to engage users with timely campaigns",
      keyPoints: [
        "Alert users to bullish market trends",
        "Promote buy/sell opportunities during volatility",
        "Highlight market analysis during major price changes"
      ],
      markets: ["Global"],
      category: "Market Activity",
      generated: "2023-04-06",
      source: "Price Tracker",
      aiGenerated: true
    },
    {
      id: 5,
      title: "User Sentiment Analysis",
      angle: "Crafting campaigns based on real user feedback from ad comments",
      keyPoints: [
        "Address common user questions in new content",
        "Highlight positive user experiences",
        "Respond to market concerns with educational content"
      ],
      markets: ["APAC", "Americas"],
      category: "User Engagement",
      generated: "2023-04-05",
      source: "User Ad Comments",
      aiGenerated: false
    },
    {
      id: 6,
      title: "Competitor Campaign Analysis",
      angle: "Learning from successful competitor campaigns to improve our approach",
      keyPoints: [
        "Visual style trends in crypto advertising",
        "Message framing that resonates with audiences",
        "Call-to-action effectiveness analysis"
      ],
      markets: ["Global"],
      category: "Competitive Analysis",
      generated: "2023-04-07",
      source: "Ad Libraries",
      aiGenerated: true
    }
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSourceFilterChange = (event) => {
    const {
      target: { value },
    } = event;
    setSourceFilter(typeof value === 'string' ? value.split(',') : value);
  };

  const handleMarketFilterChange = (event) => {
    const {
      target: { value },
    } = event;
    setMarketFilter(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter the ideas based on selected filters and search query
  const filteredIdeas = contentIdeas.filter(idea => {
    // Filter by source
    if (sourceFilter.length > 0 && !sourceFilter.includes(idea.source)) {
      return false;
    }
    
    // Filter by market
    if (marketFilter.length > 0 && !idea.markets.some(market => marketFilter.includes(market))) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        idea.title.toLowerCase().includes(query) ||
        idea.angle.toLowerCase().includes(query) ||
        idea.keyPoints.some(point => point.toLowerCase().includes(query)) ||
        idea.source.toLowerCase().includes(query) ||
        idea.category.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Group ideas by source for the "By Source" tab
  const groupedBySource = dataSources.map(source => ({
    source,
    ideas: contentIdeas.filter(idea => idea.source === source)
  })).filter(group => group.ideas.length > 0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Content Angles
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Browse AI-generated and team-curated content angles for your next marketing campaign
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="source-filter-label">Data Source</InputLabel>
              <Select
                labelId="source-filter-label"
                multiple
                value={sourceFilter}
                onChange={handleSourceFilterChange}
                input={<OutlinedInput label="Data Source" />}
                renderValue={(selected) => selected.join(', ')}
              >
                {dataSources.map((source) => (
                  <MenuItem key={source} value={source}>
                    <Checkbox checked={sourceFilter.indexOf(source) > -1} />
                    <ListItemText primary={source} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="market-filter-label">Market</InputLabel>
              <Select
                labelId="market-filter-label"
                multiple
                value={marketFilter}
                onChange={handleMarketFilterChange}
                input={<OutlinedInput label="Market" />}
                renderValue={(selected) => selected.join(', ')}
              >
                {markets.map((market) => (
                  <MenuItem key={market} value={market}>
                    <Checkbox checked={marketFilter.indexOf(market) > -1} />
                    <ListItemText primary={market} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Search Ideas"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by keyword, market, source..."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs for different views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Ideas" />
          <Tab label="By Source" />
          <Tab label="Favorites" />
        </Tabs>
      </Box>

      {/* All Ideas Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {filteredIdeas.length > 0 ? filteredIdeas.map((idea) => (
            <Grid item xs={12} md={6} key={idea.id}>
              <Card>
                <CardHeader
                  title={idea.title}
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {idea.generated} • {idea.category}
                      </Typography>
                      {idea.aiGenerated && (
                        <Chip 
                          size="small" 
                          label="AI Generated" 
                          sx={{ ml: 1, height: 20, fontSize: '0.625rem' }}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  action={
                    <IconButton onClick={() => toggleFavorite(idea.id)} size="small">
                      {favorites[idea.id] ? 
                        <FavoriteIcon color="error" fontSize="small" /> : 
                        <FavoriteBorderIcon fontSize="small" />
                      }
                    </IconButton>
                  }
                />
                <Divider />
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {idea.angle}
                  </Typography>
                  
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Key Points:
                  </Typography>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {idea.keyPoints.map((point, index) => (
                      <li key={index}>
                        <Typography variant="body2">{point}</Typography>
                      </li>
                    ))}
                  </ul>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Chip 
                      label={idea.source} 
                      size="small"
                      color="primary"
                      sx={{ fontSize: '0.75rem' }}
                    />
                    
                    <Stack direction="row" spacing={1}>
                      {idea.markets.map((market) => (
                        <Chip 
                          key={market} 
                          label={market} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Stack>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <IconButton size="small" sx={{ mr: 1 }} title="Copy to clipboard">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ mr: 1 }} title="Share with team">
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Edit idea">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No ideas match your current filters.
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<FilterListIcon />} 
                  sx={{ mt: 1 }}
                  onClick={() => {
                    setSourceFilter([]);
                    setMarketFilter([]);
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* By Source Tab */}
      {tabValue === 1 && (
        <Box>
          {groupedBySource.map((group) => (
            <Box key={group.source} sx={{ mb: 4 }}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" component="h3">
                  {group.source}
                </Typography>
                <Chip 
                  label={`${group.ideas.length} ideas`} 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              </Box>
              <Grid container spacing={3}>
                {group.ideas.map((idea) => (
                  <Grid item xs={12} md={6} lg={4} key={idea.id}>
                    <Card>
                      <CardHeader
                        title={idea.title}
                        action={
                          <IconButton onClick={() => toggleFavorite(idea.id)} size="small">
                            {favorites[idea.id] ? 
                              <FavoriteIcon color="error" fontSize="small" /> : 
                              <FavoriteBorderIcon fontSize="small" />
                            }
                          </IconButton>
                        }
                      />
                      <Divider />
                      <CardContent>
                        <Typography variant="body2">
                          {idea.angle}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Stack direction="row" spacing={0.5}>
                            {idea.markets.map((market) => (
                              <Chip 
                                key={market} 
                                label={market} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.625rem', height: 20 }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {/* Favorites Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {Object.keys(favorites).filter(id => favorites[id]).length > 0 ? (
            contentIdeas
              .filter(idea => favorites[idea.id])
              .map((idea) => (
                <Grid item xs={12} md={6} key={idea.id}>
                  <Card>
                    <CardHeader
                      title={idea.title}
                      subheader={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {idea.generated} • {idea.category}
                          </Typography>
                        </Box>
                      }
                      action={
                        <IconButton onClick={() => toggleFavorite(idea.id)} size="small">
                          <FavoriteIcon color="error" fontSize="small" />
                        </IconButton>
                      }
                    />
                    <Divider />
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {idea.angle}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Chip 
                          label={idea.source} 
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.75rem' }}
                        />
                        
                        <Stack direction="row" spacing={1}>
                          {idea.markets.map((market) => (
                            <Chip 
                              key={market} 
                              label={market} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  You haven't favorited any ideas yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Click the heart icon on ideas you like to save them here.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<LightbulbIcon />}
          sx={{ mx: 1 }}
        >
          Generate New Ideas
        </Button>
      </Box>
    </Box>
  );
};

export default IdeaBankContentAngles; 