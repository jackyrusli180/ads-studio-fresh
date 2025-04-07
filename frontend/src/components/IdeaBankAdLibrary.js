import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Chip,
  Button,
  Link,
  Alert,
  Paper,
  Avatar,
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from '@mui/material';
import {
  Collections as LibraryIcon,
  OpenInNew as OpenInNewIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  MonetizationOn as SpendIcon,
  Visibility as ImpressionIcon
} from '@mui/icons-material';
import axios from 'axios';

const IdeaBankAdLibrary = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [competitorAds, setCompetitorAds] = useState({});
  const [competitors, setCompetitors] = useState([]);
  const [activeCompetitor, setActiveCompetitor] = useState(0);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchCompetitorAds();
  }, []);

  const fetchCompetitorAds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('access_token');
      
      // Set headers based on token availability
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Fetching competitor ads...');
      const response = await axios.get('http://localhost:8002/api/integrations/meta/competitor-ads/', { headers });
      console.log('Received response:', response.data);
      
      if (response.data && response.data.data) {
        setCompetitorAds(response.data.data);
        
        if (response.data.meta && response.data.meta.competitors) {
          setCompetitors(response.data.meta.competitors);
          if (response.data.meta.competitors.length > 0) {
            setActiveCompetitor(0);
          }
        } else {
          setError('Response missing competitor data.');
        }
      } else {
        setError('Invalid API response format.');
      }
    } catch (err) {
      console.error('Error fetching competitor ads:', err);
      let errorMessage = 'Failed to load ad library data. Please try again later.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', err.response.data);
        console.error('Status code:', err.response.status);
        
        if (err.response.status === 401) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (err.response.status === 404) {
          errorMessage = 'API endpoint not found.';
        } else if (err.response.data && err.response.data.detail) {
          errorMessage = `Error: ${err.response.data.detail}`;
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitorChange = (event, newValue) => {
    setActiveCompetitor(newValue);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  const sortAds = (ads) => {
    if (!ads) return [];
    
    return [...ads].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.ad_delivery_date_start) - new Date(a.ad_delivery_date_start);
      }
      if (sortBy === 'impressions') {
        return (b.impressions_upper || 0) - (a.impressions_upper || 0);
      }
      if (sortBy === 'spend') {
        return (b.spend_upper || 0) - (a.spend_upper || 0);
      }
      return 0;
    });
  };

  const renderPlatformIcons = (platforms) => {
    if (!platforms || platforms.length === 0) return null;
    
    return (
      <Box sx={{ display: 'flex', mt: 1 }}>
        {platforms.includes('facebook') && (
          <Chip 
            icon={<FacebookIcon />} 
            label="Facebook" 
            size="small" 
            sx={{ mr: 1, backgroundColor: '#E9F2FF' }}
          />
        )}
        {platforms.includes('instagram') && (
          <Chip 
            icon={<InstagramIcon />} 
            label="Instagram" 
            size="small" 
            sx={{ backgroundColor: '#FCE9F9' }}
          />
        )}
      </Box>
    );
  };

  const renderMetrics = (ad) => {
    return (
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {ad.impressions_upper && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ImpressionIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }}/>
            <Typography variant="body2" color="text.secondary">
              {formatRange(ad.impressions_lower, ad.impressions_upper)} impressions
            </Typography>
          </Box>
        )}
        {ad.spend_upper && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SpendIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }}/>
            <Typography variant="body2" color="text.secondary">
              {formatRange(ad.spend_lower, ad.spend_upper)} {ad.currency || 'USD'}
            </Typography>
          </Box>
        )}
        {ad.ad_delivery_date_start && (
          <Typography variant="body2" color="text.secondary">
            {new Date(ad.ad_delivery_date_start).toLocaleDateString()}
          </Typography>
        )}
      </Box>
    );
  };

  const formatRange = (lower, upper) => {
    if (!lower && !upper) return 'Unknown';
    if (lower === upper) return formatNumber(lower);
    return `${formatNumber(lower || 0)} - ${formatNumber(upper || 0)}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchCompetitorAds} 
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (competitors.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No competitor ads data available.</Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchCompetitorAds} 
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  const currentCompetitor = competitors[activeCompetitor];
  const sortedAds = sortAds(competitorAds[currentCompetitor]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: '#f9fbe7', mr: 2 }}>
            <LibraryIcon color="primary" />
          </Avatar>
          <Typography variant="h5" component="h1">
            Competitor Ad Library
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={fetchCompetitorAds}
        >
          Refresh Data
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeCompetitor}
          onChange={handleCompetitorChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {competitors.map((competitor, index) => (
            <Tab 
              key={competitor} 
              label={competitor} 
              id={`competitor-tab-${index}`}
              aria-controls={`competitor-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="subtitle1">
          Viewing {sortedAds?.length || 0} ads from {currentCompetitor}
        </Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="sort-by-label">Sort By</InputLabel>
          <Select
            labelId="sort-by-label"
            id="sort-by"
            value={sortBy}
            onChange={handleSortChange}
            label="Sort By"
          >
            <MenuItem value="date">Most Recent</MenuItem>
            <MenuItem value="impressions">Most Impressions</MenuItem>
            <MenuItem value="spend">Highest Spend</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Grid container spacing={3}>
        {sortedAds && sortedAds.length > 0 ? (
          sortedAds.map((ad, index) => (
            <Grid item xs={12} sm={6} md={4} key={`${ad.page_id}-${index}`}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {ad.ad_creative_image_url && (
                  <CardMedia
                    component="img"
                    height="140"
                    image={ad.ad_creative_image_url}
                    alt={`${ad.page_name} ad`}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" component="div" gutterBottom>
                    {ad.page_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ad.ad_creative_text || 'No text available'}
                  </Typography>
                  
                  {renderPlatformIcons(ad.publisher_platforms)}
                  {renderMetrics(ad)}
                  
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    size="small" 
                    endIcon={<OpenInNewIcon />}
                    sx={{ mt: 2 }}
                    component={Link}
                    href={ad.ad_snapshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Ad
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">No ads found for {currentCompetitor}.</Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default IdeaBankAdLibrary; 