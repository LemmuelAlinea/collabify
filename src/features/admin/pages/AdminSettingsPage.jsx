import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { adminNavigation } from '../config/adminNavigation'

const defaultSettings = [
  {
    setting_key: 'platform',
    description: 'Basic platform information.',
    setting_value: {
      app_name: 'Collabify',
      support_email: '',
    },
  },
  {
    setting_key: 'maintenance',
    description: 'Maintenance mode configuration.',
    setting_value: {
      enabled: false,
      message: 'Collabify is currently under maintenance.',
    },
  },
  {
    setting_key: 'ai',
    description: 'AI feature configuration.',
    setting_value: {
      enabled: true,
      daily_request_limit: 50,
      summary_limit: 40,
    },
  },
  {
    setting_key: 'uploads',
    description: 'File upload limitations.',
    setting_value: {
      max_file_size_mb: 25,
      allowed_file_types: 'pdf,doc,docx,txt,png,jpg,jpeg',
    },
  },
]

function SettingShell({ title, description, settingKey, savingKey, onSave, children }) {
  return (
    <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-black">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        <button
          onClick={() => onSave(settingKey)}
          disabled={savingKey === settingKey}
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
        >
          {savingKey === settingKey ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {children}
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-600">{label}</span>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
      />
    </label>
  )
}

function NumberInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-600">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
      />
    </label>
  )
}

function ToggleInput({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
      <span className="text-sm font-bold text-gray-700">{label}</span>

      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  )
}

function AdminSettingsPage() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    setMessage('')

    for (const item of defaultSettings) {
      await supabase.from('system_settings').upsert(
        {
          setting_key: item.setting_key,
          setting_value: item.setting_value,
          description: item.description,
        },
        { onConflict: 'setting_key' }
      )
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key', { ascending: true })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const mapped = {}

    ;(data || []).forEach((item) => {
      mapped[item.setting_key] = item
    })

    setSettings(mapped)
    setLoading(false)
  }

  function updateSettingValue(settingKey, field, value) {
    setSettings((current) => ({
      ...current,
      [settingKey]: {
        ...current[settingKey],
        setting_value: {
          ...current[settingKey].setting_value,
          [field]: value,
        },
      },
    }))
  }

  async function saveSetting(settingKey) {
    setSavingKey(settingKey)
    setMessage('')

    const selected = settings[settingKey]

    const { error } = await supabase
      .from('system_settings')
      .update({
        setting_value: selected.setting_value,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', settingKey)

    if (error) {
      setMessage(error.message)
      setSavingKey('')
      return
    }

    setMessage(`${settingKey} settings saved successfully.`)
    setSavingKey('')
  }

  const platform = settings.platform?.setting_value || {}
  const maintenance = settings.maintenance?.setting_value || {}
  const ai = settings.ai?.setting_value || {}
  const uploads = settings.uploads?.setting_value || {}

  return (
    <DashboardLayout
      title="Collabify Admin"
      pageTitle="System Settings"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="System Settings"
            description="Configure Collabify platform-level settings without accessing user operations."
          />
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading system settings...</p>
        ) : (
          <>
            <SettingShell
              title="Platform"
              description="Basic platform information shown across the system."
              settingKey="platform"
              savingKey={savingKey}
              onSave={saveSetting}
            >
              <TextInput
                label="App Name"
                value={platform.app_name}
                onChange={(value) =>
                  updateSettingValue('platform', 'app_name', value)
                }
              />

              <TextInput
                label="Support Email"
                value={platform.support_email}
                onChange={(value) =>
                  updateSettingValue('platform', 'support_email', value)
                }
                placeholder="support@collabify.com"
              />
            </SettingShell>

            <SettingShell
              title="Maintenance"
              description="Use this only for system-wide maintenance notices."
              settingKey="maintenance"
              savingKey={savingKey}
              onSave={saveSetting}
            >
              <ToggleInput
                label="Maintenance Mode"
                value={maintenance.enabled}
                onChange={(value) =>
                  updateSettingValue('maintenance', 'enabled', value)
                }
              />

              <TextInput
                label="Maintenance Message"
                value={maintenance.message}
                onChange={(value) =>
                  updateSettingValue('maintenance', 'message', value)
                }
              />
            </SettingShell>

            <SettingShell
              title="AI"
              description="Control global AI availability and limits."
              settingKey="ai"
              savingKey={savingKey}
              onSave={saveSetting}
            >
              <ToggleInput
                label="Enable AI Features"
                value={ai.enabled}
                onChange={(value) => updateSettingValue('ai', 'enabled', value)}
              />

              <NumberInput
                label="Daily AI Request Limit"
                value={ai.daily_request_limit}
                onChange={(value) =>
                  updateSettingValue('ai', 'daily_request_limit', value)
                }
              />

              <NumberInput
                label="Summary Message Limit"
                value={ai.summary_limit}
                onChange={(value) =>
                  updateSettingValue('ai', 'summary_limit', value)
                }
              />
            </SettingShell>

            <SettingShell
              title="Uploads"
              description="Configure platform-wide upload restrictions."
              settingKey="uploads"
              savingKey={savingKey}
              onSave={saveSetting}
            >
              <NumberInput
                label="Max File Size MB"
                value={uploads.max_file_size_mb}
                onChange={(value) =>
                  updateSettingValue('uploads', 'max_file_size_mb', value)
                }
              />

              <TextInput
                label="Allowed File Types"
                value={uploads.allowed_file_types}
                onChange={(value) =>
                  updateSettingValue('uploads', 'allowed_file_types', value)
                }
                placeholder="pdf,doc,docx,txt,png,jpg"
              />
            </SettingShell>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminSettingsPage