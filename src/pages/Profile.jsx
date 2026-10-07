import {useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,Chip} from '../components/ui.jsx'
import {INTERESTS} from '../data.js'
export default function Profile(){
  const {uid}=useParams(),{user,updateProfile}=useAuth(),s=useSocial(),p=s.person(uid),own=uid===user.uid
  const [edit,setEdit]=useState(false),[d,setD]=useState(null)
  if(!p)return <p className="panel p-6">No student with the ID @{uid}. <Link to="/discover" className="underline">Back to Discover</Link></p>
  const start=()=>{setD({bio:p.bio||'',skills:p.skills||'',interests:p.interests||[]});setEdit(true)}
  const tog=i=>setD(x=>({...x,interests:x.interests.includes(i)?x.interests.filter(y=>y!==i):[...x.interests,i]}))
  const posts=s.posts.filter(x=>x.by===uid),teams=s.teams.filter(x=>x.by===uid),c=s.conns.includes(uid)
  return <div className="mx-auto max-w-3xl space-y-6">
   <header className="panel flex flex-wrap items-center gap-4 p-6"><Avatar p={p} size={64}/><div className="flex-1"><h1 className="text-3xl">{p.name}</h1><p className="text-sm text-ink-2">@{p.uid} · {p.year} · {p.college}</p></div>
    {own?<button className="btn-outline" onClick={edit?()=>setEdit(false):start}>{edit?'Cancel':'Edit profile'}</button>:<div className="flex gap-2"><button onClick={()=>s.toggleConnect(uid)} aria-pressed={c} className={c?'btn-outline':'btn-primary'}>{c?'Connected':'Connect'}</button><Link to={`/messages?to=${uid}`} className="btn-outline">Message</Link></div>}</header>
   {edit?<form onSubmit={e=>{e.preventDefault();updateProfile(d);setEdit(false)}} className="panel space-y-4 p-6">
    <div><label className="label" htmlFor="bio">Bio</label><textarea id="bio" rows={3} maxLength={200} className="field" value={d.bio} onChange={e=>setD({...d,bio:e.target.value})}/></div>
    <div><label className="label" htmlFor="sk">Skills (comma separated)</label><input id="sk" className="field" value={d.skills} onChange={e=>setD({...d,skills:e.target.value})}/></div>
    <div><span className="label">Interests</span><div className="flex flex-wrap gap-2">{INTERESTS.map(i=><Chip type="button" key={i} on={d.interests.includes(i)} onClick={()=>tog(i)}>{i}</Chip>)}</div></div>
    <button className="btn-primary" disabled={!d.interests.length}>Save profile</button></form>
   :<section className="panel space-y-3 p-6"><p>{p.bio||(own?'Add a bio so people know what you are into.':'No bio yet.')}</p>
    <div className="flex flex-wrap gap-1">{(p.interests||[]).map(i=><span key={i} className={!own&&s.shared(p).includes(i)?'pill-green':'pill'}>{i}</span>)}</div>
    {p.skills&&<p className="text-sm text-ink-2">Skills: {p.skills}</p>}</section>}
   {!!teams.length&&<section><h2 className="mb-2 text-xl">Looking for teammates</h2>{teams.map(t=><Link key={t.id} to="/partners" className="card mb-2 block p-3 text-sm"><b>{t.title}</b> <span className="text-ink-2">· {t.event}</span></Link>)}</section>}
   <section><h2 className="mb-2 text-xl">Posts</h2>{posts.length?posts.map(x=><p key={x.id} className="card mb-2 p-3 text-sm">{x.text}</p>):<p className="text-sm text-ink-2">No posts yet.</p>}</section></div>}
