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
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  TextField,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  RemoveCircleOutline as FlatIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  MonetizationOn as TokenIcon,
  Chat as FeedbackIcon,
  Campaign as CampaignIcon,
  Timeline as PriceTrackerIcon,
  Warning as AbnormalIcon,
  Collections as LibraryIcon
} from '@mui/icons-material';

const IdeaBankTrends = () => {
  const [bookmarked, setBookmarked] = useState({});
  const [selectedSource, setSelectedSource] = useState('all');
  const [timeRange, setTimeRange] = useState('week');
  const [tabValue, setTabValue] = useState(0);

  // Data sources as defined by the user that are relevant for trend tracking
  const trendSources = [
    { key: 'all', label: 'All Sources' },
    { key: 'token_listings', label: 'Token Listings', icon: <TokenIcon fontSize="small" /> },
    { key: 'trending_topics', label: 'Trending Topics', icon: <TrendingUpIcon fontSize="small" /> },
    { key: 'local_market', label: 'Local Market Feedback', icon: <FeedbackIcon fontSize="small" /> },
    { key: 'campaigns', label: 'Campaigns', icon: <CampaignIcon fontSize="small" /> },
    { key: 'price_tracker', label: 'Price Tracker', icon: <PriceTrackerIcon fontSize="small" /> },
    { key: 'abnormal_events', label: 'Abnormal Events', icon: <AbnormalIcon fontSize="small" /> },
    { key: 'ad_libraries', label: 'Ad Libraries', icon: <LibraryIcon fontSize="small" /> }
  ];

  // Sample data - would be fetched from API in real implementation
  const marketTrends = [
    {
      id: 1,
      name: "Layer 2 Solutions",
      category: "Blockchain Technology",
      trend: "up",
      percentChange: 38,
      keywords: ["scaling", "ethereum", "optimism", "arbitrum", "polygon"],
      lastUpdated: "2023-04-05",
      source: "trending_topics"
    },
    {
      id: 2,
      name: "Web3 Gaming",
      category: "GameFi",
      trend: "flat",
      percentChange: 2,
      keywords: ["play-to-earn", "metaverse", "nft gaming", "blockchain games"],
      lastUpdated: "2023-04-05",
      source: "trending_topics"
    },
    {
      id: 3,
      name: "DeFi Lending",
      category: "DeFi",
      trend: "down",
      percentChange: -12,
      keywords: ["lending protocols", "borrowing", "yield", "interest rates"],
      lastUpdated: "2023-04-05",
      source: "price_tracker"
    },
    {
      id: 4,
      name: "Zero-Knowledge Proofs",
      category: "Privacy & Scaling",
      trend: "up",
      percentChange: 62,
      keywords: ["zk-rollups", "privacy", "ethereum scaling", "zk-SNARKs"],
      lastUpdated: "2023-04-05",
      source: "trending_topics"
    },
    {
      id: 5,
      name: "SUI Token Launch",
      category: "Token Launch",
      trend: "up",
      percentChange: 125,
      keywords: ["SUI", "new listing", "layer 1", "blockchain"],
      lastUpdated: "2023-04-07",
      source: "token_listings"
    },
    {
      id: 6,
      name: "ETH Shanghai Upgrade",
      category: "Protocol Update",
      trend: "up",
      percentChange: 18,
      keywords: ["ethereum", "protocol", "upgrade", "staking"],
      lastUpdated: "2023-04-06",
      source: "abnormal_events"
    },
    {
      id: 7,
      name: "StarkNet Ecosystem",
      category: "L2 Scaling",
      trend: "up",
      percentChange: 45,
      keywords: ["layer 2", "zk-rollups", "scaling", "ecosystem"],
      lastUpdated: "2023-04-04",
      source: "campaigns"
    }
  ];

  const localMarketInsights = [
    {
      region: "North America",
      trends: [
        { name: "Bitcoin ETF", trending: true, source: "trending_topics" },
        { name: "Crypto Regulation", trending: true, source: "local_market" },
        { name: "Institutional Adoption", trending: true, source: "campaigns" }
      ]
    },
    {
      region: "Europe",
      trends: [
        { name: "MiCA Regulation", trending: true, source: "local_market" },
        { name: "CBDCs", trending: true, source: "trending_topics" },
        { name: "Self-Custody Solutions", trending: false, source: "ad_libraries" }
      ]
    },
    {
      region: "Asia-Pacific",
      trends: [
        { name: "GameFi", trending: true, source: "trending_topics" },
        { name: "Play-to-Earn", trending: false, source: "campaigns" },
        { name: "Mobile Crypto Adoption", trending: true, source: "local_market" }
      ]
    },
    {
      region: "Latin America",
      trends: [
        { name: "Stablecoins", trending: true, source: "price_tracker" },
        { name: "Remittances", trending: true, source: "local_market" },
        { name: "Inflation Hedging", trending: true, source: "abnormal_events" }
      ]
    }
  ];

  // Price alerts from the price tracker
  const priceAlerts = [
    { asset: "Bitcoin", price: "$29,425", change: 2.4, timeframe: "24h", alert: "Key resistance level" },
    { asset: "Ethereum", price: "$1,842", change: -1.2, timeframe: "24h", alert: "Support zone" },
    { asset: "SOL", price: "$21.35", change: 12.8, timeframe: "24h", alert: "Significant breakout" },
    { asset: "XRP", price: "$0.52", change: 5.1, timeframe: "24h", alert: "Legal news catalyst" }
  ];

  // Abnormal events
  const abnormalEvents = [
    { 
      title: "Sudden TVL Increase", 
      description: "Protocol XYZ saw 42% TVL increase in 24 hours", 
      timestamp: "2023-04-07 14:23", 
      priority: "medium" 
    },
    { 
      title: "Unusual Trading Volume", 
      description: "DEX token volume spiked 300% ahead of announcement", 
      timestamp: "2023-04-06 08:15", 
      priority: "high" 
    },
    { 
      title: "Exchange Outflow", 
      description: "Major BTC outflow detected from top 3 exchanges", 
      timestamp: "2023-04-05 22:10", 
      priority: "medium" 
    }
  ];

  const toggleBookmark = (id) => {
    setBookmarked(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSourceChange = (event) => {
    setSelectedSource(event.target.value);
  };

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'up':
        return <ArrowUpwardIcon fontSize="small" sx={{ color: '#4caf50' }} />;
      case 'down':
        return <ArrowDownwardIcon fontSize="small" sx={{ color: '#f44336' }} />;
      default:
        return <FlatIcon fontSize="small" sx={{ color: '#9e9e9e' }} />;
    }
  };

  const getSourceIcon = (source) => {
    const foundSource = trendSources.find(s => s.key === source);
    return foundSource ? foundSource.icon : <TrendingUpIcon fontSize="small" />;
  };

  const getSourceLabel = (source) => {
    const foundSource = trendSources.find(s => s.key === source);
    return foundSource ? foundSource.label : 'Unknown Source';
  };

  // Filter trends based on selected source
  const filteredTrends = selectedSource === 'all' 
    ? marketTrends 
    : marketTrends.filter(trend => trend.source === selectedSource);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Market Trends
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track real-time market trends from multiple data sources to inform your content strategy
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="source-filter-label">Data Source</InputLabel>
              <Select
                labelId="source-filter-label"
                value={selectedSource}
                onChange={handleSourceChange}
                label="Data Source"
              >
                {trendSources.map((source) => (
                  <MenuItem key={source.key} value={source.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {source.icon && <Box sx={{ mr: 1 }}>{source.icon}</Box>}
                      {source.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Search Trends"
              variant="outlined"
              placeholder="Keywords, categories, regions..."
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup
                value={timeRange}
                exclusive
                onChange={handleTimeRangeChange}
                size="small"
              >
                <ToggleButton value="day">
                  24H
                </ToggleButton>
                <ToggleButton value="week">
                  7D
                </ToggleButton>
                <ToggleButton value="month">
                  30D
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs for different views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Global Trends" />
          <Tab label="Regional Insights" />
          <Tab label="Price Alerts" />
          <Tab label="Abnormal Events" />
        </Tabs>
      </Box>

      {/* Global Trends Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Global Crypto & Blockchain Trends" 
                subheader="Updated daily from various data sources"
              />
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Trend</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell align="center">Direction</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell>Keywords</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTrends.map((trend) => (
                      <TableRow key={trend.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {trend.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={trend.category} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getSourceIcon(trend.source)}
                            <Typography variant="body2" sx={{ ml: 0.5 }}>
                              {getSourceLabel(trend.source)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {getTrendIcon(trend.trend)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={
                              trend.percentChange > 0 ? 'success.main' : 
                              trend.percentChange < 0 ? 'error.main' : 'text.secondary'
                            }
                            fontWeight="medium"
                          >
                            {trend.percentChange > 0 ? '+' : ''}{trend.percentChange}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {trend.keywords.slice(0, 2).map((keyword) => (
                              <Chip 
                                key={keyword} 
                                label={keyword} 
                                size="small" 
                                sx={{ height: 20, fontSize: '0.625rem' }}
                              />
                            ))}
                            {trend.keywords.length > 2 && (
                              <Chip 
                                label={`+${trend.keywords.length - 2}`} 
                                size="small" 
                                sx={{ height: 20, fontSize: '0.625rem' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => toggleBookmark(trend.id)}
                          >
                            {bookmarked[trend.id] ? 
                              <BookmarkIcon fontSize="small" color="primary" /> : 
                              <BookmarkBorderIcon fontSize="small" />
                            }
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Regional Insights Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          {localMarketInsights.map((region) => (
            <Grid item xs={12} md={6} key={region.region}>
              <Card sx={{ height: '100%' }}>
                <CardHeader 
                  title={region.region} 
                  subheader="Regional trending topics and feedback"
                />
                <Divider />
                <CardContent>
                  <List dense>
                    {region.trends.map((trend, index) => (
                      <ListItem 
                        key={index}
                        secondaryAction={
                          <Chip 
                            label={getSourceLabel(trend.source)} 
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                            icon={getSourceIcon(trend.source)}
                          />
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {trend.trending ? 
                                <ArrowUpwardIcon fontSize="small" sx={{ color: '#4caf50', mr: 0.5 }} /> : 
                                <FlatIcon fontSize="small" sx={{ color: '#9e9e9e', mr: 0.5 }} />
                              }
                              <Typography variant="body2">{trend.name}</Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small" 
                    startIcon={<TrendingUpIcon />}
                    sx={{ mt: 1 }}
                  >
                    View Full {region.region} Report
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Price Alerts Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Price Alerts" 
                subheader="Dynamic price movements and key price levels"
                action={
                  <Chip 
                    icon={<PriceTrackerIcon />}
                    label="Price Tracker"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                }
              />
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset</TableCell>
                      <TableCell>Current Price</TableCell>
                      <TableCell>24h Change</TableCell>
                      <TableCell>Alert Type</TableCell>
                      <TableCell>Content Opportunity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {priceAlerts.map((alert, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {alert.asset}
                          </Typography>
                        </TableCell>
                        <TableCell>{alert.price}</TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color={alert.change > 0 ? 'success.main' : 'error.main'}
                          >
                            {alert.change > 0 ? '+' : ''}{alert.change}%
                          </Typography>
                        </TableCell>
                        <TableCell>{alert.alert}</TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            Generate Idea
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Abnormal Events Tab */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Abnormal Events" 
                subheader="Unusual market activity that could indicate content opportunities"
                action={
                  <Chip 
                    icon={<AbnormalIcon />}
                    label="Growth Data Team"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                }
              />
              <Divider />
              <List>
                {abnormalEvents.map((event, index) => (
                  <React.Fragment key={index}>
                    <ListItem 
                      alignItems="flex-start"
                      secondaryAction={
                        <Button size="small" variant="outlined">
                          Analyze
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip
                              size="small"
                              label={event.priority}
                              sx={{ 
                                mr: 1, 
                                bgcolor: event.priority === 'high' ? '#ffebee' : '#e8f5e9',
                                color: event.priority === 'high' ? '#c62828' : '#2e7d32',
                                height: 20,
                                fontSize: '0.625rem'
                              }}
                            />
                            <Typography variant="subtitle2">{event.title}</Typography>
                          </Box>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                              {event.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                              Detected: {event.timestamp}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    {index < abnormalEvents.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default IdeaBankTrends; 