import {useEffect,useRef,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useSocial} from '../social.jsx'
import {Avatar,ago,VerifiedBadge} from '../components/ui.jsx'
export default function Messages(){
  const s=useSocial(),[sp,setSp]=useSearchParams(),to=sp.get('to'),[t,setT]=useState(''),end=useRef(null)
  const ids=[...new Set([...(to?[to]:[]),...s.partners()])].filter(u=>u!==s.me&&s.person(u)),cur=to&&s.person(to)?to:ids[0],th=cur?s.thread(cur):[]
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[th.length,cur])
  return <><h1 className="text-4xl">Messages</h1>
   {!ids.length?<p className="panel p-6 text-center">No conversations yet. Connect with people in <Link to="/discover" className="underline">Discover</Link> and say hello.</p>:
   <div className="panel grid min-h-[28rem] overflow-hidden md:grid-cols-[14rem_1fr]">
    <ul className="border-b border-outline-variant md:border-b-0 md:border-r">{ids.map(u=>{const p=s.person(u);return <li key={u}><button onClick={()=>setSp({to:u})} aria-current={u===cur} className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm ${u===cur?'bg-primary-wash':'hover:bg-surface-high'}`}><Avatar p={p} size={32}/>{p.name}<VerifiedBadge verified={p.verified}/></button></li>})}</ul>
    <div className="flex flex-col"><div className="border-b border-outline-variant p-3 text-sm font-semibold">{s.person(cur).name}<VerifiedBadge verified={s.person(cur).verified}/></div>
     <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">{!th.length&&<p className="text-sm text-ink-2">Say hello to {s.person(cur).name.split(' ')[0]}.</p>}{th.map(m=><div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.a===s.me?'ml-auto bg-primary-container text-surface':'bg-surface-high'}`}>{m.text}<div className="text-[10px] opacity-70">{ago(m.t)}</div></div>)}<div ref={end}/></div>
     <form onSubmit={e=>{e.preventDefault();if(t.trim()){s.send(cur,t.trim());setT('')}}} className="flex gap-2 border-t border-outline-variant p-3"><input className="field" aria-label="Message" placeholder="Write a message" value={t} onChange={e=>setT(e.target.value)}/><button className="btn-primary" disabled={!t.trim()}>Send</button></form></div></div>}
   <p className="text-xs text-ink-2">Messages are stored in this browser only. Sample students do not reply until a backend is connected.</p></>}
