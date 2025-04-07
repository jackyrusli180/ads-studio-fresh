import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  Tabs,
  Tab,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  Campaign as CampaignIcon,
  LocationOn as LocationIcon,
  Chat as FeedbackIcon,
  MonetizationOn as TokenIcon,
  Warning as AbnormalIcon,
  Timeline as PriceTrackerIcon,
  Collections as LibraryIcon,
  Cached as EverGreenIcon
} from '@mui/icons-material';
import IdeaBankContentAngles from './IdeaBankContentAngles';
import IdeaBankTrends from './IdeaBankTrends';
import IdeaBankTokenListings from './IdeaBankTokenListings';
import IdeaBankAdLibrary from './IdeaBankAdLibrary';

const IdeaBank = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [market, setMarket] = useState('all');
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [showTokenListings, setShowTokenListings] = useState(false);
  const [showAdLibrary, setShowAdLibrary] = useState(false);

  // Data sources for the Idea Bank
  const dataSources = [
    { 
      name: "Local Market Feedback", 
      icon: <FeedbackIcon />, 
      description: "Direct insights from regional teams about what content works in their markets",
      color: "#e3f2fd"
    },
    { 
      name: "Token Listings", 
      icon: <TokenIcon />, 
      description: "New token launches and listing events that drive user interest",
      color: "#e8f5e9",
      onClick: () => {
        setShowTokenListings(true);
        setShowAdLibrary(false);
        navigate('/ads-studio/idea-bank/token-listings');
      }
    },
    { 
      name: "Trending Topics", 
      icon: <TrendingUpIcon />, 
      description: "Hot industry topics with high engagement across social media and search",
      color: "#fff8e1"
    },
    { 
      name: "Campaigns", 
      icon: <CampaignIcon />, 
      description: "Planned marketing initiatives that need supporting content",
      color: "#f3e5f5"
    },
    { 
      name: "User Ad Comments", 
      icon: <FeedbackIcon />, 
      description: "Feedback and questions from users on existing ads",
      color: "#e1f5fe"
    },
    { 
      name: "Abnormal Events", 
      icon: <AbnormalIcon />, 
      description: "Unusual market activity detected by the growth data team",
      color: "#ffebee"
    },
    { 
      name: "Price Tracker", 
      icon: <PriceTrackerIcon />, 
      description: "Significant price movements that present timely content opportunities",
      color: "#e0f2f1"
    },
    { 
      name: "Ad Libraries", 
      icon: <LibraryIcon />, 
      description: "Competitive analysis of other crypto ads for inspiration",
      color: "#f9fbe7",
      onClick: () => {
        setShowAdLibrary(true);
        setShowTokenListings(false);
        navigate('/ads-studio/idea-bank/ad-library');
      }
    },
    { 
      name: "Evergreen Content", 
      icon: <EverGreenIcon />, 
      description: "Timeless content ideas that can be iterated and refreshed",
      color: "#fbe9e7"
    }
  ];

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    
    if (path.includes('/content-angles')) {
      setActiveTab(0);
      setShowTokenListings(false);
      setShowAdLibrary(false);
    } else if (path.includes('/trends')) {
      setActiveTab(1);
      setShowTokenListings(false);
      setShowAdLibrary(false);
    } else if (path.includes('/token-listings')) {
      setShowTokenListings(true);
      setShowAdLibrary(false);
    } else if (path.includes('/ad-library')) {
      setShowAdLibrary(true);
      setShowTokenListings(false);
    } else {
      // Default to content angles if on the main idea-bank route
      setActiveTab(0);
      setShowTokenListings(false);
      setShowAdLibrary(false);
    }
  }, [location.pathname]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setShowTokenListings(false);
    setShowAdLibrary(false);
    
    // Navigate to the appropriate route based on the selected tab
    if (newValue === 0) {
      navigate('/ads-studio/idea-bank/content-angles');
    } else if (newValue === 1) {
      navigate('/ads-studio/idea-bank/trends');
    }
  };

  const handleMarketChange = (event) => {
    setMarket(event.target.value);
  };

  const handleTimeFrameChange = (event) => {
    setTimeFrame(event.target.value);
  };

  const handleBackToMain = () => {
    setShowTokenListings(false);
    setShowAdLibrary(false);
    navigate('/ads-studio/idea-bank/content-angles');
  };

  // If token listings view is active, show only that component
  if (showTokenListings) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={handleBackToMain} 
              sx={{ mr: 2 }}
            >
              Back to Idea Bank
            </Button>
            <Typography variant="h4" component="h1">
              Token Listings
            </Typography>
          </Box>
        </Box>
        <IdeaBankTokenListings />
      </Box>
    );
  }

  // If ad library view is active, show only that component
  if (showAdLibrary) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={handleBackToMain} 
              sx={{ mr: 2 }}
            >
              Back to Idea Bank
            </Button>
            <Typography variant="h4" component="h1">
              Ad Library
            </Typography>
          </Box>
        </Box>
        <IdeaBankAdLibrary />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Idea Bank
        </Typography>
        <Button variant="contained" color="primary" startIcon={<LightbulbIcon />}>
          Generate New Ideas
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Content Angle Generation Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Streamline and automate the identification of effective "Content Angles" for ads and social media campaigns. 
          The Idea Bank brings together various inputs like token listings, trending topics, campaign launches, 
          and local market feedback to help generate weekly creative ideas by market.
        </Typography>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          Data Sources
        </Typography>
        <Grid container spacing={2}>
          {dataSources.map((source, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  bgcolor: source.color,
                  cursor: source.onClick ? 'pointer' : 'default',
                  '&:hover': source.onClick ? { 
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  } : {}
                }}
                onClick={source.onClick}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 32, height: 32, mr: 1 }}>
                      {source.icon}
                    </Avatar>
                    <Typography variant="subtitle2">
                      {source.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {source.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Content Angles" />
          <Tab label="Market Trends" />
        </Tabs>
      </Box>

      {activeTab === 0 && <IdeaBankContentAngles />}
      {activeTab === 1 && <IdeaBankTrends />}
    </Box>
  );
};

export default IdeaBank; 