import { Helmet } from 'react-helmet-async';
import { SEO_CONFIG } from '@/config/seo.config';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  structuredData?: object | object[];
  noIndex?: boolean;
}

export const SEO = ({
  title,
  description,
  keywords,
  canonical,
  ogImage = SEO_CONFIG.defaultImage,
  ogType = 'website',
  structuredData,
  noIndex = false
}: SEOProps) => {
  const fullTitle = title.includes(SEO_CONFIG.siteName) 
    ? title 
    : `${title} | ${SEO_CONFIG.siteName}`;
  
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : SEO_CONFIG.siteUrl);

  // Base Organization schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONFIG.companyInfo.name,
    legalName: SEO_CONFIG.companyInfo.legalName,
    url: SEO_CONFIG.siteUrl,
    logo: `${SEO_CONFIG.siteUrl}/logo.png`,
    foundingDate: SEO_CONFIG.companyInfo.foundingDate,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: SEO_CONFIG.companyInfo.telephone,
      contactType: 'sales',
      email: SEO_CONFIG.companyInfo.email,
      availableLanguage: ['English']
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: SEO_CONFIG.companyInfo.address.streetAddress,
      addressLocality: SEO_CONFIG.companyInfo.address.addressLocality,
      addressRegion: SEO_CONFIG.companyInfo.address.addressRegion,
      addressCountry: SEO_CONFIG.companyInfo.address.addressCountry
    },
    sameAs: [
      'https://facebook.com/trustlinkventures',
      'https://linkedin.com/company/trustlinkventures'
    ]
  };

  // Combine schemas
  const allSchemas = structuredData 
    ? Array.isArray(structuredData) 
      ? [organizationSchema, ...structuredData]
      : [organizationSchema, structuredData]
    : [organizationSchema];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={SEO_CONFIG.siteName} />
      
      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SEO_CONFIG.siteName} />
      <meta property="og:locale" content={SEO_CONFIG.locale} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={SEO_CONFIG.twitterHandle} />
      
      {/* Geo Tags for Ghana */}
      <meta name="geo.region" content="GH" />
      <meta name="geo.placename" content="Tema, Ghana" />
      <meta name="geo.position" content={`${SEO_CONFIG.companyInfo.geo.latitude};${SEO_CONFIG.companyInfo.geo.longitude}`} />
      <meta name="ICBM" content={`${SEO_CONFIG.companyInfo.geo.latitude}, ${SEO_CONFIG.companyInfo.geo.longitude}`} />
      
      {/* Structured Data */}
      {allSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
