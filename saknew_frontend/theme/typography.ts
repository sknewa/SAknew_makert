// theme/typography.ts
// Typography System — SA_makert
//
// ROLE MAPPING:
//   Shop Banners / Hero Titles  → Poppins-ExtraBold  (replaces Instrument Serif — same premium feel)
//   Section Headings            → Poppins-Bold
//   Navigation / Buttons        → Poppins-SemiBold   (replaces Manrope — geometric & friendly)
//   Body / Descriptions         → Inter-Regular
//   Prices / Data               → Inter-Bold         (replaces IBM Plex Sans — tabular-style)
//   Labels / Captions           → Inter-Medium
//   Filter Chips                → Inter-Regular / Inter-Medium at 12-14px
//   Admin Status Pills          → Inter-SemiBold uppercase with letterSpacing

export const fonts = {
  // ── Display / Headings (Poppins = premium serif-adjacent) ──
  display:          'Poppins-ExtraBold',   // Shop banners, hero names
  heading:          'Poppins-Bold',        // Section titles
  headingMedium:    'Poppins-SemiBold',    // Sub-headings, nav labels
  headingLight:     'Poppins-Medium',      // Tertiary headings
  headingExtraBold: 'Poppins-ExtraBold',   // Hero emphasis

  // ── Body / UI (Inter = screen-optimised) ──
  body:       'Inter-Regular',   // Descriptions, paragraphs
  bodyMedium: 'Inter-Medium',    // Labels, captions
  bodySemi:   'Inter-SemiBold',  // Emphasis, filter chips
  bodyBold:   'Inter-Bold',      // Prices, data values
  bodyExtra:  'Inter-ExtraBold', // Critical numbers, totals
};

// ── Semantic aliases (use these in components) ──────────────
export const textStyles = {
  // Public storefront
  shopBanner:    { fontFamily: fonts.display,       fontSize: 28, letterSpacing: 0.4 },
  shopName:      { fontFamily: fonts.display,       fontSize: 22, letterSpacing: 0.2 },
  sectionTitle:  { fontFamily: fonts.heading,       fontSize: 16 },

  // Product
  productName:   { fontFamily: fonts.headingMedium, fontSize: 13 },
  productPrice:  { fontFamily: fonts.bodyBold,      fontSize: 14, letterSpacing: 0.2 },
  productPriceGold: { fontFamily: fonts.bodyBold,   fontSize: 14, color: '#FFB81C' },

  // Navigation / Buttons
  navLabel:      { fontFamily: fonts.headingMedium, fontSize: 9,  textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  buttonLabel:   { fontFamily: fonts.headingMedium, fontSize: 15 },

  // Filter chips
  filterChip:    { fontFamily: fonts.bodyMedium,    fontSize: 12 },
  filterChipSm:  { fontFamily: fonts.body,          fontSize: 11 },

  // Admin / Dashboard
  dashStat:      { fontFamily: fonts.bodyBold,      fontSize: 32, letterSpacing: -0.5 },
  dashLabel:     { fontFamily: fonts.bodySemi,      fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1 },
  tableCell:     { fontFamily: fonts.body,          fontSize: 13 },
  tableHeader:   { fontFamily: fonts.bodySemi,      fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  statusPill:    { fontFamily: fonts.bodySemi,      fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  monospace:     { fontFamily: fonts.bodyBold,      fontSize: 12 }, // Order IDs, transaction refs

  // Body
  body:          { fontFamily: fonts.body,          fontSize: 14, lineHeight: 22 },
  bodySmall:     { fontFamily: fonts.body,          fontSize: 12, lineHeight: 18 },
  caption:       { fontFamily: fonts.bodyMedium,    fontSize: 11 },
};

const typography = {
  fontHeading:  fonts.heading,
  fontBody:     fonts.body,
  fontSizeXS:     11,
  fontSizeS:      12,
  fontSizeM:      14,
  fontSizeL:      16,
  fontSizeXL:     18,
  fontSizeXXL:    22,
  fontSizeTitle:  26,
  fontSizeHeader: 30,
  lineHeightS:  18,
  lineHeightM:  22,
  lineHeightL:  26,
};

export default typography;
