import {createContext,useContext,useEffect,useState} from 'react'
import {Navigate,useLocation} from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
  sendEmailVerification
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs
} from 'firebase/firestore'
import {auth,db,isFirebaseConfigured} from './lib/firebase.js'

const Ctx=createContext(null)
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
const norm=e=>e.trim().toLowerCase()
const ADMIN_EMAILS=['admin@uninest.example']
const MANUALLY_VERIFIED_EMAILS=['kumar.aditya30122006@gmail.com']

export const isStudentEmail=email=>{
  const e=norm(email||'')
  return e.endsWith('@sudoon.ac.in')||e.endsWith('.edu')||e.endsWith('.ac.in')
}

export const isVerifiedEmail=(email,authUser=null)=>{
  if(!email)return false
  const e=norm(email)
  if(authUser?.emailVerified)return true
  if(MANUALLY_VERIFIED_EMAILS.includes(e))return true
  if(ADMIN_EMAILS.includes(e))return true
  if(isStudentEmail(e))return true
  return false
}

export const idFromEmail=email=>{
  const base=norm(email).split('@')[0].replace(/[^a-z0-9._]/g,'').slice(0,20)||'student'
  const taken=new Set(read('uninest.users',[]).map(u=>u.uid));let id=base,n=1
  while(taken.has(id))id=base+(++n)
  return id
}

const profileFromUser=(authUser,local={},remote={})=>{
  const meta={...local,...remote}
  return {
    ...local,
    ...remote,
    authId:authUser?.uid,
    uid:meta.uid||local.uid||idFromEmail(authUser?.email||''),
    email:authUser?.email||local.email||'',
    name:meta.name||local.name||authUser?.displayName||'',
    college:meta.college||local.college||'',
    year:meta.year||local.year||'',
    stream:meta.stream||local.stream||'',
    interests:meta.interests||local.interests||[],
    avatar:meta.avatar||local.avatar||authUser?.photoURL||'',
    phone:meta.phone||local.phone||authUser?.phoneNumber||'',
    bio:meta.bio||local.bio||'',
    skills:meta.skills||local.skills||'',
    verified:isVerifiedEmail(authUser?.email,authUser)
  }
}

const saveLocalProfile=profile=>{
  try{
    const users=read('uninest.users',[])
    write('uninest.users',[...users.filter(item=>item.uid!==profile.uid),profile])
  }catch(e){
    console.warn('LocalStorage save profile skipped to prevent quota error:',e)
  }
}

const saveFirestoreProfile=async profile=>{
  if(!db||!profile.authId)return
  await setDoc(doc(db,'profiles',profile.authId),{
    id:profile.authId,
    uid:profile.uid,
    email:profile.email,
    name:profile.name,
    college:profile.college,
    year:profile.year,
    stream:profile.stream,
    interests:profile.interests||[],
    avatar:profile.avatar||'',
    phone:profile.phone||'',
    bio:profile.bio||'',
    skills:profile.skills||'',
    updated_at:new Date().toISOString()
  },{merge:true})
}

export function AuthProvider({children}){
  const [user,setUser]=useState(null)
  const [loading,setLoading]=useState(true)
  const isBanned=email=>read('uninest.bannedEmails',[]).includes(norm(email))

  useEffect(()=>{
    if(!auth){setLoading(false);return}
    let mounted=true
    const unsubscribe=onAuthStateChanged(auth,async firebaseUser=>{
      if(!mounted)return
      if(firebaseUser){
        let remote={}
        if(db){
          try{
            const snap=await getDoc(doc(db,'profiles',firebaseUser.uid))
            if(snap.exists())remote=snap.data()
          }catch(error){
            console.warn('Could not load Firestore profile:',error)
          }
        }
        const local=read('uninest.users',[]).find(x=>x.authId===firebaseUser.uid||x.email===firebaseUser.email)||{}
        const profile=profileFromUser(firebaseUser,local,remote)
        saveLocalProfile(profile)
        if(mounted)setUser(profile)
      }else{
        if(mounted)setUser(null)
      }
      if(mounted)setLoading(false)
    })
    return()=>{mounted=false;unsubscribe()}
  },[])

  const createAccount=async({email,name,college,year,stream,password,interests=[],avatar='',phone=''})=>{
    if(!auth)throw new Error('Firebase is not configured. Add VITE_FIREBASE_API_KEY and other Firebase variables to .env.')
    if(isBanned(email))throw new Error('This email address has been banned from UniNest.')
    if(password.length<8)throw new Error('Use at least 8 characters for your password.')
    const uid=idFromEmail(email)
    const userCredential=await createUserWithEmailAndPassword(auth,norm(email),password)
    const firebaseUser=userCredential.user
    if(!firebaseUser)throw new Error('Firebase did not return a user after signup. Please try again.')

    try{
      await updateAuthProfile(firebaseUser,{
        displayName:name.trim(),
        photoURL:avatar||undefined
      })
    }catch{}

    let requiresConfirmation=false
    try{
      await sendEmailVerification(firebaseUser)
      requiresConfirmation=true
    }catch{}

    const profile={
      authId:firebaseUser.uid,
      uid,
      email:norm(email),
      name:name.trim(),
      college:college.trim(),
      year,
      stream,
      interests,
      avatar,
      phone:phone.trim(),
      bio:'',
      skills:'',
      verified:isVerifiedEmail(email,firebaseUser)
    }

    saveLocalProfile(profile)
    try{
      await saveFirestoreProfile(profile)
    }catch(error){
      console.warn('Could not sync profile to Firestore:',error)
    }
    setUser(profile)
    return {requiresConfirmation,email:norm(email)}
  }

  const resendConfirmation=async email=>{
    if(!auth)throw new Error('Firebase is not configured.')
    if(auth.currentUser){
      await sendEmailVerification(auth.currentUser)
    }else{
      throw new Error('Please log in first to resend your verification email.')
    }
  }

  const login=async(idOrEmail,password)=>{
    if(!auth)throw new Error('Firebase is not configured. Add VITE_FIREBASE_API_KEY and other Firebase variables to .env.')
    const key=norm(idOrEmail).replace(/^@/,'')
    const local=read('uninest.users',[]).find(x=>x.uid===key)
    let email=local?.email||key

    if(!email.includes('@')&&db){
      try{
        const q=query(collection(db,'profiles'),where('uid','==',key),limit(1))
        const snap=await getDocs(q)
        if(!snap.empty){
          email=snap.docs[0].data().email||email
        }
      }catch{}
    }

    if(isBanned(email))throw new Error('This email address has been banned from UniNest.')
    const userCredential=await signInWithEmailAndPassword(auth,email,password)
    const firebaseUser=userCredential.user
    let remote={}
    if(db){
      try{
        const snap=await getDoc(doc(db,'profiles',firebaseUser.uid))
        if(snap.exists())remote=snap.data()
      }catch{}
    }
    const profile=profileFromUser(firebaseUser,local,remote)
    saveLocalProfile(profile)
    try{
      await saveFirestoreProfile(profile)
    }catch{}
    setUser(profile)
  }

  const updateProfile=async patch=>{
    if(!user)return
    if(!auth)throw new Error('Firebase is not configured.')
    const updated={...user,...patch}
    saveLocalProfile(updated)
    setUser(updated)
    const errors=[]
    if(auth.currentUser){
      const updates={}
      if(patch.name)updates.displayName=patch.name.trim()
      if(patch.avatar)updates.photoURL=patch.avatar
      if(Object.keys(updates).length>0){
        try{
          await updateAuthProfile(auth.currentUser,updates)
        }catch(error){
          console.warn('Auth profile update:',error)
        }
      }
    }
    try{
      await saveFirestoreProfile(updated)
    }catch(error){
      errors.push(`Firestore profile: ${error.message||'failed'}`)
    }
    if(errors.length)throw new Error(`Profile saved on this device, but could not sync with Firebase (${errors.join('; ')}).`)
  }

  const banEmail=email=>{
    if(!user||!ADMIN_EMAILS.includes(user.email))throw new Error('Only admins can ban email addresses.')
    const banned=[...new Set([...read('uninest.bannedEmails',[]),norm(email)])]
    write('uninest.bannedEmails',banned)
  }

  const logout=async()=>{
    if(auth)await signOut(auth)
    setUser(null)
  }

  const api={
    user,
    isAdmin:!!user&&ADMIN_EMAILS.includes(user.email),
    isVerifiedStudent:!!user&&isVerifiedEmail(user.email,user),
    previewId:idFromEmail,
    createAccount,
    resendConfirmation,
    login,
    updateProfile,
    banEmail,
    logout,
    loading
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useAuth=()=>useContext(Ctx)

export function RequireAuth({children}){
  const {user,loading}=useAuth(),loc=useLocation()
  if(loading)return <p className="panel p-6">Loading your session…</p>
  return user?children:<Navigate to="/login" replace state={{from:loc.pathname}}/>
}

export function GuestOnly({children}){
  const {user,loading}=useAuth()
  return loading?<p className="panel p-6">Loading your session…</p>:user?<Navigate to="/feed" replace/>:children
}
