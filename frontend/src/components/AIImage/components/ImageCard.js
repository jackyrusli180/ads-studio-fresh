import React, { useState } from 'react';
import { 
  CardMedia,
  Typography, 
  Box,
  IconButton,
  Skeleton
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Favorite as FavoriteIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  BrokenImage as BrokenImageIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { 
  ImageCard as StyledImageCard, 
  ImageCardOverlay, 
  Creator, 
  TimeStamp,
  CategoryLabel,
  ActionBar 
} from '../styles/StyledComponents';

const ImageCard = ({ image, onDownload, onLikeToggle }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Handle card click to navigate to details page
  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    navigate(`/ads-studio/aigc/creative/${image.id}`);
  };

  // Handle image load success
  const handleImageLoad = () => {
    console.log("Image loaded successfully:", image?.url);
    setImageLoaded(true);
    setImageError(false);
  };

  // Handle image load error
  const handleImageError = () => {
    console.error("Image failed to load:", image?.url);
    setImageError(true);
    setImageLoaded(true); // We still mark as "loaded" to remove skeleton
  };
  
  // Handle like toggle
  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (onLikeToggle && image?.id) {
      onLikeToggle(image.id);
    }
  };

  return (
    <StyledImageCard 
      onClick={handleCardClick}
      sx={{ cursor: 'pointer' }}
    >
      {/* Show skeleton while loading */}
      {!imageLoaded && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={200} 
          animation="wave" 
        />
      )}
      
      {/* Show error state if image failed to load */}
      {imageError && (
        <Box 
          sx={{ 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'grey.100',
            color: 'text.secondary',
            flexDirection: 'column',
            gap: 1,
            p: 2,
            textAlign: 'center'
          }}
        >
          <BrokenImageIcon fontSize="large" />
          <Typography variant="caption">
            Image could not be loaded
          </Typography>
        </Box>
      )}
      
      {/* Actual image */}
      <CardMedia
        component="img"
        height="auto"
        image={image?.url || ''}
        alt={image?.prompt || 'AI Image'}
        sx={{ 
          minHeight: '120px', 
          maxHeight: '280px',
          objectFit: 'cover',
          display: imageError ? 'none' : 'block'
        }}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      <CategoryLabel
        label={image?.category || 'Generated'}
        size="small"
        icon={<CategoryIcon fontSize="small" />}
      />
      
      <ImageCardOverlay className="image-card-overlay">
        <Box>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'white', 
              mb: 1, 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {image?.prompt || 'No prompt available'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {image?.model || 'AI Model'} • {image?.aspectRatio || '1:1'}
          </Typography>
        </Box>
        
        <Box>
          <Creator variant="caption">
            <PersonIcon />
            {image?.creator || 'User'}
          </Creator>
          <TimeStamp variant="caption">
            {image?.timestamp || ''}
          </TimeStamp>
          
          <ActionBar>
            <Box>
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (image?.url) onDownload(image.url);
                }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={(e) => e.stopPropagation()}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box>
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={handleLikeClick}
              >
                {image?.liked ? <FavoriteIcon fontSize="small" color="error" /> : <FavoriteBorderIcon fontSize="small" />}
              </IconButton>
              <IconButton 
                size="small" 
                sx={{ color: 'white' }}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </ActionBar>
        </Box>
      </ImageCardOverlay>
    </StyledImageCard>
  );
};

export default ImageCard; 