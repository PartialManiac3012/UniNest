import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useSocial} from '../social.jsx'
import {Avatar,Chip,VerifiedBadge} from '../components/ui.jsx'
import {INTERESTS} from '../data.js'
export default function Discover(){
  const s=useSocial(),[q,setQ]=useState(''),[sel,setSel]=useState([])
  const tog=i=>setSel(a=>a.includes(i)?a.filter(x=>x!==i):[...a,i])
  const rows=s.people.filter(p=>p.uid!==s.me&&(!sel.length||sel.some(i=>p.interests.includes(i)))&&(!q||(p.name+p.skills+p.bio+p.college).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>s.shared(b).length-s.shared(a).length)
  return <><header><h1 className="text-4xl md:text-5xl">Discover students</h1><p className="mt-2 text-ink-2">People are sorted by how many interests you share.</p></header>
   <input className="field max-w-md" placeholder="Search by name, skill or college" aria-label="Search students" value={q} onChange={e=>setQ(e.target.value)}/>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by interest">{INTERESTS.map(i=><Chip key={i} on={sel.includes(i)} onClick={()=>tog(i)}>{i}</Chip>)}</div>
   {!rows.length&&<p className="panel p-6 text-center">No students match. Clear a filter or search for a different skill.</p>}
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(p=>{const c=s.conns.includes(p.uid),sh=s.shared(p);return <article key={p.uid} className="card flex flex-col p-4">
    <div className="flex items-center gap-3"><Avatar p={p} size={44}/><div className="leading-tight"><Link to={`/u/${p.uid}`} className="font-serif text-lg font-semibold hover:text-primary-container">{p.name}<VerifiedBadge verified={p.verified}/></Link><div className="text-xs text-ink-2">{p.year} · {p.college}{p.sample&&' · sample'}</div></div></div>
    <p className="mt-3 text-sm text-ink-2">{p.bio||'No bio yet.'}</p>
    <div className="mt-3 flex flex-wrap gap-1">{p.interests.map(i=><span key={i} className={sh.includes(i)?'pill-green':'pill'}>{i}</span>)}</div>
    {p.skills&&<p className="mt-2 text-xs text-ink-2">Skills: {p.skills}</p>}
    <div className="mt-auto flex gap-2 pt-4"><button onClick={()=>s.toggleConnect(p.uid)} aria-pressed={c} className={c?'btn-outline flex-1':'btn-primary flex-1'}>{c?'Connected':'Connect'}</button><Link to={`/messages?to=${p.uid}`} className="btn-outline">Message</Link></div></article>})}</div></>}
