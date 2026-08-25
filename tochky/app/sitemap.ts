import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';
  const locales = ['en', 'ru', 'uk', 'pl'];
  const pages = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/rules', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/guide', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of locales) {
      const pageUrl = `${baseUrl}/${locale}${page.path}`;
      const languages: Record<string, string> = {};
      for (const l of locales) {
        languages[l] = `${baseUrl}/${l}${page.path}`;
      }

      sitemapEntries.push({
        url: pageUrl,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages,
        },
      });
    }
  }

  // Root redirect entry
  sitemapEntries.push({
    url: `${baseUrl}/`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  });

  return sitemapEntries;
}
