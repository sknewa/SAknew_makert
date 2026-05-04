// theme/typography.ts
// Poppins  → headings, titles, shop names, buttons
// Inter    → body text, labels, inputs, captions

export const fonts = {
  // Poppins — headings & display
  heading:          'Poppins-Bold',
  headingMedium:    'Poppins-SemiBold',
  headingLight:     'Poppins-Medium',
  headingExtraBold: 'Poppins-ExtraBold',

  // Inter — body & UI
  body:       'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemi:   'Inter-SemiBold',
  bodyBold:   'Inter-Bold',
};

const typography = {
  // Font families
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
