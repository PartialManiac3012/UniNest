import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,Chip} from '../components/ui.jsx'
import {EVENT_TYPES} from '../data.js'
export default function Partners(){
  const {user}=useAuth(),s=useSocial(),[f,setF]=useState('All'),[show,setShow]=useState(false)
  const [n,setN]=useState({title:'',event:EVENT_TYPES[0],need:'',desc:'',spots:2})
  const mine=(user.skills||'').toLowerCase()
  const list=s.teams.filter(t=>f==='All'||t.event===f)
  const submit=e=>{e.preventDefault();s.addTeam({...n,spots:+n.spots,need:n.need.split(',').map(x=>x.trim()).filter(Boolean)});setN({title:'',event:EVENT_TYPES[0],need:'',desc:'',spots:2});setShow(false)}
  return <><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl md:text-5xl">Find partners</h1><p className="mt-2 max-w-xl text-ink-2">Looking for a hackathon teammate, study group or project partner? Post what you need, or join a team.</p></div>
   <button className="btn-primary" aria-expanded={show} onClick={()=>setShow(!show)}>{show?'Close':'Post a team'}</button></header>
   {show&&<form onSubmit={submit} className="panel grid gap-4 p-5 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label" htmlFor="tt">What are you building or organizing?</label><input id="tt" className="field" required value={n.title} onChange={e=>setN({...n,title:e.target.value})}/></div>
    <div><label className="label" htmlFor="te">Type</label><select id="te" className="field" value={n.event} onChange={e=>setN({...n,event:e.target.value})}>{EVENT_TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
    <div><label className="label" htmlFor="ts">Open spots</label><input id="ts" type="number" min="1" max="20" className="field" value={n.spots} onChange={e=>setN({...n,spots:e.target.value})}/></div>
    <div className="sm:col-span-2"><label className="label" htmlFor="tn">Skills you need (comma separated)</label><input id="tn" className="field" placeholder="React, UI/UX, Python" value={n.need} onChange={e=>setN({...n,need:e.target.value})}/></div>
    <div className="sm:col-span-2"><label className="label" htmlFor="td">Details</label><textarea id="td" rows={3} className="field" value={n.desc} onChange={e=>setN({...n,desc:e.target.value})}/></div>
    <button className="btn-primary sm:col-span-2" disabled={!n.title.trim()}>Publish</button></form>}
   <div className="flex flex-wrap gap-2">{['All',...EVENT_TYPES].map(x=><Chip key={x} on={f===x} onClick={()=>setF(x)}>{x}</Chip>)}</div>
   {!list.length&&<p className="panel p-6 text-center">No teams in this category yet. Be the first to post one.</p>}
   <div className="grid gap-4 md:grid-cols-2">{list.map(t=>{const a=s.person(t.by),joined=t.joins.includes(s.me),left=t.spots-t.joins.length,own=t.by===s.me
    return <article key={t.id} className="card flex flex-col p-5"><div className="flex items-center justify-between"><span className="pill">{t.event}</span><span className="text-xs text-ink-2">{left>0?`${left} spot${left>1?'s':''} left`:'Full'}</span></div>
     <h2 className="mt-3 text-xl font-semibold">{t.title}</h2><p className="mt-1 text-sm text-ink-2">{t.desc}</p>
     <div className="mt-3 flex flex-wrap gap-1">{t.need.map(k=><span key={k} className={mine.includes(k.toLowerCase())?'pill-green':'pill'}>{k}</span>)}</div>
     <div className="mt-auto flex items-center gap-2 pt-4"><Avatar p={a} size={28}/><Link to={`/u/${t.by}`} className="flex-1 text-sm">{a?.name}</Link>
      {own?<span className="text-xs text-ink-2">Your post</span>:<><Link to={`/messages?to=${t.by}`} className="btn-outline !px-3 !py-1.5">Message</Link><button onClick={()=>s.toggleJoin(t.id)} disabled={!joined&&left<1} aria-pressed={joined} className={joined?'btn-outline !py-1.5':'btn-primary !py-1.5'}>{joined?'Requested':'Request to join'}</button></>}</div></article>})}</div>
   <p className="text-xs text-ink-2">Green tags are skills from your profile. Add skills on your profile to improve matches.</p></>}
