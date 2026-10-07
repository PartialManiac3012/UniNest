import {createContext,useContext,useEffect,useState} from 'react'
import {useAuth} from './auth.jsx'
import {isVerifiedEmail} from './auth.jsx'
import {supabase} from './lib/supabase.js'
// Frontend-only social store (localStorage). Sample students are seeded so the app is not empty.
const K='uninest.social',H=36e5,CLAIM_RETENTION=7*24*H,rid=()=>Math.random().toString(36).slice(2,9)
const SAMPLE_IDS=new Set(['p1','p2','p3','t1','t2','t3','ce1','ce2'])
const SAMPLE_USERS=new Set(['aditi.v','kartik.s','sneha.p','ananya.s','rohan.m','priyanshu.d'])
const emptyDb=()=>({posts:[],teams:[],conn:{},requests:[],notifications:[],msgs:[],clubEvents:[],lostFound:[],commentReports:[]})
const cleanSampleData=db=>({
  ...emptyDb(),
  ...db,
  posts:[],
  lostFound:[],
  teams:(db.teams||[]).filter(item=>!SAMPLE_IDS.has(item.id)&&!SAMPLE_USERS.has(item.by)),
  clubEvents:(db.clubEvents||[]).filter(item=>!SAMPLE_IDS.has(item.id)),
  msgs:(db.msgs||[]).filter(item=>!SAMPLE_USERS.has(item.a)&&!SAMPLE_USERS.has(item.b)),
  conn:Object.fromEntries(Object.entries(db.conn||{}).filter(([uid])=>!SAMPLE_USERS.has(uid)).map(([uid,ids])=>[uid,(ids||[]).filter(id=>!SAMPLE_USERS.has(id))])),
  requests:(db.requests||[]).filter(item=>!SAMPLE_USERS.has(item.from)&&!SAMPLE_USERS.has(item.to)),
  notifications:(db.notifications||[]).filter(item=>!SAMPLE_USERS.has(item.to))
})
const Ctx=createContext(null)
export function SocialProvider({children}){
  const {user}=useAuth(),me=user?.uid
  const [db,setDb]=useState(()=>{try{return cleanSampleData(JSON.parse(localStorage.getItem(K))||emptyDb())}catch{return emptyDb()}})
  const [canPost,setCanPost]=useState(false)
  const [postingPermissionError,setPostingPermissionError]=useState('')
  const [remotePeople,setRemotePeople]=useState([])
  const [remoteProfilesLoaded,setRemoteProfilesLoaded]=useState(!supabase)
  const [messageNotifications,setMessageNotifications]=useState([])
  const [remoteRequests,setRemoteRequests]=useState([])
  const [notificationError,setNotificationError]=useState('')
  const [notificationRevision,setNotificationRevision]=useState(0)
  useEffect(()=>{localStorage.setItem(K,JSON.stringify(db))},[db])
  useEffect(()=>{setDb(d=>{const items=d.lostFound||[],active=items.filter(item=>!item.claimed||!item.claimedAt||Date.now()-item.claimedAt<CLAIM_RETENTION);return active.length===items.length?d:{...d,lostFound:active}})},[])
  const loadPostingPermission=async()=>{
    if(!user){setCanPost(false);setPostingPermissionError('');return false}
    const allowed=isVerifiedEmail(user.email)
    setCanPost(allowed)
    setPostingPermissionError('')
    return allowed
  }
  useEffect(()=>{loadPostingPermission()},[user])
  useEffect(()=>{
    if(!supabase||!user?.authId){setRemoteRequests([]);return}
    let active=true
    const load=async()=>{
      const {data,error}=await supabase.from('connection_requests').select('*').or(`sender_id.eq.${user.authId},recipient_id.eq.${user.authId}`)
      if(active){
        if(error)setNotificationError(error.message)
        else {setRemoteRequests(data||[]);setNotificationError('');setNotificationRevision(value=>value+1)}
      }
    }
    load()
    const channel=supabase.channel(`connection-requests:${user.authId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'connection_requests'},payload=>{
        if(payload.new?.sender_id===user.authId||payload.new?.recipient_id===user.authId)load()
      }).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId])
  useEffect(()=>{
    if(!supabase||!user?.authId){setMessageNotifications([]);return}
    let active=true
    const key=`uninest.notifications.read.${user.authId}`
    const load=async()=>{
      const since=Number(localStorage.getItem(key)||0)
      const {data,error}=await supabase.from('messages').select('id,sender_id,created_at').eq('recipient_id',user.authId).gt('created_at',new Date(since).toISOString()).order('created_at',{ascending:false}).limit(30)
      if(active){
        if(error)setNotificationError(error.message)
        else {setMessageNotifications((data||[]).map(m=>({id:`message-${m.id}`,type:'message',from:m.sender_id,t:m.created_at,person:remotePeople.find(p=>p.authId===m.sender_id)})));setNotificationRevision(value=>value+1)}
      }
    }
    load()
    const channel=supabase.channel(`notifications:${user.authId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`recipient_id=eq.${user.authId}`},payload=>{
      if(active){setMessageNotifications(current=>current.some(n=>n.id===`message-${payload.new.id}`)?current:[{id:`message-${payload.new.id}`,type:'message',from:payload.new.sender_id,t:payload.new.created_at,person:remotePeople.find(p=>p.authId===payload.new.sender_id)},...current]);setNotificationRevision(value=>value+1)}
    }).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId,remotePeople])
  useEffect(()=>{
    if(!supabase){setRemoteProfilesLoaded(true);return}
    let active=true
    supabase.from('profiles').select('*').then(({data,error})=>{
      if(!active)return
      if(!error&&data){
        const profiles=data.map(p=>({...p,authId:p.id,verified:isVerifiedEmail(p.email)}))
        setRemotePeople(profiles)
        const validIds=new Set(profiles.map(p=>p.uid))
        const users=JSON.parse(localStorage.getItem('uninest.users')||'[]')
        localStorage.setItem('uninest.users',JSON.stringify(users.filter(p=>validIds.has(p.uid))))
      }
      setRemoteProfilesLoaded(true)
    })
    return()=>{active=false}
  },[])
  const upd=fn=>setDb(d=>fn(structuredClone(d)))
  let reg=[];try{reg=(JSON.parse(localStorage.getItem('uninest.users'))||[]).map(({hash,...u})=>u)}catch{}
  const localPeople=reg.filter(p=>!SAMPLE_USERS.has(p.uid)&&(!supabase||!remoteProfilesLoaded||remotePeople.some(remote=>remote.uid===p.uid))).map(p=>({...p,verified:p.verified||isVerifiedEmail(p.email||'')}))
  const people=[...remotePeople,...localPeople].reduce((all,p)=>all.some(x=>x.uid===p.uid)?all:[...all,p],[])
  const pick=(a,id)=>a.find(x=>x.id===id)
  const clubEmails=['club@uninest.example','ai.club@uninest.example']
  const isClubMember=!!user&&clubEmails.includes(user.email)
  const requirePostAccess=()=>{if(!canPost)throw new Error('Verify your student account before creating posts. You can still comment and interact with other users.')}
  const api={me,people,person:u=>people.find(p=>p.uid===u),posts:db.posts,teams:db.teams,conns:db.conn[me]||[],clubEvents:db.clubEvents||[],lostFound:db.lostFound||[],commentReports:db.commentReports||[],isClubMember,canPost,postingPermissionError,refreshPostingPermission:loadPostingPermission,
    addPost:(text,tag)=>{requirePostAccess();upd(d=>{d.posts.unshift({id:rid(),by:me,text,tag,t:Date.now(),likes:[],comments:[]});return d})},
    editPost:(id,text,tag)=>upd(d=>{const p=pick(d.posts,id);if(!p||p.by!==me)throw new Error('You can only edit your own post.');p.text=text.trim();p.tag=tag;return d}),
    deletePost:id=>upd(d=>{const index=d.posts.findIndex(p=>p.id===id),p=d.posts[index];if(!p||p.by!==me)throw new Error('You can only delete your own post.');d.posts.splice(index,1);return d}),
    toggleLike:id=>upd(d=>{const p=pick(d.posts,id);p.likes=p.likes.includes(me)?p.likes.filter(x=>x!==me):[...p.likes,me];return d}),
    addComment:(id,text)=>upd(d=>{pick(d.posts,id).comments.push({id:rid(),by:me,text,t:Date.now()});return d}),
    deleteComment:(surface,itemId,commentId)=>upd(d=>{const list=surface==='post'?d.posts:d.clubEvents;const item=pick(list,itemId);if(!item)return d;const index=item.comments.findIndex((c,i)=>(c.id||`${itemId}-${i}`)===commentId),comment=item.comments[index];if(!comment||comment.by!==me)throw new Error('You can only delete your own comment.');item.comments.splice(index,1);return d}),
    adminDeleteComment:(surface,itemId,commentId)=>upd(d=>{const list=surface==='post'?d.posts:d.clubEvents;const item=pick(list,itemId);if(!item)return d;const index=item.comments.findIndex((c,i)=>(c.id||`${itemId}-${i}`)===commentId);if(index>=0)item.comments.splice(index,1);d.commentReports=(d.commentReports||[]).filter(r=>!(r.surface===surface&&r.itemId===itemId&&r.commentId===commentId));return d}),
    reportComment:(surface,itemId,commentId)=>upd(d=>{d.commentReports??=[];if(!d.commentReports.some(r=>r.surface===surface&&r.itemId===itemId&&r.commentId===commentId&&r.by===me))d.commentReports.push({id:rid(),surface,itemId,commentId,by:me,t:Date.now()});return d}),
    addTeam:t=>{requirePostAccess();upd(d=>{d.teams.unshift({id:rid(),by:me,joins:[],...t});return d})},
    toggleJoin:id=>upd(d=>{const t=pick(d.teams,id);t.joins=t.joins.includes(me)?t.joins.filter(x=>x!==me):[...t.joins,me];return d}),
    toggleConnect:async u=>{
      const target=people.find(p=>p.uid===u)
      if(supabase&&user?.authId&&target?.authId){
        const {error}=await supabase.from('connection_requests').upsert({sender_id:user.authId,recipient_id:target.authId,status:'pending'},{onConflict:'sender_id,recipient_id'})
        if(error){setNotificationError(error.message);throw new Error(error.message)}
        setNotificationError('')
        return
      }
      upd(d=>{
      const c=d.conn[me]||[]
      if(c.includes(u)){d.conn[me]=c.filter(x=>x!==u);d.conn[u]=(d.conn[u]||[]).filter(x=>x!==me);return d}
      d.requests??=[]
      if(!d.requests.some(r=>r.from===me&&r.to===u&&r.status==='pending'))d.requests.push({id:rid(),from:me,to:u,status:'pending',t:Date.now()})
      d.notifications??=[]
      d.notifications.push({id:rid(),to:u,type:'connection',from:me,read:false,t:Date.now()})
      return d
    })},
    respondConnection:async(id,accept)=>{
      const remote=remoteRequests.find(r=>r.id===id)
      if(remote&&supabase){const {error}=await supabase.from('connection_requests').update({status:accept?'accepted':'declined'}).eq('id',id);if(error)throw new Error(error.message);return}
      upd(d=>{const r=d.requests?.find(x=>x.id===id);if(!r||r.to!==me)return d;r.status=accept?'accepted':'declined';if(accept){d.conn[me]=[...new Set([...(d.conn[me]||[]),r.from])];d.conn[r.from]=[...new Set([...(d.conn[r.from]||[]),me])]};return d})
    },
    connectionStatus:u=>{
      if((db.conn[me]||[]).includes(u))return 'connected'
      if((db.requests||[]).some(r=>r.from===me&&r.to===u&&r.status==='pending'))return 'requested'
      if((db.requests||[]).some(r=>r.from===u&&r.to===me&&r.status==='pending'))return 'incoming'
      return 'none'
    },
    notifications:()=> [
      ...(db.notifications||[]).filter(n=>n.to===me&&!n.read&&n.type!=='connection').map(n=>({...n,person:people.find(p=>p.uid===n.from)})),
      ...messageNotifications
    ],
    pendingConnectionRequests:()=> [
      ...(db.requests||[]).filter(r=>r.to===me&&r.status==='pending').map(r=>({...r,person:people.find(p=>p.uid===r.from)})),
      ...remoteRequests.filter(r=>r.recipient_id===user?.authId&&r.status==='pending').map(r=>({...r,from:people.find(p=>p.authId===r.sender_id)?.uid,person:people.find(p=>p.authId===r.sender_id)}))
    ],
    notificationError,notificationRevision,
    markNotificationsRead:()=>{upd(d=>{(d.notifications||[]).filter(n=>n.to===me).forEach(n=>{n.read=true});return d});if(user?.authId)localStorage.setItem(`uninest.notifications.read.${user.authId}`,String(Date.now()));setMessageNotifications([])},
    thread:o=>db.msgs.filter(m=>(m.a===me&&m.b===o)||(m.a===o&&m.b===me)),
    partners:()=>[...new Set([...(db.conn[me]||[]),...db.msgs.flatMap(m=>m.a===me?[m.b]:m.b===me?[m.a]:[])])],
    send:(o,text)=>upd(d=>{d.msgs.push({id:rid(),a:me,b:o,text,t:Date.now()});return d}),
    addClubEvent:event=>{requirePostAccess();if(!isClubMember)throw new Error('Only registered club email accounts can publish events.');upd(d=>{d.clubEvents.unshift({id:rid(),club:user.name,clubEmail:user.email,comments:[],joins:[],...event});return d})},
    addEventComment:(id,text)=>upd(d=>{const e=pick(d.clubEvents,id);if(e)e.comments.push({id:rid(),by:me,text,t:Date.now()});return d}),
    joinClubEvent:(id,details)=>upd(d=>{const e=pick(d.clubEvents,id);if(e&&!e.joins.some(x=>x.uid===me))e.joins.push({uid:me,...details,t:Date.now()});return d}),
    addLostFound:item=>{requirePostAccess();upd(d=>{d.lostFound??=[];d.lostFound.unshift({id:rid(),by:me,created:Date.now(),claimed:false,claimRequests:[],...item});return d})},
    deleteLostFound:id=>upd(d=>{const index=d.lostFound.findIndex(item=>item.id===id),item=d.lostFound[index];if(!item)return d;if(item.by!==me&&!user?.email?.endsWith('@uninest.example'))throw new Error('You can only delete your own Lost & Found post.');d.lostFound.splice(index,1);return d}),
    requestLostFoundClaim:id=>upd(d=>{d.lostFound??=[];const item=pick(d.lostFound,id);if(!item||item.by===me||item.type!=='found')throw new Error('Only another student can claim a found item.');if(!item.claimRequests)item.claimRequests=[];if(!item.claimRequests.some(x=>x.uid===me))item.claimRequests.push({uid:me,t:Date.now()});return d}),
    claimLostFound:id=>upd(d=>{d.lostFound??=[];const item=pick(d.lostFound,id);if(!item||item.by!==me)throw new Error('Only the person who found this item can mark it claimed.');if(!item.claimRequests?.length)throw new Error('Wait for the person who lost this item to submit a claim first.');item.claimed=true;item.claimedAt=Date.now();return d}),
    shared:p=>p.interests.filter(i=>user?.interests?.includes(i))}
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>}
export const useSocial=()=>useContext(Ctx)
