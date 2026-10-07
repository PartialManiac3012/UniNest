export const Avatar=({p,size=40})=>{
  if(p?.avatar)return <img src={p.avatar} alt={`${p?.name||'User'} profile`} style={{width:size,height:size}} className="shrink-0 rounded-full object-cover"/>
  return <span style={{width:size,height:size}} className="grid shrink-0 place-items-center rounded-full bg-primary-wash font-bold text-primary-container" aria-hidden="true">{p?.name?.[0]?.toUpperCase()||'?'}</span>
}
export const VerifiedBadge=({verified=false})=>verified?<span className="verified-badge" title="Verified profile" aria-label="Verified profile">✓</span>:null
export const ago=t=>{
  const time=typeof t==='number'?t:Date.parse(t)
  if(!Number.isFinite(time))return 'just now'
  const m=Math.max(0,Math.floor((Date.now()-time)/6e4))
  return m<1?'just now':m<60?m+'m ago':m<1440?Math.floor(m/60)+'h ago':Math.floor(m/1440)+'d ago'
}
export const Chip=({on,children,...r})=><button aria-pressed={!!on} {...r} className={`rounded-full border px-3 py-1 text-sm ${on?'border-primary-container bg-primary-container text-surface':'border-outline-variant hover:border-primary-container'}`}>{children}</button>
