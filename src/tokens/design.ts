export const color = {
  amethyst: '#A846A0',
  cornflower: '#6F9CEB',
  navy: '#102F5D',
  sand: '#CACF85',
  babyBlue: '#98B9F2',

  amethyst800: '#75276F',
  cornflower700: '#24509F',
  sand800: '#4E521C',
  navy900: '#0A1F3F',

  surface: '#FAFAF8',
  surfaceRaised: '#FFFFFF',
  surfaceSunk: '#F1F4FA',
  border: '#DDE4F3',
  borderStrong: '#C7D3EA',

  text: '#102F5D',
  textMuted: '#3D4C63',
  action: '#75276F',
  actionHover: '#5C1F58',
  linkAlt: '#24509F',
  focusRing: '#A846A0',
  focusRingOnDark: '#CACF85',
  positive: '#4E521C',
} as const

export const categorical = [
  '#102F5D',
  '#8E2F87',
  '#1F7A6E',
  '#C4622D',
  '#6F9CEB',
  '#CACF85',
] as const

export const sequential = [
  '#0A1F3F',
  '#1B3E7D',
  '#24509F',
  '#6F9CEB',
  '#98B9F2',
  '#DDE4F3',
] as const

export const diverging = [
  '#5C1F58',
  '#8E2F87',
  '#C98FC4',
  '#EFEFE9',
  '#CACF85',
  '#8E9440',
  '#4E521C',
] as const

export const font = {
  body: "'Atkinson Hyperlegible', system-ui, sans-serif",
  heading: "'Corben', Georgia, serif",
  mono: "'IBM Plex Mono', monospace",
} as const

export const motion = {
  duration: 300,
  stagger: 30,
  ease: [0, 0, 0.2, 1] as const,
} as const
