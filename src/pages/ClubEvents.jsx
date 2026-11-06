import {useState} from 'react'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'

const emptyEvent={title:'',description:'',date:'',time:'',venue:''}

export default function ClubEvents(){
  const {user,isAdmin}=useAuth()
  const s=useSocial(),{clubEvents,isClubMember,addClubEvent,addEventComment,joinClubEvent}=s
  const [draft,setDraft]=useState(emptyEvent),[comment,setComment]=useState({}),[join,setJoin]=useState(null),[notice,setNotice]=useState(''),[error,setError]=useState('')
  const update=(key,value)=>setDraft({...draft,[key]:value})
  const publish=e=>{
    e.preventDefault();setError('');setNotice('')
    try{addClubEvent(draft);setDraft(emptyEvent);setNotice('Your club event was published.');}catch(x){setError(x.message)}
  }
  const submitComment=(e,id)=>{
    e.preventDefault()
    const text=(comment[id]||'').trim()
    if(!text)return
    addEventComment(id,text);setComment({...comment,[id]:''})
  }
  const submitJoin=e=>{
    e.preventDefault();setError('')
    const data=new FormData(e.currentTarget)
    const details={name:data.get('name'),email:data.get('email'),phone:data.get('phone'),note:data.get('note')}
    if(!details.name||!details.email||!details.phone){setError('Name, email, and phone number are required.');return}
    joinClubEvent(join.id,details);setJoin(null);setNotice(`Your joining request was submitted. Confirmation will be sent to ${details.email} and ${details.phone}.`)
  }
  return <div className="space-y-8">
    <header><span className="pill">Club events</span><h1 className="mt-3 text-4xl md:text-5xl">Events by registered clubs</h1><p className="mt-3 max-w-2xl leading-7 text-ink-2">Discover campus events, discuss them with other students, and submit your details to join.</p></header>
    {notice&&<p role="status" className="rounded border border-secondary bg-secondary/10 p-3 text-sm">{notice}</p>}
    {error&&<p role="alert" className="rounded border border-error bg-error-wash p-3 text-sm text-error">{error}</p>}
    {isClubMember&&s.canPost?<section className="panel p-6"><h2 className="text-2xl">Publish a club event</h2><p className="mt-1 text-sm text-ink-2">Your registered club email is authorized to publish.</p>
      <form onSubmit={publish} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input className="field" placeholder="Event title" value={draft.title} onChange={e=>update('title',e.target.value)} required/>
        <input className="field" placeholder="Venue" value={draft.venue} onChange={e=>update('venue',e.target.value)} required/>
        <input className="field" type="date" value={draft.date} onChange={e=>update('date',e.target.value)} required/>
        <input className="field" type="time" value={draft.time} onChange={e=>update('time',e.target.value)} required/>
        <textarea className="field sm:col-span-2" rows="3" placeholder="What is this event about?" value={draft.description} onChange={e=>update('description',e.target.value)} required/>
        <button className="btn-primary sm:col-span-2">Publish event</button>
      </form></section>:<p className="panel p-4 text-sm text-ink-2">{isClubMember?'Only verified @sudoon.ac.in accounts can publish club events.':'Only registered club email accounts can publish events.'} You can still comment and join any event below.</p>}
    <section className="grid gap-5 lg:grid-cols-2">
      {clubEvents.map(event=><article key={event.id} className="card p-5">
        <div className="flex items-start justify-between gap-3"><div><span className="pill-green">{event.club}</span><h2 className="mt-3 text-2xl">{event.title}</h2></div><span className="text-right text-sm text-ink-2">{event.date}<br/>{event.time}</span></div>
        <p className="mt-3 leading-6 text-ink-2">{event.description}</p><p className="mt-3 text-sm"><b>Venue:</b> {event.venue}</p>
        <button className="btn-primary mt-4 w-full" onClick={()=>{setJoin(event);setError('')}}>Join event</button>
        <div className="mt-5 border-t border-outline-variant pt-4"><h3 className="text-lg">Comments</h3>
          <div className="mt-3 space-y-2">{event.comments.map((c,i)=><p key={c.id||i} className="rounded bg-surface-low p-2 text-sm"><b>@{c.by}</b> {c.text}<span className="ml-3 text-xs text-ink-2"><button onClick={()=>s.reportComment('event',event.id,c.id||`${event.id}-${i}`)} className="hover:text-error">Report</button>{isAdmin&&<button onClick={()=>s.adminDeleteComment('event',event.id,c.id||`${event.id}-${i}`)} className="ml-2 hover:text-error">Delete</button>}</span></p>)}</div>
          <form onSubmit={e=>submitComment(e,event.id)} className="mt-3 flex gap-2"><input className="field" placeholder="Add a comment" value={comment[event.id]||''} onChange={e=>setComment({...comment,[event.id]:e.target.value})}/><button className="btn-outline">Post</button></form>
        </div>
      </article>)}
    </section>
    {join&&<div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="join-title">
      <form onSubmit={submitJoin} className="panel w-full max-w-lg space-y-4 p-6"><div className="flex items-start justify-between"><div><h2 id="join-title" className="text-2xl">Join {join.title}</h2><p className="text-sm text-ink-2">We will confirm your request by email and phone.</p></div><button type="button" aria-label="Close" className="text-2xl" onClick={()=>setJoin(null)}>×</button></div>
        <input name="name" className="field" placeholder="Full name" defaultValue={user?.name||''} required/>
        <input name="email" type="email" className="field" placeholder="Registered email" defaultValue={user?.email||''} required/>
        <input name="phone" type="tel" className="field" placeholder="Registered phone number" defaultValue={user?.phone||''} required/>
        <textarea name="note" className="field" rows="3" placeholder="Anything the club should know?"/>
        <button className="btn-primary w-full">Submit joining request</button>
      </form>
    </div>}
  </div>
}
