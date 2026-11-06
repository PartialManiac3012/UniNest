import {useEffect,useRef,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {collection,addDoc,deleteDoc,doc,query,where,onSnapshot} from 'firebase/firestore'
import {db} from '../lib/firebase.js'
import {Avatar,ago,VerifiedBadge} from '../components/ui.jsx'
import {Icon} from '../components/Layout.jsx'

export default function Messages(){
  const {user}=useAuth(),s=useSocial(),[sp,setSp]=useSearchParams(),to=sp.get('to'),[text,setText]=useState(''),[messages,setMessages]=useState([]),[error,setError]=useState(''),[sending,setSending]=useState(false),[deletingId,setDeletingId]=useState(null),end=useRef(null)
  const canMessagePerson=p=>!!p&&s.canMessage(p.uid)
  const ids=[...(to?[to]:[]),...s.people.filter(p=>p.uid!==s.me&&p.authId&&canMessagePerson(p)).map(p=>p.uid)].filter((u,i,a)=>a.indexOf(u)===i)
  const requestedPerson=to?s.person(to):null
  const cur=requestedPerson&&canMessagePerson(requestedPerson)?to:ids[0],person=cur?s.person(cur):null

  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[messages.length,cur])

  useEffect(()=>{
    if(!db||!user?.authId||!person?.authId){setMessages([]);return}
    let active=true
    setError('')
    const convId=[user.authId,person.authId].sort().join('_')

    let sentList=[]
    let receivedList=[]

    const updateCombined=()=>{
      if(!active)return
      const map=new Map()
      for(const m of sentList){
        if(m.conversation_id===convId||m.recipient_id===person.authId){
          map.set(m.id,m)
        }
      }
      for(const m of receivedList){
        if(m.conversation_id===convId||m.sender_id===person.authId){
          map.set(m.id,m)
        }
      }
      const sorted=Array.from(map.values()).sort(
        (a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()
      )
      setMessages(sorted)
    }

    const qSent=query(collection(db,'messages'),where('sender_id','==',user.authId))
    const qReceived=query(collection(db,'messages'),where('recipient_id','==',user.authId))

    const unsubSent=onSnapshot(qSent,snapshot=>{
      if(!active)return
      sentList=snapshot.docs.map(d=>({id:d.id,...d.data()}))
      updateCombined()
    },loadError=>{
      if(active)setError(loadError.message)
    })

    const unsubReceived=onSnapshot(qReceived,snapshot=>{
      if(!active)return
      receivedList=snapshot.docs.map(d=>({id:d.id,...d.data()}))
      updateCombined()
    },loadError=>{
      if(active)setError(loadError.message)
    })

    return()=>{
      active=false
      unsubSent()
      unsubReceived()
    }
  },[user?.authId,person?.authId])

  const unsend=async id=>{
    if(!window.confirm('Unsend this message?'))return
    setError('')
    setDeletingId(id)
    try{
      await deleteDoc(doc(db,'messages',id))
      setMessages(current=>current.filter(message=>message.id!==id))
    }catch(deleteError){
      const isPermission = deleteError?.code==='permission-denied'||deleteError?.message?.toLowerCase().includes('permission')
      if(isPermission){
        setError("Could not unsend: Firebase delete permission denied. Please publish the updated rules in your Firebase Console (Firestore -> Rules).")
      }else{
        setError(deleteError.message||'Could not unsend message.')
      }
    }finally{
      setDeletingId(null)
    }
  }

  const send=async e=>{
    e.preventDefault();const body=text.trim()
    if(!body)return
    if(!db){setError('Firebase is not configured.');return}
    if(!user?.authId){setError('Your Firebase session is missing. Log out and log in again.');return}
    if(!person?.authId){setError('This profile is not synced with Firebase yet. Ask this user to log in once through UniNest, then refresh Discover before messaging.');return}
    if(!s.canMessage(person.uid)){setError('Accept the connection request before messaging this user.');return}
    setError('')
    setSending(true)
    try{
      const convId=[user.authId,person.authId].sort().join('_')
      await addDoc(collection(db,'messages'),{
        conversation_id:convId,
        sender_id:user.authId,
        recipient_id:person.authId,
        participants:[user.authId,person.authId],
        body,
        created_at:new Date().toISOString()
      })
      setText('')
    }catch(sendError){
      setError(sendError.message)
    }finally{
      setSending(false)
    }
  }

  return <><h1 className="text-4xl">Messages</h1>
   {!ids.length?<p className="panel p-6 text-center">Accept a connection request before messaging. Find people in <Link to="/discover" className="underline">Discover</Link>.</p>:
   <div className="panel grid min-h-[30rem] overflow-hidden rounded-2xl md:rounded-3xl shadow-sm md:grid-cols-[15rem_1fr]">
    <ul className="border-b border-outline-variant p-2 space-y-1 md:border-b-0 md:border-r">{ids.map(u=>{const p=s.person(u)||{name:u,uid:u};const isSelected=u===cur;return <li key={u}><button onClick={()=>setSp({to:u})} aria-current={isSelected} className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition ${isSelected?'bg-primary-wash text-primary font-medium':'hover:bg-surface-high text-ink'}`}><Avatar p={p} size={34}/><div className="min-w-0 flex-1 truncate"><div className="flex items-center gap-1 font-medium truncate"><span>{p.name||u}</span><VerifiedBadge verified={p.verified}/></div><div className="text-[11px] text-ink-2 truncate">@{p.uid||u}</div></div></button></li>})}</ul>
    {person?<div className="flex flex-col bg-surface"><div className="flex items-center gap-3 border-b border-outline-variant/70 px-4 py-3 bg-surface"><Avatar p={person} size={36}/><div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-sm font-semibold truncate"><span>{person.name}</span><VerifiedBadge verified={person.verified}/></div><div className="text-[11px] text-ink-2">@{person.uid||'student'}</div></div></div>
     <div className="flex-1 space-y-2.5 overflow-y-auto p-4" aria-live="polite">
      {error&&<div role="alert" className="flex items-center justify-between gap-2 rounded-xl bg-error/10 p-2.5 text-xs text-error"><span>{error}</span><button type="button" onClick={()=>setError('')} className="font-bold hover:underline" aria-label="Dismiss">✕</button></div>}
      {!messages.length&&!error&&(
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 scale-110"><Avatar p={person} size={56}/></div>
          <h3 className="text-base font-semibold">{person.name}</h3>
          <p className="text-xs text-ink-2">@{person.uid||'student'}</p>
          <p className="mt-3 text-xs text-ink-2">Say hello to {person.name.split(' ')[0]} 👋</p>
        </div>
      )}
      {messages.map(m=>{
        const isMe=m.sender_id===user.authId
        return (
          <div key={m.id} className={`group flex flex-col ${isMe?'items-end':'items-start'}`}>
            <div className={`max-w-[75%] px-4 py-2.5 text-sm shadow-sm transition ${
              isMe
                ? 'rounded-[20px] rounded-br-[4px] bg-primary-container text-surface'
                : 'rounded-[20px] rounded-bl-[4px] bg-surface-high text-ink'
            }`}>
              <div className="break-words leading-relaxed">{m.body}</div>
            </div>
            <div className={`mt-1 flex items-center gap-2 text-[10px] opacity-70 px-1.5 ${isMe?'flex-row-reverse':''}`}>
              <span>{ago(m.created_at)}</span>
              {isMe&&(
                <button
                  type="button"
                  onClick={()=>unsend(m.id)}
                  disabled={deletingId===m.id}
                  className="inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 underline hover:opacity-100 disabled:opacity-40"
                  title="Unsend message"
                >
                  {deletingId===m.id?'Unsending…':<><Icon n="delete" className="!text-[11px]"/><span>Unsend</span></>}
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div ref={end}/>
     </div>
     <form onSubmit={send} className="flex items-center gap-2 border-t border-outline-variant/60 p-3 bg-surface">
      <div className="flex flex-1 items-center rounded-full border border-outline-variant bg-surface-low px-4 py-1.5 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition">
        <input
          className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-ink-2/60"
          aria-label="Message"
          placeholder="Message…"
          value={text}
          onChange={e=>setText(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={!text.trim()||sending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-surface transition hover:bg-primary hover:scale-105 active:scale-95 disabled:opacity-35 disabled:hover:scale-100 shadow-sm"
        aria-label="Send message"
        title="Send"
      >
        {sending ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-transparent"/>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="translate-x-[1px]">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        )}
      </button>
     </form></div>:<p className="p-6 text-sm text-ink-2">Select a conversation.</p>}</div>}
   <p className="text-xs text-ink-2">Messages are securely stored in Firebase and update in real time.</p></>
}
