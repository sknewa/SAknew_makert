import { StyleSheet, Platform } from 'react-native';
import { fonts } from '../theme/typography';

export const colors = {
  primary:       '#6C63FF',
  primaryDark:   '#5A52D5',
  primaryLight:  '#EEF0FF',
  secondary:     '#FF6584',
  accent:        '#FFB703',
  success:       '#22C55E',
  successLight:  '#DCFCE7',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  error:         '#EF4444',
  errorLight:    '#FEE2E2',
  info:          '#3B82F6',
  infoLight:     '#DBEAFE',
  background:    '#F4F6FB',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F8FAFF',
  border:        '#E8ECF4',
  divider:       '#F0F2F8',
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',
  white:         '#FFFFFF',
  card:          '#FFFFFF',
  dangerAction:  '#EF4444',
  warningAction: '#F59E0B',
  infoAction:    '#3B82F6',
  successText:   '#22C55E',
  errorText:     '#EF4444',
  starColor:     '#FFB703',
  shadowColor:   '#6C63FF',
  iconColor:     '#64748B',
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
  h1:       { fontSize: 28, fontFamily: fonts.headingExtraBold, color: colors.textPrimary, letterSpacing: -0.5 },
  h2:       { fontSize: 22, fontFamily: fonts.heading, color: colors.textPrimary },
  h3:       { fontSize: 18, fontFamily: fonts.heading, color: colors.textPrimary },
  h4:       { fontSize: 16, fontFamily: fonts.headingMedium, color: colors.textPrimary },
  body:     { fontSize: 15, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 22 },
  bodySmall:{ fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },
  caption:  { fontSize: 11, fontFamily: fonts.body, color: colors.textMuted },
  link:     { fontSize: 14, fontFamily: fonts.bodySemi, color: colors.primary },

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
