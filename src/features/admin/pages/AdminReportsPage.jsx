import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { adminNavigation } from '../config/adminNavigation'
import { supabase } from '../../../lib/supabaseClient'

function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getPercent(value, total) {
  if (!total) return 0
  return Math.round((Number(value || 0) / Number(total || 0)) * 100)
}

function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [reportType, setReportType] = useState('full')

  const [profiles, setProfiles] = useState([])
  const [classes, setClasses] = useState([])
  const [groups, setGroups] = useState([])
  const [projects, setProjects] = useState([])
  const [generalProjects, setGeneralProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [generalTasks, setGeneralTasks] = useState([])
  const [aiLogs, setAiLogs] = useState([])
  const [storageMetrics, setStorageMetrics] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [systemLogs, setSystemLogs] = useState([])
  const [systemSettings, setSystemSettings] = useState([])
  const [institutions, setInstitutions] = useState([])

  useEffect(() => {
    fetchReportsData()
  }, [])

  async function safeSelect(table, query = '*', order = null) {
    let request = supabase.from(table).select(query)

    if (order) {
      request = request.order(order.column, { ascending: order.ascending })
    }

    const { data, error } = await request

    if (error) {
      console.warn(`${table} unavailable:`, error.message)
      return []
    }

    return data || []
  }

  async function fetchReportsData() {
    setLoading(true)
    setMessage('')

    try {
      const [
        profilesRows,
        classRows,
        groupRows,
        projectRows,
        generalProjectRows,
        taskRows,
        generalTaskRows,
        aiLogRows,
        storageRows,
        announcementRows,
        systemLogRows,
        settingRows,
        institutionRows,
      ] = await Promise.all([
        safeSelect('profiles', 'id, role, created_at'),
        safeSelect('classes', 'id, created_at'),
        safeSelect('groups', 'id, created_at'),
        safeSelect('projects', 'id, status, created_at'),
        safeSelect('general_projects', 'id, status, created_at'),
        safeSelect('tasks', 'id, status, source, created_at'),
        safeSelect('general_tasks', 'id, status, created_at'),
        safeSelect('ai_usage_logs', '*', { column: 'created_at', ascending: false }),
        safeSelect('storage_metrics', '*', { column: 'measured_at', ascending: false }),
        safeSelect('platform_announcements', '*', { column: 'created_at', ascending: false }),
        safeSelect('system_logs', '*', { column: 'created_at', ascending: false }),
        safeSelect('system_settings', '*'),
        safeSelect('institutions', '*'),
      ])

      setProfiles(profilesRows)
      setClasses(classRows)
      setGroups(groupRows)
      setProjects(projectRows)
      setGeneralProjects(generalProjectRows)
      setTasks(taskRows)
      setGeneralTasks(generalTaskRows)
      setAiLogs(aiLogRows)
      setStorageMetrics(storageRows)
      setAnnouncements(announcementRows)
      setSystemLogs(systemLogRows)
      setSystemSettings(settingRows)
      setInstitutions(institutionRows)
    } catch (error) {
      setMessage(error.message)
    }

    setLoading(false)
  }

  const latestStorageBuckets = useMemo(() => {
    const map = {}

    storageMetrics.forEach((item) => {
      if (!map[item.bucket_name]) {
        map[item.bucket_name] = item
      }
    })

    return Object.values(map)
  }, [storageMetrics])

  const totalStorageBytes = latestStorageBuckets.reduce(
    (sum, item) => sum + Number(item.total_size_bytes || 0),
    0
  )

  const totalStorageFiles = latestStorageBuckets.reduce(
    (sum, item) => sum + Number(item.file_count || 0),
    0
  )

  const averageUploadSize =
    totalStorageFiles > 0 ? totalStorageBytes / totalStorageFiles : 0

  const aiSettings =
    systemSettings.find((item) => item.setting_key === 'ai')?.setting_value || {}

  const storageSettings =
    systemSettings.find((item) => item.setting_key === 'uploads')?.setting_value || {}

  const roleCounts = useMemo(() => {
    const map = {}

    profiles.forEach((profile) => {
      const role = profile.role || 'unknown'
      map[role] = (map[role] || 0) + 1
    })

    return Object.entries(map)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
  }, [profiles])

  const aiFeatureCounts = useMemo(() => {
    const map = {}

    aiLogs.forEach((log) => {
      const feature = log.feature_name || 'unknown'
      map[feature] = (map[feature] || 0) + 1
    })

    return Object.entries(map)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
  }, [aiLogs])

  const recentAiTrend = useMemo(() => {
    const map = {}

    aiLogs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString()
      map[date] = (map[date] || 0) + 1
    })

    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .slice(0, 7)
  }, [aiLogs])

  const storageTrend = useMemo(() => {
    return storageMetrics.slice(0, 8)
  }, [storageMetrics])

  const successfulAi = aiLogs.filter((log) => log.status === 'success').length
  const failedAi = aiLogs.filter((log) => log.status === 'failed').length

  const teacherCount = profiles.filter((item) => item.role === 'teacher').length
  const studentCount = profiles.filter((item) => item.role === 'student').length
  const managerCount = profiles.filter((item) => item.role === 'project_manager').length
  const sponsorCount = profiles.filter((item) => item.role === 'project_sponsor').length
  const memberCount = profiles.filter((item) => item.role === 'project_member').length

  const activeEducationalUsers = teacherCount + studentCount
  const totalProjects = projects.length + generalProjects.length
  const totalTasks = tasks.length + generalTasks.length

  const errorLogs = systemLogs.filter(
    (log) => log.severity === 'error' || log.log_type === 'error'
  ).length

  const failedSystemLogs = systemLogs.filter(
    (log) => String(log.status || log.severity || '').toLowerCase().includes('fail')
  ).length

  function generateCsv() {
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', profiles.length],
      ['Total Classes', classes.length],
      ['Educational Projects', projects.length],
      ['General Projects', generalProjects.length],
      ['Educational Tasks', tasks.length],
      ['General Tasks', generalTasks.length],
      ['Total AI Requests', aiLogs.length],
      ['Successful AI Requests', successfulAi],
      ['Failed AI Requests', failedAi],
      ['Total Storage Used', formatBytes(totalStorageBytes)],
      ['Total Buckets Used', latestStorageBuckets.length],
      ['Total Announcements', announcements.length],
      ['Registered Institutions', institutions.length],
    ]

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `collabify-${reportType}-report.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  function generateReportHtml() {
    const generatedAt = new Date().toLocaleString()

    const roleRows = roleCounts
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.role)}</td>
            <td>${item.count}</td>
          </tr>
        `
      )
      .join('')

    const aiRows = aiFeatureCounts
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.feature)}</td>
            <td>${item.count}</td>
          </tr>
        `
      )
      .join('')

    const storageRows = latestStorageBuckets
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.bucket_name)}</td>
            <td>${item.file_count || 0}</td>
            <td>${formatBytes(item.total_size_bytes)}</td>
            <td>${item.measured_at ? new Date(item.measured_at).toLocaleString() : 'N/A'}</td>
          </tr>
        `
      )
      .join('')

    const announcementRows = announcements
      .slice(0, 10)
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.title)}</td>
            <td>${escapeHtml(item.target_workspace || 'all')}</td>
            <td>${item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</td>
          </tr>
        `
      )
      .join('')

    const institutionRows = institutions
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name || item.institution_name || item.title || item.id)}</td>
            <td>${escapeHtml(item.status || 'active')}</td>
            <td>${item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</td>
          </tr>
        `
      )
      .join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Collabify Admin Report</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: white;
            }

            .header {
              border-bottom: 3px solid #111827;
              padding-bottom: 18px;
              margin-bottom: 26px;
            }

            .eyebrow {
              color: #0f766e;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 0.2em;
              text-transform: uppercase;
            }

            h1 {
              margin: 8px 0 0;
              font-size: 30px;
              font-weight: 900;
            }

            h2 {
              margin-top: 30px;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 6px;
              font-size: 20px;
              font-weight: 900;
            }

            p {
              font-size: 12px;
              color: #4b5563;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-top: 14px;
            }

            .card {
              border: 1px solid #9ca3af;
              border-radius: 10px;
              padding: 12px;
              background: #f8fbff;
            }

            .card strong {
              display: block;
              font-size: 11px;
              color: #4b5563;
            }

            .card span {
              display: block;
              margin-top: 6px;
              font-size: 22px;
              font-weight: 900;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              font-size: 11px;
            }

            th {
              background: #e5e7eb;
              font-weight: 900;
            }

            th, td {
              border: 1px solid #9ca3af;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }

            .note {
              margin-top: 30px;
              border: 1px solid #9ca3af;
              border-radius: 10px;
              padding: 12px;
              background: #f9fafb;
            }

            @media print {
              body { padding: 24px; }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="eyebrow">Collabify Platform Administration</div>
            <h1>${escapeHtml(reportType.toUpperCase())} Report</h1>
            <p>Generated on ${escapeHtml(generatedAt)}</p>
          </div>

          <h2>Platform Overview</h2>
          <div class="grid">
            <div class="card"><strong>Total Users</strong><span>${profiles.length}</span></div>
            <div class="card"><strong>Total Projects</strong><span>${totalProjects}</span></div>
            <div class="card"><strong>Total AI Requests</strong><span>${aiLogs.length}</span></div>
            <div class="card"><strong>Storage Used</strong><span>${formatBytes(totalStorageBytes)}</span></div>
          </div>

          <h2>Platform Growth Statistics</h2>
          <table>
            <tbody>
              <tr><th>Total Registered Users</th><td>${profiles.length}</td></tr>
              <tr><th>Total Classes</th><td>${classes.length}</td></tr>
              <tr><th>Total Educational Projects</th><td>${projects.length}</td></tr>
              <tr><th>Total Workplace Projects</th><td>${generalProjects.length}</td></tr>
              <tr><th>Total Tasks</th><td>${totalTasks}</td></tr>
              <tr><th>Total Buckets Used</th><td>${latestStorageBuckets.length}</td></tr>
            </tbody>
          </table>

          <h2>User Role Distribution</h2>
          <table>
            <thead><tr><th>Role</th><th>Total</th></tr></thead>
            <tbody>${roleRows || '<tr><td colspan="2">No role data.</td></tr>'}</tbody>
          </table>

          <h2>Workspace Usage Report</h2>
          <table>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Classes</th>
                <th>Projects</th>
                <th>Groups</th>
                <th>Tasks</th>
                <th>Active Users</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Educational Workspace</td>
                <td>${classes.length}</td>
                <td>${projects.length}</td>
                <td>${groups.length}</td>
                <td>${tasks.length}</td>
                <td>${activeEducationalUsers}</td>
              </tr>
              <tr>
                <td>General Workplace</td>
                <td>N/A</td>
                <td>${generalProjects.length}</td>
                <td>N/A</td>
                <td>${generalTasks.length}</td>
                <td>${managerCount + sponsorCount + memberCount}</td>
              </tr>
            </tbody>
          </table>

          <h2>AI Usage Report</h2>
          <table>
            <tbody>
              <tr><th>Total AI Requests</th><td>${aiLogs.length}</td></tr>
              <tr><th>Successful AI Requests</th><td>${successfulAi}</td></tr>
              <tr><th>Failed AI Requests</th><td>${failedAi}</td></tr>
              <tr><th>AI Service Status</th><td>${aiSettings.enabled === false ? 'Disabled' : 'Enabled'}</td></tr>
            </tbody>
          </table>

          <table>
            <thead><tr><th>AI Feature</th><th>Usage Count</th></tr></thead>
            <tbody>${aiRows || '<tr><td colspan="2">No AI logs.</td></tr>'}</tbody>
          </table>

          <h2>Storage Usage Report</h2>
          <table>
            <tbody>
              <tr><th>Total Platform Storage Used</th><td>${formatBytes(totalStorageBytes)}</td></tr>
              <tr><th>Total Uploaded Files</th><td>${totalStorageFiles}</td></tr>
              <tr><th>Average Upload Size</th><td>${formatBytes(averageUploadSize)}</td></tr>
              <tr><th>Storage Health</th><td>${totalStorageBytes >= Number(storageSettings.storage_warning_limit_mb || 0) * 1024 * 1024 ? 'Warning' : 'Healthy'}</td></tr>
            </tbody>
          </table>

          <table>
            <thead><tr><th>Bucket</th><th>Files</th><th>Storage Used</th><th>Measured At</th></tr></thead>
            <tbody>${storageRows || '<tr><td colspan="4">No storage data.</td></tr>'}</tbody>
          </table>

          <h2>System Health Report</h2>
          <table>
            <tbody>
              <tr><th>Database Health</th><td>Connected</td></tr>
              <tr><th>API Activity</th><td>${systemLogs.length} system logs</td></tr>
              <tr><th>Authentication Statistics</th><td>${profiles.length} registered authenticated profiles</td></tr>
              <tr><th>Error Counts</th><td>${errorLogs}</td></tr>
              <tr><th>Failed Requests</th><td>${failedSystemLogs}</td></tr>
              <tr><th>System Uptime</th><td>Application-level uptime monitoring not yet connected</td></tr>
              <tr><th>AI Service Status</th><td>${aiSettings.enabled === false ? 'Disabled' : 'Enabled'}</td></tr>
              <tr><th>Storage Health</th><td>${latestStorageBuckets.length > 0 ? 'Tracked' : 'No metrics recorded'}</td></tr>
            </tbody>
          </table>

          <h2>Announcement Report</h2>
          <table>
            <tbody>
              <tr><th>Total Announcements</th><td>${announcements.length}</td></tr>
              <tr><th>Announcement Frequency</th><td>${announcements.length} total recorded announcement(s)</td></tr>
            </tbody>
          </table>

          <table>
            <thead><tr><th>Title</th><th>Target</th><th>Created At</th></tr></thead>
            <tbody>${announcementRows || '<tr><td colspan="3">No announcements.</td></tr>'}</tbody>
          </table>

          <h2>Institution Report</h2>
          <table>
            <tbody>
              <tr><th>Registered Institutions</th><td>${institutions.length}</td></tr>
              <tr><th>Institution Counts</th><td>${institutions.length}</td></tr>
              <tr><th>Active Institution Administrators</th><td>Not connected</td></tr>
              <tr><th>Institution Activity Levels</th><td>Not connected</td></tr>
            </tbody>
          </table>

          <table>
            <thead><tr><th>Institution</th><th>Status</th><th>Created At</th></tr></thead>
            <tbody>${institutionRows || '<tr><td colspan="3">No institution table/data found.</td></tr>'}</tbody>
          </table>

          <div class="note">
            <strong>Privacy Notice:</strong>
            <p>This report contains platform-level metadata only. It does not include private chats, submissions, grades, task contents, uploaded file contents, or user-controlled project operations.</p>
          </div>

          <script>
            window.onload = function () {
              window.print()
            }
          </script>
        </body>
      </html>
    `
  }

  function handlePrintPdf() {
    const reportWindow = window.open('', '_blank')

    if (!reportWindow) {
      setMessage('Please allow pop-ups to generate the PDF report.')
      return
    }

    reportWindow.document.open()
    reportWindow.document.write(generateReportHtml())
    reportWindow.document.close()
  }

  return (
    <DashboardLayout
      title="Collabify Admin"
      pageTitle="Reports"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <SectionHeader
              title="System Reports"
              description="Generate platform-level metadata reports without exposing private user content."
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={fetchReportsData}
                disabled={loading}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>

              <button
                onClick={generateCsv}
                disabled={loading}
                className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-700 transition-all hover:bg-violet-100 disabled:opacity-50"
              >
                Export CSV
              </button>

              <button
                onClick={handlePrintPdf}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                Print / Download PDF
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading reports...</p>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Downloadable Report Generation"
                description="Choose which report type to preview and export."
              />

              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="mt-4 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-[#00CFC8]"
              >
                <option value="full">Full System Report</option>
                <option value="platform">Platform Overview Report</option>
                <option value="workspace">Workspace Usage Report</option>
                <option value="ai">AI Usage Report</option>
                <option value="storage">Storage Usage Report</option>
                <option value="system_health">System Health Report</option>
                <option value="announcements">Announcement Report</option>
                <option value="institutions">Institution Report</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card title="Total Users" value={profiles.length} description="Registered users" />
              <Card title="Total Projects" value={totalProjects} description="All workspaces" />
              <Card title="AI Requests" value={aiLogs.length} description="AI metadata logs" />
              <Card title="Storage Used" value={formatBytes(totalStorageBytes)} description="Latest storage snapshot" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ReportSection title="Platform Overview Report">
                <Metric label="Total registered users" value={profiles.length} />
                <Metric label="Total classes" value={classes.length} />
                <Metric label="Total educational projects" value={projects.length} />
                <Metric label="Total workplace projects" value={generalProjects.length} />
                <Metric label="Total tasks" value={totalTasks} />
                <Metric label="Total AI requests" value={aiLogs.length} />
                <Metric label="Total storage usage" value={formatBytes(totalStorageBytes)} />
                <Metric label="Total buckets used" value={latestStorageBuckets.length} />
              </ReportSection>

              <ReportSection title="Workspace Usage Report">
                <Metric label="Educational classes" value={classes.length} />
                <Metric label="Academic projects" value={projects.length} />
                <Metric label="Student groups" value={groups.length} />
                <Metric label="Academic tasks" value={tasks.length} />
                <Metric label="Active educational users" value={activeEducationalUsers} />
                <Metric label="Workplace projects" value={generalProjects.length} />
                <Metric label="Project managers" value={managerCount} />
                <Metric label="Sponsors" value={sponsorCount} />
                <Metric label="Members" value={memberCount} />
                <Metric label="Workplace tasks" value={generalTasks.length} />
              </ReportSection>

              <ReportSection title="AI Usage Report">
                <Metric label="Total AI requests" value={aiLogs.length} />
                <Metric label="Successful requests" value={successfulAi} />
                <Metric label="Failed requests" value={failedAi} />
                <Metric label="AI service status" value={aiSettings.enabled === false ? 'Disabled' : 'Enabled'} />
                <Metric label="Average AI response activity" value={`${aiLogs.length} logged request(s)`} />
              </ReportSection>

              <ReportSection title="Storage Usage Report">
                <Metric label="Total platform storage used" value={formatBytes(totalStorageBytes)} />
                <Metric label="Total uploaded files" value={totalStorageFiles} />
                <Metric label="Average upload size" value={formatBytes(averageUploadSize)} />
                <Metric label="Largest storage bucket" value={latestStorageBuckets[0]?.bucket_name || 'No data'} />
                <Metric label="Storage health" value={latestStorageBuckets.length > 0 ? 'Tracked' : 'No metrics'} />
              </ReportSection>

              <ReportSection title="System Health Report">
                <Metric label="Database health" value="Connected" />
                <Metric label="API activity" value={`${systemLogs.length} system log(s)`} />
                <Metric label="Active sessions" value="Not connected" />
                <Metric label="Authentication statistics" value={`${profiles.length} profiles`} />
                <Metric label="Error counts" value={errorLogs} />
                <Metric label="Failed requests" value={failedSystemLogs} />
                <Metric label="System uptime" value="Not connected" />
                <Metric label="AI service status" value={aiSettings.enabled === false ? 'Disabled' : 'Enabled'} />
                <Metric label="Storage health" value={latestStorageBuckets.length > 0 ? 'Tracked' : 'No metrics'} />
              </ReportSection>

              <ReportSection title="Announcement Reports">
                <Metric label="Total announcements" value={announcements.length} />
                <Metric label="Most recent announcement" value={announcements[0]?.title || 'None'} />
                <Metric label="Announcement categories" value={[...new Set(announcements.map((item) => item.target_workspace || 'all'))].join(', ') || 'None'} />
                <Metric label="Announcement frequency" value={`${announcements.length} total`} />
              </ReportSection>

              <ReportSection title="Institution Reports">
                <Metric label="Registered institutions" value={institutions.length} />
                <Metric label="Institution counts" value={institutions.length} />
                <Metric label="Active institution administrators" value="Not connected" />
                <Metric label="Institution activity levels" value="Not connected" />
              </ReportSection>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartCard title="User Role Distribution">
                {roleCounts.map((item) => (
                  <ProgressBar
                    key={item.role}
                    label={item.role}
                    value={item.count}
                    percent={getPercent(item.count, profiles.length)}
                  />
                ))}
              </ChartCard>

              <ChartCard title="Workspace Distribution">
                <ProgressBar
                  label="Educational Workspace"
                  value={projects.length}
                  percent={getPercent(projects.length, totalProjects)}
                />
                <ProgressBar
                  label="General Workplace"
                  value={generalProjects.length}
                  percent={getPercent(generalProjects.length, totalProjects)}
                />
              </ChartCard>

              <ChartCard title="AI Usage Trend">
                {recentAiTrend.length === 0 ? (
                  <p className="text-sm text-gray-500">No AI trend data yet.</p>
                ) : (
                  recentAiTrend.map((item) => (
                    <ProgressBar
                      key={item.date}
                      label={item.date}
                      value={item.count}
                      percent={getPercent(item.count, aiLogs.length)}
                    />
                  ))
                )}
              </ChartCard>

              <ChartCard title="Storage Usage Trend">
                {storageTrend.length === 0 ? (
                  <p className="text-sm text-gray-500">No storage trend data yet.</p>
                ) : (
                  storageTrend.map((item) => (
                    <ProgressBar
                      key={item.id}
                      label={item.bucket_name}
                      value={formatBytes(item.total_size_bytes)}
                      percent={getPercent(item.total_size_bytes, totalStorageBytes)}
                    />
                  ))
                )}
              </ChartCard>
            </div>

            <DataTable title="AI Logs Summary" columns={['Feature', 'Workspace', 'Status', 'Date']}>
              {aiLogs.slice(0, 20).map((log) => (
                <tr key={log.id}>
                  <td className="border-b border-gray-200 p-4">{log.feature_name}</td>
                  <td className="border-b border-gray-200 p-4">{log.workspace}</td>
                  <td className="border-b border-gray-200 p-4">{log.status}</td>
                  <td className="border-b border-gray-200 p-4">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </DataTable>

            <DataTable title="Bucket Usage" columns={['Bucket', 'Files', 'Storage Used', 'Measured At']}>
              {latestStorageBuckets.map((bucket) => (
                <tr key={bucket.bucket_name}>
                  <td className="border-b border-gray-200 p-4">{bucket.bucket_name}</td>
                  <td className="border-b border-gray-200 p-4">{bucket.file_count}</td>
                  <td className="border-b border-gray-200 p-4">{formatBytes(bucket.total_size_bytes)}</td>
                  <td className="border-b border-gray-200 p-4">{new Date(bucket.measured_at).toLocaleString()}</td>
                </tr>
              ))}
            </DataTable>

            <DataTable title="System Activity" columns={['Type', 'Title', 'Severity', 'Date']}>
              {systemLogs.slice(0, 20).map((log) => (
                <tr key={log.id}>
                  <td className="border-b border-gray-200 p-4">{log.log_type}</td>
                  <td className="border-b border-gray-200 p-4">{log.title}</td>
                  <td className="border-b border-gray-200 p-4">{log.severity}</td>
                  <td className="border-b border-gray-200 p-4">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </DataTable>

            <DataTable title="Growth Metrics" columns={['Metric', 'Value']}>
              <tr>
                <td className="border-b border-gray-200 p-4">Registered users</td>
                <td className="border-b border-gray-200 p-4">{profiles.length}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-200 p-4">Educational projects</td>
                <td className="border-b border-gray-200 p-4">{projects.length}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-200 p-4">Workplace projects</td>
                <td className="border-b border-gray-200 p-4">{generalProjects.length}</td>
              </tr>
              <tr>
                <td className="border-b border-gray-200 p-4">AI logs</td>
                <td className="border-b border-gray-200 p-4">{aiLogs.length}</td>
              </tr>
            </DataTable>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function ReportSection({ title, children }) {
  return (
    <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-black">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <p className="text-right text-sm font-black text-gray-900">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-black">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  )
}

function ProgressBar({ label, value, percent }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-gray-800">{label}</span>
        <span className="font-black text-[#00B8B0]">
          {value} ({percent}%)
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
}

function DataTable({ title, columns, children }) {
  return (
    <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-black">{title}</h2>

      <div className="mt-5 overflow-hidden rounded-3xl border border-gray-300">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-gray-200 p-4 text-left text-gray-700"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminReportsPage