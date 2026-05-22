import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { adminNavigation } from '../config/adminNavigation'

function AdminAIMonitoringPage() {
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchAIData()
  }, [])

  async function fetchAIData() {
    setLoading(true)
    setMessage('')

    const { data: settingsRow } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'ai')
      .maybeSingle()

    const { data: logRows, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setSettings(
      settingsRow || {
        setting_key: 'ai',
        setting_value: {
          enabled: true,
          daily_request_limit: 50,
          summary_limit: 40,
        },
      }
    )

    setLogs(logRows || [])
    setLoading(false)
  }

  async function toggleAI() {
    if (!settings) return

    setSaving(true)
    setMessage('')

    const updatedValue = {
      ...settings.setting_value,
      enabled: !settings.setting_value?.enabled,
    }

    const { error } = await supabase.from('system_settings').upsert(
      {
        setting_key: 'ai',
        setting_value: updatedValue,
        description: 'AI feature configuration.',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    )

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setSettings({
      ...settings,
      setting_value: updatedValue,
    })

    setMessage(`AI features ${updatedValue.enabled ? 'enabled' : 'disabled'}.`)
    setSaving(false)
  }

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString()

    return logs.filter(
      (log) => new Date(log.created_at).toDateString() === today
    )
  }, [logs])

  const successLogs = logs.filter((log) => log.status === 'success')
  const failedLogs = logs.filter((log) => log.status === 'failed')

  const mostUsedFeature = useMemo(() => {
    const counts = {}

    logs.forEach((log) => {
      counts[log.feature_name] = (counts[log.feature_name] || 0) + 1
    })

    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])?.[0]?.[0] ||
      'No data'
    )
  }, [logs])

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="AI Monitoring"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeader
              title="AI Monitoring"
              description="Monitor platform-level AI usage without viewing private user content."
            />

            <button
              onClick={toggleAI}
              disabled={saving}
              className={`rounded-xl px-5 py-3 text-sm font-black transition-all disabled:opacity-50 ${
                settings?.setting_value?.enabled
                  ? 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-gradient-to-r from-cyan-400 to-green-400 text-black hover:opacity-90'
              }`}
            >
              {saving
                ? 'Saving...'
                : settings?.setting_value?.enabled
                  ? 'Disable AI'
                  : 'Enable AI'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading AI monitoring...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
              <Card
                title="AI Status"
                value={settings?.setting_value?.enabled ? 'Enabled' : 'Disabled'}
                description="Global AI control"
              />

              <Card
                title="Requests Today"
                value={todayLogs.length}
                description="Logged AI usage"
              />

              <Card
                title="Successful"
                value={successLogs.length}
                description="Success logs"
              />

              <Card
                title="Failed"
                value={failedLogs.length}
                description="Failed logs"
              />

              <Card
                title="Top Feature"
                value={mostUsedFeature}
                description="Most used AI tool"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Recent AI Logs"
                description="Metadata only. No private chats, files, or submissions are shown."
              />

              {logs.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                  No AI usage logs yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black text-gray-900">
                            {log.feature_name}
                          </p>

                          <p className="text-sm text-gray-500">
                            Workspace: {log.workspace || 'unknown'}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                            log.status === 'success'
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : 'border-red-300 bg-red-50 text-red-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-xl border border-gray-300 bg-white p-3">
                          <p className="text-gray-500">Tokens</p>
                          <p className="font-bold text-gray-900">
                            {log.tokens_used || 0}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-300 bg-white p-3">
                          <p className="text-gray-500">Cost Estimate</p>
                          <p className="font-bold text-gray-900">
                            ₱{Number(log.cost_estimate || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-300 bg-white p-3">
                          <p className="text-gray-500">Date</p>
                          <p className="font-bold text-gray-900">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminAIMonitoringPage