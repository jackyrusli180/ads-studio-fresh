// Generation types configuration
import React from 'react';
import { 
  Image as ImageIcon,
  VideoLibrary as VideoIcon, 
  Loop as IteratedIcon,
  Face as AvatarIcon
} from '@mui/icons-material';

// Define generation types
export const GENERATION_TYPES = [
  { 
    id: 'image',
    name: 'Image',
    icon: <ImageIcon />,
    description: 'Generate static images',
    modelId: 'flux-pro-1.1'
  },
  { 
    id: 'animated-video',
    name: 'Animated Video',
    icon: <VideoIcon />,
    description: 'Create short animated videos',
    modelId: 'flux-pro-1.1-video'
  },
  { 
    id: 'iterated-video',
    name: 'Iterated Video',
    icon: <IteratedIcon />,
    description: 'Generate incremental frame-by-frame videos',
    modelId: 'flux-pro-1.1-iterated'
  },
  { 
    id: 'avatar-video',
    name: 'Avatar Video',
    icon: <AvatarIcon />,
    description: 'Create personalized avatar videos',
    modelId: 'flux-pro-1.1-avatar'
  }
];

export default GENERATION_TYPES; 