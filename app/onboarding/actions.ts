'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function list(v:string){return v.split(/[,\n]/).map(x=>x.trim()).filter(Boolean)}
function slugify(v:string){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)}

export async function completeOnboarding(formData:FormData){
const supabase = await createClient()

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser()

if (userError || !user) {
  redirect('/login')
}

const userId = user.id

const userId = user.id
 const name=String(formData.get('name')||'').trim(); const segment=String(formData.get('segment')||'').trim(); const subsegment=String(formData.get('subsegment')||'').trim(); const city=String(formData.get('city')||'').trim(); const state=String(formData.get('state')||'').trim(); const goal=String(formData.get('goal')||'Conseguir mais clientes'); const instagram=String(formData.get('instagram')||'').trim(); const whatsapp=String(formData.get('whatsapp')||'').trim(); const services=list(String(formData.get('services')||'')); const differentiators=list(String(formData.get('differentiators')||'')); const tone=list(String(formData.get('tone')||'Elegante, próximo, profissional')); const audience=String(formData.get('audience')||'').trim();
 if(!name||!segment) redirect('/onboarding?erro='+encodeURIComponent('Informe o nome e o segmento da empresa.'))
 let {data:org}=await supabase.from('organizations').select('id').eq('owner_id',userId).limit(1).maybeSingle()
 if(!org){const suffix=userId.slice(0,6);const created=await supabase.from('organizations').insert({owner_id:userId,name,slug:`${slugify(name)}-${suffix}`}).select('id').single(); if(created.error) redirect('/onboarding?erro='+encodeURIComponent(created.error.message)); org=created.data}
 const companyInsert=await supabase.from('companies').insert({organization_id:org!.id,name,segment,subsegment:subsegment||null,city:city||null,state:state||null,service_mode:'local',instagram:instagram||null,whatsapp:whatsapp||null,primary_goal:goal,cta:whatsapp?'Chame no WhatsApp':'Entre em contato',services,differentiators,onboarding_completed:true}).select('id').single()
 if(companyInsert.error) redirect('/onboarding?erro='+encodeURIComponent(companyInsert.error.message))
 const companyId=companyInsert.data.id
 const brain={empresa:name,segmento:segment,subsegmento:subsegment,local:[city,state].filter(Boolean).join(' - '),publico:audience||'A definir',objetivo:goal,tom:tone,servicos:services,diferenciais:differentiators,cta:whatsapp?'Chame no WhatsApp':'Entre em contato'}
 const profile=await supabase.from('company_profiles').insert({company_id:companyId,audience:audience||null,tone,main_offer:services[0]||null,positioning:`${name} — ${segment}`,mtk_score:70,strengths:['Negócio cadastrado','Objetivo definido','Presença digital em construção'],opportunities:['Criar conteúdo consistente','Usar CTA em publicações','Acompanhar resultados'],next_action:'Criar sua primeira campanha de marketing',brain_context:brain})
 if(profile.error) redirect('/onboarding?erro='+encodeURIComponent(profile.error.message))
 await supabase.from('profiles').update({onboarding_completed:true}).eq('id',userId)
 redirect('/')
}
