import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { brainPrompt } from '@/lib/brain'

export async function POST(req:Request){
  try{
    const {message,mode='chat'}=await req.json()
    if(!message||typeof message!=='string') return NextResponse.json({error:'Escreva o que você quer criar.'},{status:400})
    if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:'Configure OPENAI_API_KEY no servidor.'},{status:503})

    const supabase=await createClient()
    const {data:claims}=await supabase.auth.getClaims()
    const userId=claims?.claims?.sub as string|undefined
    if(!userId) return NextResponse.json({error:'Sessão expirada.'},{status:401})

    const {data:org}=await supabase.from('organizations').select('id').eq('owner_id',userId).limit(1).maybeSingle()
    if(!org) return NextResponse.json({error:'Finalize o onboarding primeiro.'},{status:400})

    const {data:company}=await supabase.from('companies').select('*, company_profiles(*)').eq('organization_id',org.id).order('created_at',{ascending:true}).limit(1).maybeSingle()
    if(!company) return NextResponse.json({error:'Empresa não encontrada.'},{status:404})
    const profile=Array.isArray((company as any).company_profiles)?(company as any).company_profiles[0]:(company as any).company_profiles
    const brain=profile?.brain_context||{}
    const normalized={
      name:company.name,segment:company.segment||brain.segmento||'',subsegment:company.subsegment||brain.subsegmento,
      city:company.city||'',state:company.state||'',audience:profile?.audience||brain.publico,
      goal:company.primary_goal||brain.objetivo,tone:Array.isArray(profile?.tone)?profile.tone.join(', '):brain.tom,
      cta:company.cta||brain.cta,services:Array.isArray(company.services)?company.services:[],
      differentiators:Array.isArray(company.differentiators)?company.differentiators.join(', '):''
    }
    const task=mode==='post'?'Crie um post completo, pronto para publicar, com headline, legenda, CTA e hashtags.':mode==='campaign'?'Crie uma campanha de marketing objetiva com oferta, canais, cronograma e peças recomendadas.':'Ajude como copiloto de marketing com uma resposta prática e aplicável.'
    const model=process.env.OPENAI_MODEL||'gpt-5.6-luna'
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY})
    const response=await client.responses.create({model,input:`${brainPrompt(normalized)}\n\nTarefa: ${task}\nPedido do usuário: ${message}`})
    const text=response.output_text

    await supabase.from('ai_generations').insert({organization_id:org.id,company_id:company.id,user_id:userId,generation_type:mode,model,prompt_version:'v1',input:{message},output:{text},credits_used:0,status:'completed'})
    if(mode==='post') await supabase.from('content_items').insert({organization_id:org.id,company_id:company.id,created_by:userId,type:'post',title:message.slice(0,80),body:text,status:'draft'})
    if(mode==='campaign') await supabase.from('campaigns').insert({organization_id:org.id,company_id:company.id,created_by:userId,name:`Campanha — ${message.slice(0,60)}`,goal:message,duration_days:14,channels:['instagram','stories','whatsapp'],strategy:{text},status:'draft'})

    return NextResponse.json({text,company:company.name})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao gerar conteúdo.'},{status:500})}
}
