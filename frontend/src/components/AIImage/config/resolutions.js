// Resolutions configuration
import { 
  AspectRatio as AspectRatioIcon,
  Landscape as LandscapeIcon,
  Portrait as PortraitIcon,
  CropSquare as SquareIcon 
} from '@mui/icons-material';
import React from 'react';

// Define available resolutions for each model
export const RESOLUTIONS = {
  'flux-pro-1.1': [
    { name: 'Square', value: '1:1', width: 1024, height: 1024, icon: <SquareIcon /> },
    { name: 'Portrait', value: '3:4', width: 768, height: 1024, icon: <PortraitIcon /> },
    { name: 'Landscape', value: '4:3', width: 1024, height: 768, icon: <LandscapeIcon /> },
    { name: 'Portrait Tall', value: '2:3', width: 640, height: 960, icon: <PortraitIcon /> },
    { name: 'Landscape Wide', value: '3:2', width: 960, height: 640, icon: <LandscapeIcon /> }
  ],
  'flux-pro-1.1-ultra': [
    { name: 'Square', value: '1:1', width: 1024, height: 1024, icon: <SquareIcon /> },
    { name: 'Vertical Video', value: '9:16', width: 720, height: 1280, icon: <PortraitIcon /> },
    { name: 'Landscape Video', value: '16:9', width: 1920, height: 1080, icon: <LandscapeIcon /> },
    { name: 'Ultra Vertical', value: '9:21', width: 720, height: 1680, icon: <PortraitIcon /> },
    { name: 'Ultra Widescreen', value: '21:9', width: 2520, height: 1080, icon: <LandscapeIcon /> },
    { name: 'Social Post', value: '6.5:5', width: 600, height: 500, icon: <AspectRatioIcon /> },
    { name: 'Social Banner', value: '1.91:1', width: 1200, height: 628, icon: <AspectRatioIcon /> },
    { name: 'Banner', value: '16:5', width: 320, height: 100, icon: <AspectRatioIcon /> },
    { name: 'Social Media', value: '7:5', width: 860, height: 600, icon: <AspectRatioIcon /> },
    { name: 'Mobile Thumbnail', value: '9:16', width: 300, height: 540, icon: <AspectRatioIcon /> }
  ]
};

export default RESOLUTIONS; 