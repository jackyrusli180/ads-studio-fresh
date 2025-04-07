import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AutoAwesome as AIModelIcon } from '@mui/icons-material';
import { AI_MODELS } from '../config/models';

const ModelDialog = ({ open, onClose, selectedModel, onSelectModel }) => {
  const theme = useTheme();
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { 
          borderRadius: '12px',
          minWidth: { xs: '90%', sm: '500px' }
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.grey[300]}` }}>
        Choose AI Model
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Select the AI model to use for image generation. Different models offer various capabilities and styles.
        </Typography>
        
        {AI_MODELS.map((model) => (
          <Paper
            key={model.id}
            elevation={0}
            onClick={() => onSelectModel(model.id)}
            sx={{ 
              p: 2,
              mb: 2,
              borderRadius: '8px',
              border: model.id === selectedModel 
                ? `2px solid ${theme.palette.primary.main}` 
                : `1px solid ${theme.palette.grey[300]}`,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.grey[50],
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AIModelIcon 
                sx={{ 
                  mr: 1, 
                  color: model.id === selectedModel ? theme.palette.primary.main : theme.palette.text.secondary 
                }} 
              />
              <Typography variant="subtitle1" fontWeight={500}>
                {model.name}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              {model.description}
            </Typography>
          </Paper>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px' }}>
          Cancel
        </Button>
        <Button 
          onClick={onClose} 
          variant="contained" 
          sx={{ 
            textTransform: 'none', 
            borderRadius: '8px',
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelDialog; 