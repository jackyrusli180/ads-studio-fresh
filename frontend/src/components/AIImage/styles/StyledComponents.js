// Styled components for AIImage
import { 
  Box, 
  TextField, 
  Card,
  Typography, 
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled text input
export const StyledInput = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: theme.palette.grey[100],
    '&:hover fieldset': {
      borderColor: theme.palette.grey[400],
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
}));

// Styled image card
export const ImageCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
    '& .image-card-overlay': {
      opacity: 1,
    },
  },
}));

// Image card overlay
export const ImageCardOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5),
  opacity: 0,
  transition: 'opacity 0.2s',
}));

// Creator component
export const Creator = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.white,
  display: 'flex',
  alignItems: 'center',
  fontSize: '12px',
  '& svg': {
    fontSize: '16px',
    marginRight: theme.spacing(0.5),
  },
}));

// Timestamp component
export const TimeStamp = styled(Typography)(({ theme }) => ({
  color: theme.palette.grey[300],
  fontSize: '11px',
  marginLeft: theme.spacing(2.5),
}));

// Category label
export const CategoryLabel = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: theme.palette.common.white,
  fontSize: '11px',
  height: '24px',
}));

// Action bar
export const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(0.5),
}));

// Aspect ratio selection box
export const AspectRatioBox = styled(Box)(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  backgroundColor: selected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));

// Resolution preview
export const ResolutionPreview = styled(Box)(({ theme, ratio, width, height }) => ({
  width: '100%',
  height: '40px',
  backgroundColor: theme.palette.grey[300],
  borderRadius: '4px',
  margin: theme.spacing(1, 0),
  position: 'relative',
  overflow: 'hidden',
  '&:after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${width / 32}px`,
    height: `${height / 32}px`,
    backgroundColor: theme.palette.primary.main,
    borderRadius: '2px',
  }
}));

// Section header
export const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  marginTop: theme.spacing(4),
  '& svg': {
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  '& .MuiTypography-root': {
    fontWeight: 500,
  }
}));

// Model selector
export const ModelSelector = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: theme.spacing(3),
  '& .MuiToggleButtonGroup-root': {
    width: '100%',
  },
  '& .MuiToggleButton-root': {
    flex: 1,
    textTransform: 'none',
    padding: theme.spacing(1.5),
    borderRadius: '8px',
    border: `1px solid ${theme.palette.grey[300]}`,
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: 'white',
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
  },
})); 