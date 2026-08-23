export const grey = {
  0: '#fafafa',
  1: '#e5e5e5',
  2: '#c4c4c4',
  3: '#696969',
  4: '#525252',
  5: '#1a1a1a',
} as const

export const accent = {
  emphasis: '#1d4ed8',
} as const

export const font = {
  family: "'Albert Sans', system-ui, -apple-system, sans-serif",
  print: "'Libertinus Serif', 'Linux Libertine', Georgia, serif",
} as const

export const texture = {
  patterns: ['solid', 'diagonal', 'dots', 'crosshatch', 'horizontal', 'vertical'] as const,
} as const

export const motion = {
  duration: 300,
  stagger: 30,
  ease: [0, 0, 0.2, 1] as const,
} as const
