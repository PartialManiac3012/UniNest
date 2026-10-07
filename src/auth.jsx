import {createContext,useContext,useEffect,useState} from 'react'
import {Navigate,useLocation} from 'react-router-dom'
import {supabase} from './lib/supabase.js'

const Ctx=createContext(null)
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
const norm=e=>e.trim().toLowerCase()
const ADMIN_EMAILS=['admin@uninest.example']
const MANUALLY_VERIFIED_EMAILS=['kumar.aditya30122006@gmail.com']

export const isStudentEmail=email=>norm(email||'').endsWith('@sudoon.ac.in')
export const isVerifiedEmail=email=>isStudentEmail(email)||MANUALLY_VERIFIED_EMAILS.includes(norm(email||''))
export const idFromEmail=email=>{
  const base=norm(email).split('@')[0].replace(/[^a-z0-9._]/g,'').slice(0,20)||'student'
  const taken=new Set(read('uninest.users',[]).map(u=>u.uid));let id=base,n=1
  while(taken.has(id))id=base+(++n)
  return id
}
const profileFromUser=(authUser,local={})=>{
  const meta=authUser?.user_metadata||{}
  return {...local,authId:authUser?.id,uid:meta.uid||local.uid||idFromEmail(authUser.email||''),email:authUser.email||local.email||'',name:meta.name||local.name||'',college:meta.college||local.college||'',year:meta.year||local.year||'',stream:meta.stream||local.stream||'',interests:meta.interests||local.interests||[],avatar:meta.avatar||local.avatar||'',phone:meta.phone||local.phone||'',bio:meta.bio||local.bio||'',skills:meta.skills||local.skills||'',verified:isVerifiedEmail(authUser.email)}
}
const saveLocalProfile=profile=>{
  const users=read('uninest.users',[])
  write('uninest.users',[...users.filter(item=>item.uid!==profile.uid),profile])
}
const saveSupabaseProfile=async profile=>{
  if(!supabase||!profile.authId)return
  const {error}=await supabase.from('profiles').upsert({
    id:profile.authId,uid:profile.uid,email:profile.email,name:profile.name,college:profile.college,
    year:profile.year,stream:profile.stream,interests:profile.interests,avatar:profile.avatar,
    phone:profile.phone,bio:profile.bio,skills:profile.skills
  })
  if(error)throw new Error(`Could not sync your profile with Supabase: ${error.message}`)
}

export function AuthProvider({children}){
  const [user,setUser]=useState(null)
  const [loading,setLoading]=useState(true)
  const isBanned=email=>read('uninest.bannedEmails',[]).includes(norm(email))

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    let mounted=true
    supabase.auth.getSession().then(({data})=>{
      if(mounted)setUser(data.session?.user?profileFromUser(data.session.user):null)
      if(mounted)setLoading(false)
    })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(mounted)setUser(session?.user?profileFromUser(session.user):null)
    })
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])

  const createAccount=async({email,name,college,year,stream,password,interests=[],avatar='',phone=''})=>{
    if(!supabase)throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.')
    if(isBanned(email))throw new Error('This email address has been banned from UniNest.')
    if(password.length<8)throw new Error('Use at least 8 characters for your password.')
    const uid=idFromEmail(email)
    const {data,error}=await supabase.auth.signUp({email:norm(email),password,options:{data:{uid,name:name.trim(),college:college.trim(),year,stream,interests,avatar,phone:phone.trim(),bio:'',skills:''}}})
    if(error)throw new Error(error.message)
    if(!data.session)throw new Error('Account created. Check your email and click the confirmation link before logging in.')
    const profile=profileFromUser(data.user)
    saveLocalProfile(profile)
    await saveSupabaseProfile(profile)
    setUser(profile)
  }
  const login=async(idOrEmail,password)=>{
    if(!supabase)throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.')
    const key=norm(idOrEmail).replace(/^@/,'')
    const local=read('uninest.users',[]).find(x=>x.uid===key)
    const email=local?.email||key
    if(isBanned(email))throw new Error('This email address has been banned from UniNest.')
    const {data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error)throw new Error(error.message)
    const profile=profileFromUser(data.user,local)
    saveLocalProfile(profile)
    await saveSupabaseProfile(profile)
    setUser(profile)
  }
  const updateProfile=async patch=>{
    if(!user)return
    if(!supabase)throw new Error('Supabase is not configured.')
    const {data,error}=await supabase.auth.updateUser({data:patch})
    if(error)throw new Error(error.message)
    const profile=profileFromUser(data.user,{...user,...patch})
    saveLocalProfile(profile)
    await saveSupabaseProfile(profile)
    setUser(profile)
  }
  const banEmail=email=>{
    if(!user||!ADMIN_EMAILS.includes(user.email))throw new Error('Only admins can ban email addresses.')
    const banned=[...new Set([...read('uninest.bannedEmails',[]),norm(email)])]
    write('uninest.bannedEmails',banned)
  }
  const logout=async()=>{
    if(supabase)await supabase.auth.signOut()
    setUser(null)
  }
  const api={user,isAdmin:!!user&&ADMIN_EMAILS.includes(user.email),isVerifiedStudent:!!user&&isVerifiedEmail(user.email),previewId:idFromEmail,createAccount,login,updateProfile,banEmail,logout,loading}
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
export const useAuth=()=>useContext(Ctx)
export function RequireAuth({children}){
  const {user,loading}=useAuth(),loc=useLocation()
  if(loading)return <p className="panel p-6">Loading your session…</p>
  return user?children:<Navigate to="/login" replace state={{from:loc.pathname}}/>
}
export function GuestOnly({children}){const {user,loading}=useAuth();return loading?<p className="panel p-6">Loading your session…</p>:user?<Navigate to="/feed" replace/>:children}
