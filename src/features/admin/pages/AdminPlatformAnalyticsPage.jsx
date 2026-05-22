import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { adminNavigation } from '../config/adminNavigation'

function getPercent(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function AdminPlatformAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [counts, setCounts] = useState({
    users: 0,
    teachers: 0,
    students: 0,
    managers: 0,
    sponsors: 0,
    members: 0,
    classes: 0,
    eduProjects: 0,
    generalProjects: 0,
    eduTasks: 0,
    generalTasks: 0,
    aiLogs: 0,
    storageBytes: 0,
  })

  const [aiLogs, setAiLogs] = useState([])
  const [storageMetrics, setStorageMetrics] = useState([])

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function countRows(table, filter = null) {
    let query = supabase.from(table).select('*', {
      count: 'exact',
      head: true,
    })

    if (filter) {
      query = query.eq(filter.column, filter.value)
    }

    const { count } = await query
    return count || 0
  }

  async function fetchAnalytics() {
    setLoading(true)
    setMessage('')

    try {
      const [
        users,
        teachers,
        students,
        managers,
        sponsors,
        members,
        classes,
        eduProjects,
        generalProjects,
        eduTasks,
        generalTasks,
        aiLogsCount,
      ] = await Promise.all([
        countRows('profiles'),
        countRows('profiles', { column: 'role', value: 'teacher' }),
        countRows('profiles', { column: 'role', value: 'student' }),
        countRows('profiles', { column: 'role', value: 'project_manager' }),
        countRows('profiles', { column: 'role', value: 'project_sponsor' }),
        countRows('profiles', { column: 'role', value: 'project_member' }),
        countRows('classes'),
        countRows('projects'),
        countRows('general_projects'),
        countRows('tasks'),
        countRows('general_tasks'),
        countRows('ai_usage_logs'),
      ])

      const { data: aiRows } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      const { data: storageRows } = await supabase
        .from('storage_metrics')
        .select('*')
        .order('measured_at', { ascending: false })
        .limit(100)

      const latestBucketMap = {}

      ;(storageRows || []).forEach((metric) => {
        if (!latestBucketMap[metric.bucket_name]) {
          latestBucketMap[metric.bucket_name] = metric
        }
      })

      const latestBuckets = Object.values(latestBucketMap)

      const storageBytes = latestBuckets.reduce(
        (sum, metric) => sum + Number(metric.total_size_bytes || 0),
        0
      )

      setCounts({
        users,
        teachers,
        students,
        managers,
        sponsors,
        members,
        classes,
        eduProjects,
        generalProjects,
        eduTasks,
        generalTasks,
        aiLogs: aiLogsCount,
        storageBytes,
      })

      setAiLogs(aiRows || [])
      setStorageMetrics(storageRows || [])
    } catch (error) {
      setMessage(error.message)
    }

    setLoading(false)
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

  const totalProjects = counts.eduProjects + counts.generalProjects
  const totalTasks = counts.eduTasks + counts.generalTasks

  const aiSuccessCount = aiLogs.filter((log) => log.status === 'success').length
  const aiFailedCount = aiLogs.filter((log) => log.status === 'failed').length

  const workspaceUsage = [
    {
      label: 'Educational Workspace',
      value: counts.eduProjects,
      total: totalProjects,
    },
    {
      label: 'General Workplace',
      value: counts.generalProjects,
      total: totalProjects,
    },
  ]

  const roleDistribution = [
    { label: 'Teachers', value: counts.teachers },
    { label: 'Students', value: counts.students },
    { label: 'Managers', value: counts.managers },
    { label: 'Sponsors', value: counts.sponsors },
    { label: 'Members', value: counts.members },
  ]

  const aiFeatureCounts = useMemo(() => {
    const map = {}

    aiLogs.forEach((log) => {
      map[log.feature_name] = (map[log.feature_name] || 0) + 1
    })

    return Object.entries(map)
      .map(([feature, value]) => ({ feature, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [aiLogs])

  const latestStorageByBucket = useMemo(() => {
    const map = {}

    storageMetrics.forEach((metric) => {
      if (!map[metric.bucket_name]) {
        map[metric.bucket_name] = metric
      }
    })

    return Object.values(map)
  }, [storageMetrics])

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Platform Analytics"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeader
              title="Platform Analytics"
              description="View system-level analytics without accessing private user operations."
            />

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Analytics'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading platform analytics...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card
                title="Total Users"
                value={counts.users}
                description="Registered accounts"
              />

              <Card
                title="Total Projects"
                value={totalProjects}
                description="Educational + general"
              />

              <Card
                title="Total Tasks"
                value={totalTasks}
                description="Tasks across workspaces"
              />

              <Card
                title="Storage Used"
                value={formatBytes(counts.storageBytes)}
                description="Latest bucket snapshots"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="User Role Distribution"
                  description="Aggregate user count by platform role."
                />

                <div className="mt-5 space-y-4">
                  {roleDistribution.map((item) => {
                    const percent = getPercent(item.value, counts.users)

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-bold text-gray-800">
                            {item.label}
                          </span>
                          <span className="font-black text-[#00B8B0]">
                            {item.value} ({percent}%)
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Workspace Usage"
                  description="Project distribution between Collabify workspaces."
                />

                <div className="mt-5 space-y-4">
                  {workspaceUsage.map((item) => {
                    const percent = getPercent(item.value, item.total)

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-bold text-gray-800">
                            {item.label}
                          </span>
                          <span className="font-black text-[#00B8B0]">
                            {item.value} ({percent}%)
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                    <p className="text-sm text-gray-500">Classes</p>
                    <p className="mt-1 text-3xl font-black text-gray-900">
                      {counts.classes}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                    <p className="text-sm text-gray-500">General Projects</p>
                    <p className="mt-1 text-3xl font-black text-gray-900">
                      {counts.generalProjects}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="AI Usage Analytics"
                  description="AI usage metadata only."
                />

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-300 bg-green-50 p-4">
                    <p className="text-sm text-green-700">Successful AI Logs</p>
                    <p className="mt-1 text-3xl font-black text-green-800">
                      {aiSuccessCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-300 bg-red-50 p-4">
                    <p className="text-sm text-red-700">Failed AI Logs</p>
                    <p className="mt-1 text-3xl font-black text-red-800">
                      {aiFailedCount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {aiFeatureCounts.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      No AI usage data yet.
                    </div>
                  ) : (
                    aiFeatureCounts.map((item) => (
                      <div
                        key={item.feature}
                        className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="break-words font-black text-gray-900">
                            {item.feature}
                          </p>

                          <span className="rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-bold text-[#00B8B0]">
                            {item.value}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Storage Analytics"
                  description="Latest usage snapshot by bucket."
                />

                <div className="mt-5 space-y-3">
                  {latestStorageByBucket.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      No storage analytics yet. Refresh metrics from Storage
                      Management first.
                    </div>
                  ) : (
                    latestStorageByBucket.map((bucket) => (
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
                              {bucket.file_count || 0} files
                            </p>
                          </div>

                          <span className="rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-bold text-[#00B8B0]">
                            {formatBytes(bucket.total_size_bytes)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminPlatformAnalyticsPage