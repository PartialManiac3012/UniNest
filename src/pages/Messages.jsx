import {useEffect,useRef,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {supabase} from '../lib/supabase.js'
import {Avatar,ago,VerifiedBadge} from '../components/ui.jsx'

export default function Messages(){
  const {user}=useAuth(),s=useSocial(),[sp,setSp]=useSearchParams(),to=sp.get('to'),[text,setText]=useState(''),[messages,setMessages]=useState([]),[error,setError]=useState(''),[sending,setSending]=useState(false),end=useRef(null)
  const canMessagePerson=p=>!!p&&s.conns.includes(p.uid)
  const ids=[...(to?[to]:[]),...s.people.filter(p=>p.uid!==s.me&&p.authId&&canMessagePerson(p)).map(p=>p.uid)].filter((u,i,a)=>a.indexOf(u)===i)
  const requestedPerson=to?s.person(to):null
  const cur=requestedPerson&&canMessagePerson(requestedPerson)?to:ids[0],person=cur?s.person(cur):null
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[messages.length,cur])
  useEffect(()=>{
    if(!supabase||!user?.authId||!person?.authId){setMessages([]);return}
    let active=true
    setError('')
    const load=async()=>{
      const {data,error:loadError}=await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${user.authId},recipient_id.eq.${person.authId}),and(sender_id.eq.${person.authId},recipient_id.eq.${user.authId})`)
        .order('created_at',{ascending:true})
      if(active){if(loadError)setError(loadError.message);else setMessages(data||[])}
    }
    load()
    const channel=supabase.channel(`messages:${user.authId}:${person.authId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`recipient_id=eq.${user.authId}`},payload=>{
        if(payload.new.sender_id===person.authId)setMessages(current=>current.some(m=>m.id===payload.new.id)?current:[...current,payload.new])
      }).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId,person?.authId])
  const unsend=async id=>{
    if(!window.confirm('Unsend this message?'))return
    const {error:deleteError}=await supabase.from('messages').delete().eq('id',id).eq('sender_id',user.authId)
    if(deleteError){setError(deleteError.message);return}
    setMessages(current=>current.filter(message=>message.id!==id))
  }
  const send=async e=>{
    e.preventDefault();const body=text.trim()
    if(!body)return
    if(!supabase){setError('Supabase is not configured.');return}
    if(!user?.authId){setError('Your Supabase session is missing. Log out and log in again.');return}
    if(!person?.authId){setError('This profile is not synced with Supabase yet. Ask this user to log in once through the new UniNest login, then refresh Discover before messaging.');return}
    if(!s.conns.includes(person.uid)){setError('Accept the connection request before messaging this user.');return}
    setError('')
    setSending(true)
    const {data,error:sendError}=await supabase.from('messages').insert({sender_id:user.authId,recipient_id:person.authId,body}).select().single()
    if(sendError){setError(sendError.message);setSending(false);return}
    setMessages(current=>current.some(m=>m.id===data.id)?current:[...current,data]);setText('');setSending(false)
  }
  return <><h1 className="text-4xl">Messages</h1>
   {!ids.length?<p className="panel p-6 text-center">Accept a connection request before messaging. Find people in <Link to="/discover" className="underline">Discover</Link>.</p>:
   <div className="panel grid min-h-[28rem] overflow-hidden md:grid-cols-[14rem_1fr]">
    <ul className="border-b border-outline-variant md:border-b-0 md:border-r">{ids.map(u=>{const p=s.person(u);return <li key={u}><button onClick={()=>setSp({to:u})} aria-current={u===cur} className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm ${u===cur?'bg-primary-wash':'hover:bg-surface-high'}`}><Avatar p={p} size={32}/>{p.name}<VerifiedBadge verified={p.verified}/></button></li>})}</ul>
    {person?<div className="flex flex-col"><div className="border-b border-outline-variant p-3 text-sm font-semibold">{person.name}<VerifiedBadge verified={person.verified}/></div>
     <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">{error&&<p role="alert" className="text-sm text-error">{error}</p>}{!messages.length&&!error&&<p className="text-sm text-ink-2">Say hello to {person.name.split(' ')[0]}.</p>}{messages.map(m=><div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender_id===user.authId?'ml-auto bg-primary-container text-surface':'bg-surface-high'}`}>{m.body}<div className="flex items-center justify-end gap-2 text-[10px] opacity-70"><span>{ago(m.created_at)}</span>{m.sender_id===user.authId&&<button type="button" className="underline" onClick={()=>unsend(m.id)}>Unsend</button>}</div></div>)}<div ref={end}/></div>
     <form onSubmit={send} className="flex gap-2 border-t border-outline-variant p-3"><input className="field" aria-label="Message" placeholder="Write a message" value={text} onChange={e=>setText(e.target.value)}/><button className="btn-primary" disabled={!text.trim()||sending}>{sending?'Sending…':'Send'}</button></form></div>:<p className="p-6 text-sm text-ink-2">Select a conversation.</p>}</div>}
   <p className="text-xs text-ink-2">Messages are securely stored in Supabase and update in real time.</p></>
}
