import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  Button,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AutoFixHigh as AIGCIcon,
  FolderOpen as AssetManagerIcon,
  Campaign as AdsManagerIcon,
  Category as TemplatesIcon,
  BarChart as AnalyticsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
  Assessment as ReportIcon,
  People as UserGroupsIcon,
  LocalOffer as TagsIcon,
  CardGiftcard as RewardsIcon,
  Settings as SettingsIcon,
  Brush as AdsStudioIcon,
  Lightbulb as LightbulbIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { logout } from '../features/auth/authSlice';

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const MainContent = styled('main', { shouldForwardProp: (prop) => prop !== 'sidebarOpen' && prop !== 'sidebarCollapsed' })(
  ({ theme, sidebarOpen, sidebarCollapsed }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    marginLeft: 0,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: sidebarOpen 
      ? sidebarCollapsed 
        ? `calc(100% - ${collapsedDrawerWidth}px)` 
        : `calc(100% - ${drawerWidth}px)`
      : '100%',
  }),
);

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#000',
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
}));

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'collapsed' })(
  ({ theme, collapsed }) => ({
    width: collapsed ? collapsedDrawerWidth : drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      width: collapsed ? collapsedDrawerWidth : drawerWidth,
      boxSizing: 'border-box',
      backgroundColor: '#f5f5f5',
      borderRight: '1px solid #e0e0e0',
      marginTop: 64, // AppBar height
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      overflowX: 'hidden',
    },
  })
);

// Styled component for logo fallback
const LogoFallback = styled(Box)(({ theme }) => ({
  backgroundColor: '#000',
  color: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontWeight: 'bold',
  fontSize: '14px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  marginRight: theme.spacing(1),
}));

// Toggle button for collapsing sidebar
const CollapseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: -12,
  top: 12,
  zIndex: 1200,
  backgroundColor: '#f5f5f5',
  border: '1px solid #e0e0e0',
  '&:hover': {
    backgroundColor: '#e0e0e0',
  },
}));

// Menu items for top navigation
const TopMenuItems = [
  { text: 'Home', path: '/' },
  { text: 'CRM', path: '/crm' },
  { text: 'Report', path: '/report' },
  { text: 'Campaign', path: '/campaign' },
  { text: 'Ads Studio', path: '/ads-studio' },
  { text: 'User Engagement', path: '/user-engagement' },
  { text: 'User Tagging', path: '/user-tagging' },
  { text: 'Rewards Platform', path: '/rewards' },
  { text: 'Approval Center', path: '/approval' }
];

// Sidebar content for different sections
const SidebarContent = {
  '/user-tagging': [
    { text: 'User groups', icon: <UserGroupsIcon />, path: '/user-groups' },
    { text: 'User tags', icon: <TagsIcon />, path: '/user-tags' },
    { text: 'User persona', icon: <PersonIcon />, path: '/user-persona' }
  ],
  '/ads-studio': [
    { text: 'AIGC', icon: <AIGCIcon />, path: '/ads-studio/aigc', 
      subItems: [
        { text: 'AI Image', path: '/ads-studio/aigc/ai-image' },
        { text: 'AI Video', path: '/ads-studio/aigc/ai-video' }
      ] 
    },
    { text: 'Asset Manager', icon: <AssetManagerIcon />, path: '/ads-studio/asset-manager',
      subItems: [
        { text: 'Asset Library', path: '/ads-studio/asset-manager/library' },
        { text: 'Approval Flow', path: '/ads-studio/asset-manager/approval-flow' },
        { text: 'My Approvals', path: '/ads-studio/asset-manager/my-approvals' }
      ]
    },
    { text: 'Ads Manager', icon: <AdsManagerIcon />, path: '/ads-studio/ads-manager',
      subItems: [
        { text: 'Ads Builder', path: '/ads-studio/ads-manager/ads-builder' },
        { text: 'Automated Rules', path: '/ads-studio/ads-manager/automated-rules' }
      ]
    },
    { text: 'Idea Bank', icon: <LightbulbIcon />, path: '/ads-studio/idea-bank',
      subItems: [
        { text: 'Content Angles', path: '/ads-studio/idea-bank/content-angles' },
        { text: 'Market Trends', path: '/ads-studio/idea-bank/trends' }
      ]
    },
    { text: 'Templates', icon: <TemplatesIcon />, path: '/ads-studio/templates',
      subItems: [
        { text: 'ComfyUI', path: '/ads-studio/templates/comfy' }
      ]
    },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/ads-studio/analytics',
      subItems: [
        { text: 'Performance', path: '/ads-studio/analytics/performance' },
        { text: 'Reports', path: '/ads-studio/analytics/reports' }
      ]
    }
  ]
};

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [expandedItems, setExpandedItems] = useState({});
  const [logoError, setLogoError] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null); // For user dropdown menu
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // New state for collapsible sidebar

  // Find active tab index based on current path
  const getActiveTabIndex = () => {
    const path = location.pathname;
    // Check if path starts with any of the top menu paths
    for (let i = 0; i < TopMenuItems.length; i++) {
      if (path === TopMenuItems[i].path || path.startsWith(`${TopMenuItems[i].path}/`)) {
        return i;
      }
    }
    return 0; // Default to Home
  };

  const activeTab = getActiveTabIndex();

  // Check if sidebar should be shown (only for Ads Studio or User Tagging)
  const shouldShowSidebar = () => {
    const path = location.pathname;
    return path.startsWith('/ads-studio') || path.startsWith('/user-tagging');
  };

  const sidebarOpen = shouldShowSidebar();

  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const toggleExpand = (item) => {
    setExpandedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  // Determine which sidebar items to show based on the current path
  const getSidebarItems = () => {
    const path = location.pathname;
    
    // Check if we have a specific sidebar for this path
    for (const [key, value] of Object.entries(SidebarContent)) {
      if (path.startsWith(key)) {
        return value;
      }
    }
    
    return []; // No sidebar items if not matching
  };

  const sidebarItems = getSidebarItems();

  // Get current section name for the header
  const getCurrentSectionName = () => {
    const path = location.pathname;
    
    // Don't display heading for AI Image page
    if (path === '/ads-studio/aigc/ai-image') return null;
    
    if (path.startsWith('/ads-studio')) {
      if (path.includes('/aigc')) return 'AIGC';
      if (path.includes('/asset-manager')) return 'Asset Manager';
      if (path.includes('/ads-manager')) return 'Ads Manager';
      if (path.includes('/idea-bank')) return 'Idea Bank';
      if (path.includes('/templates')) return 'Templates';
      if (path.includes('/analytics')) return 'Analytics';
      return 'Ads Studio Dashboard';
    }
    
    if (path.includes('user-tagging')) return 'Manage user tags';
    if (path.includes('user-groups')) return 'Manage user groups';
    if (path.includes('user-persona')) return 'User persona';
    
    if (path === '/crm') return 'CRM Dashboard';
    if (path === '/report') return 'Reports Dashboard';
    if (path === '/campaign') return 'Campaign Dashboard';
    if (path === '/user-engagement') return 'User Engagement Dashboard';
    if (path === '/rewards') return 'Rewards Platform Dashboard';
    if (path === '/approval') return 'Approval Center Dashboard';
    
    return 'Dashboard'; // Default
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <StyledAppBar position="fixed">
        <Toolbar>
          {/* Logo */}
          <Box 
            component="div"
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              mr: 3
            }}
          >
            {logoError ? (
              <LogoFallback>OKX</LogoFallback>
            ) : (
              <Box 
                component="img" 
                src="/images/logo.png" 
                alt="OKX Platform" 
                sx={{ height: 28, mr: 1 }}
                onError={handleLogoError}
              />
            )}
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              PLATFORM
            </Typography>
          </Box>
          
          {/* Horizontal Navigation Menu */}
          <Box sx={{ flexGrow: 1 }}>
            <Tabs 
              value={activeTab} 
              textColor="inherit"
              TabIndicatorProps={{
                style: {
                  backgroundColor: '#fff',
                }
              }}
            >
              {TopMenuItems.map((item, index) => (
                <Tab 
                  key={item.text} 
                  label={item.text} 
                  component={Link} 
                  to={item.path}
                  sx={{ 
                    color: '#fff',
                    minWidth: 'auto',
                    padding: '12px 16px',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: activeTab === index ? 'bold' : 'normal',
                    '&:hover': {
                      opacity: 0.9
                    }
                  }}
                />
              ))}
            </Tabs>
          </Box>
          
          {/* Right Section - Language, Notifications, User */}
          <IconButton color="inherit">
            <LanguageIcon />
          </IconButton>
          
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
          
          <IconButton 
            onClick={handleUserMenuOpen}
            sx={{ ml: 2 }}
          >
            <Avatar 
              alt={user?.username || 'User'} 
              src={user?.avatar}
            />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleUserMenuClose}>Profile</MenuItem>
            <MenuItem onClick={handleUserMenuClose}>Settings</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </StyledAppBar>
      
      {/* Sidebar - only show when in Ads Studio or User Tagging */}
      {sidebarOpen && (
        <Box sx={{ position: 'relative' }}>
          <StyledDrawer
            variant="permanent"
            anchor="left"
            collapsed={sidebarCollapsed}
          >
            {/* Sidebar Toggle Button */}
            <CollapseButton 
              size="small" 
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </CollapseButton>
            
            {sidebarItems.map((item) => (
              <React.Fragment key={item.text}>
                <ListItem disablePadding sx={{ mb: 1 }}>
                  {item.subItems ? (
                    <Tooltip title={sidebarCollapsed ? item.text : ""} placement="right">
                      <ListItemButton 
                        onClick={() => toggleExpand(item.text)}
                        sx={{
                          borderRadius: '4px',
                          mx: 1,
                          justifyContent: sidebarCollapsed ? 'center' : 'initial',
                          minHeight: 48,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 36, mr: sidebarCollapsed ? 0 : 2 }}>
                          {item.icon}
                        </ListItemIcon>
                        {!sidebarCollapsed && <ListItemText primary={item.text} />}
                      </ListItemButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title={sidebarCollapsed ? item.text : ""} placement="right">
                      <ListItemButton 
                        component={Link} 
                        to={item.path}
                        selected={location.pathname === item.path}
                        sx={{
                          borderRadius: '4px',
                          mx: 1,
                          justifyContent: sidebarCollapsed ? 'center' : 'initial',
                          minHeight: 48,
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(0, 0, 0, 0.08)',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.12)',
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 36, mr: sidebarCollapsed ? 0 : 2 }}>
                          {item.icon}
                        </ListItemIcon>
                        {!sidebarCollapsed && <ListItemText primary={item.text} />}
                      </ListItemButton>
                    </Tooltip>
                  )}
                </ListItem>
                
                {!sidebarCollapsed && item.subItems && expandedItems[item.text] && (
                  <List disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <ListItemButton 
                          component={Link} 
                          to={subItem.path}
                          selected={location.pathname === subItem.path}
                          sx={{
                            pl: 4,
                            borderRadius: '4px',
                            mx: 1,
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(0, 0, 0, 0.08)',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.12)',
                              },
                            },
                          }}
                        >
                          <ListItemText primary={subItem.text} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </React.Fragment>
            ))}
          </StyledDrawer>
        </Box>
      )}
      
      {/* Main Content */}
      <MainContent sidebarOpen={sidebarOpen} sidebarCollapsed={sidebarCollapsed}>
        <Toolbar /> {/* Add space for the AppBar */}
        
        {/* Page Header */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          mt: 1
        }}>
          {getCurrentSectionName() && (
            <Typography variant="h5" component="h1">
              {getCurrentSectionName()}
            </Typography>
          )}
          
          {/* Action buttons can be conditionally rendered here based on the current path */}
          {location.pathname.includes('user-groups') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonIcon />}
              sx={{ 
                bgcolor: '#000', 
                '&:hover': { bgcolor: '#333' } 
              }}
            >
              Create user group
            </Button>
          )}
        </Box>
        
        {children}
      </MainContent>
    </Box>
  );
};

export default Layout; 