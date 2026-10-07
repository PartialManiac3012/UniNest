import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,ago} from '../components/ui.jsx'

const MAX_PHOTO_BYTES=2*1024*1024
const empty={title:'',description:'',location:'',type:'lost',photo:''}
const readPhoto=file=>new Promise((resolve,reject)=>{
  const reader=new FileReader()
  reader.onload=()=>{
    const image=new Image()
    image.onload=()=>{
      const scale=Math.min(1,1200/Math.max(image.width,image.height))
      const canvas=document.createElement('canvas')
      canvas.width=Math.max(1,Math.round(image.width*scale))
      canvas.height=Math.max(1,Math.round(image.height*scale))
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
      resolve(canvas.toDataURL('image/jpeg',.75))
    }
    image.onerror=()=>reject(new Error('Could not process that image.'))
    image.src=reader.result
  }
  reader.onerror=()=>reject(new Error('Could not read that image.'))
  reader.readAsDataURL(file)
})

export default function LostFound(){
  const {user}=useAuth()
  const {lostFound,person,addLostFound,requestLostFoundClaim,claimLostFound}=useSocial()
  const [form,setForm]=useState(empty),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const update=(key,value)=>setForm({...form,[key]:value})
  const photoChange=async e=>{
    const file=e.target.files?.[0]
    if(!file)return
    setError('')
    if(!file.type.startsWith('image/')){setError('Please choose an image file.');return}
    if(file.size>MAX_PHOTO_BYTES){setError('Please choose an image under 2MB.');return}
    try{const photo=await readPhoto(file);setForm(current=>({...current,photo}))}catch(x){setError(x.message)}
  }
  const submit=e=>{
    e.preventDefault();setError('');setNotice('')
    if(!form.title.trim()||!form.description.trim()||!form.location.trim()){setError('Add the item, description, and last-seen/found location.');return}
    try{
      addLostFound({...form,title:form.title.trim(),description:form.description.trim(),location:form.location.trim()})
      setForm(empty);setNotice('Your lost-and-found post is live.')
    }catch(x){setError(x.message||'Could not save this post. Try removing the photo and posting again.')}
  }
  const markClaimed=id=>{
    try{claimLostFound(id);setNotice('Marked as claimed. This post will remain visible for seven days before it is automatically removed.')}catch(x){setError(x.message)}
  }
  const requestClaim=id=>{
    try{requestLostFoundClaim(id);setNotice('Your claim was sent to the person who found the item. You can message them to coordinate the handoff.')}catch(x){setError(x.message)}
  }
  const visible=lostFound.filter(item=>filter==='all'||item.type===filter)
  return <div className="space-y-8">
    <header><span className="pill">Campus help desk</span><h1 className="mt-3 text-4xl md:text-5xl">Lost & found</h1><p className="mt-3 max-w-2xl leading-7 text-ink-2">Post something you lost or found on campus. Message the poster to arrange a safe handoff.</p></header>
    {notice&&<p role="status" className="rounded border border-secondary bg-secondary/10 p-3 text-sm">{notice}</p>}
    {error&&<p role="alert" className="rounded border border-error bg-error-wash p-3 text-sm text-error">{error}</p>}
    {s.canPost?<section className="panel p-6"><h2 className="text-2xl">Create a post</h2><p className="mt-1 text-sm text-ink-2">Verified students can post lost-and-found items.</p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <select className="field" value={form.type} onChange={e=>update('type',e.target.value)}><option value="lost">I lost something</option><option value="found">I found something</option></select>
        <input className="field" placeholder="Item name" value={form.title} onChange={e=>update('title',e.target.value)} required/>
        <input className="field sm:col-span-2" placeholder="Last seen or found location" value={form.location} onChange={e=>update('location',e.target.value)} required/>
        <textarea className="field sm:col-span-2" rows="3" placeholder="Describe the item and useful identifying details" value={form.description} onChange={e=>update('description',e.target.value)} required/>
        <div className="sm:col-span-2"><label className="label" htmlFor="lost-photo">Photo (optional, max 2MB)</label><input id="lost-photo" type="file" accept="image/*" className="block text-sm" onChange={photoChange}/>{form.photo&&<img src={form.photo} alt="Item preview" className="mt-3 h-24 w-24 rounded object-cover"/>}</div>
        <button className="btn-primary sm:col-span-2">Publish post</button>
      </form>
    </section>:<p className="panel p-4 text-sm text-ink-2">Only students verified with an <b>@sudoon.ac.in</b> email can create Lost & Found posts. You can still claim items and message other users.</p>}
    <div className="flex flex-wrap gap-2"><button className={filter==='all'?'btn-primary':'btn-outline'} onClick={()=>setFilter('all')}>All active posts</button><button className={filter==='lost'?'btn-primary':'btn-outline'} onClick={()=>setFilter('lost')}>Lost</button><button className={filter==='found'?'btn-primary':'btn-outline'} onClick={()=>setFilter('found')}>Found</button></div>
    {!visible.length?<p className="panel p-6 text-center text-ink-2">No active posts in this view.</p>:<section className="grid gap-5 lg:grid-cols-2">
      {visible.map(item=>{const owner=person(item.by),mine=item.by===user.uid,requested=item.claimRequests?.some(x=>x.uid===user.uid);return <article key={item.id} className={`card overflow-hidden ${item.claimed?'opacity-75':''}`}>
        {item.photo&&<img src={item.photo} alt={item.title} className="h-56 w-full object-cover"/>}
        <div className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><span className={item.type==='lost'?'pill':'pill-green'}>{item.type==='lost'?'Lost':'Found'}</span>{item.claimed&&<span className="pill-gold">Claimed</span>}</div><span className="text-xs text-ink-2">{ago(item.created)}</span></div>
          <h2 className="text-2xl">{item.title}</h2><p className="text-sm leading-6 text-ink-2">{item.description}</p><p className="text-sm"><b>Location:</b> {item.location}</p>
          <div className="flex items-center gap-2 border-t border-outline-variant pt-3 text-sm"><Avatar p={owner} size={32}/><span>Posted by <b>{owner?.name||item.by}</b></span></div>
          {!item.claimed&&item.type==='found'&&!mine&&<button className="btn-primary w-full" disabled={requested} onClick={()=>requestClaim(item.id)}>{requested?'Claim request sent':'Claim this item'}</button>}
          {!item.claimed&&!mine&&<Link to={`/messages?to=${item.by}`} className="btn-outline block w-full text-center">{item.type==='found'?'Message finder':'Message person who lost it'}</Link>}
          {!item.claimed&&mine&&item.type==='found'&&<><p className="text-center text-xs text-ink-2">{item.claimRequests?.length?`${item.claimRequests.length} owner claim request${item.claimRequests.length===1?'':'s'} received.`:'No owner claim requests yet.'}</p><button className="btn-outline w-full" disabled={!item.claimRequests?.length} onClick={()=>markClaimed(item.id)}>{item.claimRequests?.length?'Mark as claimed':'Waiting for the owner to claim'}</button></>}
          {!item.claimed&&mine&&item.type==='lost'&&<p className="text-center text-xs text-ink-2">Waiting for someone who found this item to contact you.</p>}
        </div>
      </article>})}
    </section>}
    <p className="text-xs text-ink-2">Claim and messaging buttons appear on another student’s post. Your own post only shows the controls available to you as the poster.</p>
    <p className="text-xs text-ink-2">Claimed posts stay visible with their photo for seven days, then are automatically removed to recover local storage space. The person who found an item can mark it claimed only after the owner submits a claim.</p>
  </div>
}
