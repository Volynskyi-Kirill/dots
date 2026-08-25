import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/room/',
        '/en/room/',
        '/ru/room/',
        '/uk/room/',
        '/pl/room/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
