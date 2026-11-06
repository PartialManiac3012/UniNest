import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {Icon} from '../components/Layout.jsx'
import {tracks} from '../data.js'
const target=Date.now()+(14*86400+8*3600+42*60+19)*1000
const useCountdown=()=>{const [n,setN]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setN(Date.now()),1000);return()=>clearInterval(t)},[]);let s=Math.max(0,Math.floor((target-n)/1000));const p=x=>String(x).padStart(2,'0');return `${p(Math.floor(s/86400))}d : ${p(Math.floor(s%86400/3600))}h : ${p(Math.floor(s%3600/60))}m : ${p(s%60)}s`}
const facts=[['Venue & mode','Innovation Hall & Lab 3, hybrid supported'],['Eligibility','All engineering disciplines, squads of 2–4'],['Dates','Oct 24–26, 2025, 36-hour sprint'],['Registry deadline','Oct 20, 23:59 IST'],['Hardware','Jetson Orin & FPGA available'],['Entry','Free with a university credential']]
export default function Events(){
 const clock=useCountdown(),[pick,setPick]=useState(null),[reg,setReg]=useState(false),[follow,setFollow]=useState(false),claimed=128+(reg?1:0)
 return <>
 <header className="grid gap-6 lg:grid-cols-12 items-end"><div className="lg:col-span-8"><span className="pill">Upcoming events</span>
   <h1 className="mt-3 text-4xl md:text-5xl">Events & hackathons</h1>
   <p className="mt-3 max-w-2xl text-ink-2 leading-7">Upcoming tech symposiums, inter-collegiate hackathons, and chartered club assemblies.</p></div>
  <div className="lg:col-span-4 panel p-4 text-center"><div className="kicker">Registration closes in</div><div className="mt-1 font-serif text-2xl tabular-nums text-primary-container" role="timer">{clock}</div></div></header>
 <div className="rule-double"/>
 <div className="card p-4 flex flex-wrap items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded bg-primary-wash font-bold text-primary-container">CO</span>
  <span className="flex-1 min-w-[200px]"><b className="font-serif text-lg">Coding & Open Source Society</b> <span className="pill-green ml-1">Chartered guild</span><br/><span className="text-xs text-ink-2">2,418 enrolled engineers and mentors</span></span>
  <button aria-pressed={follow} onClick={()=>setFollow(!follow)} className={follow?'btn-outline':'btn-primary'}><Icon n={follow?'check':'person_add'}/>{follow?'Following':'Follow society'}</button></div>
 <section className="grid gap-6 lg:grid-cols-12"><div className="lg:col-span-8 panel p-6">
   <span className="pill-gold">Flagship event · 36-hour national sprint</span>
   <h2 className="mt-3 text-3xl md:text-4xl">Hack-Campus 2025: national collegiate hackathon</h2>
   <p className="mt-3 text-ink-2 leading-7">The flagship software event for 500+ undergraduate technologists, systems architects and machine learning researchers, building community-first computing systems across three problem spaces.</p>
   <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">{facts.map(([k,v])=><div key={k} className="border-t border-outline-variant pt-2"><dt className="kicker">{k}</dt><dd className="text-sm">{v}</dd></div>)}</dl>
   <p className="mt-4 text-sm"><span className="pill-green mr-2">Registration open</span>128 verified teams registered. 4 classmates from ML-302 and CS-411 are attending.</p></div>
  <aside className="lg:col-span-4 space-y-4"><div className="card p-5"><div className="kicker">Official entry pass</div><p className="mt-1 font-serif text-3xl">Free</p><p className="text-sm text-ink-2">For matriculated students with an active university credential. Sign-in uses SSO.</p>
    <button disabled={reg} onClick={()=>setReg(true)} className="btn-primary w-full mt-3">{reg?'Team registered ✓':'Register team & join'}</button><Link to="/partners" className="btn-outline w-full mt-2"><Icon n="group_add"/>Find teammates</Link><button className="btn-outline w-full mt-2"><Icon n="download"/>Download rulebook (PDF)</button></div>
   <div className="panel p-5"><div className="flex justify-between text-sm"><b>Capacity</b><span>{Math.round(claimed/150*100)}% allotted</span></div>
    <div className="mt-2 h-2.5 rounded-full bg-surface-highest" role="progressbar" aria-valuenow={claimed} aria-valuemax={150} aria-label="In-person quads claimed"><i className="block h-full rounded-full bg-primary-container" style={{width:claimed/150*100+'%'}}/></div>
    <p className="mt-2 text-xs text-ink-2">{claimed} / 150 in-person quads claimed · {150-claimed} left</p>
    <p className="mt-3 text-xs"><b className="text-primary-container">Hostel residents:</b> overnight permission slips are generated once the Dean of Student Affairs confirms your registration.</p></div></aside></section>
 <section><h2 className="text-3xl">Official problem statements</h2><p className="text-sm text-ink-2">Select one primary track for jury review.</p>
  <div role="radiogroup" aria-label="Primary track" className="mt-5 grid gap-4 lg:grid-cols-3">{tracks.map((t,i)=>{const on=pick===t.id;return <article key={t.id} className={`card p-5 flex flex-col ${on?'!border-primary-container bg-primary-wash/40':''}`}>
   <div className="flex justify-between text-xs"><span className="kicker">Track {i+1}</span><span className="pill-green">{t.tag}</span></div>
   <h3 className="mt-3 text-xl font-semibold">{t.t}</h3><p className="mt-2 text-sm text-ink-2 leading-6">{t.d}</p>
   <ul className="mt-3 space-y-1 text-sm">{t.subs.map(s=><li key={s} className="flex gap-2"><Icon n="check_circle" className="!text-[16px] text-secondary mt-0.5"/>{s}</li>)}</ul>
   <div className="mt-auto pt-4 flex items-center justify-between"><span className="text-xs text-ink-2">{t.teams+(on?1:0)} teams declared</span>
    <button role="radio" aria-checked={on} onClick={()=>setPick(on?null:t.id)} className={on?'btn-primary':'btn-outline'}>{on?'Selected':'Select track'}</button></div></article>})}</div></section>
 </>}
