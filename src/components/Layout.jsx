import {useEffect,useRef,useState} from 'react'
import {NavLink,Link,Outlet,useLocation,useNavigate} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,VerifiedBadge,ago} from './ui.jsx'
export const Icon=({n,className=''})=><span className={`material-symbols-outlined ${className}`} aria-hidden="true">{n}</span>
const nav=[['/','Homepage'],['/discover','Discover'],['/feed','Activities'],['/events','Events'],['/club-events','Club events'],['/lost-found','Lost & found']]
const Section=({title,links})=><div><h4 className="kicker mb-3">{title}</h4><ul className="space-y-2 text-sm">{links.map(l=><li key={l}><a href="#" className="hover:text-primary-container hover:underline">{l}</a></li>)}</ul></div>
export default function Layout(){
  const {user,logout}=useAuth(),s=useSocial(),go=useNavigate(),q=useRef(null),noticeRef=useRef(null),{pathname}=useLocation(),[open,setOpen]=useState(false),[noticeOpen,setNoticeOpen]=useState(false),[tick,setTick]=useState(0)
  const notices=user?[...s.notifications(),...s.pendingConnectionRequests().map(r=>({id:r.id,type:'connection',from:r.from,person:r.person,request:r,t:r.created_at||r.t}))]:[],unread=notices.length
  useEffect(()=>{const f=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();q.current?.focus()}};addEventListener('keydown',f);return()=>removeEventListener('keydown',f)},[])
  useEffect(()=>{window.scrollTo(0,0);setOpen(false)},[pathname])
  useEffect(()=>{const close=e=>{if(noticeRef.current&&!noticeRef.current.contains(e.target))setNoticeOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
  return <div className="min-h-screen flex flex-col">
    <header className="border-b border-outline-variant bg-surface sticky top-0 z-30">
      <div className="relative mx-auto flex min-h-16 max-w-[1200px] items-center gap-3 overflow-visible px-4 py-2 md:gap-4 md:px-12">
        <Link to="/" className="flex items-center gap-3 mr-auto">
          <img src="/WEB%20LOGO.png" alt="UniNest" className="h-12 w-28 object-contain" />
          <span className="sr-only">UniNest</span></Link>
        <label className="hidden md:flex items-center gap-2 border border-outline-variant rounded px-3 py-1.5 w-64 focus-within:border-primary-container">
          <Icon n="search" className="text-ink-2"/><input ref={q} placeholder="Search people" className="bg-transparent text-sm outline-none flex-1 min-w-0"/><kbd className="text-[10px] text-ink-2">⌘K</kbd></label>
        {user?<><div ref={noticeRef} className="relative"><button className={`relative grid h-10 w-10 place-items-center rounded-full transition ${noticeOpen?'bg-primary-wash text-primary-container':'text-ink-2 hover:bg-surface-low hover:text-primary-container'}`} aria-label={`Notifications${unread?`, ${unread} unread`:''}`} aria-expanded={noticeOpen} onClick={()=>setNoticeOpen(!noticeOpen)}><Icon n="notifications"/>{unread>0&&<span className="absolute right-0 top-0 grid h-5 min-w-5 -translate-y-1/4 translate-x-1/4 place-items-center rounded-full bg-error px-1 text-[10px] font-bold text-white">{unread>9?'9+':unread}</span>}</button>{noticeOpen&&<div role="dialog" aria-label="Notifications" className="absolute left-1/2 top-12 z-50 w-[calc(100vw-1rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl sm:left-auto sm:right-0 sm:w-[360px] sm:translate-x-0"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-4 py-3"><h2 className="text-lg font-semibold">Notifications</h2><button className="rounded px-2 py-1 text-xs font-semibold text-primary-container hover:bg-primary-wash" onClick={()=>{s.markNotificationsRead();setTick(tick+1)}}>Mark all as read</button></header>{s.notificationError&&<p role="alert" className="border-b border-error bg-error-wash px-4 py-3 text-xs text-error">{s.notificationError}</p>}{!notices.length?<p className="px-4 py-10 text-center text-sm text-ink-2">No notifications yet</p>:<ul className="max-h-[min(28rem,70vh)] overflow-y-auto py-1">{notices.map(n=>n.type==='connection'?<li key={n.id} className="border-b border-outline-variant/60 px-3 py-3"><div className="flex gap-3"><Avatar p={n.person} size={40}/><div className="min-w-0 flex-1 text-sm"><p><b>{n.person?.name||'A student'}</b> sent you a connection request.</p><p className="mt-1 text-xs text-ink-2">{ago(n.t)}</p>{n.request&&<div className="mt-2 flex gap-2"><button className="btn-primary !px-3 !py-1 text-xs" onClick={()=>{s.respondConnection(n.request.id,true);setTick(tick+1)}}>Accept</button><button className="btn-outline !px-3 !py-1 text-xs" onClick={()=>{s.respondConnection(n.request.id,false);setTick(tick+1)}}>Decline</button></div>}</div></div></li>:<li key={n.id} className="border-b border-outline-variant/60 px-3 py-3 hover:bg-surface-low"><Link className="flex gap-3 text-sm" to={`/messages?to=${n.from}`} onClick={()=>setNoticeOpen(false)}><Avatar p={n.person} size={40}/><span className="min-w-0 flex-1"><b>{n.person?.name||'Someone'}</b> sent you a message.<span className="mt-1 block text-xs text-ink-2">{ago(n.t)}</span></span><Icon n="chat_bubble" className="text-primary-container"/></Link></li>)}</ul>}</div>}</div><div className="hidden min-w-0 sm:block text-right leading-tight"><div className="truncate text-xs font-semibold">{user.name}<VerifiedBadge verified={user.verified}/></div><div className="truncate text-[11px] text-ink-2">@{user.uid}</div></div>
          {user.avatar?<img src={user.avatar} alt={`${user.name} profile`} className="h-9 w-9 rounded-full object-cover"/>:<span className="grid h-9 w-9 place-items-center rounded-full bg-primary-wash text-primary-container text-xs font-bold" aria-hidden="true">{user.name.trim()[0]?.toUpperCase()}</span>}
          <button onClick={()=>{logout();go('/')}} className="btn-outline !py-1.5">Log out</button></>
          :<><Link to="/login" className="text-sm font-semibold hover:text-primary-container">Log in</Link><Link to="/signup" className="btn-primary !py-1.5">Create ID</Link></>}
        <button className="md:hidden p-1" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(!open)}><Icon n={open?'close':'menu'}/></button>
      </div>
    </header>
    <nav className={`${open?'block':'hidden'} md:block border-b border-outline-variant bg-surface-low`} aria-label="Campus navigation">
      <div className="mx-auto max-w-[1200px] overflow-x-auto px-4 md:px-12">
        <div className="flex min-w-max flex-col md:flex-row md:items-center">
        {nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 md:px-5 ${isActive?'bg-primary-container text-surface border-primary-container':'border-transparent text-ink-2 hover:text-primary-container'}`}>{label}</NavLink>)}
        </div>
      </div>
    </nav>
    <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 md:px-12 py-8 space-y-10"><Outlet/></main>
    <footer className="border-t border-outline-variant bg-surface-low mt-10"><div className="mx-auto max-w-[1200px] px-4 md:px-12 py-10 grid gap-8 md:grid-cols-4">
      <div><div className="font-serif text-xl font-semibold">UniNest</div><p className="mt-2 text-sm text-ink-2 max-w-xs">Find study groups, project partners and hackathon squads on your campus.</p></div>
      <Section title="Product" links={["How it works","Features","Events","Discover"]}/>
      <Section title="Explore" links={['Create an ID','Log in','Find teammates','Hackathons']}/>
      <div><h4 className="kicker mb-3">Company</h4><p className="text-sm text-ink-2">UniNest is an early-stage startup built for students.</p></div>
      <p className="md:col-span-4 border-t border-outline-variant pt-4 text-xs text-ink-2">© 2025 UniNest. <Link to="/privacy-policy" className="hover:text-primary-container hover:underline">Privacy Policy</Link> · Terms</p>
    </div></footer></div>
}