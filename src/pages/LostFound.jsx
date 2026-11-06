import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {useSocial} from '../social.jsx'
import {Avatar,ago} from '../components/ui.jsx'
import {uploadImage,compressImageToDataUrl} from '../lib/storage.js'

const empty={title:'',description:'',location:'',type:'lost',photo:''}

export default function LostFound(){
  const {user,isAdmin}=useAuth()
  const {lostFound,person,addLostFound,deleteLostFound,requestLostFoundClaim,claimLostFound,canPost}=useSocial()
  const navigate=useNavigate()
  const [form,setForm]=useState(empty)
  const [filter,setFilter]=useState('all')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const [photoUploading,setPhotoUploading]=useState(false)

  const update=(key,value)=>setForm(prev=>({...prev,[key]:value}))

  const photoChange=async e=>{
    const file=e.target.files?.[0]
    if(!file)return
    setError('')
    if(!file.type.startsWith('image/')){setError('Please choose an image file.');return}
    setPhotoUploading(true)
    try{
      const preview=await compressImageToDataUrl(file,900,900,0.8)
      setForm(current=>({...current,photo:preview,photoFile:file}))
    }catch(x){
      setError(x.message||'Could not process that image.')
    }finally{
      setPhotoUploading(false)
    }
  }

  const removePhoto=()=>{
    setForm(current=>({...current,photo:'',photoFile:null}))
  }

  const submit=async e=>{
    e.preventDefault();setError('');setNotice('')
    if(!form.title.trim()||!form.description.trim()||!form.location.trim()){
      setError('Add the item name, description, and last-seen or found location.')
      return
    }
    setBusy(true)
    try{
      let photoUrl=form.photo||''
      if(form.photoFile){
        photoUrl=await uploadImage(form.photoFile,'lost_found',user?.authId,{maxWidth:900,maxHeight:900,quality:0.82})
      }
      const {photoFile,...postData}=form
      await addLostFound({
        ...postData,
        title:form.title.trim(),
        description:form.description.trim(),
        location:form.location.trim(),
        photo:photoUrl
      })
      setForm(empty)
      setNotice('Your lost-and-found post is live.')
    }catch(x){
      setError(x.message||'Could not save this post.')
    }finally{
      setBusy(false)
    }
  }

  const markClaimed=async id=>{
    try{await claimLostFound(id);setNotice('Marked as claimed. This post will remain visible for seven days before it is automatically removed.')}catch(x){setError(x.message)}
  }

  const requestClaim=async id=>{
    try{
      const finderUid=await requestLostFoundClaim(id)
      setNotice('Your claim was sent. Opening messages with the person who found it…')
      navigate(`/messages?to=${encodeURIComponent(finderUid)}`)
    }catch(x){setError(x.message)}
  }

  const visible=lostFound.filter(item=>filter==='all'||item.type===filter)

  return <div className="space-y-8">
    <header><span className="pill">Campus help desk</span><h1 className="mt-3 text-4xl md:text-5xl">Lost & found</h1><p className="mt-3 max-w-2xl leading-7 text-ink-2">Post something you lost or found on campus. Message the poster to arrange a safe handoff.</p></header>
    {notice&&<p role="status" className="rounded border border-secondary bg-secondary/10 p-3 text-sm">{notice}</p>}
    {error&&<p role="alert" className="rounded border border-error bg-error-wash p-3 text-sm text-error">{error}</p>}
    {canPost?<section className="panel p-6"><h2 className="text-2xl">Create a post</h2><p className="mt-1 text-sm text-ink-2">Post lost or found items on campus.</p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <select className="field" value={form.type} onChange={e=>update('type',e.target.value)}><option value="lost">I lost something</option><option value="found">I found something</option></select>
        <input className="field" placeholder="Item name" value={form.title} onChange={e=>update('title',e.target.value)} required/>
        <input className="field sm:col-span-2" placeholder="Last seen or found location" value={form.location} onChange={e=>update('location',e.target.value)} required/>
        <textarea className="field sm:col-span-2" rows="3" placeholder="Describe the item and useful identifying details" value={form.description} onChange={e=>update('description',e.target.value)} required/>
        <div className="sm:col-span-2"><label className="label" htmlFor="lost-photo">Photo (optional)</label><input id="lost-photo" type="file" accept="image/*" className="block text-sm" onChange={photoChange}/>
          {form.photo&&<div className="mt-3 flex items-center gap-3"><img src={form.photo} alt="Item preview" className="h-24 w-24 rounded object-cover border border-outline-variant"/><button type="button" className="text-sm underline underline-offset-4 text-error" onClick={removePhoto}>Remove photo</button></div>}
          {photoUploading&&<p className="text-xs text-primary-container mt-1">Processing photo…</p>}
        </div>
        <button className="btn-primary sm:col-span-2" disabled={busy||photoUploading}>{busy?'Publishing post…':'Publish post'}</button>
      </form>
    </section>:<p className="panel p-4 text-sm text-ink-2">Log in to create Lost & Found posts. You can still claim items and message other users.</p>}
    <div className="flex flex-wrap gap-2"><button className={filter==='all'?'btn-primary':'btn-outline'} onClick={()=>setFilter('all')}>All active posts</button><button className={filter==='lost'?'btn-primary':'btn-outline'} onClick={()=>setFilter('lost')}>Lost</button><button className={filter==='found'?'btn-primary':'btn-outline'} onClick={()=>setFilter('found')}>Found</button></div>
    {!visible.length?<p className="panel p-6 text-center text-ink-2">No active posts in this view.</p>:<section className="grid gap-5 lg:grid-cols-2">
      {visible.map(item=>{const owner=person(item.by),mine=item.by===user?.uid,requested=item.claimRequests?.some(x=>x.uid===user?.uid),canDelete=mine||isAdmin;return <article key={item.id} className={`card overflow-hidden ${item.claimed?'opacity-75':''}`}>
        {item.photo&&<img src={item.photo} alt={item.title} className="h-56 w-full object-cover"/>}
        <div className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><span className={item.type==='lost'?'pill':'pill-green'}>{item.type==='lost'?'Lost':'Found'}</span>{item.claimed&&<span className="pill-gold">Claimed</span>}</div><span className="text-xs text-ink-2">{ago(item.created)}</span></div>
          <div className="flex items-start justify-between gap-3"><h2 className="text-2xl">{item.title}</h2>          {canDelete&&<button className="btn-outline !px-2 !py-1 text-xs text-error" onClick={async()=>{if(window.confirm('Delete this Lost & Found post?')){try{await deleteLostFound(item.id);setNotice('Post deleted.')}catch(x){setError(x.message)}}}}>Delete</button>}</div><p className="text-sm leading-6 text-ink-2">{item.description}</p><p className="text-sm"><b>Location:</b> {item.location}</p>
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
