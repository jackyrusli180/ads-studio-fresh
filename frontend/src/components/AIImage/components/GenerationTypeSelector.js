import React from 'react';
import {
  Box,
  Typography,
  ButtonGroup,
  Button,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GENERATION_TYPES } from '../config/generation-types';

const GenerationTypeSelector = ({ selectedType, onSelectType }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
        Generation Type
      </Typography>
      
      <ButtonGroup
        variant="outlined"
        aria-label="generation type selection"
        fullWidth
        sx={{ 
          borderRadius: '8px',
          '& .MuiButton-root': {
            textTransform: 'none',
            py: 1,
            px: 0.5,
            borderRadius: 0,
            flex: 1,
            '&.active': {
              backgroundColor: `${theme.palette.primary.main}20`, // 20% opacity primary color
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main
            }
          },
          '& .MuiButton-root:first-of-type': {
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
          },
          '& .MuiButton-root:last-of-type': {
            borderTopRightRadius: '8px', 
            borderBottomRightRadius: '8px',
          }
        }}
      >
        {GENERATION_TYPES.map((type) => (
          <Tooltip key={type.id} title={type.description} arrow>
            <Button
              onClick={() => onSelectType(type)}
              className={selectedType.id === type.id ? 'active' : ''}
              sx={{
                minWidth: 0,
                height: 'auto'
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center', 
                gap: 0.5,
                width: '100%'
              }}>
                {React.cloneElement(type.icon, { 
                  fontSize: 'small',
                  sx: { opacity: 0.8 } 
                })}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    lineHeight: 1,
                    fontSize: '0.75rem',
                    whiteSpace: 'normal',
                    textAlign: 'center'
                  }}
                >
                  {type.name}
                </Typography>
              </Box>
            </Button>
          </Tooltip>
        ))}
      </ButtonGroup>
    </Box>
  );
};

export default GenerationTypeSelector; 