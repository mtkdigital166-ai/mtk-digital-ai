'use client'
import {useState} from 'react'
export default function CreateAI({companyName}:{companyName:string}){
 const [msg,setMsg]=useState('Quero movimentar minha agenda esta semana'); const [out,setOut]=useState(''); const [loading,setLoading]=useState(false)
 async function go(mode:'chat'|'post'|'campaign'){
  setLoading(true); setOut('')
  try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,mode})});const j=await r.json();setOut(j.text||j.error||'Não foi possível gerar agora.')}catch{setOut('Falha de conexão. Tente novamente.')}finally{setLoading(false)}
 }
 return <><div className="page-head"><div><div className="eyebrow">MTK BRAIN ATIVO</div><h1>MTK AI</h1><p className="muted">Conhecendo: {companyName}</p></div></div><div className="grid content2"><div className="card form"><h2>O que você quer criar hoje?</h2><textarea rows={6} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Ex.: Quero conseguir mais clientes esta semana"/><div className="chips"><button className="btn" disabled={loading} onClick={()=>go('chat')}>Perguntar à MTK</button><button className="btn" disabled={loading} onClick={()=>go('post')}>Gerar post</button><button className="btn gold" disabled={loading} onClick={()=>go('campaign')}>Gerar campanha</button></div></div><div className="card chat"><h2>Resultado</h2>{loading?<div className="loading">Criando com seu MTK Brain...</div>:<div>{out||'Sua geração aparecerá aqui e será salva automaticamente.'}</div>}</div></div></>
}
