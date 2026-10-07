import {createContext,useContext,useState} from 'react'
import {Navigate,useLocation} from 'react-router-dom'
// Frontend-only demo auth: accounts live in this browser's localStorage.
// Swap the functions below for real API calls when you have a backend.
const Ctx=createContext(null)
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const norm=e=>e.trim().toLowerCase()
const ADMIN_EMAILS=['admin@uninest.example']
export const idFromEmail=email=>{
  const base=norm(email).split('@')[0].replace(/[^a-z0-9._]/g,'').slice(0,20)||'student'
  const taken=new Set(read('uninest.users',[]).map(u=>u.uid));let id=base,n=1
  while(taken.has(id))id=base+(++n);return id}
export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{const u=read('uninest.session',null);return read('uninest.users',[]).find(x=>x.uid===u)||null})
  const strip=({hash,...u})=>u
  const isBanned=email=>read('uninest.bannedEmails',[]).includes(norm(email))
  const api={
    user:user&&strip(user),
    isAdmin:!!user&&ADMIN_EMAILS.includes(user.email),
    previewId:idFromEmail,
    sendCode(email){
      if(!EMAIL.test(norm(email)))throw new Error('Enter a valid email address.')
      if(isBanned(email))throw new Error('This email address has been banned from UniNest.')
      if(read('uninest.users',[]).some(u=>u.email===norm(email)))throw new Error('An account with this email already exists. Log in instead.')
      const code=String(Math.floor(100000+Math.random()*900000))
      write('uninest.pending',{email:norm(email),code,exp:Date.now()+10*60*1000});return code},
    verifyCode(email,code){
      const p=read('uninest.pending',null)
      if(!p||p.email!==norm(email))throw new Error('Request a new code first.')
      if(Date.now()>p.exp)throw new Error('This code expired. Request a new one.')
      if(p.code!==code.trim())throw new Error('That code is not right. Check it and try again.')
      write('uninest.pending',{...p,ok:true})},
    async createAccount({email,name,college,year,password,interests=[],avatar='',phone=''}) {
      const p=read('uninest.pending',null)
      if(!p?.ok||p.email!==norm(email))throw new Error('Verify your email first.')
      if(password.length<8)throw new Error('Use at least 8 characters for your password.')
      if(isBanned(email))throw new Error('This email address has been banned from UniNest.')
      const u={uid:idFromEmail(email),email:norm(email),name:name.trim(),college:college.trim(),year,interests,avatar,phone:phone.trim(),skills:'',bio:'',hash:await sha(password),created:Date.now()}
      write('uninest.users',[...read('uninest.users',[]),u]);localStorage.removeItem('uninest.pending')
      write('uninest.session',u.uid);setUser(u)},
    async login(idOrEmail,password){
      const k=norm(idOrEmail).replace(/^@/,''),h=await sha(password)
      const u=read('uninest.users',[]).find(x=>x.email===k||x.uid===k)
      if(u&&isBanned(u.email))throw new Error('This email address has been banned from UniNest.')
      if(!u||u.hash!==h)throw new Error('ID/email or password is incorrect.')
      write('uninest.session',u.uid);setUser(u)},
    updateProfile(patch){const us=read('uninest.users',[]).map(u=>u.uid===user.uid?{...u,...patch}:u);write('uninest.users',us);setUser(us.find(u=>u.uid===user.uid))},
    banEmail:email=>{
      if(!user||!ADMIN_EMAILS.includes(user.email))throw new Error('Only admins can ban email addresses.')
      const banned=[...new Set([...read('uninest.bannedEmails',[]),norm(email)])]
      write('uninest.bannedEmails',banned)
      const remaining=read('uninest.users',[]).filter(u=>u.email!==norm(email))
      write('uninest.users',remaining)
    },
    logout(){localStorage.removeItem('uninest.session');setUser(null)}}
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>}
export const useAuth=()=>useContext(Ctx)
export function RequireAuth({children}){
  const {user}=useAuth(),loc=useLocation()
  return user?children:<Navigate to="/login" replace state={{from:loc.pathname}}/>}
export function GuestOnly({children}){const {user}=useAuth();return user?<Navigate to="/feed" replace/>:children}
