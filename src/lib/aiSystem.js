import { supabase } from './supabaseClient'

export async function getAISettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'ai')
    .maybeSingle()

  if (error) {
    console.error('AI settings error:', error)
    return {
      enabled: false,
      daily_request_limit: 50,
      summary_limit: 40,
    }
  }

  return data?.setting_value || {
    enabled: false,
    daily_request_limit: 50,
    summary_limit: 40,
  }
}

export async function isAIEnabled() {
  const settings = await getAISettings()
  return settings.enabled === true
}

export async function logAIUsage({
  featureName,
  workspace,
  status = 'success',
  tokensUsed = 0,
  costEstimate = 0,
  metadata = {},
}) {
  const { error } = await supabase.from('ai_usage_logs').insert({
    feature_name: featureName,
    workspace,
    status,
    tokens_used: tokensUsed,
    cost_estimate: costEstimate,
    metadata,
  })

  if (error) {
    console.error('AI log insert error:', error)
  }
}