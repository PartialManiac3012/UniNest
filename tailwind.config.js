export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: { extend: {
    colors: {
      surface: 'rgb(var(--surface) / <alpha-value>)',
      'surface-dim': 'rgb(var(--surface-dim) / <alpha-value>)',
      'surface-lowest': 'rgb(var(--surface-lowest) / <alpha-value>)',
      'surface-low': 'rgb(var(--surface-low) / <alpha-value>)',
      'surface-container': 'rgb(var(--surface-container) / <alpha-value>)',
      'surface-high': 'rgb(var(--surface-high) / <alpha-value>)',
      'surface-highest': 'rgb(var(--surface-highest) / <alpha-value>)',
      ink: 'rgb(var(--ink) / <alpha-value>)',
      'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
      outline: 'rgb(var(--outline) / <alpha-value>)',
      'outline-variant': 'rgb(var(--outline-variant) / <alpha-value>)',
      primary: 'rgb(var(--primary) / <alpha-value>)',
      'primary-container': 'rgb(var(--primary-container) / <alpha-value>)',
      'primary-wash': 'rgb(var(--primary-wash) / <alpha-value>)',
      secondary: 'rgb(var(--secondary) / <alpha-value>)',
      'secondary-wash': 'rgb(var(--secondary-wash) / <alpha-value>)',
      tertiary: 'rgb(var(--tertiary) / <alpha-value>)',
      gold: 'rgb(var(--gold) / <alpha-value>)',
      'gold-wash': 'rgb(var(--gold-wash) / <alpha-value>)',
      error: 'rgb(var(--error) / <alpha-value>)',
      'error-wash': 'rgb(var(--error-wash) / <alpha-value>)'
    },
    fontFamily: { serif:['Newsreader','Georgia','serif'], sans:['Inter','system-ui','sans-serif'] },
    borderRadius: { DEFAULT:'0.25rem', lg:'0.5rem' }
  }}
}
