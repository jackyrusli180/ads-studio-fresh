import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

// Import components
import ImageGenerator from './components/ImageGenerator';
import ImageHistory from './components/ImageHistory';
import ResolutionDialog from './components/ResolutionDialog';
import ModelDialog from './components/ModelDialog';

// Import config
import { AI_MODELS } from './config/models';
import { RESOLUTIONS } from './config/resolutions';
import { GENERATION_TYPES } from './config/generation-types';

// Import utils
import { getAxiosInstance } from './utils/apiUtils';
import { formatImageUrl, getWidthFromResolution, getHeightFromResolution } from './utils/imageUtils';

const AIImage = () => {
  // State for image generation
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedGenerationType, setSelectedGenerationType] = useState(GENERATION_TYPES[0]);
  const [selectedModel, setSelectedModel] = useState(GENERATION_TYPES[0].modelId);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(RESOLUTIONS[GENERATION_TYPES[0].modelId]?.[0] || RESOLUTIONS['flux-pro-1.1'][0]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  
  // State for image history
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['Generations', 'Edits', 'Uploads']);
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  
  // Dialog states
  const [aspectRatioDialogOpen, setAspectRatioDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  
  // Error handling
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  
  // Other state
  const [generatedImage, setGeneratedImage] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isInputSticky, setIsInputSticky] = useState(false);
  const inputBoxRef = useRef(null);

  // Available resolutions based on selected model
  const availableResolutions = useMemo(() => 
    RESOLUTIONS[selectedModel] || RESOLUTIONS['flux-pro-1.1'], 
    [selectedModel]
  );

  // Update the authentication and image history loading useEffect
  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem('token');
    console.log('Authentication check. Token exists:', !!token);
    
    // Update authentication state
    setIsAuthenticated(!!token);
    
    // Only fetch image history if authenticated
    if (token) {
      try {
        console.log('Fetching image history after authentication check');
        fetchImageHistory();
      } catch (error) {
        console.error('Error in initial image history fetch:', error);
      }
    } else {
      console.log('Not authenticated, skipping image history fetch');
      // Clear images when not authenticated
      setImages([]);
      setFilteredImages([]);
    }
  }, []); // Run once on mount

  // Add a separate effect to force refetch after 1 second
  // This helps with development and ensures data is loaded after hot reloads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        console.log('Performing delayed refetch of image history');
        fetchImageHistory();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Filter images based on search, categories, creators, attributes, and liked status
  useEffect(() => {
    let filtered = [...images];
    
    if (searchQuery) {
      filtered = filtered.filter(
        img => img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
               img.creator?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategories.length > 0 && selectedCategories.length < 3) {
      filtered = filtered.filter(img => selectedCategories.includes(img.category));
    }
    
    if (selectedCreators.length > 0) {
      filtered = filtered.filter(img => selectedCreators.includes(img.creator));
    }
    
    if (showLikedOnly) {
      filtered = filtered.filter(img => img.liked);
    }
    
    if (selectedAttributes.length > 0) {
      // For each selected attribute, check if the image has that attribute
      filtered = filtered.filter(img => {
        // Check that the image has image_attributes property and it's not empty
        if (!img.image_attributes || img.image_attributes.length === 0) {
          return false;
        }
        
        // Check that ALL selected attributes are present in the image
        return selectedAttributes.every(selectedAttr => 
          img.image_attributes.some(imgAttr => 
            imgAttr.attribute.id === selectedAttr.id
          )
        );
      });
    }
    
    setFilteredImages(filtered);
  }, [searchQuery, selectedCategories, selectedCreators, images, showLikedOnly, selectedAttributes]);

  // Update aspect ratio when model changes
  useEffect(() => {
    if (availableResolutions.length > 0) {
      setSelectedAspectRatio(availableResolutions[0]);
    }
  }, [selectedModel, availableResolutions]);

  // Update the model when generation type changes
  useEffect(() => {
    if (selectedGenerationType) {
      const newModel = selectedGenerationType.modelId;
      setSelectedModel(newModel);
      
      // Update aspect ratio if the current one isn't available for this model
      if (RESOLUTIONS[newModel] && RESOLUTIONS[newModel].length > 0) {
        const matchingRatio = RESOLUTIONS[newModel].find(
          res => res.value === selectedAspectRatio.value
        );
        
        if (!matchingRatio) {
          // Set to first available ratio for this model
          setSelectedAspectRatio(RESOLUTIONS[newModel][0]);
        }
      }
    }
  }, [selectedGenerationType]);

  // Add scroll event listener for sticky input
  useEffect(() => {
    const handleScroll = () => {
      if (inputBoxRef.current) {
        const inputPosition = inputBoxRef.current.getBoundingClientRect().top;
        if (inputPosition <= 80) { // 80px is the height of the navbar
          setIsInputSticky(true);
        } else {
          setIsInputSticky(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update the fetchImageHistory function with better error handling
  const fetchImageHistory = async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping image history fetch');
      return;
    }
    
    console.log('Starting to fetch image history...');
    
    try {
      const historyResponse = await getAxiosInstance().get('/api/aigc/image-history/');
      
      console.log('Image history response:', historyResponse);
      
      if (historyResponse?.data && Array.isArray(historyResponse.data.images)) {
        console.log('Raw image count from backend:', historyResponse.data.images.length);
        
        // Map backend data to our frontend format
        const formattedImages = historyResponse.data.images
          .filter(img => img) // Filter out null/undefined entries
          .map(img => {
            console.log('Processing image:', img.id, img.image_url);
            
            // Determine the appropriate category
            let category = 'Generations';
            
            // Check if this is an edited image
            if (img.prompt && img.prompt.includes('[Edited]')) {
              category = 'Edits';
            } 
            // If the model is Gemini (used for edits), categorize as Edits
            else if (img.model_used && img.model_used.includes('gemini')) {
              category = 'Edits';
            }
            // If it's an existing approval status, keep it
            else if (img.status === 'approved' || img.status === 'rejected') {
              category = img.status === 'approved' ? 'Approved' : 'Rejected';
            }
            
            return {
              id: img.id || Math.random().toString(36).substring(2, 11),
              url: formatImageUrl(img.image_url || ''),
              prompt: img.prompt || 'No prompt available',
              creator: img.username || 'You',
              timestamp: img.created_at ? new Date(img.created_at).toLocaleString() : new Date().toLocaleString(),
              category: category,
              aspectRatio: img.resolution || '1:1',
              likes: 0,
              model: img.model_used || 'AI Model',
              width: getWidthFromResolution(img.resolution || '1:1'),
              height: getHeightFromResolution(img.resolution || '1:1'),
              image_attributes: img.image_attributes || []
            };
          });
        
        console.log('Formatted images count:', formattedImages.length);
        setImages(formattedImages);
        setFilteredImages(formattedImages);
      } else {
        // Handle empty or invalid response
        console.warn('Invalid image history response format:', historyResponse);
        setImages([]);
        setFilteredImages([]);
      }
    } catch (error) {
      console.error('Error fetching image history:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      setImages([]);
      setFilteredImages([]);
      
      if (error.response?.status === 403) {
        showErrorMessage('Authentication required. Please log in to view your image history.');
        setIsAuthenticated(false);
        localStorage.removeItem('token'); // Clear invalid token
      } else {
        showErrorMessage('Failed to load image history. Please try again later.');
      }
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Remove the category if it's already selected
        return prev.filter(cat => cat !== category);
      } else {
        // Add the category if it's not selected
        return [...prev, category];
      }
    });
  };

  const handleCreatorChange = (creator) => {
    setSelectedCreators(prev => {
      if (prev.includes(creator)) {
        // Remove the creator if already selected
        return prev.filter(c => c !== creator);
      } else {
        // Add the creator if not selected
        return [...prev, creator];
      }
    });
  };

  const handleLikedFilter = (value) => {
    setShowLikedOnly(value);
  };

  const handleLikeToggle = (imageId) => {
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === imageId 
          ? { ...img, liked: !img.liked } 
          : img
      )
    );
  };

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleReferenceImageChange = (imageData) => {
    setReferenceImage(imageData);
  };

  const handleModelClick = () => {
    setModelDialogOpen(true);
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    setModelDialogOpen(false);
  };

  const handleAspectRatioClick = () => {
    setAspectRatioDialogOpen(true);
  };

  const handleAspectRatioSelect = (resolution) => {
    setSelectedAspectRatio(resolution);
  };

  const handleAspectRatioDialogClose = () => {
    setAspectRatioDialogOpen(false);
  };

  const handleModelDialogClose = () => {
    setModelDialogOpen(false);
  };

  const handleErrorClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowError(false);
  };

  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowError(true);
  };

  const redirectToLogin = () => {
    // Save current page to localStorage
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    // Redirect using window.location instead of navigate
    window.location.href = '/login';
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      showErrorMessage('Please enter a prompt to generate an image');
      return;
    }
    
    if (!isAuthenticated) {
      showErrorMessage('Please log in to generate images');
      redirectToLogin();
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Prepare request data
      const requestData = {
        prompt: prompt.trim(),
        resolution: selectedAspectRatio?.value || '1:1',
        model: selectedModel || AI_MODELS[0].id
      };
      
      // Add reference image if available and generation type supports it
      if (referenceImage && ['image', 'animated-video'].includes(selectedGenerationType?.id)) {
        requestData.image_prompt = referenceImage.base64;
      }
      
      // Make API call to backend using authenticated axiosInstance
      const generateResponse = await getAxiosInstance().post('/api/aigc/generate-image/', requestData);
      
      if (generateResponse?.data && generateResponse.data.image_url) {
        // Add generated image to state
        const newImage = {
          id: generateResponse.data.id || `gen_${Date.now()}`,
          url: formatImageUrl(generateResponse.data.image_url),
          prompt: prompt,
          creator: 'You',
          timestamp: new Date().toLocaleString(),
          category: 'Generations',
          aspectRatio: selectedAspectRatio.value,
          model: AI_MODELS.find(model => model.id === selectedModel)?.name || 'AI Model',
          width: selectedAspectRatio.width || 1024,
          height: selectedAspectRatio.height || 1024
        };
        
        setGeneratedImage(newImage);
        setImages(prevImages => [newImage, ...prevImages]);
        setPrompt('');
        setReferenceImage(null); // Clear reference image after successful generation
      } else {
        // Handle empty or invalid response
        showErrorMessage('Failed to generate image. Please try again or check server logs.');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      let errorMsg = 'Failed to generate image. Please try again.';
      
      if (error.response?.status === 403) {
        errorMsg = 'Authentication required. Please log in to generate images.';
        setIsAuthenticated(false);
        localStorage.removeItem('token'); // Clear invalid token
        setTimeout(redirectToLogin, 2000); // Redirect to login after showing error
      } else if (error.response?.status === 400) {
        errorMsg = 'Invalid request. Please check your inputs and try again.';
      } else if (error.response?.status === 502 && error.response?.data?.detail) {
        // Handle specific API errors
        try {
          const errorDetail = JSON.parse(error.response.data.detail);
          if (errorDetail.detail && Array.isArray(errorDetail.detail) && errorDetail.detail.length > 0) {
            const firstError = errorDetail.detail[0];
            if (firstError.msg && firstError.msg.includes("Image_prompt dimensions")) {
              errorMsg = "Reference image must be at least 256x256 pixels";
            } else {
              errorMsg = firstError.msg || errorMsg;
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use the original error message or response data
          errorMsg = error.response?.data?.detail || errorMsg;
        }
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = `Error: ${error.message}`;
      }
      
      showErrorMessage(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = (imageUrl) => {
    const token = localStorage.getItem('token');
    
    // Create an anchor element
    const anchor = document.createElement('a');
    
    // Check if URL is relative and prepend origin if needed
    if (imageUrl.startsWith('/')) {
      imageUrl = window.location.origin + imageUrl;
    }
    
    // If authentication is required for the media, attach the token
    if (token && imageUrl.includes('/media/')) {
      // Add token as query parameter if it's our own domain
      const url = new URL(imageUrl);
      if (url.origin === window.location.origin) {
        url.searchParams.append('token', token);
        imageUrl = url.toString();
      }
    }
    
    anchor.href = imageUrl;
    anchor.download = 'ai-generated-image.jpg';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Get selected model's name for dialog
  const selectedModelName = AI_MODELS.find(model => model.id === selectedModel)?.name || '';

  // Handle generation type selection
  const handleGenerationTypeSelect = (type) => {
    setSelectedGenerationType(type);
  };

  const handleAttributeFilter = (attributes) => {
    setSelectedAttributes(attributes);
  };

  return (
    <Box sx={{ 
      py: 2, 
      px: { xs: 1, sm: 2, md: 3 }, 
      mt: -2,
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      gap: 3
    }}>
      {/* Left side - Image Creation Section */}
      <Box 
        sx={{ 
          width: { xs: '100%', md: '320px', lg: '350px' },
          flexShrink: 0,
          position: 'sticky',
          top: '80px',
          alignSelf: 'flex-start',
          zIndex: 20, // Higher than the history header
          backgroundColor: 'background.default'
        }}
        ref={inputBoxRef}
      >
        <ImageGenerator 
          prompt={prompt}
          onPromptChange={handlePromptChange}
          selectedModel={selectedModel}
          selectedAspectRatio={selectedAspectRatio}
          selectedGenerationType={selectedGenerationType}
          onSelectGenerationType={handleGenerationTypeSelect}
          onModelClick={handleModelClick}
          onAspectRatioClick={handleAspectRatioClick}
          onGenerateImage={handleGenerateImage}
          isGenerating={isGenerating}
          isAuthenticated={isAuthenticated}
          redirectToLogin={redirectToLogin}
          referenceImage={referenceImage}
          onReferenceImageChange={handleReferenceImageChange}
          onError={showErrorMessage}
        />
      </Box>

      {/* Right side - Image History Section */}
      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', md: 'calc(100vh - 100px)' },
        position: 'relative'
      }}>
        <ImageHistory
          images={filteredImages}
          isAuthenticated={isAuthenticated}
          searchQuery={searchQuery}
          selectedCategories={selectedCategories}
          selectedCreators={selectedCreators}
          showLikedOnly={showLikedOnly}
          selectedAttributes={selectedAttributes}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          onCategoryChange={handleCategoryChange}
          onCreatorChange={handleCreatorChange}
          onLikedFilter={handleLikedFilter}
          onAttributeFilter={handleAttributeFilter}
          onLikeToggle={handleLikeToggle}
          onDownloadImage={handleDownloadImage}
          redirectToLogin={redirectToLogin}
          allImages={images}
        />
      </Box>
      
      {/* Resolution Selection Dialog */}
      <ResolutionDialog
        open={aspectRatioDialogOpen}
        onClose={handleAspectRatioDialogClose}
        availableResolutions={availableResolutions}
        selectedAspectRatio={selectedAspectRatio}
        onSelectAspectRatio={handleAspectRatioSelect}
        selectedModelName={selectedModelName}
      />

      {/* Model Selection Dialog */}
      <ModelDialog
        open={modelDialogOpen}
        onClose={handleModelDialogClose}
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
      />

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleErrorClose}
          severity="error"
          sx={{ width: '100%' }}
          icon={<ErrorIcon />}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AIImage; 