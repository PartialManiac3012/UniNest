import {createContext,useContext,useEffect,useState} from 'react'
import {useAuth} from './auth.jsx'
import {isStudentEmail} from './auth.jsx'
import {supabase} from './lib/supabase.js'
// Frontend-only social store (localStorage). Sample students are seeded so the app is not empty.
const K='uninest.social',H=36e5,CLAIM_RETENTION=7*24*H,rid=()=>Math.random().toString(36).slice(2,9)
const P=(uid,name,college,year,bio,interests,skills,verified=false)=>({uid,name,college,year,bio,interests,skills,verified,sample:true})
const SEED=[
 P('aditi.v','Aditi Verma','North Quad Institute','3rd year','Leading the AI club. Always up for a hackathon.',['AI/ML','Hackathons','Open source'],'Python, PyTorch, OpenCV'),
 P('kartik.s','Kartik Sharma','North Quad Institute','3rd year','Backend dev. Looking for a capstone team.',['Web dev','Startups','Open source'],'Go, Docker, FastAPI'),
 P('sneha.p','Sneha Patel','Lakeside College','1st year','Data science newbie, big on study groups.',['Data science','Research','Music'],'Python, SQL, Statistics'),
 P('ananya.s','Ananya Singh','Lakeside College','2nd year','Designer who also codes a little React.',['Design','Web dev','Photography'],'Figma, UI/UX, React',true),
 P('rohan.m','Rohan Mehra','North Quad Institute','3rd year','Hardware tinkerer. IoT and embedded.',['Robotics','Hackathons','Gaming'],'Embedded C, Verilog, IoT'),
 P('priyanshu.d','Priyanshu Das','Lakeside College','1st year','NLP and LLM projects. Need a frontend teammate.',['AI/ML','Hackathons','Startups'],'PyTorch, NLP, Next.js')]
const seed=()=>({
 posts:[
  {id:'p1',by:'aditi.v',text:'Anyone want to build a campus copilot for the next hackathon? I have the ML side covered.',tag:'Hackathons',t:Date.now()-2*H,likes:['rohan.m'],comments:[{by:'priyanshu.d',text:'I am in. I can handle NLP.',t:Date.now()-H}]},
  {id:'p2',by:'ananya.s',text:'Shared my Figma starter kit for student projects. Happy to review your landing pages.',tag:'Design',t:Date.now()-5*H,likes:['kartik.s','sneha.p'],comments:[]},
  {id:'p3',by:'sneha.p',text:'Starting a weekly stats study group on Thursdays. Beginners welcome.',tag:'Data science',t:Date.now()-26*H,likes:[],comments:[]}],
 teams:[
  {id:'t1',by:'priyanshu.d',title:'Need a frontend dev for an LLM study-helper',event:'Hackathon',need:['React','Next.js','UI/UX'],desc:'We have the model side. Looking for someone to build the interface. 36 hours, free pizza.',spots:2,joins:[]},
  {id:'t2',by:'rohan.m',title:'IoT squad for smart campus track',event:'Hackathon',need:['Embedded C','Python','Mechanical'],desc:'Building a sensor network for hostel energy use. Hardware provided.',spots:3,joins:[]},
  {id:'t3',by:'sneha.p',title:'Thursday stats study group',event:'Study group',need:['Statistics'],desc:'Working through problem sets together. All levels.',spots:6,joins:[]}],
 conn:{},msgs:[],clubEvents:[
  {id:'ce1',club:'Coding & Open Source Society',clubEmail:'club@uninest.example',title:'Open Source Sprint Night',description:'Build, review, and ship a contribution with mentors from the campus OSS community.',date:'2026-10-24',time:'18:00',venue:'Innovation Hall',comments:[],joins:[]},
  {id:'ce2',club:'AI Research Circle',clubEmail:'ai.club@uninest.example',title:'Responsible AI Research Talk',description:'A practical discussion on evaluation, safety, and reproducible student research.',date:'2026-11-02',time:'16:30',venue:'Seminar Room 2',comments:[],joins:[]}
],lostFound:[],commentReports:[]})
const Ctx=createContext(null)
export function SocialProvider({children}){
  const {user}=useAuth(),me=user?.uid
  const [db,setDb]=useState(()=>{try{return JSON.parse(localStorage.getItem(K))||seed()}catch{return seed()}})
  const [canPost,setCanPost]=useState(false)
  useEffect(()=>{localStorage.setItem(K,JSON.stringify(db))},[db])
  useEffect(()=>{setDb(d=>{const items=d.lostFound||[],active=items.filter(item=>!item.claimed||!item.claimedAt||Date.now()-item.claimedAt<CLAIM_RETENTION);return active.length===items.length?d:{...d,lostFound:active}})},[])
  useEffect(()=>{
    let active=true
    async function loadPostingPermission(){
      if(!user){setCanPost(false);return}
      if(!supabase){setCanPost(isStudentEmail(user.email));return}
      const {data,error}=await supabase.rpc('is_verified_student')
      if(active)setCanPost(!error&&data===true)
    }
    loadPostingPermission()
    return()=>{active=false}
  },[user])
  const upd=fn=>setDb(d=>fn(structuredClone(d)))
  let reg=[];try{reg=(JSON.parse(localStorage.getItem('uninest.users'))||[]).map(({hash,...u})=>u)}catch{}
  const people=[...SEED,...reg].map(p=>({...p,verified:p.verified||isStudentEmail(p.email||'')})),pick=(a,id)=>a.find(x=>x.id===id)
  const clubEmails=['club@uninest.example','ai.club@uninest.example']
  const isClubMember=!!user&&clubEmails.includes(user.email)
  const requirePostAccess=()=>{if(!canPost)throw new Error('Verify your student account before creating posts. You can still comment and interact with other users.')}
  const api={me,people,person:u=>people.find(p=>p.uid===u),posts:db.posts,teams:db.teams,conns:db.conn[me]||[],clubEvents:db.clubEvents||[],lostFound:db.lostFound||[],commentReports:db.commentReports||[],isClubMember,canPost,
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
    toggleConnect:u=>upd(d=>{const c=d.conn[me]||[];d.conn[me]=c.includes(u)?c.filter(x=>x!==u):[...c,u];return d}),
    thread:o=>db.msgs.filter(m=>(m.a===me&&m.b===o)||(m.a===o&&m.b===me)),
    partners:()=>[...new Set([...(db.conn[me]||[]),...db.msgs.flatMap(m=>m.a===me?[m.b]:m.b===me?[m.a]:[])])],
    send:(o,text)=>upd(d=>{d.msgs.push({id:rid(),a:me,b:o,text,t:Date.now()});return d}),
    addClubEvent:event=>{requirePostAccess();if(!isClubMember)throw new Error('Only registered club email accounts can publish events.');upd(d=>{d.clubEvents.unshift({id:rid(),club:user.name,clubEmail:user.email,comments:[],joins:[],...event});return d})},
    addEventComment:(id,text)=>upd(d=>{const e=pick(d.clubEvents,id);if(e)e.comments.push({id:rid(),by:me,text,t:Date.now()});return d}),
    joinClubEvent:(id,details)=>upd(d=>{const e=pick(d.clubEvents,id);if(e&&!e.joins.some(x=>x.uid===me))e.joins.push({uid:me,...details,t:Date.now()});return d}),
    addLostFound:item=>{requirePostAccess();upd(d=>{d.lostFound??=[];d.lostFound.unshift({id:rid(),by:me,created:Date.now(),claimed:false,claimRequests:[],...item});return d})},
    requestLostFoundClaim:id=>upd(d=>{d.lostFound??=[];const item=pick(d.lostFound,id);if(!item||item.by===me||item.type!=='found')throw new Error('Only another student can claim a found item.');if(!item.claimRequests)item.claimRequests=[];if(!item.claimRequests.some(x=>x.uid===me))item.claimRequests.push({uid:me,t:Date.now()});return d}),
    claimLostFound:id=>upd(d=>{d.lostFound??=[];const item=pick(d.lostFound,id);if(!item||item.by!==me)throw new Error('Only the person who found this item can mark it claimed.');if(!item.claimRequests?.length)throw new Error('Wait for the person who lost this item to submit a claim first.');item.claimed=true;item.claimedAt=Date.now();return d}),
    shared:p=>p.interests.filter(i=>user?.interests?.includes(i))}
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>}
export const useSocial=()=>useContext(Ctx)
