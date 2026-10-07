import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {Icon} from '../components/Layout.jsx'
import {INTERESTS} from '../data.js'
import {Chip} from '../components/ui.jsx'
const steps=['Email','Verify','Profile'],years=['1st year','2nd year','3rd year','4th year','Postgraduate']
export default function Signup(){
  const {sendCode,verifyCode,createAccount,previewId}=useAuth(),nav=useNavigate()
  const [step,setStep]=useState(0),[demo,setDemo]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false)
  const [f,setF]=useState({email:'',code:'',name:'',college:'',year:years[0],password:'',confirm:'',interests:[]})
  const set=k=>e=>setF({...f,[k]:e.target.value})
  const run=fn=>async e=>{e.preventDefault();setErr('');setBusy(true);try{await fn()}catch(x){setErr(x.message)}setBusy(false)}
  const send=run(async()=>{setDemo(sendCode(f.email));setStep(1)})
  const verify=run(async()=>{verifyCode(f.email,f.code);setStep(2)})
  const create=run(async()=>{
    if(f.password!==f.confirm)throw new Error('The two passwords do not match.')
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
      {step===1&&<form onSubmit={verify} className="space-y-4" noValidate><h2 className="text-2xl">Check your email</h2>
        <p className="text-sm text-ink-2">We sent a 6-digit code to <b className="text-ink">{f.email}</b>. It expires in 10 minutes.</p>
        <div className="rounded border border-gold bg-gold-wash p-3 text-sm" role="note"><b>Demo mode:</b> no email service is connected yet, so your code is shown here: <b className="tracking-widest">{demo}</b></div>
        <div><label className="label" htmlFor="cd">Verification code</label><input id="cd" inputMode="numeric" maxLength={6} className="field tracking-[.4em]" autoComplete="one-time-code" value={f.code} onChange={set('code')} required/></div>
        <button className="btn-primary w-full" disabled={busy||f.code.length<6}>Verify email</button>
        <div className="flex justify-between text-sm"><button type="button" className="underline underline-offset-4" onClick={()=>{setStep(0);setErr('')}}>Change email</button><button type="button" className="underline underline-offset-4" onClick={()=>{try{setDemo(sendCode(f.email));setErr('')}catch(x){setErr(x.message)}}}>Send a new code</button></div></form>}
      {step===2&&<form onSubmit={create} className="space-y-4" noValidate><h2 className="text-2xl">Set up your profile</h2>
        <p className="text-sm text-ink-2">Your ID: <b className="text-ink">@{previewId(f.email)}</b></p>
        <div><label className="label" htmlFor="nm">Full name</label><input id="nm" className="field" autoComplete="name" value={f.name} onChange={set('name')} required/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="cl">College</label><input id="cl" className="field" value={f.college} onChange={set('college')} required/></div>
          <div><label className="label" htmlFor="yr">Year</label><select id="yr" className="field" value={f.year} onChange={set('year')}>{years.map(y=><option key={y}>{y}</option>)}</select></div></div>
        <div><span className="label">Pick your interests (at least one)</span><div className="flex flex-wrap gap-2">{INTERESTS.map(i=><Chip type="button" key={i} on={f.interests.includes(i)} onClick={()=>setF({...f,interests:f.interests.includes(i)?f.interests.filter(x=>x!==i):[...f.interests,i]})}>{i}</Chip>)}</div></div>
        <div><label className="label" htmlFor="p1">Password (8+ characters)</label><div className="relative"><input id="p1" type={show?'text':'password'} className="field pr-10" autoComplete="new-password" value={f.password} onChange={set('password')} required/>
          <button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2"><Icon n={show?'visibility_off':'visibility'}/></button></div></div>
        <div><label className="label" htmlFor="p2">Confirm password</label><input id="p2" type={show?'text':'password'} className="field" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required/></div>
        <button className="btn-primary w-full" disabled={busy||!f.name||!f.college||f.password.length<8||!f.interests.length}>{busy?'Creating…':'Create my account'}</button></form>}
    </div></div>}
