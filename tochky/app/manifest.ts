import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dots Game',
    short_name: 'Dots',
    description: 'Play the classic Dots (Tochka) game online with friends. Capture territory, block opponents, and win the match!',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/icons/icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
      {
        src: '/icons/apple-icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
