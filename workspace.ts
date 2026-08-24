import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getWorkspace(requireCompany=true){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub as string|undefined
  if(!userId) redirect('/login')
  const {data:org}=await supabase.from('organizations').select('id,name').eq('owner_id',userId).order('created_at',{ascending:true}).limit(1).maybeSingle()
  if(!org){if(requireCompany) redirect('/onboarding'); return {supabase,userId,org:null,company:null}}
  const {data:company}=await supabase.from('companies').select('*, company_profiles(*)').eq('organization_id',org.id).order('created_at',{ascending:true}).limit(1).maybeSingle()
  if(!company&&requireCompany) redirect('/onboarding')
  return {supabase,userId,org,company}
}
