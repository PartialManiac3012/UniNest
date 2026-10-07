import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {Icon} from '../components/Layout.jsx'
import {INTERESTS,STREAMS} from '../data.js'
import {Chip} from '../components/ui.jsx'
const steps=['Email','Profile'],years=['1st year','2nd year','3rd year','4th year','Postgraduate']
const MAX_AVATAR_BYTES=2*1024*1024
const toDataUrl=file=>new Promise((resolve,reject)=>{
  const r=new FileReader()
  r.onload=()=>resolve(r.result)
  r.onerror=()=>reject(new Error('Could not read that image. Please try another file.'))
  r.readAsDataURL(file)
})
export default function Signup(){
  const {createAccount,previewId}=useAuth(),nav=useNavigate()
  const [step,setStep]=useState(0),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[accepted,setAccepted]=useState(false)
  const [f,setF]=useState({email:'',code:'',name:'',college:'',year:years[0],stream:'',password:'',confirm:'',interests:[],avatar:'',phone:''})
  const set=k=>e=>setF({...f,[k]:e.target.value})
  const onAvatar=async e=>{
    const file=e.target.files?.[0]
    if(!file)return
    setErr('')
    if(!file.type.startsWith('image/')){setErr('Please choose an image file.');return}
    if(file.size>MAX_AVATAR_BYTES){setErr('Please choose an image under 2MB.');return}
    const avatar=await toDataUrl(file)
    setF(v=>({...v,avatar}))
  }
  const run=fn=>async e=>{e.preventDefault();setErr('');setBusy(true);try{await fn()}catch(x){setErr(x.message)}setBusy(false)}
  const send=run(async()=>{if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()))throw new Error('Enter a valid email address.');setStep(1)})
  const create=run(async()=>{
    if(f.password!==f.confirm)throw new Error('The two passwords do not match.')
    if(!accepted)throw new Error('Please read and accept the Privacy Policy before creating your UniNest ID.')
    await createAccount(f);nav('/feed',{replace:true})})
  return <div className="grid gap-10 py-4 lg:grid-cols-2">
    <div><h1 className="text-4xl md:text-5xl">Create your UniNest ID</h1>
      <p className="mt-3 max-w-md text-ink-2 leading-7">Your ID is made from your email, so it takes about a minute: confirm your email, then tell us a little about you.</p>
      <ol className="mt-8 space-y-3">{steps.map((s,i)=><li key={s} className={`flex items-center gap-3 text-sm ${i===step?'font-semibold':'text-ink-2'}`} aria-current={i===step?'step':undefined}>
        <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${i<step?'border-secondary bg-secondary text-white':i===step?'border-primary-container bg-primary-container text-surface':'border-outline-variant'}`}>{i<step?<Icon n="check" className="!text-[16px]"/>:i+1}</span>{s}</li>)}</ol>
      <p className="mt-8 text-sm text-ink-2">Already have an ID? <Link to="/login" className="font-semibold text-primary-container underline underline-offset-4">Log in</Link></p></div>
    <div className="panel p-6">
      {err&&<p role="alert" className="mb-4 rounded border border-error bg-error-wash p-3 text-sm text-error">{err}</p>}
      {step===0&&<form onSubmit={send} className="space-y-4" noValidate><h2 className="text-2xl">Enter your email</h2>
        <div><label className="label" htmlFor="em">Email address</label><input id="em" type="email" className="field" autoComplete="email" placeholder="you@college.edu" value={f.email} onChange={set('email')} required/></div>
        {f.email.includes('@')&&<p className="text-sm text-ink-2">Your ID will be <b className="text-ink">@{previewId(f.email)}</b></p>}
        <button className="btn-primary w-full" disabled={busy||!f.email}>{busy?'Sending…':'Send verification code'}</button></form>}
      {step===1&&<form onSubmit={create} className="space-y-4" noValidate><h2 className="text-2xl">Set up your profile</h2>
        <p className="text-sm text-ink-2">After signup, Supabase will send a confirmation link to <b className="text-ink">{f.email}</b>.</p>
        <p className="text-sm text-ink-2">Your ID: <b className="text-ink">@{previewId(f.email)}</b></p>
        <div><span className="label">Profile photo (optional)</span>
          <div className="flex items-center gap-4">
            {f.avatar?<img src={f.avatar} alt="Profile preview" className="h-14 w-14 rounded-full border border-outline-variant object-cover"/>:<span className="grid h-14 w-14 place-items-center rounded-full border border-outline-variant bg-surface-low text-xs font-bold text-ink-2">PHOTO</span>}
            <div className="space-y-2">
              <input type="file" accept="image/*" className="block text-sm" onChange={e=>{onAvatar(e).catch(x=>setErr(x.message))}}/>
              {f.avatar&&<button type="button" className="text-sm underline underline-offset-4" onClick={()=>setF({...f,avatar:''})}>Remove photo</button>}
            </div>
          </div>
        </div>
        <div><label className="label" htmlFor="nm">Full name</label><input id="nm" className="field" autoComplete="name" value={f.name} onChange={set('name')} required/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="cl">College</label><input id="cl" className="field" value={f.college} onChange={set('college')} required/></div>
          <div><label className="label" htmlFor="yr">Year</label><select id="yr" className="field" value={f.year} onChange={set('year')}>{years.map(y=><option key={y}>{y}</option>)}</select></div></div>
        <div><label className="label" htmlFor="stream">Stream</label><select id="stream" className="field" value={f.stream} onChange={set('stream')} required><option value="">Select your stream</option>{STREAMS.map(stream=><option key={stream}>{stream}</option>)}</select></div>
        <div><label className="label" htmlFor="ph">Phone number</label><input id="ph" type="tel" className="field" autoComplete="tel" placeholder="+91 98765 43210" value={f.phone} onChange={set('phone')} required/></div>
        <div><span className="label">Pick your interests (at least one)</span><div className="flex flex-wrap gap-2">{INTERESTS.map(i=><Chip type="button" key={i} on={f.interests.includes(i)} onClick={()=>setF({...f,interests:f.interests.includes(i)?f.interests.filter(x=>x!==i):[...f.interests,i]})}>{i}</Chip>)}</div></div>
        <div><label className="label" htmlFor="p1">Password (8+ characters)</label><div className="relative"><input id="p1" type={show?'text':'password'} className="field pr-10" autoComplete="new-password" value={f.password} onChange={set('password')} required/>
          <button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2"><Icon n={show?'visibility_off':'visibility'}/></button></div></div>
        <div><label className="label" htmlFor="p2">Confirm password</label><input id="p2" type={show?'text':'password'} className="field" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required/></div>
        <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" className="mt-1 accent-primary-container" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>I have read and agree to the <Link to="/privacy-policy" className="font-semibold text-primary-container underline underline-offset-4">Privacy Policy</Link>.</span></label>
        <button className="btn-primary w-full" disabled={busy||!f.name||!f.college||!f.stream||f.password.length<8||!f.interests.length||!accepted}>{busy?'Creating…':'Create my account'}</button></form>}
    </div></div>}
