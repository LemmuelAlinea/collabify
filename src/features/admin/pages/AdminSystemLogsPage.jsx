import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { adminNavigation } from '../config/adminNavigation'
import { supabase } from '../../../lib/supabaseClient'

function AdminSystemLogsPage() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setLogs(data || [])
    setLoading(false)
  }

  async function createTestLog() {
    setMessage('')

    const { error } = await supabase.from('system_logs').insert({
      log_type: 'manual_test',
      title: 'Manual System Log Test',
      description: 'This log was created from the admin system logs page.',
      severity: 'info',
      metadata: {
        source: 'AdminSystemLogsPage',
      },
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Test log created.')
    await fetchLogs()
  }

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs
    return logs.filter((log) => log.severity === filter)
  }, [logs, filter])

  const infoCount = logs.filter((log) => log.severity === 'info').length
  const warningCount = logs.filter((log) => log.severity === 'warning').length
  const errorCount = logs.filter((log) => log.severity === 'error').length

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="System Logs"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <SectionHeader
              title="System Logs"
              description="View platform-level system events only. This does not show private user operations."
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>

              <button
                onClick={createTestLog}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
              >
                Create Test Log
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading system logs...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card title="Total Logs" value={logs.length} description="Recorded events" />
              <Card title="Info" value={infoCount} description="Normal events" />
              <Card title="Warnings" value={warningCount} description="Potential issues" />
              <Card title="Errors" value={errorCount} description="System issues" />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Filter Logs"
                description="Filter logs by severity."
              />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mt-4 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-[#00CFC8] sm:w-80"
              >
                <option value="all">All Logs</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Recent System Logs"
                description="Metadata logs for platform health and maintenance."
              />

              {filteredLogs.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                  No logs found.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-gray-900">{log.title}</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {log.description || 'No description.'}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                            log.severity === 'error'
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : log.severity === 'warning'
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-green-300 bg-green-50 text-green-700'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-xl border border-gray-300 bg-white p-3">
                          <p className="text-gray-500">Type</p>
                          <p className="font-bold text-gray-900">{log.log_type}</p>
                        </div>

                        <div className="rounded-xl border border-gray-300 bg-white p-3">
                          <p className="text-gray-500">Created At</p>
                          <p className="font-bold text-gray-900">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-300 bg-white p-3">
                          <p className="text-gray-500">Metadata</p>
                          <p className="break-words font-bold text-gray-900">
                            {log.metadata
                              ? JSON.stringify(log.metadata)
                              : 'None'}
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

export default AdminSystemLogsPage