import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress, 
  IconButton,
  Divider,
  List,
  ListItem
} from '@mui/material';
import { 
  Send as SendIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getAxiosInstance } from '../utils/apiUtils';

const MessageBubble = ({ message, isUser }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      mb: 2
    }}
  >
    <Box
      sx={{
        maxWidth: '80%',
        p: 2,
        borderRadius: 2,
        bgcolor: isUser ? 'primary.light' : 'grey.100',
        color: isUser ? 'primary.contrastText' : 'text.primary'
      }}
    >
      {message.type === 'text' ? (
        <Typography variant="body2">{message.text}</Typography>
      ) : (
        <Box
          component="img"
          src={message.url}
          alt="AI Generated Edit"
          sx={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 1,
            my: 1
          }}
        />
      )}
    </Box>
  </Box>
);

const ImageEditor = ({ 
  creative, 
  onClose, 
  onImageEdited, 
  initialPrompt = '',
  referenceImage = null,
  promptWithReference = null
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState([
    {
      role: 'system',
      type: 'text',
      text: 'I am viewing this image and would like to edit it. I can describe what changes I want to make.'
    }
  ]);
  
  // Reference to the active image (starts with the original, updates as edits are made)
  const [activeImage, setActiveImage] = useState({
    id: creative.id,
    url: creative.url || creative.image_url
  });
  
  // Keep track of the conversation history to send to API
  const [conversationHistory, setConversationHistory] = useState([]);
  
  // If initialPrompt is provided, submit it automatically
  useEffect(() => {
    if (initialPrompt) {
      // If there's a reference image, pass it to handleSubmit
      if (referenceImage && promptWithReference) {
        handleSubmit(null, promptWithReference, referenceImage);
      } else {
        handleSubmit(null, initialPrompt);
      }
    }
  }, []);
  
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };
  
  const handleSubmit = async (e, promptText = null, referenceImg = null) => {
    if (e) e.preventDefault();
    
    const textToSubmit = promptText || prompt;
    if (!textToSubmit.trim() && !referenceImg) return;
    
    // Add user message to conversation
    const userMessage = {
      role: 'user',
      type: 'text',
      text: textToSubmit
    };
    
    setConversation(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      // Format the conversation history for the API
      const historyForApi = [...conversationHistory];
      
      // Add the current user message
      historyForApi.push({
        role: 'user',
        text: textToSubmit
      });
      
      console.log('Sending image edit request to API with prompt:', textToSubmit);
      
      // Prepare the API request
      let apiRequestData = {
        image_url: activeImage.url,
        image_id: activeImage.id,
        prompt: textToSubmit,
        conversation_history: historyForApi
      };
      
      // If we have a reference image, prepare to send it
      if (referenceImg) {
        console.log('Including reference image in request');
        
        // If your API accepts base64 image data
        apiRequestData.reference_image = referenceImg.preview;
        apiRequestData.reference_image_name = referenceImg.file.name;
        
        // Alternative approach for multipart form data:
        // const formData = new FormData();
        // formData.append('image_url', activeImage.url);
        // formData.append('image_id', activeImage.id);
        // formData.append('prompt', textToSubmit);
        // formData.append('reference_image', referenceImg.file);
        // etc...
      }
      
      // Call the API
      const response = await getAxiosInstance().post('/api/aigc/edit-image/', apiRequestData);
      
      console.log('API response:', response.data);
      
      // Process the response
      if (response.data && response.data.parts) {
        const newMessages = [];
        let newImage = null;
        
        // Log all parts to debug
        console.log('Response parts:', response.data.parts);
        
        // Check if there are multiple images (for debugging)
        const imageCount = response.data.parts.filter(part => part.type === 'image').length;
        if (imageCount > 1) {
          console.warn(`Found ${imageCount} images in response, only keeping the last one`);
        }
        
        // Process each part
        for (const part of response.data.parts) {
          if (part.type === 'text') {
            newMessages.push({
              role: 'model',
              type: 'text',
              text: part.text
            });
            
            // Update conversation history
            historyForApi.push({
              role: 'model',
              parts: [{ type: 'text', text: part.text }]
            });
          } else if (part.type === 'image') {
            // Only keep the latest image - overwrite any previous ones
            newImage = {
              id: part.image_id,
              url: part.image_url
            };
            
            // Don't push each image to newMessages yet
            // We'll add the final one after processing all parts
          }
        }
        
        // Add the final image to messages if one was found
        if (newImage) {
          console.log('Using final image:', newImage);
          
          newMessages.push({
            role: 'model',
            type: 'image',
            url: newImage.url
          });
          
          // Single image for conversation history
          historyForApi.push({
            role: 'model',
            parts: [{ type: 'image', url: newImage.url }]
          });
        }
        
        // Update the conversation
        setConversation(prev => [...prev, ...newMessages]);
        
        // Update the conversation history
        setConversationHistory(historyForApi);
        
        // Update the active image if we got a new one
        if (newImage) {
          setActiveImage(newImage);
          
          // Notify parent component if needed
          if (onImageEdited) {
            console.log('Notifying parent with edited image:', newImage);
            onImageEdited(newImage);
          }
        }
      }
    } catch (err) {
      console.error('Error editing image:', err);
      
      // Extract detailed error message from API response if available
      let errorMessage = 'Failed to edit image. Please try again.';
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error;
        // If it's a long error message, truncate it for display
        if (errorMessage.length > 150) {
          errorMessage = errorMessage.substring(0, 150) + '...';
        }
        console.error('API error details:', err.response.data);
      }
      
      setError(errorMessage);
      
      // Add error message to conversation
      setConversation(prev => [
        ...prev,
        {
          role: 'system',
          type: 'text',
          text: `Error: ${errorMessage}`
        }
      ]);
    } finally {
      setIsLoading(false);
      setPrompt('');
      
      // Close editor if we were processing an initial prompt
      if (promptText === initialPrompt && onClose) {
        setTimeout(() => {
          onClose();
        }, 500); // Small delay to ensure all state updates have completed
      }
    }
  };
  
  // If we're in hidden mode (for background processing), return minimal UI
  if (initialPrompt) {
    return (
      <Box sx={{ display: 'none' }}>
        {isLoading && <CircularProgress size={24} />}
      </Box>
    );
  }
  
  // Otherwise return the full editor UI
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 400,
        height: 500,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 1000
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="h6">Image Editor (Gemini AI)</Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* Conversation */}
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflowY: 'auto',
          bgcolor: 'background.default'
        }}
      >
        {conversation.filter(msg => msg.role !== 'system').map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isUser={message.role === 'user'}
          />
        ))}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {error && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'error.light',
              color: 'error.contrastText',
              borderRadius: 1,
              mb: 2
            }}
          >
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
      </Box>
      
      {/* Input */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <TextField
          fullWidth
          placeholder="Describe how you want to edit the image..."
          variant="outlined"
          size="small"
          value={prompt}
          onChange={handlePromptChange}
          disabled={isLoading}
          sx={{ mr: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading || !prompt.trim()}
          sx={{ minWidth: 0, p: 1 }}
        >
          <SendIcon />
        </Button>
      </Box>
    </Paper>
  );
};

export default ImageEditor; 