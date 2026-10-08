import {createContext,useContext,useEffect,useState} from 'react'
import {useAuth} from './auth.jsx'
import {isVerifiedEmail} from './auth.jsx'
import {supabase} from './lib/supabase.js'
// Frontend-only social store (localStorage). Sample students are seeded so the app is not empty.
const K='uninest.social',H=36e5,CLAIM_RETENTION=7*24*H,rid=()=>Math.random().toString(36).slice(2,9),remoteId=()=>crypto.randomUUID()
const SAMPLE_IDS=new Set(['p1','p2','p3','t1','t2','t3','ce1','ce2'])
const SAMPLE_USERS=new Set(['aditi.v','kartik.s','sneha.p','ananya.s','rohan.m','priyanshu.d'])
const emptyDb=()=>({posts:[],teams:[],conn:{},requests:[],notifications:[],msgs:[],clubEvents:[],lostFound:[],commentReports:[]})
const notificationFailure=error=>{
  const message=error?.message||''
  return message.toLowerCase().includes('failed to fetch')
    ? 'Notifications are temporarily unavailable. Check your connection and try again.'
    : message||'Could not load notifications. Please try again.'
}
const cleanSampleData=db=>({
  ...emptyDb(),
  ...db,
  posts:(db.posts||[]).filter(item=>item&&item.id&&item.by&&item.text),
  lostFound:(db.lostFound||[]).filter(item=>item&&item.id&&item.by&&item.title),
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
  const [remotePosts,setRemotePosts]=useState([])
  const [remoteLostFound,setRemoteLostFound]=useState([])
  const [remoteProfilesLoaded,setRemoteProfilesLoaded]=useState(!supabase)
  const [messageNotifications,setMessageNotifications]=useState([])
  const [remoteRequests,setRemoteRequests]=useState([])
  const [pendingRemoteRequests,setPendingRemoteRequests]=useState(()=>new Set())
  const [notificationError,setNotificationError]=useState('')
  const [notificationRevision,setNotificationRevision]=useState(0)
  const [notificationRetry,setNotificationRetry]=useState(0)
  useEffect(()=>{localStorage.setItem(K,JSON.stringify(db))},[db])
  useEffect(()=>{setDb(d=>{const items=d.lostFound||[],active=items.filter(item=>!item.claimed||!item.claimedAt||Date.now()-item.claimedAt<CLAIM_RETENTION);return active.length===items.length?d:{...d,lostFound:active}})},[])
  useEffect(()=>{
    if(!supabase||!user?.authId){setRemotePosts([]);return}
    let active=true
    const load=async()=>{
      const {data,error}=await supabase.from('posts').select('*').order('created_at',{ascending:false})
      if(!active)return
      if(error){setNotificationError(`Could not load shared posts: ${notificationFailure(error)}`);return}
      setRemotePosts((data||[]).map(post=>({
        ...post,id:post.id,by:post.by_uid||remotePeople.find(person=>person.authId===post.author_id)?.uid,text:post.text||post.content,tag:post.tag,t:new Date(post.created_at).getTime(),
        likes:post.likes||[],comments:post.comments||[],pinned:!!post.pinned
      })))
    }
    load()
    const channel=supabase.channel(`posts:${user.authId}`).on('postgres_changes',{event:'*',schema:'public',table:'posts'},load).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId,remotePeople])
  useEffect(()=>{
    if(!supabase||!user?.authId){setRemoteLostFound([]);return}
    let active=true
    const load=async()=>{
      const {data,error}=await supabase.from('lost_found').select('*').order('created_at',{ascending:false})
      if(!active)return
      if(error){setNotificationError(`Could not load Lost & Found posts: ${notificationFailure(error)}`);return}
      setRemoteLostFound((data||[]).map(item=>({
        ...item,id:item.id,by:item.by_uid,created:new Date(item.created_at).getTime(),
        claimRequests:item.claim_requests||[]
      })))
    }
    load()
    const channel=supabase.channel(`lost-found:${user.authId}`).on('postgres_changes',{event:'*',schema:'public',table:'lost_found'},load).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId])
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
        if(error)setNotificationError(notificationFailure(error))
        else {setRemoteRequests(data||[]);setNotificationError('');setNotificationRevision(value=>value+1)}
      }
    }
    load().catch(error=>{if(active)setNotificationError(notificationFailure(error))})
    const channel=supabase.channel(`connection-requests:${user.authId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'connection_requests'},payload=>{
        if(payload.new?.sender_id===user.authId||payload.new?.recipient_id===user.authId)load()
      }).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId,notificationRetry])
  useEffect(()=>{
    if(!supabase||!user?.authId){setMessageNotifications([]);return}
    let active=true
    const key=`uninest.notifications.read.${user.authId}`
    const load=async()=>{
      const since=Number(localStorage.getItem(key)||0)
      const {data,error}=await supabase.from('messages').select('id,sender_id,created_at').eq('recipient_id',user.authId).gt('created_at',new Date(since).toISOString()).order('created_at',{ascending:false}).limit(30)
      if(active){
        if(error)setNotificationError(notificationFailure(error))
        else {setMessageNotifications((data||[]).map(m=>{const person=remotePeople.find(p=>p.authId===m.sender_id);return {id:`message-${m.id}`,type:'message',from:person?.uid||m.sender_id,t:m.created_at,person}}));setNotificationRevision(value=>value+1)}
      }
    }
    load().catch(error=>{if(active)setNotificationError(notificationFailure(error))})
    const channel=supabase.channel(`notifications:${user.authId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`recipient_id=eq.${user.authId}`},payload=>{
      if(active){const person=remotePeople.find(p=>p.authId===payload.new.sender_id);setMessageNotifications(current=>current.some(n=>n.id===`message-${payload.new.id}`)?current:[{id:`message-${payload.new.id}`,type:'message',from:person?.uid||payload.new.sender_id,t:payload.new.created_at,person},...current]);setNotificationRevision(value=>value+1)}
    }).subscribe()
    return()=>{active=false;supabase.removeChannel(channel)}
  },[user?.authId,remotePeople,notificationRetry])
  useEffect(()=>{
    if(!supabase){setRemoteProfilesLoaded(true);return}
    let active=true
    supabase.from('profiles').select('*').then(({data,error})=>{
      if(!active)return
      if(!error&&data){
        const profiles=data.map(p=>({...p,authId:p.id,verified:isVerifiedEmail(p.email)}))
        setRemotePeople(profiles)
      }
      setRemoteProfilesLoaded(true)
    })
    return()=>{active=false}
  },[])
  const upd=fn=>setDb(d=>fn(structuredClone(d)))
  let reg=[];try{reg=(JSON.parse(localStorage.getItem('uninest.users'))||[]).map(({hash,...u})=>u)}catch{}
  const localPeople=reg.filter(p=>!SAMPLE_USERS.has(p.uid)&&(!supabase||!remoteProfilesLoaded||remotePeople.some(remote=>remote.uid===p.uid))).map(p=>({...p,verified:p.verified||isVerifiedEmail(p.email||'')}))
  const people=[user,...remotePeople,...localPeople].filter(Boolean).reduce((all,p)=>all.some(x=>x.uid===p.uid)?all:[...all,p],[])
  const remoteConnections=new Set(remoteRequests.filter(r=>r.status==='accepted').map(r=>{
    const otherId=r.sender_id===user?.authId?r.recipient_id:r.sender_id
    return people.find(p=>p.authId===otherId)?.uid
  }).filter(Boolean))
  const connections=[...new Set([...(db.conn[me]||[]),...remoteConnections])]
  const posts=[...remotePosts,...db.posts].reduce((all,post)=>all.some(item=>item.id===post.id)?all:[...all,post],[])
  const lostFound=[...remoteLostFound,...(db.lostFound||[])].reduce((all,item)=>all.some(existing=>existing.id===item.id)?all:[...all,item],[])
  const claimContacts=u=>lostFound.some(item=>(item.by===me&&item.claimRequests?.some(request=>request.uid===u))||(item.by===u&&item.claimRequests?.some(request=>request.uid===me)))
  const pick=(a,id)=>a.find(x=>x.id===id)
  const clubEmails=['club@uninest.example','ai.club@uninest.example']
  const isClubMember=!!user&&clubEmails.includes(user.email)
  const requirePostAccess=()=>{if(!canPost)throw new Error('Verify your student account before creating posts. You can still comment and interact with other users.')}
  const api={me,people,person:u=>people.find(p=>p.uid===u),posts,teams:db.teams,conns:connections,lostFound,canMessage:u=>connections.includes(u)||claimContacts(u),clubEvents:db.clubEvents||[],commentReports:db.commentReports||[],isClubMember,canPost,postingPermissionError,refreshPostingPermission:loadPostingPermission,
    addPost:async(text,tag)=>{
      requirePostAccess()
      if(!me)throw new Error('Your profile is still loading. Please try again.')
      const post={id:remoteId(),by:me,text,tag,t:Date.now(),likes:[],comments:[],pinned:false}
      if(supabase){
        if(!user?.authId)throw new Error('Your Supabase session is still loading. Please try again.')
        const payload={
          id:post.id,by_uid:me,text,tag,likes:[],comments:[],pinned:false
        }
        let {error}=await supabase.from('posts').insert(payload)
        if(error?.message?.includes('null value in column "author_id"')||error?.message?.includes('null value in column "content"')){
          ({error}=await supabase.from('posts').insert({...payload,author_id:user.authId,content:text}))
        }
        if(error)throw new Error(`Could not publish post: ${error.message}`)
      }
      upd(d=>{d.posts.unshift(post);return d})
    },
    editPost:async(id,text,tag)=>{
      const post=posts.find(item=>item.id===id)
      if(!post||post.by!==me)throw new Error('You can only edit your own post.')
      const nextText=text.trim()
      if(supabase){
        const {error}=await supabase.from('posts').update({text:nextText,content:nextText,tag}).eq('id',id).eq('by_uid',me)
        if(error)throw new Error(`Could not update post: ${error.message}`)
        setRemotePosts(current=>current.map(item=>item.id===id?{...item,text:nextText,content:nextText,tag}:item))
      }
      upd(d=>{const p=pick(d.posts,id);if(p){p.text=nextText;p.tag=tag}return d})
    },
    deletePost:async id=>{
      const post=posts.find(item=>item.id===id)
      if(!post||post.by!==me)throw new Error('You can only delete your own post.')
      if(supabase){
        const {error}=await supabase.from('posts').delete().eq('id',id)
        if(error)throw new Error(`Could not delete post: ${error.message}`)
      }
      setRemotePosts(current=>current.filter(item=>item.id!==id))
      upd(d=>({...d,posts:d.posts.filter(p=>p.id!==id)}))
    },
    pinPost:id=>{const post=posts.find(item=>item.id===id);if(!post||post.by!==me)throw new Error('You can only pin your own post.');const pinned=!post.pinned;upd(d=>{const p=pick(d.posts,id);if(p)p.pinned=pinned;return d});if(supabase)supabase.from('posts').update({pinned}).eq('id',id).eq('by_uid',me)},
    toggleLike:id=>upd(d=>{const p=pick(d.posts,id);if(p)p.likes=p.likes.includes(me)?p.likes.filter(x=>x!==me):[...p.likes,me];return d}),
    addComment:async(id,text)=>{
      const post=posts.find(item=>item.id===id)
      if(!post)throw new Error('This post is no longer available.')
      const comment={id:rid(),by:me,text,t:Date.now()}
      const comments=[...(post.comments||[]),comment]
      if(supabase){
        const {error}=await supabase.rpc('update_post_comments',{p_post_id:id,p_comments:comments})
        if(error)throw new Error(`Could not save reply: ${error.message}`)
        setRemotePosts(current=>current.map(item=>item.id===id?{...item,comments}:item))
      }
      upd(d=>{const p=pick(d.posts,id);if(p)p.comments.push(comment);return d})
    },
    deleteComment:async(surface,itemId,commentId)=>{
      const list=surface==='post'?posts:db.clubEvents
      const item=pick(list,itemId)
      if(!item)return
      const index=item.comments.findIndex((c,i)=>(c.id||`${itemId}-${i}`)===commentId),comment=item.comments[index]
      if(!comment||comment.by!==me)throw new Error('You can only delete your own comment.')
      const comments=item.comments.filter((_,i)=>i!==index)
      if(supabase&&surface==='post'){
        const {error}=await supabase.rpc('update_post_comments',{p_post_id:itemId,p_comments:comments})
        if(error)throw new Error(`Could not delete reply: ${error.message}`)
        setRemotePosts(current=>current.map(post=>post.id===itemId?{...post,comments}:post))
      }
      upd(d=>{const local=pick(surface==='post'?d.posts:d.clubEvents,itemId);if(local)local.comments=comments;return d})
    },
    adminDeleteComment:(surface,itemId,commentId)=>upd(d=>{const list=surface==='post'?d.posts:d.clubEvents;const item=pick(list,itemId);if(!item)return d;const index=item.comments.findIndex((c,i)=>(c.id||`${itemId}-${i}`)===commentId);if(index>=0)item.comments.splice(index,1);d.commentReports=(d.commentReports||[]).filter(r=>!(r.surface===surface&&r.itemId===itemId&&r.commentId===commentId));return d}),
    reportComment:(surface,itemId,commentId)=>upd(d=>{d.commentReports??=[];if(!d.commentReports.some(r=>r.surface===surface&&r.itemId===itemId&&r.commentId===commentId&&r.by===me))d.commentReports.push({id:rid(),surface,itemId,commentId,by:me,t:Date.now()});return d}),
    addTeam:t=>{requirePostAccess();upd(d=>{d.teams.unshift({id:rid(),by:me,joins:[],...t});return d})},
    toggleJoin:id=>upd(d=>{const t=pick(d.teams,id);t.joins=t.joins.includes(me)?t.joins.filter(x=>x!==me):[...t.joins,me];return d}),
    toggleConnect:async u=>{
      const target=people.find(p=>p.uid===u)
      if(supabase&&user?.authId&&target?.authId){
        setPendingRemoteRequests(current=>new Set(current).add(u))
        try{
          const {error}=await supabase.from('connection_requests').upsert({sender_id:user.authId,recipient_id:target.authId,status:'pending'},{onConflict:'sender_id,recipient_id'})
          if(error)throw new Error(error.message)
          setNotificationError('')
        }catch(error){
          setPendingRemoteRequests(current=>{const next=new Set(current);next.delete(u);return next})
          setNotificationError(error.message)
          throw error
        }
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
      if(remote&&supabase){
        const {error}=await supabase.from('connection_requests').update({status:accept?'accepted':'declined'}).eq('id',id)
        if(error)throw new Error(error.message)
        setRemoteRequests(current=>current.map(request=>request.id===id?{...request,status:accept?'accepted':'declined'}:request))
        return
      }
      upd(d=>{const r=d.requests?.find(x=>x.id===id);if(!r||r.to!==me)return d;r.status=accept?'accepted':'declined';if(accept){d.conn[me]=[...new Set([...(d.conn[me]||[]),r.from])];d.conn[r.from]=[...new Set([...(d.conn[r.from]||[]),me])]};return d})
    },
    connectionStatus:u=>{
      if(connections.includes(u))return 'connected'
      if(pendingRemoteRequests.has(u))return 'requested'
      if(remoteRequests.some(r=>r.sender_id===user?.authId&&r.recipient_id===people.find(p=>p.uid===u)?.authId&&r.status==='pending'))return 'requested'
      if(remoteRequests.some(r=>r.sender_id===people.find(p=>p.uid===u)?.authId&&r.recipient_id===user?.authId&&r.status==='pending'))return 'incoming'
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
    notificationError,notificationRevision,retryNotifications:()=>setNotificationRetry(value=>value+1),
    markNotificationsRead:()=>{upd(d=>{(d.notifications||[]).filter(n=>n.to===me).forEach(n=>{n.read=true});return d});if(user?.authId)localStorage.setItem(`uninest.notifications.read.${user.authId}`,String(Date.now()));setMessageNotifications([])},
    thread:o=>db.msgs.filter(m=>(m.a===me&&m.b===o)||(m.a===o&&m.b===me)),
    partners:()=>[...new Set([...connections,...db.msgs.flatMap(m=>m.a===me?[m.b]:m.b===me?[m.a]:[])])],
    send:(o,text)=>upd(d=>{d.msgs.push({id:rid(),a:me,b:o,text,t:Date.now()});return d}),
    addClubEvent:event=>{requirePostAccess();if(!isClubMember)throw new Error('Only registered club email accounts can publish events.');upd(d=>{d.clubEvents.unshift({id:rid(),club:user.name,clubEmail:user.email,comments:[],joins:[],...event});return d})},
    addEventComment:(id,text)=>upd(d=>{const e=pick(d.clubEvents,id);if(e)e.comments.push({id:rid(),by:me,text,t:Date.now()});return d}),
    joinClubEvent:(id,details)=>upd(d=>{const e=pick(d.clubEvents,id);if(e&&!e.joins.some(x=>x.uid===me))e.joins.push({uid:me,...details,t:Date.now()});return d}),
    addLostFound:async item=>{
      requirePostAccess()
      const post={id:remoteId(),by:me,created:Date.now(),claimed:false,claimRequests:[],...item}
      if(supabase){
        const {error}=await supabase.from('lost_found').insert({
          id:post.id,by_uid:me,type:post.type,title:post.title,description:post.description,
          location:post.location,photo:post.photo||'',claimed:false,claim_requests:[]
        })
        if(error)throw new Error(`Could not publish Lost & Found post: ${error.message}`)
      }
      upd(d=>{d.lostFound??=[];d.lostFound.unshift(post);return d})
    },
    deleteLostFound:async id=>{
      const item=lostFound.find(value=>value.id===id)
      if(!item)return
      if(item.by!==me&&!user?.email?.endsWith('@uninest.example'))throw new Error('You can only delete your own Lost & Found post.')
      if(supabase){
        const {error}=await supabase.from('lost_found').delete().eq('id',id).eq('by_uid',me)
        if(error)throw new Error(`Could not delete Lost & Found post: ${error.message}`)
      }
      upd(d=>({...d,lostFound:d.lostFound.filter(value=>value.id!==id)}))
    },
    requestLostFoundClaim:async id=>{
      const item=lostFound.find(value=>value.id===id)
      if(!item||item.by===me||item.type!=='found')throw new Error('Only another student can claim a found item.')
      if(item.claimRequests?.some(request=>request.uid===me))return item.by
      const requests=[...(item.claimRequests||[]),{uid:me,t:Date.now()}]
      if(supabase){
        const {error}=await supabase.from('lost_found').update({claim_requests:requests}).eq('id',id)
        if(error)throw new Error(`Could not send the claim request: ${error.message}`)
      }
      upd(d=>{const local=pick(d.lostFound,id);if(local)local.claimRequests=requests;return d})
      return item.by
    },
    claimLostFound:async id=>{
      const item=lostFound.find(value=>value.id===id)
      if(!item||item.by!==me)throw new Error('Only the person who found this item can mark it claimed.')
      if(!item.claimRequests?.length)throw new Error('Wait for the person who lost this item to submit a claim first.')
      const claimedAt=Date.now()
      if(supabase){
        const {error}=await supabase.from('lost_found').update({claimed:true,claimed_at:new Date(claimedAt).toISOString()}).eq('id',id).eq('by_uid',me)
        if(error)throw new Error(`Could not mark this item as claimed: ${error.message}`)
      }
      upd(d=>{const local=pick(d.lostFound,id);if(local){local.claimed=true;local.claimedAt=claimedAt}return d})
    },
    shared:p=>p.interests.filter(i=>user?.interests?.includes(i))}
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>}
export const useSocial=()=>useContext(Ctx)
