import {createContext,useContext,useEffect,useState} from 'react'
import {useAuth} from './auth.jsx'
// Frontend-only social store (localStorage). Sample students are seeded so the app is not empty.
const K='uninest.social',H=36e5,rid=()=>Math.random().toString(36).slice(2,9)
const P=(uid,name,college,year,bio,interests,skills)=>({uid,name,college,year,bio,interests,skills,sample:true})
const SEED=[
 P('aditi.v','Aditi Verma','North Quad Institute','3rd year','Leading the AI club. Always up for a hackathon.',['AI/ML','Hackathons','Open source'],'Python, PyTorch, OpenCV'),
 P('kartik.s','Kartik Sharma','North Quad Institute','3rd year','Backend dev. Looking for a capstone team.',['Web dev','Startups','Open source'],'Go, Docker, FastAPI'),
 P('sneha.p','Sneha Patel','Lakeside College','1st year','Data science newbie, big on study groups.',['Data science','Research','Music'],'Python, SQL, Statistics'),
 P('ananya.s','Ananya Singh','Lakeside College','2nd year','Designer who also codes a little React.',['Design','Web dev','Photography'],'Figma, UI/UX, React'),
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
 conn:{},msgs:[]})
const Ctx=createContext(null)
export function SocialProvider({children}){
  const {user}=useAuth(),me=user?.uid
  const [db,setDb]=useState(()=>{try{return JSON.parse(localStorage.getItem(K))||seed()}catch{return seed()}})
  useEffect(()=>{localStorage.setItem(K,JSON.stringify(db))},[db])
  const upd=fn=>setDb(d=>fn(structuredClone(d)))
  let reg=[];try{reg=(JSON.parse(localStorage.getItem('uninest.users'))||[]).map(({hash,...u})=>u)}catch{}
  const people=[...SEED,...reg],pick=(a,id)=>a.find(x=>x.id===id)
  const api={me,people,person:u=>people.find(p=>p.uid===u),posts:db.posts,teams:db.teams,conns:db.conn[me]||[],
    addPost:(text,tag)=>upd(d=>{d.posts.unshift({id:rid(),by:me,text,tag,t:Date.now(),likes:[],comments:[]});return d}),
    toggleLike:id=>upd(d=>{const p=pick(d.posts,id);p.likes=p.likes.includes(me)?p.likes.filter(x=>x!==me):[...p.likes,me];return d}),
    addComment:(id,text)=>upd(d=>{pick(d.posts,id).comments.push({by:me,text,t:Date.now()});return d}),
    addTeam:t=>upd(d=>{d.teams.unshift({id:rid(),by:me,joins:[],...t});return d}),
    toggleJoin:id=>upd(d=>{const t=pick(d.teams,id);t.joins=t.joins.includes(me)?t.joins.filter(x=>x!==me):[...t.joins,me];return d}),
    toggleConnect:u=>upd(d=>{const c=d.conn[me]||[];d.conn[me]=c.includes(u)?c.filter(x=>x!==u):[...c,u];return d}),
    thread:o=>db.msgs.filter(m=>(m.a===me&&m.b===o)||(m.a===o&&m.b===me)),
    partners:()=>[...new Set([...(db.conn[me]||[]),...db.msgs.flatMap(m=>m.a===me?[m.b]:m.b===me?[m.a]:[])])],
    send:(o,text)=>upd(d=>{d.msgs.push({id:rid(),a:me,b:o,text,t:Date.now()});return d}),
    shared:p=>p.interests.filter(i=>user?.interests?.includes(i))}
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>}
export const useSocial=()=>useContext(Ctx)
