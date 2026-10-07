import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,ago,Chip} from '../components/ui.jsx'
import {Icon} from '../components/Layout.jsx'
function Post({p}){
  const s=useSocial(),[open,setOpen]=useState(false),[c,setC]=useState(''),a=s.person(p.by),liked=p.likes.includes(s.me)
  return <article className="card p-4"><header className="flex items-center gap-3"><Avatar p={a}/><div className="flex-1 leading-tight"><Link to={`/u/${p.by}`} className="font-semibold hover:text-primary-container">{a?.name||p.by}</Link><div className="text-xs text-ink-2">{ago(p.t)}</div></div><span className="pill">{p.tag}</span></header>
   <p className="mt-3 leading-7">{p.text}</p>
   <footer className="mt-3 flex gap-5 text-sm"><button aria-pressed={liked} onClick={()=>s.toggleLike(p.id)} className={liked?'font-semibold text-primary-container':'text-ink-2'}><Icon n="favorite"/> {p.likes.length}</button><button onClick={()=>setOpen(!open)} className="text-ink-2" aria-expanded={open}><Icon n="chat_bubble"/> {p.comments.length}</button></footer>
   {open&&<div className="mt-3 space-y-3 border-t border-outline-variant pt-3">{p.comments.map((m,i)=><div key={i} className="flex gap-2 text-sm"><Avatar p={s.person(m.by)} size={28}/><div><b>{s.person(m.by)?.name}</b> <span className="text-xs text-ink-2">{ago(m.t)}</span><br/>{m.text}</div></div>)}
    <form onSubmit={e=>{e.preventDefault();if(c.trim()){s.addComment(p.id,c.trim());setC('')}}} className="flex gap-2"><input className="field" placeholder="Write a comment" aria-label="Comment" value={c} onChange={e=>setC(e.target.value)}/><button className="btn-primary" disabled={!c.trim()}>Reply</button></form></div>}</article>}
export default function Feed(){
  const {user}=useAuth(),s=useSocial(),[t,setT]=useState(''),[tag,setTag]=useState('General'),[mine,setMine]=useState(false)
  const mi=user.interests||[],posts=s.posts.filter(p=>!mine||mi.includes(p.tag)||s.conns.includes(p.by)||p.by===s.me)
  const sugg=s.people.filter(p=>p.uid!==s.me&&!s.conns.includes(p.uid)).sort((a,b)=>s.shared(b).length-s.shared(a).length).slice(0,3)
  return <div className="grid gap-8 lg:grid-cols-12">
   <aside className="space-y-4 lg:col-span-3"><div className="panel p-4"><Avatar p={user} size={48}/><Link to={`/u/${user.uid}`} className="mt-2 block font-serif text-xl font-semibold hover:text-primary-container">{user.name}</Link><p className="text-xs text-ink-2">@{user.uid} · {user.college}</p>
    <div className="mt-3 flex flex-wrap gap-1">{mi.map(i=><span key={i} className="pill">{i}</span>)}</div><p className="mt-3 text-sm text-ink-2">{s.conns.length} connections</p></div></aside>
   <section className="space-y-4 lg:col-span-6">
    <form onSubmit={e=>{e.preventDefault();s.addPost(t.trim(),tag);setT('')}} className="panel p-4"><label className="label" htmlFor="np">Share an update or look for people</label>
     <textarea id="np" maxLength={280} rows={3} className="field" placeholder="What are you building or looking for?" value={t} onChange={e=>setT(e.target.value)}/>
     <div className="mt-2 flex flex-wrap items-center gap-3"><select aria-label="Topic" className="field !w-auto" value={tag} onChange={e=>setTag(e.target.value)}>{['General',...mi].map(x=><option key={x}>{x}</option>)}</select><span className="text-xs text-ink-2">{t.length}/280</span><button className="btn-primary ml-auto" disabled={!t.trim()}>Post</button></div></form>
    <div className="flex gap-2"><Chip on={!mine} onClick={()=>setMine(false)}>Everyone</Chip><Chip on={mine} onClick={()=>setMine(true)}>My interests & connections</Chip></div>
    {!posts.length&&<p className="panel p-6 text-center">Nothing here yet. Connect with people in Discover or post the first update.</p>}
    {posts.map(p=><Post key={p.id} p={p}/>)}</section>
   <aside className="space-y-4 lg:col-span-3"><div className="panel p-4"><h2 className="text-lg">People to connect with</h2>
     <ul className="mt-2 divide-y divide-outline-variant">{sugg.map(p=><li key={p.uid} className="flex items-center gap-2 py-2"><Avatar p={p} size={32}/><Link to={`/u/${p.uid}`} className="flex-1 text-sm font-semibold">{p.name}<br/><span className="text-xs font-normal text-ink-2">{s.shared(p).length} shared interests</span></Link><button onClick={()=>s.toggleConnect(p.uid)} className="btn-outline !px-3 !py-1">Connect</button></li>)}</ul><Link to="/discover" className="mt-2 block text-sm underline underline-offset-4">See more</Link></div>
    <div className="panel p-4"><h2 className="text-lg">Teams looking for members</h2>{s.teams.slice(0,2).map(t=><Link key={t.id} to="/partners" className="mt-2 block text-sm"><b>{t.title}</b><br/><span className="text-xs text-ink-2">{t.event}</span></Link>)}</div></aside></div>}
