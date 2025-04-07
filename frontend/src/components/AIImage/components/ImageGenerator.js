import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  AutoAwesome as AIModelIcon,
  AspectRatio as AspectRatioIcon,
  AddPhotoAlternate as AddImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { StyledInput } from '../styles/StyledComponents';
import { AI_MODELS } from '../config/models';
import GenerationTypeSelector from './GenerationTypeSelector';

const ImageGenerator = ({
  prompt,
  onPromptChange,
  selectedModel,
  selectedAspectRatio,
  selectedGenerationType,
  onSelectGenerationType,
  onModelClick,
  onAspectRatioClick,
  onGenerateImage,
  isGenerating,
  isAuthenticated,
  redirectToLogin,
  referenceImage,
  onReferenceImageChange,
  onError
}) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  
  // Get selected model info
  const selectedModelName = AI_MODELS.find(model => model.id === selectedModel)?.name || '';
  const selectedModelDescription = AI_MODELS.find(model => model.id === selectedModel)?.description || '';
  
  // Determine the generation button text based on the selected generation type
  const getGenerateButtonText = () => {
    if (isGenerating) return <CircularProgress size={24} color="inherit" />;
    if (!isAuthenticated) return 'Log in to Generate';
    
    const typeName = selectedGenerationType?.name || 'Content';
    return `Generate ${typeName}`;
  };

  // Handle reference image upload
  const handleReferenceImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      // Create an image element to check dimensions
      const img = new Image();
      img.onload = () => {
        // Check if image meets minimum dimensions (256x256)
        if (img.width < 256 || img.height < 256) {
          // Use the parent component's error showing mechanism
          onError("Reference image must be at least 256x256 pixels");
          return;
        }
        
        onReferenceImageChange({
          preview: reader.result,
          file: file,
          base64: reader.result.split(',')[1], // Extract base64 data without mime type prefix
          width: img.width,
          height: img.height
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  
  // Clear reference image
  const handleClearReferenceImage = () => {
    onReferenceImageChange(null);
  };
  
  // Determine if reference image upload should be shown (only for image and animated video types)
  const showReferenceImageUpload = ['image', 'animated-video'].includes(selectedGenerationType?.id);

  return (
    <Box>
      <Paper 
        elevation={0}
        sx={{ 
          p: 2, 
          borderRadius: '12px',
          border: `1px solid ${theme.palette.grey[200]}`,
          backgroundColor: theme.palette.grey[50],
          mb: 3
        }}
      >
        {/* Generation Type Selector */}
        <GenerationTypeSelector 
          selectedType={selectedGenerationType}
          onSelectType={onSelectGenerationType}
        />
        
        {/* Model selection button */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            AI Model
          </Typography>
          <Button 
            variant="outlined" 
            fullWidth
            startIcon={<AIModelIcon />}
            onClick={onModelClick}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              justifyContent: 'flex-start',
              py: 1
            }}
          >
            {selectedModelName}
          </Button>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
            {selectedModelDescription}
          </Typography>
        </Box>

        {/* Resolution selection button */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            Resolution
          </Typography>
          <Button 
            variant="outlined" 
            fullWidth
            startIcon={<AspectRatioIcon />}
            onClick={onAspectRatioClick}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              justifyContent: 'flex-start',
              py: 1
            }}
          >
            {selectedAspectRatio.name} ({selectedAspectRatio.value}) - {selectedAspectRatio.width}×{selectedAspectRatio.height}
          </Button>
        </Box>
        
        {/* Reference Image Upload (only for image and animated video) */}
        {showReferenceImageUpload && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              Reference Image (Optional)
            </Typography>
            
            {!referenceImage ? (
              <>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AddImageIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    py: 1
                  }}
                >
                  Upload Reference Image
                </Button>
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleReferenceImageUpload}
                />
              </>
            ) : (
              <Box sx={{ 
                p: 1, 
                border: `1px solid ${theme.palette.grey[300]}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box 
                  component="img"
                  src={referenceImage.preview}
                  alt="Reference"
                  sx={{ 
                    height: '60px',
                    width: 'auto',
                    borderRadius: '4px',
                    objectFit: 'cover'
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                  {referenceImage.file.name}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={handleClearReferenceImage}
                  sx={{ color: theme.palette.error.main }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
              Upload an image to use as reference for style or content
            </Typography>
          </Box>
        )}
        
        {/* Prompt input */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            Prompt
          </Typography>
          <StyledInput
            fullWidth
            multiline
            rows={6}
            placeholder={`Describe the ${selectedGenerationType?.name?.toLowerCase() || 'content'} you want to create in detail...`}
            value={prompt}
            onChange={onPromptChange}
          />
        </Box>
        
        <Button
          variant="contained"
          fullWidth
          disabled={!prompt.trim() || isGenerating || !isAuthenticated}
          onClick={isAuthenticated ? onGenerateImage : redirectToLogin}
          sx={{ 
            borderRadius: '8px',
            textTransform: 'none',
            py: 1.5,
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }}
        >
          {getGenerateButtonText()}
        </Button>
      </Paper>
    </Box>
  );
};

export default ImageGenerator; 