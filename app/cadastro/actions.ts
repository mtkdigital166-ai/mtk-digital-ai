'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export async function signup(formData:FormData){
 const supabase=await createClient(); const full_name=String(formData.get('full_name')||''); const email=String(formData.get('email')||''); const password=String(formData.get('password')||'')
 const appUrl=process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'
 const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name},emailRedirectTo:`${appUrl}/auth/confirm`}})
 if(error) redirect('/cadastro?erro='+encodeURIComponent(error.message))
 if(data.session) redirect('/onboarding')
 redirect('/login?msg='+encodeURIComponent('Conta criada. Confirme seu e-mail e depois entre.'))
}
