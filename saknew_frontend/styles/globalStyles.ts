import { StyleSheet, Platform } from 'react-native';
import { fonts, textStyles } from '../theme/typography';

export { textStyles };

export const colors = {
  // SA Flag palette (primary brand)
  primary:       '#007A4D',  // SA Green
  primaryDark:   '#005c39',
  primaryLight:  '#E8F5EF',
  gold:          '#FFB81C',  // SA Gold
  goldLight:     '#FFF8E1',
  blue:          '#002395',  // SA Blue
  blueLight:     '#EEF1FF',
  red:           '#DE3831',  // SA Red
  redLight:      '#FEE2E2',
  navy:          '#0D1B2A',  // Deep Navy
  // Semantic
  secondary:     '#FF6584',
  accent:        '#FFB81C',  // = gold
  success:       '#007A4D',
  successLight:  '#E8F5EF',
  warning:       '#FFB81C',
  warningLight:  '#FFF8E1',
  error:         '#DE3831',
  errorLight:    '#FEE2E2',
  info:          '#002395',
  infoLight:     '#EEF1FF',
  background:    '#F4F6FB',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F8FAFF',
  border:        '#E0E0E0',
  divider:       '#F0F2F8',
  textPrimary:   '#111111',
  textSecondary: '#555555',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',
  white:         '#FFFFFF',
  card:          '#FFFFFF',
  dangerAction:  '#DE3831',
  warningAction: '#FFB81C',
  infoAction:    '#002395',
  successText:   '#007A4D',
  errorText:     '#DE3831',
  starColor:     '#FFB81C',
  shadowColor:   '#C8A96E',  // warm SA shadow
  iconColor:     '#555555',
  buttonText:    '#FFFFFF',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const shadow = {
  sm: Platform.select({
    ios:     { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios:     { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios:     { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 8 },
    android: { elevation: 8 },
    default: {},
  }),
};

export const globalStyles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────
  flex1:        { flex: 1 },
  safeContainer: { flex: 1, backgroundColor: colors.background },
  container:    { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row:          { flexDirection: 'row', alignItems: 'center' },
  rowBetween:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // ── Cards ────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    ...Platform.select({
      ios:     { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  cardFlat: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ── Buttons ──────────────────────────────────────────────────
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  btnDanger: {
    backgroundColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  },
  btnText:        { color: colors.white, fontSize: 15, fontFamily: fonts.headingMedium },
  btnOutlineText: { color: colors.primary, fontSize: 15, fontFamily: fonts.headingMedium },
  btnDisabled:    { opacity: 0.5 },

  // ── Inputs ───────────────────────────────────────────────────
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.bodySemi,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inputError: { borderColor: colors.error },

  // ── Typography ───────────────────────────────────────────────
  // Shop banners / hero (Poppins-ExtraBold = Instrument Serif role)
  h1:       { fontSize: 28, fontFamily: fonts.display,       color: colors.textPrimary, letterSpacing: -0.5 },
  h2:       { fontSize: 22, fontFamily: fonts.display,       color: colors.textPrimary },
  h3:       { fontSize: 18, fontFamily: fonts.heading,       color: colors.textPrimary },
  h4:       { fontSize: 16, fontFamily: fonts.headingMedium, color: colors.textPrimary },
  // Body / data (Inter = IBM Plex Sans role)
  body:     { fontSize: 15, fontFamily: fonts.body,          color: colors.textPrimary, lineHeight: 22 },
  bodySmall:{ fontSize: 13, fontFamily: fonts.body,          color: colors.textSecondary, lineHeight: 20 },
  caption:  { fontSize: 11, fontFamily: fonts.bodyMedium,    color: colors.textMuted },
  link:     { fontSize: 14, fontFamily: fonts.bodySemi,      color: colors.primary },
  // Price — Inter-Bold in SA Gold
  price:    { fontSize: 14, fontFamily: fonts.bodyBold,      color: '#FFB81C', letterSpacing: 0.2 },
  // Nav labels (Poppins-SemiBold = Manrope role)
  navLabel: { fontSize: 9,  fontFamily: fonts.headingMedium, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  // Admin status pills (Inter-SemiBold uppercase)
  statusPill: { fontSize: 11, fontFamily: fonts.bodySemi, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  // Dashboard stats (Inter-Bold large)
  dashStat: { fontSize: 32, fontFamily: fonts.bodyBold, color: '#111', letterSpacing: -0.5 },
  dashLabel:{ fontSize: 11, fontFamily: fonts.bodySemi, textTransform: 'uppercase' as const, letterSpacing: 1, color: colors.textMuted },

  // ── Badges ───────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start' as const,
  },
  badgeSuccess: { backgroundColor: colors.successLight },
  badgeError:   { backgroundColor: colors.errorLight },
  badgeWarning: { backgroundColor: colors.warningLight },
  badgeInfo:    { backgroundColor: colors.infoLight },
  badgePrimary: { backgroundColor: colors.primaryLight },
  badgeText:    { fontSize: 11, fontFamily: fonts.bodyBold },

  // ── Divider ──────────────────────────────────────────────────
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },

  // ── Section header ───────────────────────────────────────────
  sectionHeader: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  // ── Empty state ──────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle:   { fontSize: 18, fontFamily: fonts.heading, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm, textAlign: 'center' as const },
  emptySubtitle:{ fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center' as const, lineHeight: 22 },

  // ── Screen header ────────────────────────────────────────────
  screenHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.textPrimary },
});
