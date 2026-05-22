import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Database,
  FileText,
  HardDrive,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'

import DashboardLayout from '../../../layouts/DashboardLayout'
import SectionHeader from '../../../components/ui/SectionHeader'
import Card from '../../../components/ui/Card'
import { adminNavigation } from '../config/adminNavigation'
import { supabase } from '../../../lib/supabaseClient'

function formatBytes(bytes) {
  const value = Number(bytes || 0)

  if (value < 1024) return `${value} B`

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function DashboardShortcut({
  to,
  icon: Icon,
  title,
  description,
  gradient,
}) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r ${gradient}`}
      >
        <Icon size={24} className="text-black" />
      </div>

      <h3 className="mt-4 text-lg font-black text-gray-900">{title}</h3>

      <p className="mt-2 text-sm text-gray-500">{description}</p>

      <div className="mt-4 text-sm font-bold text-[#00B8B0]">
        Open Module →
      </div>
    </Link>
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

function AdminDashboard() {
  const [loading, setLoading] = useState(true)

  const [profiles, setProfiles] = useState([])
  const [projects, setProjects] = useState([])
  const [generalProjects, setGeneralProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [generalTasks, setGeneralTasks] = useState([])
  const [aiLogs, setAiLogs] = useState([])
  const [storageMetrics, setStorageMetrics] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [systemLogs, setSystemLogs] = useState([])
  const [systemSettings, setSystemSettings] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function safeSelect(table, query = '*', order = null) {
    let request = supabase.from(table).select(query)

    if (order) {
      request = request.order(order.column, {
        ascending: order.ascending,
      })
    }

    const { data } = await request

    return data || []
  }

  async function fetchDashboardData() {
    setLoading(true)

    const [
      profilesRows,
      projectRows,
      generalProjectRows,
      taskRows,
      generalTaskRows,
      aiLogRows,
      storageRows,
      announcementRows,
      logRows,
      settingsRows,
    ] = await Promise.all([
      safeSelect('profiles'),
      safeSelect('projects'),
      safeSelect('general_projects'),
      safeSelect('tasks'),
      safeSelect('general_tasks'),
      safeSelect('ai_usage_logs', '*', {
        column: 'created_at',
        ascending: false,
      }),
      safeSelect('storage_metrics', '*', {
        column: 'measured_at',
        ascending: false,
      }),
      safeSelect('platform_announcements', '*', {
        column: 'created_at',
        ascending: false,
      }),
      safeSelect('system_logs', '*', {
        column: 'created_at',
        ascending: false,
      }),
      safeSelect('system_settings'),
    ])

    setProfiles(profilesRows)
    setProjects(projectRows)
    setGeneralProjects(generalProjectRows)
    setTasks(taskRows)
    setGeneralTasks(generalTaskRows)
    setAiLogs(aiLogRows)
    setStorageMetrics(storageRows)
    setAnnouncements(announcementRows)
    setSystemLogs(logRows)
    setSystemSettings(settingsRows)

    setLoading(false)
  }

  const totalProjects = projects.length + generalProjects.length
  const totalTasks = tasks.length + generalTasks.length

  const latestStorageBuckets = useMemo(() => {
    const map = {}

    storageMetrics.forEach((metric) => {
      if (!map[metric.bucket_name]) {
        map[metric.bucket_name] = metric
      }
    })

    return Object.values(map)
  }, [storageMetrics])

  const totalStorageUsed = latestStorageBuckets.reduce(
    (sum, item) => sum + Number(item.total_size_bytes || 0),
    0
  )

  const aiSettings =
    systemSettings.find((item) => item.setting_key === 'ai')
      ?.setting_value || {}

  const maintenanceSettings =
    systemSettings.find((item) => item.setting_key === 'maintenance')
      ?.setting_value || {}

  const teacherCount = profiles.filter(
    (item) => item.role === 'teacher'
  ).length

  const studentCount = profiles.filter(
    (item) => item.role === 'student'
  ).length

  const managerCount = profiles.filter(
    (item) => item.role === 'project_manager'
  ).length

  const sponsorCount = profiles.filter(
    (item) => item.role === 'project_sponsor'
  ).length

  const memberCount = profiles.filter(
    (item) => item.role === 'project_member'
  ).length

  const educationalProjects = projects.length
  const workplaceProjects = generalProjects.length

  const workspaceTotal =
    educationalProjects + workplaceProjects

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Dashboard"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        {/* HERO */}
        <div className="rounded-[32px] border border-gray-400 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-700 bg-clip-text text-5xl font-black text-transparent">
                Collabify Admin Control Center
              </h1>

              <p className="mt-4 max-w-3xl text-gray-500">
                Monitor platform health, AI systems, storage,
                workspace growth, reports, and operational
                analytics without accessing private user data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-5">
                <p className="text-sm font-semibold text-gray-500">
                  AI Status
                </p>

                <p className="mt-2 text-3xl font-black text-gray-900">
                  {aiSettings.enabled === false
                    ? 'Disabled'
                    : 'Active'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-5">
                <p className="text-sm font-semibold text-gray-500">
                  Maintenance
                </p>

                <p className="mt-2 text-3xl font-black text-gray-900">
                  {maintenanceSettings.enabled
                    ? 'Enabled'
                    : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card
            title="Total Users"
            value={profiles.length}
            description="Registered accounts"
          />

          <Card
            title="Projects"
            value={totalProjects}
            description="All workspaces"
          />

          <Card
            title="AI Requests"
            value={aiLogs.length}
            description="Tracked AI usage"
          />

          <Card
            title="Storage Used"
            value={formatBytes(totalStorageUsed)}
            description="Current platform usage"
          />
        </div>

{/* SHORTCUT MODULES */}
<div className="rounded-3xl border border-gray-400 bg-white p-4 sm:p-6 shadow-sm">
  <SectionHeader
    title="Quick Access Modules"
    description="Fast navigation for platform administration."
  />

  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
    <DashboardShortcut
      to="/admin/platform-analytics"
      icon={BarChart3}
      title="Analytics"
      description="Platform insights"
      gradient="from-cyan-400 to-green-400"
    />

    <DashboardShortcut
      to="/admin/ai-monitoring"
      icon={Bot}
      title="AI"
      description="Monitor AI systems"
      gradient="from-violet-400 to-fuchsia-400"
    />

    <DashboardShortcut
      to="/admin/storage"
      icon={HardDrive}
      title="Storage"
      description="Bucket management"
      gradient="from-orange-400 to-yellow-300"
    />

    <DashboardShortcut
      to="/admin/reports"
      icon={FileText}
      title="Reports"
      description="Generate reports"
      gradient="from-sky-400 to-cyan-400"
    />

    <DashboardShortcut
      to="/admin/profile"
      icon={Users}
      title="Profile"
      description="Profile controls"
      gradient="from-emerald-400 to-lime-400"
    />
  </div>
</div>

        {/* WORKSPACE DISTRIBUTION */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Workspace Distribution"
              description="Project allocation between Collabify workspaces."
            />

            <div className="mt-6 space-y-5">
              <ProgressBar
                label="Educational Workspace"
                value={educationalProjects}
                percent={
                  workspaceTotal > 0
                    ? Math.round(
                        (educationalProjects / workspaceTotal) *
                          100
                      )
                    : 0
                }
              />

              <ProgressBar
                label="General Workplace"
                value={workplaceProjects}
                percent={
                  workspaceTotal > 0
                    ? Math.round(
                        (workplaceProjects / workspaceTotal) *
                          100
                      )
                    : 0
                }
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                <p className="text-sm text-gray-500">
                  Educational Projects
                </p>

                <p className="mt-2 text-3xl font-black text-gray-900">
                  {educationalProjects}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                <p className="text-sm text-gray-500">
                  Workplace Projects
                </p>

                <p className="mt-2 text-3xl font-black text-gray-900">
                  {workplaceProjects}
                </p>
              </div>
            </div>
          </div>

          {/* USER DISTRIBUTION */}
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="User Role Distribution"
              description="Platform-wide user role statistics."
            />

            <div className="mt-6 space-y-5">
              <ProgressBar
                label="Students"
                value={studentCount}
                percent={
                  profiles.length > 0
                    ? Math.round(
                        (studentCount / profiles.length) * 100
                      )
                    : 0
                }
              />

              <ProgressBar
                label="Teachers"
                value={teacherCount}
                percent={
                  profiles.length > 0
                    ? Math.round(
                        (teacherCount / profiles.length) * 100
                      )
                    : 0
                }
              />

              <ProgressBar
                label="Managers"
                value={managerCount}
                percent={
                  profiles.length > 0
                    ? Math.round(
                        (managerCount / profiles.length) * 100
                      )
                    : 0
                }
              />

              <ProgressBar
                label="Sponsors"
                value={sponsorCount}
                percent={
                  profiles.length > 0
                    ? Math.round(
                        (sponsorCount / profiles.length) * 100
                      )
                    : 0
                }
              />

              <ProgressBar
                label="Members"
                value={memberCount}
                percent={
                  profiles.length > 0
                    ? Math.round(
                        (memberCount / profiles.length) * 100
                      )
                    : 0
                }
              />
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400">
                <ShieldCheck size={24} className="text-black" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-black">
                  System Health
                </h2>

                <p className="text-sm text-gray-500">
                  Operational platform status.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                <p className="text-sm text-gray-500">
                  Database Status
                </p>

                <p className="mt-2 text-xl font-black text-green-600">
                  Connected
                </p>
              </div>

              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                <p className="text-sm text-gray-500">
                  System Logs
                </p>

                <p className="mt-2 text-xl font-black text-gray-900">
                  {systemLogs.length}
                </p>
              </div>
            </div>
          </div>

          {/* STORAGE */}
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-300">
                <Database size={24} className="text-black" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-black">
                  Storage
                </h2>

                <p className="text-sm text-gray-500">
                  Current storage monitoring.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                <p className="text-sm text-gray-500">
                  Buckets Tracked
                </p>

                <p className="mt-2 text-xl font-black text-gray-900">
                  {latestStorageBuckets.length}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                <p className="text-sm text-gray-500">
                  Storage Used
                </p>

                <p className="mt-2 text-xl font-black text-gray-900">
                  {formatBytes(totalStorageUsed)}
                </p>
              </div>
            </div>
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400">
                <Bell size={24} className="text-black" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-black">
                  Announcements
                </h2>

                <p className="text-sm text-gray-500">
                  Latest platform announcements.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {announcements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  No announcements yet.
                </div>
              ) : (
                announcements.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4"
                  >
                    <p className="font-black text-gray-900">
                      {item.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AdminDashboard