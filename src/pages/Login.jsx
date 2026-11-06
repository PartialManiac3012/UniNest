import {useState} from 'react'
import {Link,useLocation,useNavigate} from 'react-router-dom'
import {useAuth} from '../auth.jsx'
import {Icon} from '../components/Layout.jsx'
export default function Login(){
  const {login}=useAuth(),nav=useNavigate(),loc=useLocation()
  const [id,setId]=useState(''),[pw,setPw]=useState(''),[show,setShow]=useState(false),[accepted,setAccepted]=useState(false),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
  const submit=async e=>{e.preventDefault();setErr('');setBusy(true)
    try{await login(id,pw);nav(loc.state?.from||'/feed',{replace:true})}catch(x){setErr(x.message);setBusy(false)}}
  return <div className="mx-auto max-w-md py-6">
    <h1 className="text-4xl">Log in to UniNest</h1>
    <p className="mt-2 text-ink-2">Use the email or UniNest ID you signed up with.</p>
    <form onSubmit={submit} className="panel mt-6 space-y-4 p-6" noValidate>
      {err&&<p role="alert" className="rounded border border-error bg-error-wash p-3 text-sm text-error">{err}</p>}
      <div><label className="label" htmlFor="id">Email or UniNest ID</label><input id="id" className="field" autoComplete="username" value={id} onChange={e=>setId(e.target.value)} required/></div>
      <div><label className="label" htmlFor="pw">Password</label><div className="relative"><input id="pw" type={show?'text':'password'} className="field pr-10" autoComplete="current-password" value={pw} onChange={e=>setPw(e.target.value)} required/>
        <button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-2"><Icon n={show?'visibility_off':'visibility'}/></button></div></div>
      <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" className="mt-1 accent-primary-container" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>I have read and agree to the <Link to="/privacy-policy" className="font-semibold text-primary-container underline underline-offset-4">Privacy Policy</Link>.</span></label>
      <p className="text-sm text-ink-2">Please also read and agree to the <Link to="/terms-and-conditions" className="font-semibold text-primary-container underline underline-offset-4">Terms &amp; Conditions</Link>.</p>
      <button className="btn-primary w-full" disabled={busy||!id||!pw||!accepted}>{busy?'Logging in…':'Log in'}</button>
    </form>
    <p className="mt-4 text-sm text-ink-2">New here? <Link to="/signup" className="font-semibold text-primary-container underline underline-offset-4">Create your UniNest ID</Link></p>
  </div>}
