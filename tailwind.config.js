export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: {
      surface:'#fdf8f5','surface-dim':'#ddd9d6','surface-lowest':'#ffffff','surface-low':'#f7f3ef',
      'surface-container':'#f2ede9','surface-high':'#ece7e4','surface-highest':'#e6e2de',
      ink:'#1c1b19','ink-2':'#554240',outline:'#887270','outline-variant':'#dbc0be',
      primary:'#611816','primary-container':'#7f2e2a','primary-wash':'#ffdad6',
      secondary:'#3a6753','secondary-wash':'#bceed3',tertiary:'#5e4500','gold':'#f0c04d','gold-wash':'#ffdf9d',
      error:'#ba1a1a','error-wash':'#ffdad6'
    },
    fontFamily: { serif:['Newsreader','Georgia','serif'], sans:['Inter','system-ui','sans-serif'] },
    borderRadius: { DEFAULT:'0.25rem', lg:'0.5rem' }
  }}
}
