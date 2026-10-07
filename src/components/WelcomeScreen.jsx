import {useEffect,useState} from 'react'
import './WelcomeScreen.css'

const greetings=[
  {text:'Welcome',lang:'en'},
  {text:'स्वागत है',lang:'hi'},
  {text:'Bienvenue',lang:'fr'},
]

export default function WelcomeScreen({children}){
  const [firstVisit]=useState(()=>localStorage.getItem('uninest.welcome.seen')!=='true')
  const [index,setIndex]=useState(0)
  const [phase,setPhase]=useState(firstVisit?'greeting':'done')

  useEffect(()=>{
    if(!firstVisit)return
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finish=()=>{localStorage.setItem('uninest.welcome.seen','true');setPhase('done')}
    const timers=reducedMotion
      ? [setTimeout(finish,900)]
      : [
        setTimeout(()=>setIndex(1),1350),
        setTimeout(()=>setIndex(2),2700),
        setTimeout(()=>setPhase('zoom'),4100),
        setTimeout(finish,5300),
      ]
    return ()=>timers.forEach(clearTimeout)
  },[firstVisit])

  return <>
    <div className={`login-screen login-screen--${phase}`} inert={phase!=='done'} aria-hidden={phase!=='done'}>{children}</div>
    {phase!=='done'&&<div className={`welcome-screen welcome-screen--${phase}`} role="status" aria-label="Welcome to UniNest">
      <div className="welcome-stage" aria-hidden="true">
        <span key={index} lang={greetings[index].lang} className={`welcome-word ${index===2?'welcome-word--last':''}`}>{greetings[index].text}</span>
      </div>
    </div>}
  </>
}
