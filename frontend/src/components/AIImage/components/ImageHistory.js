import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  InputAdornment,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Popover,
  Badge,
  Divider,
  Tooltip,
  ToggleButton,
  Chip,
  Collapse,
  Paper
} from '@mui/material';
import Masonry from '@mui/lab/Masonry';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Image as ImageIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocalOffer as TagIcon
} from '@mui/icons-material';
import { StyledInput } from '../styles/StyledComponents';
import ImageCard from './ImageCard';
import { getAxiosInstance } from '../utils/apiUtils';

const ImageHistory = ({
  images,
  allImages,
  isAuthenticated,
  searchQuery,
  selectedCategories,
  selectedCreators,
  showLikedOnly,
  onSearchChange,
  onClearSearch,
  onCategoryChange,
  onCreatorChange,
  onLikedFilter,
  onLikeToggle,
  onDownloadImage,
  redirectToLogin,
  onAttributeFilter
}) => {
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [attributeCategories, setAttributeCategories] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAttributeFilters, setShowAttributeFilters] = useState(false);
  const openFilterMenu = Boolean(filterAnchorEl);
  
  // Fetch attribute categories
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const response = await getAxiosInstance().get('/api/aigc/attributes/');
        if (response?.data && Array.isArray(response.data)) {
          setAttributeCategories(response.data);
          
          // Initialize expanded state for each category
          const expanded = {};
          response.data.forEach(category => {
            expanded[category.id] = false;
          });
          setExpandedCategories(expanded);
        } else {
          console.error('Received invalid attribute categories format:', response?.data);
          setAttributeCategories([]); // Initialize with empty array if response is not an array
        }
      } catch (error) {
        console.error('Error fetching attributes:', error);
        setAttributeCategories([]); // Initialize with empty array on error
      }
    };
    
    if (isAuthenticated) {
      fetchAttributes();
    }
  }, [isAuthenticated]);
  
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  // Handle attribute selection
  const handleAttributeToggle = (attribute) => {
    const newSelectedAttributes = [...selectedAttributes];
    const index = newSelectedAttributes.findIndex(a => a.id === attribute.id);
    
    if (index >= 0) {
      // Remove attribute
      newSelectedAttributes.splice(index, 1);
    } else {
      // Add attribute
      newSelectedAttributes.push(attribute);
    }
    
    setSelectedAttributes(newSelectedAttributes);
    onAttributeFilter(newSelectedAttributes);
  };
  
  // Handle clearing all attributes
  const handleClearAllAttributes = () => {
    setSelectedAttributes([]);
    onAttributeFilter([]);
  };
  
  // Calculate active filter count (categories + creators)
  const allCategories = ['Generations', 'Edits', 'Uploads'];
  const activeFilterCount = (
    (selectedCategories.length < allCategories.length ? selectedCategories.length : 0) + 
    (selectedCreators.length > 0 ? selectedCreators.length : 0)
  );
  
  // Get unique creators from all images
  const uniqueCreators = useMemo(() => {
    const creators = allImages.map(img => img.creator).filter(Boolean);
    return [...new Set(creators)].sort();
  }, [allImages]);
  
  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed header section with search bar and filters */}
      <Box 
        sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 10, 
          backgroundColor: 'background.default',
          pb: 2,
          pt: 1,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Header with search and filters */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2
        }}>
          {/* Title */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HistoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle1" fontWeight={500}>
              History
            </Typography>
          </Box>
          
          {/* Search and Filter Controls */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Search bar */}
            <StyledInput
              placeholder="Search images by prompt or creator..."
              value={searchQuery}
              onChange={onSearchChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={onClearSearch}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                width: { xs: '180px', sm: '220px' },
                '& .MuiInputBase-root': {
                  height: '36px'
                }
              }}
            />
            
            {/* Attribute Filter Toggle Button */}
            <Badge 
              badgeContent={selectedAttributes.length || null}
              color="secondary"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
            >
              <ToggleButton
                value="attributes"
                selected={showAttributeFilters}
                onChange={() => setShowAttributeFilters(prev => !prev)}
                size="small"
                color="primary"
                sx={{ 
                  height: '36px', 
                  borderRadius: '4px',
                  borderColor: showAttributeFilters ? 'secondary.main' : 'grey.300',
                }}
              >
                <TagIcon fontSize="small" />
              </ToggleButton>
            </Badge>
            
            {/* Liked Only Toggle Button */}
            <Tooltip title="Show liked images only">
              <ToggleButton
                value="liked"
                selected={showLikedOnly}
                onChange={() => onLikedFilter(!showLikedOnly)}
                size="small"
                color="primary"
                sx={{ 
                  height: '36px', 
                  borderRadius: '4px',
                  borderColor: showLikedOnly ? 'primary.main' : 'grey.300',
                  color: showLikedOnly ? 'error.main' : 'action.active'
                }}
              >
                {showLikedOnly ? 
                  <FavoriteIcon fontSize="small" color="error" /> : 
                  <FavoriteBorderIcon fontSize="small" />
                }
              </ToggleButton>
            </Tooltip>
            
            {/* Filter Button */}
            <Badge 
              badgeContent={activeFilterCount || null} 
              color="primary"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterIcon />}
                onClick={handleFilterClick}
                aria-describedby="filter-menu"
                sx={{ 
                  textTransform: 'none',
                  height: '36px',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                Filter
              </Button>
            </Badge>

            {/* Filter Menu Popover */}
            <Popover
              id="filter-menu"
              open={openFilterMenu}
              anchorEl={filterAnchorEl}
              onClose={handleFilterClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  width: {xs: '250px', sm: '300px'},
                  maxHeight: '400px',
                  overflow: 'auto'
                }
              }}
            >
              <Box sx={{ p: 2 }}>
                {/* Category filters */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <FilterIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Filter by Category
                  </Typography>
                  <FormGroup>
                    {allCategories.map(category => (
                      <FormControlLabel
                        key={category}
                        control={
                          <Checkbox 
                            checked={selectedCategories.includes(category)}
                            onChange={() => onCategoryChange(category)}
                            size="small"
                          />
                        }
                        label={category}
                        sx={{ 
                          '& .MuiTypography-root': { 
                            fontSize: '0.875rem' 
                          }
                        }}
                      />
                    ))}
                  </FormGroup>
                </Box>
                
                {/* Divider between filter types */}
                {uniqueCreators.length > 0 && <Divider sx={{ my: 2 }} />}
                
                {/* Creator filters */}
                {uniqueCreators.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Filter by Creator
                    </Typography>
                    <FormGroup>
                      {uniqueCreators.map(creator => (
                        <FormControlLabel
                          key={creator}
                          control={
                            <Checkbox 
                              checked={selectedCreators.includes(creator)}
                              onChange={() => onCreatorChange(creator)}
                              size="small"
                            />
                          }
                          label={
                            <Tooltip title={creator} arrow>
                              <Typography noWrap sx={{ fontSize: '0.875rem', maxWidth: '200px' }}>
                                {creator}
                              </Typography>
                            </Tooltip>
                          }
                        />
                      ))}
                    </FormGroup>
                  </Box>
                )}
              </Box>
            </Popover>
          </Box>
        </Box>
        
        {/* Attribute Filters Section - Horizontally scrollable */}
        <Collapse in={showAttributeFilters}>
          <Box 
            sx={{ 
              mt: 2, 
              pb: 2,
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '3px',
              }
            }}
          >
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: '8px' 
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Filter by Attributes
              </Typography>
              
              {selectedAttributes.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {selectedAttributes.map(attr => (
                    <Chip
                      key={attr.id}
                      label={attr.name}
                      color="primary"
                      size="small"
                      onDelete={() => handleAttributeToggle(attr)}
                    />
                  ))}
                  {selectedAttributes.length > 0 && (
                    <Chip
                      label="Clear All"
                      variant="outlined"
                      size="small"
                      onClick={handleClearAllAttributes}
                    />
                  )}
                </Box>
              )}
              
              <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2 }}>
                {Array.isArray(attributeCategories) && attributeCategories.map(category => (
                  <Box key={category.id} sx={{ minWidth: '200px' }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                        p: 0.5,
                        borderRadius: 1
                      }}
                      onClick={() => toggleCategoryExpansion(category.id)}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {category.name}
                      </Typography>
                      {expandedCategories[category.id] ? 
                        <ExpandLessIcon fontSize="small" /> : 
                        <ExpandMoreIcon fontSize="small" />
                      }
                    </Box>
                    
                    <Collapse in={expandedCategories[category.id]}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 0.5,
                        pt: 1,
                        pl: 1
                      }}>
                        {category.attributes.map(attribute => (
                          <Chip
                            key={attribute.id}
                            label={attribute.name}
                            size="small"
                            variant={selectedAttributes.some(a => a.id === attribute.id) ? "filled" : "outlined"}
                            color={selectedAttributes.some(a => a.id === attribute.id) ? "primary" : "default"}
                            onClick={() => handleAttributeToggle(attribute)}
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Collapse>
      </Box>
      
      {/* Scrollable content area */}
      <Box 
        sx={{ 
          flexGrow: 1,
          overflowY: 'auto',
          pt: 2,
          height: 'calc(100vh - 200px)',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          }
        }}
      >
        {/* Image masonry grid */}
        {isAuthenticated ? (
          images.length > 0 ? (
            <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2}>
              {images.map((image) => (
                <ImageCard 
                  key={image?.id || Math.random()} 
                  image={image} 
                  onDownload={onDownloadImage}
                  onLikeToggle={onLikeToggle}
                />
              ))}
            </Masonry>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 8 
            }}>
              <ImageIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No images found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Try adjusting your search or filter criteria
              </Typography>
            </Box>
          )
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            py: 8 
          }}>
            <ImageIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Authentication Required
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Please log in to view your image history
            </Typography>
            <Button
              variant="contained"
              onClick={redirectToLogin}
              sx={{ 
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              Log In
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ImageHistory; 