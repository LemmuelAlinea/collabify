import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { adminNavigation } from '../config/adminNavigation'

const defaultUploadSettings = {
  max_file_size_mb: 25,
  allowed_file_types: 'pdf,doc,docx,txt,png,jpg,jpeg',
  storage_warning_limit_mb: 500,
}

function formatBytes(bytes) {
  const value = Number(bytes || 0)

  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function AdminStoragePage() {
  const [metrics, setMetrics] = useState([])
  const [uploadSettings, setUploadSettings] = useState(defaultUploadSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchStorageData()
  }, [])

  async function fetchStorageData() {
    setLoading(true)
    setMessage('')

    const { data: settingsRow } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'uploads')
      .maybeSingle()

    if (!settingsRow) {
      await supabase.from('system_settings').upsert(
        {
          setting_key: 'uploads',
          setting_value: defaultUploadSettings,
          description: 'File upload and storage configuration.',
        },
        { onConflict: 'setting_key' }
      )

      setUploadSettings(defaultUploadSettings)
    } else {
      setUploadSettings({
        ...defaultUploadSettings,
        ...(settingsRow.setting_value || {}),
      })
    }

    const { data: metricRows, error } = await supabase
      .from('storage_metrics')
      .select('*')
      .order('measured_at', { ascending: false })
      .limit(100)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMetrics(metricRows || [])
    setLoading(false)
  }

  async function saveUploadSettings() {
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('system_settings').upsert(
      {
        setting_key: 'uploads',
        setting_value: uploadSettings,
        description: 'File upload and storage configuration.',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    )

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Storage settings saved successfully.')
    setSaving(false)
  }
async function refreshStorageMetrics() {
  setLoading(true)
  setMessage('')

  const { error } = await supabase.rpc('refresh_storage_metrics')

  if (error) {
    setMessage(error.message)
    setLoading(false)
    return
  }

  setMessage('Storage metrics refreshed successfully.')
  await fetchStorageData()
}
  function handleSettingChange(field, value) {
    setUploadSettings((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const latestByBucket = useMemo(() => {
    const map = {}

    metrics.forEach((metric) => {
      if (!map[metric.bucket_name]) {
        map[metric.bucket_name] = metric
      }
    })

    return Object.values(map)
  }, [metrics])

  const totalFiles = latestByBucket.reduce(
    (sum, item) => sum + Number(item.file_count || 0),
    0
  )

  const totalBytes = latestByBucket.reduce(
    (sum, item) => sum + Number(item.total_size_bytes || 0),
    0
  )

  const warningLimitBytes =
    Number(uploadSettings.storage_warning_limit_mb || 0) * 1024 * 1024

  const storageStatus =
    warningLimitBytes > 0 && totalBytes >= warningLimitBytes
      ? 'Warning'
      : 'Healthy'

  return (
    <DashboardLayout
      title="Collabify Admin"
      pageTitle="Storage Management"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
<div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <SectionHeader
      title="Storage Management"
      description="Monitor storage usage and configure platform upload limits without opening private user files."
    />

    <button
      onClick={refreshStorageMetrics}
      disabled={loading}
      className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
    >
      Refresh Storage Metrics
    </button>
  </div>
</div>

        {loading ? (
          <p className="text-gray-500">Loading storage data...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card
                title="Storage Status"
                value={storageStatus}
                description="Based on warning limit"
              />

              <Card
                title="Total Files"
                value={totalFiles}
                description="Latest bucket snapshots"
              />

              <Card
                title="Storage Used"
                value={formatBytes(totalBytes)}
                description="Estimated total usage"
              />

              <Card
                title="Buckets Tracked"
                value={latestByBucket.length}
                description="Buckets with metrics"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Upload Settings"
                  description="System-wide upload rules used by Collabify features."
                />

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Max File Size MB
                    </span>

                    <input
                      type="number"
                      value={uploadSettings.max_file_size_mb}
                      onChange={(e) =>
                        handleSettingChange(
                          'max_file_size_mb',
                          Number(e.target.value)
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Allowed File Types
                    </span>

                    <input
                      value={uploadSettings.allowed_file_types}
                      onChange={(e) =>
                        handleSettingChange(
                          'allowed_file_types',
                          e.target.value
                        )
                      }
                      placeholder="pdf,doc,docx,txt,png,jpg,jpeg"
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Storage Warning Limit MB
                    </span>

                    <input
                      type="number"
                      value={uploadSettings.storage_warning_limit_mb}
                      onChange={(e) =>
                        handleSettingChange(
                          'storage_warning_limit_mb',
                          Number(e.target.value)
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                    />
                  </label>

                  <button
                    onClick={saveUploadSettings}
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Storage Settings'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Tracked Buckets"
                  description="Latest recorded usage per bucket."
                />

                {latestByBucket.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                    No storage metrics recorded yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {latestByBucket.map((bucket) => (
                      <div
                        key={bucket.bucket_name}
                        className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-black text-gray-900">
                              {bucket.bucket_name}
                            </p>

                            <p className="text-sm text-gray-500">
                              Last measured:{' '}
                              {new Date(bucket.measured_at).toLocaleString()}
                            </p>
                          </div>

                          <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-bold text-[#00B8B0]">
                            {bucket.file_count || 0} files
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-gray-700">
                          Used:{' '}
                          <span className="font-black text-[#00B8B0]">
                            {formatBytes(bucket.total_size_bytes)}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Storage Metric History"
                description="Recent storage snapshots. This is metadata only."
              />

              {metrics.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                  No metric history available.
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-3xl border border-gray-300">
                  <div className="max-h-[460px] overflow-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-100">
                        <tr>
                          <th className="border-b border-gray-200 p-4 text-left">
                            Bucket
                          </th>

                          <th className="border-b border-gray-200 p-4 text-left">
                            File Count
                          </th>

                          <th className="border-b border-gray-200 p-4 text-left">
                            Total Size
                          </th>

                          <th className="border-b border-gray-200 p-4 text-left">
                            Measured At
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {metrics.map((metric) => (
                          <tr key={metric.id} className="hover:bg-gray-50">
                            <td className="border-b border-gray-200 p-4 font-semibold text-gray-900">
                              {metric.bucket_name}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {metric.file_count || 0}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {formatBytes(metric.total_size_bytes)}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {new Date(metric.measured_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminStoragePage