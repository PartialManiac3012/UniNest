import {useEffect,useRef,useState} from 'react'
import {NavLink,Link,Outlet,useLocation,useNavigate} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
export const Icon=({n,className=''})=><span className={`material-symbols-outlined ${className}`} aria-hidden="true">{n}</span>
const nav=[['/','Gateway'],['/discover','Directory'],['/feed','Activities'],['/events','Events'],['/club-events','Club events'],['/lost-found','Lost & found']]
const Section=({title,links})=><div><h4 className="kicker mb-3">{title}</h4><ul className="space-y-2 text-sm">{links.map(l=><li key={l}><a href="#" className="hover:text-primary-container hover:underline">{l}</a></li>)}</ul></div>
export default function Layout(){
  const {user,logout}=useAuth(),go=useNavigate(),q=useRef(null),{pathname}=useLocation(),[open,setOpen]=useState(false)
  useEffect(()=>{const f=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();q.current?.focus()}};addEventListener('keydown',f);return()=>removeEventListener('keydown',f)},[])
  useEffect(()=>{window.scrollTo(0,0);setOpen(false)},[pathname])
  return <div className="min-h-screen flex flex-col">
    <header className="border-b border-outline-variant bg-surface sticky top-0 z-30">
      <div className="mx-auto max-w-[1200px] px-4 md:px-12 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 mr-auto">
          <span className="grid h-9 w-9 place-items-center rounded bg-primary-container text-surface font-serif text-lg font-semibold">U</span>
          <span><span className="block font-serif text-xl font-semibold leading-none">UniNest</span>
          <span className="kicker text-[10px]">Find your people on campus</span></span></Link>
        <label className="hidden md:flex items-center gap-2 border border-outline-variant rounded px-3 py-1.5 w-64 focus-within:border-primary-container">
          <Icon n="search" className="text-ink-2"/><input ref={q} placeholder="Search courses, resources" className="bg-transparent text-sm outline-none flex-1 min-w-0"/><kbd className="text-[10px] text-ink-2">⌘K</kbd></label>
        {user?<><div className="hidden sm:block text-right leading-tight"><div className="text-xs font-semibold">{user.name}</div><div className="text-[11px] text-ink-2">@{user.uid}</div></div>
          {user.avatar?<img src={user.avatar} alt={`${user.name} profile`} className="h-9 w-9 rounded-full object-cover"/>:<span className="grid h-9 w-9 place-items-center rounded-full bg-primary-wash text-primary-container text-xs font-bold" aria-hidden="true">{user.name.trim()[0]?.toUpperCase()}</span>}
          <button onClick={()=>{logout();go('/')}} className="btn-outline !py-1.5">Log out</button></>
          :<><Link to="/login" className="text-sm font-semibold hover:text-primary-container">Log in</Link><Link to="/signup" className="btn-primary !py-1.5">Create ID</Link></>}
        <button className="md:hidden p-1" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(!open)}><Icon n={open?'close':'menu'}/></button>
      </div>
    </header>
    <nav className={`${open?'block':'hidden'} md:block border-b border-outline-variant bg-surface-low`} aria-label="Campus navigation">
      <div className="mx-auto max-w-[1200px] px-4 md:px-12 flex flex-col md:flex-row md:items-center">
        {nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 md:px-5 ${isActive?'bg-primary-container text-surface border-primary-container':'border-transparent text-ink-2 hover:text-primary-container'}`}>{label}</NavLink>)}
      </div>
    </nav>
    <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 md:px-12 py-8 space-y-10"><Outlet/></main>
    <footer className="border-t border-outline-variant bg-surface-low mt-10"><div className="mx-auto max-w-[1200px] px-4 md:px-12 py-10 grid gap-8 md:grid-cols-4">
      <div><div className="font-serif text-xl font-semibold">UniNest</div><p className="mt-2 text-sm text-ink-2 max-w-xs">Find study groups, project partners and hackathon squads on your campus.</p></div>
      <Section title="Product" links={["How it works","Features","Events","Directory"]}/>
      <Section title="Explore" links={['Create an ID','Log in','Find teammates','Hackathons']}/>
      <div><h4 className="kicker mb-3">Company</h4><p className="text-sm text-ink-2">UniNest is an early-stage startup built for students.</p></div>
      <p className="md:col-span-4 border-t border-outline-variant pt-4 text-xs text-ink-2">© 2025 UniNest. Privacy · Terms</p>
    </div></footer></div>
}