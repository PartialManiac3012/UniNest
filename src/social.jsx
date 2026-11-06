import {createContext,useContext,useEffect,useState} from 'react'
import {useAuth,isVerifiedEmail} from './auth.jsx'
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import {db,isFirebaseConfigured} from './lib/firebase.js'

// Frontend social store (localStorage fallback/cache). Sample students are seeded so the app is not empty.
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
  const [dbState,setDbState]=useState(()=>{try{return cleanSampleData(JSON.parse(localStorage.getItem(K))||emptyDb())}catch{return emptyDb()}})
  const [canPost,setCanPost]=useState(false)
  const [postingPermissionError,setPostingPermissionError]=useState('')
  const [remotePeople,setRemotePeople]=useState([])
  const [remotePosts,setRemotePosts]=useState([])
  const [remoteLostFound,setRemoteLostFound]=useState([])
  const [remoteProfilesLoaded,setRemoteProfilesLoaded]=useState(!db)
  const [messageNotifications,setMessageNotifications]=useState([])
  const [remoteRequests,setRemoteRequests]=useState([])
  const [pendingRemoteRequests,setPendingRemoteRequests]=useState(()=>new Set())
  const [notificationError,setNotificationError]=useState('')
  const [notificationRevision,setNotificationRevision]=useState(0)
  const [notificationRetry,setNotificationRetry]=useState(0)

  useEffect(()=>{try{localStorage.setItem(K,JSON.stringify(dbState))}catch(e){console.warn('LocalStorage quota exceeded, skipped:',e)}},[dbState])
  useEffect(()=>{
    setDbState(d=>{
      const items=d.lostFound||[],active=items.filter(item=>!item.claimed||!item.claimedAt||Date.now()-item.claimedAt<CLAIM_RETENTION)
      return active.length===items.length?d:{...d,lostFound:active}
    })
  },[])

  // Listen to remote posts
  useEffect(()=>{
    if(!db||!user?.authId){setRemotePosts([]);return}
    let active=true
    const q=query(collection(db,'posts'),orderBy('created_at','desc'))
    const unsubscribe=onSnapshot(q,snapshot=>{
      if(!active)return
      const posts=snapshot.docs.map(docSnap=>{
        const post=docSnap.data()
        return {
          ...post,
          id:docSnap.id,
          by:post.by_uid||remotePeople.find(person=>person.authId===post.author_id)?.uid,
          text:post.text||post.content||'',
          tag:post.tag||'General',
          t:post.created_at ? (typeof post.created_at==='number' ? post.created_at : new Date(post.created_at).getTime()) : Date.now(),
          likes:post.likes||[],
          comments:post.comments||[],
          pinned:!!post.pinned
        }
      })
      setRemotePosts(posts)
    },error=>{
      if(active)setNotificationError(`Could not load shared posts: ${notificationFailure(error)}`)
    })
    return()=>{active=false;unsubscribe()}
  },[user?.authId,remotePeople])

  // Listen to remote Lost & Found
  useEffect(()=>{
    if(!db||!user?.authId){setRemoteLostFound([]);return}
    let active=true
    const q=query(collection(db,'lost_found'),orderBy('created_at','desc'))
    const unsubscribe=onSnapshot(q,snapshot=>{
      if(!active)return
      const items=snapshot.docs.map(docSnap=>{
        const item=docSnap.data()
        return {
          ...item,
          id:docSnap.id,
          by:item.by_uid,
          created:item.created_at ? (typeof item.created_at==='number' ? item.created_at : new Date(item.created_at).getTime()) : Date.now(),
          claimRequests:item.claim_requests||[]
        }
      })
      setRemoteLostFound(items)
    },error=>{
      if(active)setNotificationError(`Could not load Lost & Found posts: ${notificationFailure(error)}`)
    })
    return()=>{active=false;unsubscribe()}
  },[user?.authId])

  const loadPostingPermission=async()=>{
    if(!user){setCanPost(false);setPostingPermissionError('');return false}
    setCanPost(true)
    setPostingPermissionError('')
    return true
  }

  useEffect(()=>{loadPostingPermission()},[user])

  // Listen to remote connection requests
  useEffect(()=>{
    if(!db||!user?.authId){setRemoteRequests([]);return}
    let active=true
    const q=query(collection(db,'connection_requests'),where('participants','array-contains',user.authId))
    const unsubscribe=onSnapshot(q,snapshot=>{
      if(!active)return
      const data=snapshot.docs.map(d=>({id:d.id,...d.data()}))
      setRemoteRequests(data)
      setNotificationError('')
      setNotificationRevision(val=>val+1)
    },error=>{
      if(active)setNotificationError(notificationFailure(error))
    })
    return()=>{active=false;unsubscribe()}
  },[user?.authId,notificationRetry])

  // Listen to message notifications
  useEffect(()=>{
    if(!db||!user?.authId){setMessageNotifications([]);return}
    let active=true
    const key=`uninest.notifications.read.${user.authId}`
    const since=Number(localStorage.getItem(key)||0)
    const sinceIso=new Date(since).toISOString()

    const q=query(collection(db,'messages'),where('recipient_id','==',user.authId))
    const unsubscribe=onSnapshot(q,snapshot=>{
      if(!active)return
      const unread=snapshot.docs
        .map(d=>({id:d.id,...d.data()}))
        .filter(m=>m.created_at&&m.created_at>sinceIso)
        .sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())
        .slice(0,30)
        .map(m=>{
          const person=remotePeople.find(p=>p.authId===m.sender_id)
          return {
            id:`message-${m.id}`,
            type:'message',
            from:person?.uid||m.sender_id,
            t:m.created_at,
            person
          }
        })
      setMessageNotifications(unread)
      setNotificationRevision(val=>val+1)
    },error=>{
      if(active)setNotificationError(notificationFailure(error))
    })
    return()=>{active=false;unsubscribe()}
  },[user?.authId,remotePeople,notificationRetry])

  // Listen to all profiles in Firestore
  useEffect(()=>{
    if(!db){setRemoteProfilesLoaded(true);return}
    let active=true
    const unsubscribe=onSnapshot(collection(db,'profiles'),snapshot=>{
      if(!active)return
      const profiles=snapshot.docs.map(docSnap=>{
        const data=docSnap.data()
        return {...data,authId:docSnap.id,verified:isVerifiedEmail(data.email)}
      })
      setRemotePeople(profiles)
      setRemoteProfilesLoaded(true)
    },error=>{
      if(active){
        console.warn('Could not load remote profiles:',error)
        setRemoteProfilesLoaded(true)
      }
    })
    return()=>{active=false;unsubscribe()}
  },[])

  const upd=fn=>setDbState(d=>fn(structuredClone(d)))
  let reg=[];try{reg=(JSON.parse(localStorage.getItem('uninest.users'))||[]).map(({hash,...u})=>u)}catch{}
  const localPeople=reg.filter(p=>!SAMPLE_USERS.has(p.uid)&&(!db||!remoteProfilesLoaded||remotePeople.some(remote=>remote.uid===p.uid))).map(p=>({...p,verified:p.verified||isVerifiedEmail(p.email||'')}))
  const people=[user,...remotePeople,...localPeople].filter(Boolean).reduce((all,p)=>all.some(x=>x.uid===p.uid)?all:[...all,p],[])
  const remoteConnections=new Set(remoteRequests.filter(r=>r.status==='accepted').map(r=>{
    const otherId=r.sender_id===user?.authId?r.recipient_id:r.sender_id
    return people.find(p=>p.authId===otherId)?.uid
  }).filter(Boolean))
  const connections=[...new Set([...(dbState.conn[me]||[]),...remoteConnections])]
  const posts=[...remotePosts,...dbState.posts].reduce((all,post)=>all.some(item=>item.id===post.id)?all:[...all,post],[])
  const lostFound=[...remoteLostFound,...(dbState.lostFound||[])].reduce((all,item)=>all.some(existing=>existing.id===item.id)?all:[...all,item],[])
  const claimContacts=u=>lostFound.some(item=>(item.by===me&&item.claimRequests?.some(request=>request.uid===u))||(item.by===u&&item.claimRequests?.some(request=>request.uid===me)))
  const pick=(a,id)=>a.find(x=>x.id===id)
  const clubEmails=['club@uninest.example','ai.club@uninest.example']
  const isClubMember=!!user&&clubEmails.includes(user.email)
  const requirePostAccess=()=>{if(!user)throw new Error('Please log in before creating posts.')}

  const api={
    me,
    people,
    person:u=>people.find(p=>p.uid===u),
    posts,
    teams:dbState.teams,
    conns:connections,
    lostFound,
    canMessage:u=>connections.includes(u)||claimContacts(u),
    clubEvents:dbState.clubEvents||[],
    commentReports:dbState.commentReports||[],
    isClubMember,
    canPost,
    postingPermissionError,
    refreshPostingPermission:loadPostingPermission,
    addPost:async(text,tag)=>{
      requirePostAccess()
      if(!me)throw new Error('Your profile is still loading. Please try again.')
      const post={id:remoteId(),by:me,text,tag,t:Date.now(),likes:[],comments:[],pinned:false}
      if(db){
        if(!user?.authId)throw new Error('Your Firebase session is still loading. Please try again.')
        const payload={
          id:post.id,
          by_uid:me,
          author_id:user.authId,
          text,
          content:text,
          tag,
          likes:[],
          comments:[],
          pinned:false,
          created_at:new Date().toISOString()
        }
        await setDoc(doc(db,'posts',post.id),payload)
      }
      upd(d=>{d.posts.unshift(post);return d})
    },
    editPost:async(id,text,tag)=>{
      const post=posts.find(item=>item.id===id)
      if(!post||post.by!==me)throw new Error('You can only edit your own post.')
      const nextText=text.trim()
      if(db){
        await updateDoc(doc(db,'posts',id),{
          text:nextText,
          content:nextText,
          tag,
          updated_at:new Date().toISOString()
        })
        setRemotePosts(current=>current.map(item=>item.id===id?{...item,text:nextText,content:nextText,tag}:item))
      }
      upd(d=>{const p=pick(d.posts,id);if(p){p.text=nextText;p.tag=tag}return d})
    },
    deletePost:async id=>{
      const post=posts.find(item=>item.id===id)
      if(!post||post.by!==me)throw new Error('You can only delete your own post.')
      if(db){
        await deleteDoc(doc(db,'posts',id))
      }
      setRemotePosts(current=>current.filter(item=>item.id!==id))
      upd(d=>({...d,posts:d.posts.filter(p=>p.id!==id)}))
    },
    toggleLike:async id=>{
      const post=posts.find(item=>item.id===id)
      if(!post)return
      const likes=post.likes.includes(me)?post.likes.filter(x=>x!==me):[...post.likes,me]
      if(db){
        await updateDoc(doc(db,'posts',id),{likes})
        setRemotePosts(current=>current.map(item=>item.id===id?{...item,likes}:item))
      }
      upd(d=>{const p=pick(d.posts,id);if(p)p.likes=likes;return d})
    },
    addComment:async(id,text)=>{
      const post=posts.find(item=>item.id===id)
      if(!post)throw new Error('This post is no longer available.')
      const comment={id:rid(),by:me,text,t:Date.now()}
      const comments=[...(post.comments||[]),comment]
      if(db){
        await updateDoc(doc(db,'posts',id),{comments})
        setRemotePosts(current=>current.map(item=>item.id===id?{...item,comments}:item))
      }
      upd(d=>{const p=pick(d.posts,id);if(p)p.comments.push(comment);return d})
    },
    deleteComment:async(surface,itemId,commentId)=>{
      const list=surface==='post'?posts:dbState.clubEvents
      const item=pick(list,itemId)
      if(!item)return
      const index=item.comments.findIndex((c,i)=>(c.id||`${itemId}-${i}`)===commentId),comment=item.comments[index]
      if(!comment||comment.by!==me)throw new Error('You can only delete your own comment.')
      const comments=item.comments.filter((_,i)=>i!==index)
      if(db&&surface==='post'){
        await updateDoc(doc(db,'posts',itemId),{comments})
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
      if(db&&user?.authId&&target?.authId){
        setPendingRemoteRequests(current=>new Set(current).add(u))
        try{
          const docId=`${user.authId}_${target.authId}`
          await setDoc(doc(db,'connection_requests',docId),{
            id:docId,
            sender_id:user.authId,
            recipient_id:target.authId,
            participants:[user.authId,target.authId],
            status:'pending',
            created_at:new Date().toISOString()
          },{merge:true})
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
      })
    },
    disconnect:async u=>{
      const target=people.find(p=>p.uid===u)
      if(db&&user?.authId&&target?.authId){
        const request=remoteRequests.find(r=>(r.status==='accepted'||(
          r.status==='pending'&&r.sender_id===user.authId
        ))&&(
          (r.sender_id===user.authId&&r.recipient_id===target.authId)||
          (r.sender_id===target.authId&&r.recipient_id===user.authId)
        ))
        if(request){
          await deleteDoc(doc(db,'connection_requests',request.id))
          setRemoteRequests(current=>current.filter(item=>item.id!==request.id))
        }
        setPendingRemoteRequests(current=>{
          const next=new Set(current)
          next.delete(u)
          return next
        })
        return
      }
      upd(d=>{
        d.conn[me]=(d.conn[me]||[]).filter(id=>id!==u)
        d.conn[u]=(d.conn[u]||[]).filter(id=>id!==me)
        d.requests=(d.requests||[]).filter(request=>!(
          (request.from===me&&request.to===u&&request.status==='pending')||
          (request.from===u&&request.to===me&&request.status==='pending')
        ))
        return d
      })
    },
    respondConnection:async(id,accept)=>{
      const remote=remoteRequests.find(r=>r.id===id)
      if(remote&&db){
        await updateDoc(doc(db,'connection_requests',id),{status:accept?'accepted':'declined'})
        setRemoteRequests(current=>current.map(request=>request.id===id?{...request,status:accept?'accepted':'declined'}:request))
        return
      }
      upd(d=>{
        const r=d.requests?.find(x=>x.id===id)
        if(!r||r.to!==me)return d
        r.status=accept?'accepted':'declined'
        if(accept){
          d.conn[me]=[...new Set([...(d.conn[me]||[]),r.from])]
          d.conn[r.from]=[...new Set([...(d.conn[r.from]||[]),me])]
        }
        return d
      })
    },
    connectionStatus:u=>{
      if(connections.includes(u))return 'connected'
      if(pendingRemoteRequests.has(u))return 'requested'
      if(remoteRequests.some(r=>r.sender_id===user?.authId&&r.recipient_id===people.find(p=>p.uid===u)?.authId&&r.status==='pending'))return 'requested'
      if(remoteRequests.some(r=>r.sender_id===people.find(p=>p.uid===u)?.authId&&r.recipient_id===user?.authId&&r.status==='pending'))return 'incoming'
      if((dbState.requests||[]).some(r=>r.from===me&&r.to===u&&r.status==='pending'))return 'requested'
      if((dbState.requests||[]).some(r=>r.from===u&&r.to===me&&r.status==='pending'))return 'incoming'
      return 'none'
    },
    notifications:()=>[
      ...(dbState.notifications||[]).filter(n=>n.to===me&&!n.read&&n.type!=='connection').map(n=>({...n,person:people.find(p=>p.uid===n.from)})),
      ...messageNotifications
    ],
    pendingConnectionRequests:()=>[
      ...(dbState.requests||[]).filter(r=>r.to===me&&r.status==='pending').map(r=>({...r,person:people.find(p=>p.uid===r.from)})),
      ...remoteRequests.filter(r=>r.recipient_id===user?.authId&&r.status==='pending').map(r=>({...r,from:people.find(p=>p.authId===r.sender_id)?.uid,person:people.find(p=>p.authId===r.sender_id)}))
    ],
    notificationError,
    notificationRevision,
    retryNotifications:()=>setNotificationRetry(value=>value+1),
    markNotificationsRead:()=>{
      upd(d=>{(d.notifications||[]).filter(n=>n.to===me).forEach(n=>{n.read=true});return d})
      if(user?.authId)localStorage.setItem(`uninest.notifications.read.${user.authId}`,String(Date.now()))
      setMessageNotifications([])
    },
    thread:o=>dbState.msgs.filter(m=>(m.a===me&&m.b===o)||(m.a===o&&m.b===me)),
    partners:()=>[...new Set([...connections,...dbState.msgs.flatMap(m=>m.a===me?[m.b]:m.b===me?[m.a]:[])])],
    send:(o,text)=>upd(d=>{d.msgs.push({id:rid(),a:me,b:o,text,t:Date.now()});return d}),
    addClubEvent:event=>{requirePostAccess();if(!isClubMember)throw new Error('Only registered club email accounts can publish events.');upd(d=>{d.clubEvents.unshift({id:rid(),club:user.name,clubEmail:user.email,comments:[],joins:[],...event});return d})},
    addEventComment:(id,text)=>upd(d=>{const e=pick(d.clubEvents,id);if(e)e.comments.push({id:rid(),by:me,text,t:Date.now()});return d}),
    joinClubEvent:(id,details)=>upd(d=>{const e=pick(d.clubEvents,id);if(e&&!e.joins.some(x=>x.uid===me))e.joins.push({uid:me,...details,t:Date.now()});return d}),
    addLostFound:async item=>{
      requirePostAccess()
      const post={id:remoteId(),by:me,created:Date.now(),claimed:false,claimRequests:[],...item}
      if(db){
        await setDoc(doc(db,'lost_found',post.id),{
          id:post.id,
          by_uid:me,
          type:post.type,
          title:post.title,
          description:post.description,
          location:post.location,
          photo:post.photo||'',
          claimed:false,
          claim_requests:[],
          created_at:new Date().toISOString()
        })
      }
      upd(d=>{d.lostFound??=[];d.lostFound.unshift(post);return d})
    },
    deleteLostFound:async id=>{
      const item=lostFound.find(value=>value.id===id)
      if(!item)return
      if(item.by!==me&&!user?.email?.endsWith('@uninest.example'))throw new Error('You can only delete your own Lost & Found post.')
      if(db){
        await deleteDoc(doc(db,'lost_found',id))
      }
      upd(d=>({...d,lostFound:d.lostFound.filter(value=>value.id!==id)}))
    },
    requestLostFoundClaim:async id=>{
      const item=lostFound.find(value=>value.id===id)
      if(!item||item.by===me||item.type!=='found')throw new Error('Only another student can claim a found item.')
      if(item.claimRequests?.some(request=>request.uid===me))return item.by
      const requests=[...(item.claimRequests||[]),{uid:me,t:Date.now()}]
      if(db){
        await updateDoc(doc(db,'lost_found',id),{claim_requests:requests})
      }
      upd(d=>{const local=pick(d.lostFound,id);if(local)local.claimRequests=requests;return d})
      return item.by
    },
    claimLostFound:async id=>{
      const item=lostFound.find(value=>value.id===id)
      if(!item||item.by!==me)throw new Error('Only the person who found this item can mark it claimed.')
      if(!item.claimRequests?.length)throw new Error('Wait for the person who lost this item to submit a claim first.')
      const claimedAt=Date.now()
      if(db){
        await updateDoc(doc(db,'lost_found',id),{
          claimed:true,
          claimed_at:new Date(claimedAt).toISOString()
        })
      }
      upd(d=>{const local=pick(d.lostFound,id);if(local){local.claimed=true;local.claimedAt=claimedAt}return d})
    },
    shared:p=>p.interests.filter(i=>user?.interests?.includes(i))
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useSocial=()=>useContext(Ctx)
