// AI models configuration

// Define AI models and their supported resolutions
export const AI_MODELS = [
  { 
    id: 'flux-pro-1.1', 
    name: 'Flux1.1 Pro',
    endpoint: '/v1/flux-pro-1.1',
    description: 'Standard model with common aspect ratios'
  },
  { 
    id: 'flux-pro-1.1-ultra', 
    name: 'Flux1.1 Pro-ultra',
    endpoint: '/v1/flux-pro-1.1-ultra',
    description: 'Advanced model with wider range of aspect ratios'
  },
  { 
    id: 'flux-pro-1.1-video', 
    name: 'Flux1.1 Video',
    endpoint: '/v1/flux-pro-1.1-video',
    description: 'Generate short animated videos'
  },
  { 
    id: 'flux-pro-1.1-iterated', 
    name: 'Flux1.1 Iterated',
    endpoint: '/v1/flux-pro-1.1-iterated',
    description: 'Create frame-by-frame generated videos'
  },
  { 
    id: 'flux-pro-1.1-avatar', 
    name: 'Flux1.1 Avatar',
    endpoint: '/v1/flux-pro-1.1-avatar',
    description: 'Generate personalized avatar videos'
  }
];

export default AI_MODELS; 