import {useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,Chip,VerifiedBadge} from '../components/ui.jsx'
import {INTERESTS,STREAMS} from '../data.js'
const MAX_AVATAR_BYTES=2*1024*1024
const toDataUrl=file=>new Promise((resolve,reject)=>{
  const reader=new FileReader()
  reader.onload=()=>resolve(reader.result)
  reader.onerror=()=>reject(new Error('Could not read that image. Please try another file.'))
  reader.readAsDataURL(file)
})
export default function Profile(){
  const {uid}=useParams(),{user,updateProfile}=useAuth(),s=useSocial(),p=s.person(uid),own=uid===user.uid
  const [edit,setEdit]=useState(false),[d,setD]=useState(null),[err,setErr]=useState('')
  if(!p)return <p className="panel p-6">No student with the ID @{uid}. <Link to="/discover" className="underline">Back to Discover</Link></p>
  const start=()=>{setD({bio:p.bio||'',skills:p.skills||'',interests:p.interests||[],avatar:p.avatar||'',stream:p.stream||''});setErr('');setEdit(true)}
  const onAvatar=async e=>{
    const file=e.target.files?.[0]
    if(!file)return
    setErr('')
    if(!file.type.startsWith('image/')){setErr('Please choose an image file.');return}
    if(file.size>MAX_AVATAR_BYTES){setErr('Please choose an image under 2MB.');return}
    try{setD({...d,avatar:await toDataUrl(file)})}catch(x){setErr(x.message)}
  }
  const tog=i=>setD(x=>({...x,interests:x.interests.includes(i)?x.interests.filter(y=>y!==i):[...x.interests,i]}))
  const posts=s.posts.filter(x=>x.by===uid),teams=s.teams.filter(x=>x.by===uid),c=s.conns.includes(uid)
  const connections=own?s.conns.map(id=>s.person(id)).filter(Boolean):[]
  return <div className="mx-auto max-w-3xl space-y-6">
   <header className="panel flex flex-wrap items-center gap-4 p-6"><Avatar p={p} size={64}/><div className="flex-1"><h1 className="text-3xl">{p.name}<VerifiedBadge verified={own?s.canPost:p.verified}/></h1><p className="text-sm text-ink-2">@{p.uid} · {p.year} · {p.college}{p.stream&&<> · {p.stream}</>}</p></div>
    {own?<button className="btn-outline" onClick={edit?()=>setEdit(false):start}>{edit?'Cancel':'Edit profile'}</button>:<div className="flex gap-2"><button onClick={()=>s.toggleConnect(uid)} aria-pressed={c} className={c?'btn-outline':'btn-primary'}>{c?'Connected':'Connect'}</button><Link to={`/messages?to=${uid}`} className="btn-outline">Message</Link></div>}</header>
   {own&&<section className="panel flex flex-wrap items-center gap-4 p-6"><div className="flex-1"><h2 className="text-lg font-semibold">Student verification</h2><p className="mt-1 text-sm text-ink-2">{s.canPost?'Your student account is verified. You can create posts, teams, club events, and Lost & Found listings.':'Use your verified student account to create posts. Verification is checked using your Supabase student verification function.'}</p><p className="mt-2 text-xs text-ink-2">{user.email}</p>{s.postingPermissionError&&<p role="alert" className="mt-2 text-sm text-error">Verification check failed: {s.postingPermissionError}</p>}</div><div className="flex items-center gap-3">{s.canPost?<span className="pill-green">Verified <VerifiedBadge verified/></span>:<span className="pill">Not verified</span>}<button className="btn-outline" onClick={()=>s.refreshPostingPermission()}>Check status</button></div></section>}
   {edit?<form onSubmit={e=>{e.preventDefault();updateProfile(d);setEdit(false)}} className="panel space-y-4 p-6">
    {err&&<p role="alert" className="rounded border border-error bg-error-wash p-3 text-sm text-error">{err}</p>}
    <div><span className="label">Profile photo</span><div className="flex items-center gap-4">
      <Avatar p={{...p,avatar:d.avatar}} size={64}/>
      <div className="space-y-2"><input type="file" accept="image/*" className="block text-sm" onChange={e=>onAvatar(e)}/>
        {d.avatar&&<button type="button" className="block text-sm underline underline-offset-4" onClick={()=>setD({...d,avatar:''})}>Remove photo</button>}
        <p className="text-xs text-ink-2">JPG, PNG, GIF, or WebP up to 2MB.</p>
      </div>
    </div></div>
    <div><label className="label" htmlFor="bio">Bio</label><textarea id="bio" rows={3} maxLength={200} className="field" value={d.bio} onChange={e=>setD({...d,bio:e.target.value})}/></div>
    <div><label className="label" htmlFor="sk">Skills (comma separated)</label><input id="sk" className="field" value={d.skills} onChange={e=>setD({...d,skills:e.target.value})}/></div>
    <div><label className="label" htmlFor="profile-stream">Stream</label><select id="profile-stream" className="field" value={d.stream} onChange={e=>setD({...d,stream:e.target.value})}><option value="">Select your stream</option>{STREAMS.map(stream=><option key={stream}>{stream}</option>)}</select></div>
    <div><span className="label">Interests</span><div className="flex flex-wrap gap-2">{INTERESTS.map(i=><Chip type="button" key={i} on={d.interests.includes(i)} onClick={()=>tog(i)}>{i}</Chip>)}</div></div>
    <button className="btn-primary" disabled={!d.interests.length}>Save profile</button></form>
   :<section className="panel space-y-3 p-6"><p>{p.bio||(own?'Add a bio so people know what you are into.':'No bio yet.')}</p>
    <div className="flex flex-wrap gap-1">{(p.interests||[]).map(i=><span key={i} className={!own&&s.shared(p).includes(i)?'pill-green':'pill'}>{i}</span>)}</div>
    {p.skills&&<p className="text-sm text-ink-2">Skills: {p.skills}</p>}</section>}
   {!!teams.length&&<section><h2 className="mb-2 text-xl">Looking for teammates</h2>{teams.map(t=><Link key={t.id} to="/partners" className="card mb-2 block p-3 text-sm"><b>{t.title}</b> <span className="text-ink-2">· {t.event}</span></Link>)}</section>}
   {own&&<section><div className="mb-2 flex items-center justify-between"><h2 className="text-xl">Your connections</h2><span className="text-sm text-ink-2">{connections.length}</span></div>{connections.length?<div className="grid gap-3 sm:grid-cols-2">{connections.map(connection=><Link key={connection.uid} to={`/u/${connection.uid}`} className="card flex items-center gap-3 p-3 hover:border-primary-container"><Avatar p={connection} size={44}/><span className="min-w-0 flex-1"><b className="block truncate">{connection.name}<VerifiedBadge verified={connection.verified}/></b><span className="block truncate text-xs text-ink-2">@{connection.uid} · {connection.college}</span></span></Link>)}</div>:<p className="panel p-5 text-sm text-ink-2">You do not have any connections yet. Discover students and send a connection request.</p>}</section>}
   <section><h2 className="mb-2 text-xl">Posts</h2>{posts.length?posts.map(x=><p key={x.id} className="card mb-2 p-3 text-sm">{x.text}</p>):<p className="text-sm text-ink-2">No posts yet.</p>}</section></div>}
