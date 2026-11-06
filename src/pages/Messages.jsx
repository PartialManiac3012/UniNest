import {useEffect,useRef,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {collection,addDoc,deleteDoc,doc,query,where,onSnapshot} from 'firebase/firestore'
import {db} from '../lib/firebase.js'
import {Avatar,ago,VerifiedBadge} from '../components/ui.jsx'

export default function Messages(){
  const {user}=useAuth(),s=useSocial(),[sp,setSp]=useSearchParams(),to=sp.get('to'),[text,setText]=useState(''),[messages,setMessages]=useState([]),[error,setError]=useState(''),[sending,setSending]=useState(false),end=useRef(null)
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
    try{
      await deleteDoc(doc(db,'messages',id))
      setMessages(current=>current.filter(message=>message.id!==id))
    }catch(deleteError){
      setError(deleteError.message)
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
   <div className="panel grid min-h-[28rem] overflow-hidden md:grid-cols-[14rem_1fr]">
    <ul className="border-b border-outline-variant md:border-b-0 md:border-r">{ids.map(u=>{const p=s.person(u);return <li key={u}><button onClick={()=>setSp({to:u})} aria-current={u===cur} className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm ${u===cur?'bg-primary-wash':'hover:bg-surface-high'}`}><Avatar p={p} size={32}/>{p.name}<VerifiedBadge verified={p.verified}/></button></li>})}</ul>
    {person?<div className="flex flex-col"><div className="border-b border-outline-variant p-3 text-sm font-semibold">{person.name}<VerifiedBadge verified={person.verified}/></div>
     <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">{error&&<p role="alert" className="text-sm text-error">{error}</p>}{!messages.length&&!error&&<p className="text-sm text-ink-2">Say hello to {person.name.split(' ')[0]}.</p>}{messages.map(m=><div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender_id===user.authId?'ml-auto bg-primary-container text-surface':'bg-surface-high'}`}>{m.body}<div className="flex items-center justify-end gap-2 text-[10px] opacity-70"><span>{ago(m.created_at)}</span>{m.sender_id===user.authId&&<button type="button" className="underline" onClick={()=>unsend(m.id)}>Unsend</button>}</div></div>)}<div ref={end}/></div>
     <form onSubmit={send} className="flex gap-2 border-t border-outline-variant p-3"><input className="field" aria-label="Message" placeholder="Write a message" value={text} onChange={e=>setText(e.target.value)}/><button className="btn-primary" disabled={!text.trim()||sending}>{sending?'Sending…':'Send'}</button></form></div>:<p className="p-6 text-sm text-ink-2">Select a conversation.</p>}</div>}
   <p className="text-xs text-ink-2">Messages are securely stored in Firebase and update in real time.</p></>
}
