'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function list(v: string) {
  return v
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  // 1. Confirma o usuário autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const userId = user.id

  // 2. Dados enviados pelo formulário
  const name = String(formData.get('name') || '').trim()
  const segment = String(formData.get('segment') || '').trim()
  const subsegment = String(formData.get('subsegment') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const state = String(formData.get('state') || '').trim()

  const goal = String(
    formData.get('goal') || 'Conseguir mais clientes'
  ).trim()

  const instagram = String(formData.get('instagram') || '').trim()
  const whatsapp = String(formData.get('whatsapp') || '').trim()

  const services = list(
    String(formData.get('services') || '')
  )

  const differentiators = list(
    String(formData.get('differentiators') || '')
  )

  const tone = list(
    String(
      formData.get('tone') ||
        'Elegante, próximo, profissional'
    )
  )

  const audience = String(
    formData.get('audience') || ''
  ).trim()

  if (!name || !segment) {
    redirect(
      '/onboarding?erro=' +
        encodeURIComponent(
          'Informe o nome e o segmento da empresa.'
        )
    )
  }

  // 3. Procura uma organização existente
  let { data: org, error: findOrgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (findOrgError) {
    redirect(
      '/onboarding?erro=' +
        encodeURIComponent(findOrgError.message)
    )
  }

  // 4. Se não existir, cria pela função segura do banco
  if (!org) {
    const suffix = userId.slice(0, 6)

    const { data: orgId, error: orgError } =
      await supabase.rpc('create_own_organization', {
        p_name: name,
        p_slug: `${slugify(name)}-${suffix}`,
      })

    if (orgError) {
      redirect(
        '/onboarding?erro=' +
          encodeURIComponent(
            `Organização: ${orgError.message}`
          )
      )
    }

    if (!orgId) {
      redirect(
        '/onboarding?erro=' +
          encodeURIComponent(
            'Não foi possível criar a organização.'
          )
      )
    }

    org = {
      id: String(orgId),
    }
  }

  // 5. Verifica se a empresa já existe
  let { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // 6. Cria empresa somente se ainda não existir
  if (!company) {
    const { data: companyCreated, error: companyError } =
      await supabase
        .from('companies')
        .insert({
          organization_id: org.id,
          name,
          segment,
          subsegment: subsegment || null,
          city: city || null,
          state: state || null,
          service_mode: 'local',
          instagram: instagram || null,
          whatsapp: whatsapp || null,
          primary_goal: goal,
          cta: whatsapp
            ? 'Chame no WhatsApp'
            : 'Entre em contato',
          services,
          differentiators,
          onboarding_completed: true,
        })
        .select('id')
        .single()

    if (companyError) {
      redirect(
        '/onboarding?erro=' +
          encodeURIComponent(
            `Empresa: ${companyError.message}`
          )
      )
    }

    company = companyCreated
  }

  if (!company?.id) {
    redirect(
      '/onboarding?erro=' +
        encodeURIComponent(
          'Não foi possível identificar a empresa.'
        )
    )
  }

  const companyId = company.id

  // 7. MTK Brain
  const brain = {
    empresa: name,
    segmento: segment,
    subsegmento: subsegment,
    local: [city, state].filter(Boolean).join(' - '),
    publico: audience || 'A definir',
    objetivo: goal,
    tom: tone,
    servicos: services,
    diferenciais: differentiators,
    cta: whatsapp
      ? 'Chame no WhatsApp'
      : 'Entre em contato',
  }

  // 8. Evita criar perfil duplicado
  const { data: existingProfile } = await supabase
    .from('company_profiles')
    .select('company_id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await supabase
      .from('company_profiles')
      .insert({
        company_id: companyId,
        audience: audience || null,
        tone,
        main_offer: services[0] || null,
        positioning: `${name} — ${segment}`,
        mtk_score: 70,

        strengths: [
          'Negócio cadastrado',
          'Objetivo definido',
          'Presença digital em construção',
        ],

        opportunities: [
          'Criar conteúdo consistente',
          'Usar CTA em publicações',
          'Acompanhar resultados',
        ],

        next_action:
          'Criar sua primeira campanha de marketing',

        brain_context: brain,
      })

    if (profileError) {
      redirect(
        '/onboarding?erro=' +
          encodeURIComponent(
            `DNA Digital: ${profileError.message}`
          )
      )
    }
  }

  // 9. Marca onboarding como concluído
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
    })
    .eq('id', userId)

  if (profileUpdateError) {
    redirect(
      '/onboarding?erro=' +
        encodeURIComponent(
          `Perfil: ${profileUpdateError.message}`
        )
    )
  }

  // 10. Finalizado
  redirect('/')
}
