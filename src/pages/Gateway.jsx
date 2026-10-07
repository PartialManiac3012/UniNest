import {Link} from 'react-router-dom'
import {Icon} from '../components/Layout.jsx'
import {useAuth} from '../auth.jsx'
import PixelSwap from '../components/PixelSwap.jsx'
const how=[['Create your ID','Sign up with your email. Your UniNest ID is made from it.'],['Say what you do and want','Pick your interests and skills so we can show you people who fit.'],['Get matched and connect','Connect, message, and team up for the next hackathon or event.']]
const features=[['/feed','dynamic_feed','Share updates','Post what you are building, like and comment on what others share.'],['/discover','group_search','Find your people','Connect with students by interests, skills and college.'],['/partners','handshake','Find partners','Post a team for a hackathon, study group or project, or join one.'],['/messages','chat','Message anyone','Chat one-on-one with students you connect with.']]
export default function Gateway(){
 const {user}=useAuth()
 return <>
 <section className="grid items-center gap-10 lg:grid-cols-2">
  <div>
   <h1 className="text-4xl md:text-[3.5rem] md:leading-[4rem] tracking-[-0.02em]">Meet students who share your interests.</h1>
   <p className="mt-5 max-w-xl text-lg text-ink-2 leading-8">UniNest is a social network for college students. Share what you are working on, connect over interests, and find partners for hackathons and events.</p>
   <div className="mt-6 flex flex-wrap gap-3">{user?<Link to="/feed" className="btn-primary">Open your feed <Icon n="arrow_forward"/></Link>:<><Link to="/signup" className="btn-primary">Create your ID <Icon n="arrow_forward"/></Link><Link to="/login" className="btn-outline">Log in</Link></>}</div>
   <p className="mt-3 text-sm text-ink-2">Free for students. All you need is an email address.</p>
  </div>
  <div><PixelSwap className="rounded-lg border border-outline-variant" aspectRatio="16 / 11" pixelSize={44} pattern="diagonal" randomness={0.25} duration={1100} trigger="hover"
    firstContent={<div className="flex h-full w-full flex-col justify-center gap-3 bg-surface-container p-6"><div className="text-sm text-ink-2">Your profile</div><div className="font-serif text-2xl">I know Python and Figma. I want a hackathon squad.</div><div className="flex gap-2 text-xs"><span className="pill">Python</span><span className="pill">Figma</span><span className="pill-gold">Hackathon squad</span></div></div>}
    secondContent={<div className="flex h-full w-full flex-col justify-center gap-3 bg-primary-container p-6 text-surface"><div className="text-sm opacity-80">Your matches</div>{[['Backend dev, 3rd year','94%'],['ML student, 1st year','91%'],['Hardware, 2nd year','87%']].map(([a,b])=><div key={a} className="flex justify-between border-b border-surface/25 pb-2 font-serif text-lg"><span>{a}</span><b>{b}</b></div>)}</div>}/>
   <p className="mt-2 text-xs text-ink-2">Hover or focus the card to see how matching looks. Example data.</p></div>
 </section>
 <section><h2 className="text-3xl">How it works</h2>
  <ol className="mt-5 grid gap-4 md:grid-cols-3">{how.map(([t,d],i)=><li key={t} className="card p-5"><span className="font-serif text-3xl text-primary-container">{i+1}</span><h3 className="mt-2 text-xl font-semibold">{t}</h3><p className="mt-1 text-sm text-ink-2">{d}</p></li>)}</ol></section>
 <section><h2 className="text-3xl">What you can do</h2>
  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(([to,i,t,d])=><Link key={t} to={to} className="card block p-5"><Icon n={i} className="text-primary-container"/><h3 className="mt-3 text-xl font-semibold">{t}</h3><p className="mt-1 text-sm text-ink-2">{d}</p></Link>)}</div></section>
 {!user&&<section className="panel p-8 text-center"><h2 className="text-3xl">Create your UniNest ID in a minute</h2><p className="mt-2 text-ink-2">Confirm your email, add a few details, and start finding people.</p>
  <div className="mt-5 flex flex-wrap justify-center gap-3"><Link to="/signup" className="btn-primary">Create your ID</Link><Link to="/login" className="btn-outline">Log in</Link></div></section>}
</>}
