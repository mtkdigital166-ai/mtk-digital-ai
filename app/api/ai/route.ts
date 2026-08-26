import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { brainPrompt } from '@/lib/brain'

export async function POST(req: Request) {
  try {
    // =========================
    // 1. RECEBE O PEDIDO
    // =========================

    const { message, mode = 'chat' } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Escreva o que você quer criar.' },
        { status: 400 }
      )
    }

    if (!['chat', 'post', 'campaign'].includes(mode)) {
      return NextResponse.json(
        { error: 'Tipo de geração inválido.' },
        { status: 400 }
      )
    }

    // =========================
    // 2. OPENAI
    // =========================

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Configure OPENAI_API_KEY no servidor.' },
        { status: 503 }
      )
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5.4'

    // =========================
    // 3. AUTENTICAÇÃO
    // =========================

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Sessão expirada. Entre novamente.' },
        { status: 401 }
      )
    }

    const userId = user.id

    // =========================
    // 4. ORGANIZAÇÃO
    // =========================

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (orgError) {
      return NextResponse.json(
        { error: `Organização: ${orgError.message}` },
        { status: 500 }
      )
    }

    if (!org) {
      return NextResponse.json(
        { error: 'Finalize o onboarding primeiro.' },
        { status: 400 }
      )
    }

    // =========================
    // 5. EMPRESA + MTK BRAIN
    // =========================

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*, company_profiles(*)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (companyError) {
      return NextResponse.json(
        { error: `Empresa: ${companyError.message}` },
        { status: 500 }
      )
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada.' },
        { status: 404 }
      )
    }

    const profile = Array.isArray(
      (company as any).company_profiles
    )
      ? (company as any).company_profiles[0]
      : (company as any).company_profiles

    const brain = profile?.brain_context || {}

    // =========================
    // 6. CUSTO EM CRÉDITOS MTK
    // =========================

    const creditCost =
      mode === 'campaign'
        ? 3
        : mode === 'post'
          ? 2
          : 1

    // =========================
    // 7. VERIFICA SALDO ANTES
    // =========================

    const { data: wallet, error: walletError } = await supabase
      .from('credit_wallets')
      .select('balance')
      .eq('organization_id', org.id)
      .maybeSingle()

    if (walletError) {
      return NextResponse.json(
        { error: `Créditos: ${walletError.message}` },
        { status: 500 }
      )
    }

    if (!wallet) {
      return NextResponse.json(
        {
          error:
            'Carteira de créditos não encontrada para esta conta.',
        },
        { status: 400 }
      )
    }

    if (wallet.balance < creditCost) {
      return NextResponse.json(
        {
          error: `Créditos insuficientes. Esta geração custa ${creditCost} crédito${
            creditCost > 1 ? 's' : ''
          } e seu saldo é ${wallet.balance}.`,
        },
        { status: 402 }
      )
    }

    // =========================
    // 8. CONTEXTO DA EMPRESA
    // =========================

    const normalized = {
      name: company.name,

      segment:
        company.segment ||
        brain.segmento ||
        '',

      subsegment:
        company.subsegment ||
        brain.subsegmento,

      city:
        company.city ||
        '',

      state:
        company.state ||
        '',

      audience:
        profile?.audience ||
        brain.publico,

      goal:
        company.primary_goal ||
        brain.objetivo,

      tone:
        Array.isArray(profile?.tone)
          ? profile.tone.join(', ')
          : brain.tom,

      cta:
        company.cta ||
        brain.cta,

      services:
        Array.isArray(company.services)
          ? company.services
          : [],

      differentiators:
        Array.isArray(company.differentiators)
          ? company.differentiators.join(', ')
          : '',
    }

    // =========================
    // 9. TAREFA
    // =========================

    const task =
      mode === 'post'
        ? 'Crie um post completo, pronto para publicar, com headline, legenda, CTA e hashtags.'
        : mode === 'campaign'
          ? 'Crie uma campanha de marketing objetiva com oferta, canais, cronograma e peças recomendadas.'
          : 'Ajude como copiloto de marketing com uma resposta prática e aplicável.'

    // =========================
    // 10. GERA COM OPENAI
    // =========================

    const client = new OpenAI({
      apiKey,
    })

    const response = await client.responses.create({
      model,

      input: `${brainPrompt(
        normalized
      )}

Tarefa: ${task}

Pedido do usuário: ${message}`,
    })

    const text = response.output_text

    if (!text) {
      return NextResponse.json(
        {
          error:
            'A IA não retornou conteúdo. Tente novamente.',
        },
        { status: 500 }
      )
    }

    // =========================
    // 11. DESCONTA CRÉDITOS
    // =========================

    const {
      data: newBalance,
      error: creditError,
    } = await supabase.rpc(
      'consume_ai_credits',
      {
        p_organization_id: org.id,
        p_amount: creditCost,
      }
    )

    if (creditError) {
      return NextResponse.json(
        {
          error: `Não foi possível descontar os créditos: ${creditError.message}`,
        },
        { status: 402 }
      )
    }

    // =========================
    // 12. REGISTRA GERAÇÃO
    // =========================

    const { error: generationError } = await supabase
      .from('ai_generations')
      .insert({
        organization_id: org.id,
        company_id: company.id,
        user_id: userId,
        generation_type: mode,
        model,
        prompt_version: 'v1',

        input: {
          message,
        },

        output: {
          text,
        },

        credits_used: creditCost,
        status: 'completed',
      })

    if (generationError) {
      console.error(
        'Erro ao registrar geração:',
        generationError
      )
    }

    // =========================
    // 13. SALVA POST
    // =========================

    if (mode === 'post') {
      const { error: contentError } = await supabase
        .from('content_items')
        .insert({
          organization_id: org.id,
          company_id: company.id,
          created_by: userId,
          type: 'post',
          title: message.slice(0, 80),
          body: text,
          status: 'draft',
        })

      if (contentError) {
        console.error(
          'Erro ao salvar post:',
          contentError
        )
      }
    }

    // =========================
    // 14. SALVA CAMPANHA
    // =========================

    if (mode === 'campaign') {
      const { error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          organization_id: org.id,
          company_id: company.id,
          created_by: userId,

          name: `Campanha — ${message.slice(
            0,
            60
          )}`,

          goal: message,
          duration_days: 14,

          channels: [
            'instagram',
            'stories',
            'whatsapp',
          ],

          strategy: {
            text,
          },

          status: 'draft',
        })

      if (campaignError) {
        console.error(
          'Erro ao salvar campanha:',
          campaignError
        )
      }
    }

    // =========================
    // 15. RESPOSTA
    // =========================

    return NextResponse.json({
      text,
      company: company.name,
      creditsUsed: creditCost,
      balance: newBalance,
    })
  } catch (e) {
    console.error('MTK AI ERROR:', e)

    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Erro ao gerar conteúdo.',
      },
      { status: 500 }
    )
  }
}
