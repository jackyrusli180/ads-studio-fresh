import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Grid,
  Box
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AspectRatioBox, ResolutionPreview } from '../styles/StyledComponents';

const ResolutionDialog = ({ 
  open, 
  onClose, 
  availableResolutions, 
  selectedAspectRatio, 
  onSelectAspectRatio,
  selectedModelName
}) => {
  const theme = useTheme();
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { 
          borderRadius: '12px',
          minWidth: { xs: '90%', sm: '600px' }
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.grey[300]}` }}>
        Choose Resolution for {selectedModelName}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Select the resolution for your generated image. Available options depend on the AI model you're using.
        </Typography>
        
        <Grid container spacing={2}>
          {availableResolutions.map((resolution) => (
            <Grid item xs={6} md={4} key={`${resolution.width}x${resolution.height}`}>
              <AspectRatioBox
                selected={selectedAspectRatio.name === resolution.name}
                onClick={() => onSelectAspectRatio(resolution)}
              >
                <Box sx={{ mb: 1 }}>
                  {resolution.icon}
                </Box>
                <Typography variant="subtitle2">{resolution.name}</Typography>
                <Typography variant="caption" color="textSecondary">{resolution.value}</Typography>
                <ResolutionPreview 
                  width={resolution.width}
                  height={resolution.height}
                />
                <Typography variant="caption" color="textSecondary">
                  {resolution.width}×{resolution.height}
                </Typography>
              </AspectRatioBox>
            </Grid>
          ))}
        </Grid>
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

export default ResolutionDialog; 