import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  IconButton,
  Grid,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  Avatar,
  Stack,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Error as ErrorIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { getAxiosInstance } from '../utils/apiUtils';
import { formatImageUrl } from '../utils/imageUtils';
import ImageEditor from './ImageEditor';

const DetailItem = ({ label, value }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="body2">{value}</Typography>
      <IconButton size="small" sx={{ opacity: 0.6 }}>
        <CopyIcon fontSize="small" />
      </IconButton>
    </Box>
  </Box>
);

const CreativeDetails = ({ onBack, onDownload: propOnDownload }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [creative, setCreative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // New state for conversation history
  const [conversationHistory, setConversationHistory] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [fileInput, setFileInput] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null); // Added state for image preview
  
  // New state for attribute editor
  const [showAttributeEditor, setShowAttributeEditor] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [attributeCategories, setAttributeCategories] = useState([]);
  
  // Fetch creative data when component mounts
  useEffect(() => {
    const fetchCreativeDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // Make API call to get creative details by ID
        const response = await getAxiosInstance().get(`/api/aigc/creative/${id}/`);
        
        if (response?.data) {
          // Format image URL and other data
          const formattedCreative = {
            ...response.data,
            url: formatImageUrl(response.data.image_url || ''),
          };
          setCreative(formattedCreative);
        }
      } catch (err) {
        console.error('Error fetching creative details:', err);
        setError('Failed to load creative. It may have been deleted or you may not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCreativeDetails();
  }, [id]);
  
  // Fetch attribute categories and image attributes
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        // Fetch all attribute categories
        const response = await getAxiosInstance().get('/api/aigc/attributes/');
        if (response?.data) {
          setAttributeCategories(response.data);
        }
      } catch (error) {
        console.error('Error fetching attributes:', error);
      }
    };
    
    if (showAttributeEditor) {
      fetchAttributes();
      
      // Set initial selected attributes based on the image's current attributes
      if (creative?.image_attributes) {
        const currentAttributes = creative.image_attributes.map(attr => ({
          id: attr.attribute.id,
          name: attr.attribute.name,
          category: attr.attribute.category,
          category_name: attr.attribute.category_name
        }));
        
        setSelectedAttributes(currentAttributes);
      }
    }
  }, [showAttributeEditor, creative?.image_attributes]);
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/ads-studio/aigc/ai-image');
    }
  };
  
  const handleDownload = (url) => {
    if (propOnDownload) {
      propOnDownload(url);
    } else {
      // Default download implementation
      const token = localStorage.getItem('token');
      const anchor = document.createElement('a');
      
      if (url.startsWith('/')) {
        url = window.location.origin + url;
      }
      
      // If authentication is required for the media, attach the token
      if (token && url.includes('/media/')) {
        const urlObj = new URL(url);
        if (urlObj.origin === window.location.origin) {
          urlObj.searchParams.append('token', token);
          url = urlObj.toString();
        }
      }
      
      anchor.href = url;
      anchor.download = `ai-creative-${id}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };
  
  // Function to determine if the creative is a video
  const isVideo = () => {
    return creative?.type === 'video' || 
           creative?.category === 'Video' || 
           creative?.url?.endsWith('.mp4') || 
           creative?.url?.endsWith('.mov');
  };
  
  const handleImageEdited = (newImage) => {
    // Add the edited image to the conversation history instead of replacing
    setConversationHistory(prev => [...prev, {
      type: 'response',
      content: newImage.url,
      id: newImage.id,
      timestamp: new Date().toISOString()
    }]);
    
    // Set the selected image to the new image
    setSelectedImage(newImage);
    
    // Show a success message
    setSnackbarMessage('Image successfully edited!');
    setSnackbarOpen(true);
  };
  
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  const handleSendPromptWithImage = () => {
    if (!uploadedImage) return;
    
    // First add text prompt if available
    if (prompt.trim()) {
      // Add the text prompt with reference to the image
      setConversationHistory(prev => [...prev, {
        type: 'prompt',
        content: `${prompt} (with reference image: ${uploadedImage.file.name})`,
        timestamp: new Date().toISOString(),
        hasAttachment: true,
      }]);
    }
    
    // Then add the uploaded image as a reference
    setConversationHistory(prev => [...prev, {
      type: 'prompt-image',
      content: uploadedImage.preview,
      timestamp: new Date().toISOString(),
      fileName: uploadedImage.file.name,
      isReference: true,
    }]);
    
    // Store the reference image and prompt for ImageEditor
    const imageRef = {
      preview: uploadedImage.preview,
      file: uploadedImage.file
    };
    
    // Clear the prompt field and uploaded image
    const promptToProcess = prompt;
    setPrompt('');
    setUploadedImage(null);
    
    // Process with ImageEditor component - pass the reference image data
    setTimeout(() => {
      // Pass the image reference to ImageEditor via selectedImage state
      setSelectedImage({
        ...selectedImage,
        referenceImage: imageRef,
        promptWithReference: promptToProcess
      });
      setShowEditor(true);
    }, 100);
  };
  
  // Regular send prompt without image
  const handleSendPrompt = () => {
    if (!prompt.trim()) return;
    
    // If there's an uploaded image, use the image + text flow instead
    if (uploadedImage) {
      handleSendPromptWithImage();
      return;
    }
    
    // Otherwise just add the text prompt to conversation history
    setConversationHistory(prev => [...prev, {
      type: 'prompt',
      content: prompt,
      timestamp: new Date().toISOString()
    }]);
    
    // Clear the prompt field
    setPrompt('');
    
    // Process with ImageEditor component
    setShowEditor(true);
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview the uploaded image but don't add to conversation yet
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage({
        preview: reader.result,
        file: file
      });
    };
    reader.readAsDataURL(file);
  };
  
  const selectFileToUpload = () => {
    fileInput.click();
  };
  
  useEffect(() => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = handleFileUpload;
    setFileInput(input);
    document.body.appendChild(input);
    
    return () => {
      document.body.removeChild(input);
    };
  }, []);
  
  // Initialize conversation with original image when data is loaded
  useEffect(() => {
    if (creative && !conversationHistory.length) {
      setConversationHistory([{
        type: 'original',
        content: creative.url,
        id: creative.id,
        timestamp: creative.created_at || new Date().toISOString()
      }]);
      setSelectedImage({
        url: creative.url,
        id: creative.id
      });
    }
  }, [creative, conversationHistory.length]);
  
  // Handle attribute toggle selection
  const handleAttributeToggle = (attribute) => {
    setSelectedAttributes(prev => {
      // Check if attribute is already selected
      const isSelected = prev.some(a => a.id === attribute.id);
      
      if (isSelected) {
        // Remove the attribute
        return prev.filter(a => a.id !== attribute.id);
      } else {
        // Add the attribute
        return [...prev, attribute];
      }
    });
  };
  
  // Handle auto-tagging of images
  const handleAutoTag = async () => {
    try {
      const response = await getAxiosInstance().get(`/api/aigc/attributes/auto-tag/${id}/`);
      
      if (response?.data) {
        setSnackbarMessage(`Auto-tagged with attributes: ${response.data.attributes.join(', ') || 'None found'}`);
        setSnackbarOpen(true);
        
        // Refresh the image data to get the updated attributes
        const imageResponse = await getAxiosInstance().get(`/api/aigc/creative/${id}/`);
        if (imageResponse?.data) {
          const formattedCreative = {
            ...imageResponse.data,
            url: formatImageUrl(imageResponse.data.image_url || ''),
          };
          setCreative(formattedCreative);
        }
      }
    } catch (error) {
      console.error('Error auto-tagging image:', error);
      setSnackbarMessage('Failed to auto-tag image');
      setSnackbarOpen(true);
    }
  };
  
  // Handle saving attributes
  const handleSaveAttributes = async () => {
    try {
      // Format the selected attributes for the API
      const attributesToSave = selectedAttributes.map(attr => ({
        id: attr.id,
        confidence: 1.0,  // Full confidence for manually selected
        is_verified: true  // Marked as verified since user selected
      }));
      
      // Call the API to assign attributes
      const response = await getAxiosInstance().post(`/api/aigc/attributes/assign/${id}/`, {
        attributes: attributesToSave,
        replace: true  // Replace all existing attributes
      });
      
      if (response?.data) {
        // Update the creative with the new data
        const formattedCreative = {
          ...response.data,
          url: formatImageUrl(response.data.image_url || ''),
        };
        setCreative(formattedCreative);
        
        // Show success message
        setSnackbarMessage('Attributes updated successfully');
        setSnackbarOpen(true);
        
        // Close attribute editor
        setShowAttributeEditor(false);
      }
    } catch (error) {
      console.error('Error saving attributes:', error);
      setSnackbarMessage('Failed to save attributes');
      setSnackbarOpen(true);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: 'calc(100vh - 100px)'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !creative) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        height: 'calc(100vh - 100px)',
        p: 3,
        textAlign: 'center'
      }}>
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {error || 'Creative not found'}
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: 'calc(100vh - 100px)',
      p: 3
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3,
        gap: 1
      }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">
          {isVideo() ? 'Video Details' : 'Image Editor'}
        </Typography>
      </Box>
      
      <Grid container spacing={3} sx={{ flexWrap: 'nowrap', height: 'calc(100vh - 150px)' }}>
        {/* Main content - Conversation UI - Now on the left */}
        <Grid item xs={9} sx={{ flexGrow: 1, display: 'flex', minWidth: 0 }}>
          <Paper 
            elevation={0}
            sx={{ 
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              width: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Conversation history */}
            <Box 
              sx={{ 
                flex: 1, 
                overflowY: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 3
              }}
            >
              {conversationHistory.map((item, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex', 
                    flexDirection: item.type === 'prompt' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 2
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: item.type === 'prompt' ? 'primary.main' : 'secondary.main'
            }}
          >
                    {item.type === 'prompt' || item.type === 'prompt-image' ? 'U' : 'AI'}
                  </Avatar>
                  
                  <Box sx={{ maxWidth: '80%' }}>
                    {(item.type === 'original' || item.type === 'response') && (
                      <Box 
                        component="img"
                        src={item.content}
                        alt={item.type === 'original' ? 'Original Image' : 'Edited Image'}
                sx={{ 
                          maxWidth: '100%',
                          maxHeight: '50vh',
                          borderRadius: '12px',
                          mb: 1,
                          border: selectedImage?.id === item.id ? '3px solid' : 'none',
                          borderColor: 'secondary.main',
                          cursor: 'pointer'
                }}
                        onClick={() => setSelectedImage({ url: item.content, id: item.id })}
              />
                    )}
                    
                    {item.type === 'prompt-image' && (
                      <Box sx={{ position: 'relative' }}>
              <Box 
                component="img"
                          src={item.content}
                          alt={item.isReference ? "Reference Image" : "Uploaded Image"}
                sx={{ 
                  maxWidth: '100%',
                            maxHeight: '30vh',
                            borderRadius: '12px',
                            mb: 1,
                            border: item.isReference ? '2px dashed' : 'none',
                            borderColor: 'grey.400',
                          }}
                        />
                        {item.isReference && (
                          <Box 
                            sx={{ 
                              position: 'absolute', 
                              top: 10, 
                              left: 10, 
                              bgcolor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.8rem'
                            }}
                          >
                            Reference Image
                          </Box>
                        )}
                        {item.fileName && (
                          <Typography variant="caption" color="textSecondary">
                            {item.fileName}
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    {item.type === 'prompt' && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: '12px',
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText',
                          position: 'relative'
                        }}
                      >
                        <Typography variant="body1">{item.content}</Typography>
                        {item.hasAttachment && (
                          <Box 
                            sx={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              mt: 1,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              px: 1,
                              py: 0.5,
                              gap: 0.5
                            }}
                          >
                            <AttachFileIcon fontSize="small" />
                            <Typography variant="caption">With reference image</Typography>
                          </Box>
                        )}
                      </Paper>
                    )}
                    
                    <Typography 
                      variant="caption" 
                      color="textSecondary"
                      sx={{ 
                        display: 'block',
                        mt: 0.5,
                        textAlign: item.type === 'prompt' || item.type === 'prompt-image' ? 'right' : 'left'
                      }}
                    >
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            
            {/* Input area with image upload preview */}
            <Box sx={{ 
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Image upload preview */}
              {uploadedImage && (
                <Box sx={{ 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <Box 
                    component="img"
                    src={uploadedImage.preview}
                    alt="Image to upload"
                    sx={{ 
                      height: '60px',
                      width: 'auto',
                  borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {uploadedImage.file.name}
                  </Typography>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => setUploadedImage(null)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={handleSendPromptWithImage}
                  >
                    Send
                  </Button>
                </Box>
              )}
              
              {/* Text input */}
              <Box sx={{ 
                p: 2, 
                display: 'flex',
                gap: 1,
                alignItems: 'center'
              }}>
                <IconButton onClick={selectFileToUpload}>
                  <AttachFileIcon />
                </IconButton>
                
                <TextField 
                  fullWidth
                  placeholder="Describe how you want to edit the image..."
                  variant="outlined"
                  size="small"
                  value={prompt}
                  onChange={handlePromptChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendPrompt()}
                />
                
                <Button 
                  variant="contained" 
                  color="primary"
                  endIcon={<SendIcon />}
                  onClick={handleSendPrompt}
                  disabled={!prompt.trim()}
                >
                  Edit
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Right sidebar - Details panel */}
        <Grid item xs={3} sx={{ 
          width: '320px', 
          flexShrink: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex'
        }}>
          <Paper
            elevation={0}
            sx={{ 
              p: 2, 
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              position: 'sticky',
              top: '16px',
              width: '100%',
              height: 'fit-content'
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={500}>Details</Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <DetailItem 
              label="Prompt" 
              value={creative?.prompt || 'No prompt available'} 
            />
            
            <DetailItem 
              label="Model" 
              value={creative?.model_used || 'Standard AI Model'} 
            />
            
            <DetailItem 
              label="Resolution" 
              value={`${creative?.width || '1024'}×${creative?.height || '1024'} (${creative?.resolution || '1:1'})`} 
            />
            
            <DetailItem 
              label="Created By" 
              value={creative?.username || 'You'} 
            />
            
            <DetailItem 
              label="Date Created" 
              value={creative?.created_at ? new Date(creative.created_at).toLocaleString() : new Date().toLocaleString()} 
            />
            
            <DetailItem 
              label="Category" 
              value={creative?.status || 'Generated'} 
            />
            
            {creative?.seed && (
              <DetailItem 
                label="Seed" 
                value={creative.seed} 
              />
            )}
            
            <Divider sx={{ my: 2 }} />
            
            {/* Attributes Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>Attributes</Typography>
              
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  {creative?.image_attributes?.length > 0 ? (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: 1 
                    }}>
                      {/* Group attributes by category */}
                      {Object.entries(
                        creative.image_attributes.reduce((acc, attr) => {
                          const category = attr.attribute.category_name;
                          if (!acc[category]) acc[category] = [];
                          acc[category].push(attr);
                          return acc;
                        }, {})
                      ).map(([category, attrs]) => (
                        <Box key={category} sx={{ mb: 1 }}>
                          <Typography 
                            variant="subtitle2" 
                            color="textSecondary" 
                            sx={{ fontSize: '0.8rem', mb: 0.5 }}
                          >
                            {category}
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: 0.5 
                          }}>
                            {attrs.map((attr, index) => (
                              <Box
                                key={index}
                                sx={{
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  borderRadius: '12px',
                                  px: 1,
                                  py: 0.3,
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}
                              >
                                {attr.attribute.name}
                                {attr.is_verified && (
                                  <Box 
                                    sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      bgcolor: 'success.main',
                                      borderRadius: '50%' 
                                    }} 
                                  />
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No attributes assigned
                    </Typography>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => setShowAttributeEditor(prev => !prev)}
                      sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                    >
                      {showAttributeEditor ? 'Hide Attribute Editor' : 'Edit Attributes'}
                    </Button>
                    {!showAttributeEditor && (
                      <Button 
                        variant="text" 
                        size="small" 
                        onClick={handleAutoTag}
                        sx={{ textTransform: 'none', fontSize: '0.8rem', ml: 1 }}
                      >
                        Auto-Tag
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </Box>
            
            {/* Attribute Editor */}
            {showAttributeEditor && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                  Add/Remove Attributes
                </Typography>
                <Box sx={{ maxHeight: '300px', overflowY: 'auto', pr: 1 }}>
                  {attributeCategories.map(category => (
                    <Box key={category.id} sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                        {category.name}
                      </Typography>
                      <FormGroup>
                        {category.attributes.map(attribute => (
                          <FormControlLabel
                            key={attribute.id}
                            control={
                              <Checkbox
                                checked={selectedAttributes.some(a => a.id === attribute.id)}
                                onChange={() => handleAttributeToggle(attribute)}
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {attribute.name}
                              </Typography>
                            }
                          />
                        ))}
                      </FormGroup>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => setShowAttributeEditor(false)}
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    size="small" 
                    color="primary"
                    onClick={handleSaveAttributes}
                    sx={{ textTransform: 'none' }}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(selectedImage?.url || creative?.url)}
                fullWidth
              >
                Download
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<ShareIcon />}
                fullWidth
              >
                Share
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Hidden ImageEditor component that processes the edits */}
      {showEditor && selectedImage && (
        <Box sx={{ display: 'none' }}>
        <ImageEditor 
            creative={{...creative, url: selectedImage.url, id: selectedImage.id}}
            onClose={() => setShowEditor(false)}
          onImageEdited={handleImageEdited}
            initialPrompt={conversationHistory.length > 0 ? 
              conversationHistory[conversationHistory.length - 1].content : ''}
            referenceImage={selectedImage.referenceImage}
            promptWithReference={selectedImage.promptWithReference}
        />
        </Box>
      )}
      
      {/* Success notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreativeDetails; 