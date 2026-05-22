import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  CheckSquare,
  BarChart3,
  ClipboardCheck,
  Bot,
  Settings,
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'

function GeneralManagerDashboard() {
  const [projects, setProjects] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setLoading(false)
      setUser(user)
      return
    }

    const { data: projectRows, error } = await supabase.rpc(
      'get_general_manager_project_progress',
      {
        manager_uuid: user.id,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setProjects(projectRows || [])
const { data: profileData } = await supabase
  .from('profiles')
  .select('first_name')
  .eq('id', user.id)
  .single()

setProfile(profileData)
    const projectIds = (projectRows || []).map((project) => project.project_id)

    if (projectIds.length > 0) {
      const { data: activityRows } = await supabase
        .from('general_activity_logs')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(6)

      setActivities(activityRows || [])
    }

    setLoading(false)
  }

  const totalProjects = projects.length
  const activeProjects = projects.filter((project) => project.status === 'active').length
  const totalTasks = projects.reduce((sum, project) => sum + Number(project.task_count || 0), 0)
  const completedTasks = projects.reduce(
    (sum, project) => sum + Number(project.completed_task_count || 0),
    0
  )

  const quickLinks = [
    {
      title: 'Projects',
      description: 'Create and manage projects.',
      path: '/general/manager/projects',
      icon: FolderKanban,
    },
    {
      title: 'Tasks',
      description: 'Manage all project tasks.',
      path: '/general/manager/tasks',
      icon: CheckSquare,
    },
    {
      title: 'Analytics',
      description: 'View project performance.',
      path: '/general/manager/analytics',
      icon: BarChart3,
    },
    {
      title: 'Evaluation',
      description: 'Evaluate member performance.',
      path: '/general/manager/evaluation',
      icon: ClipboardCheck,
    },
    {
      title: 'AI Assistant',
      description: 'Generate insights and reports.',
      path: '/general/manager/ai-assistant',
      icon: Bot,
    },
    {
      title: 'Settings',
      description: 'Manage your account.',
      path: '/general/manager/settings',
      icon: Settings,
    },
  ]

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Manager Dashboard"
      navigation={generalManagerNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-8 shadow-sm">

<h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
  Welcome,{' '}
  {profile?.first_name ||
    user?.user_metadata?.first_name ||
    user?.email?.split('@')[0] ||
    'User'}
</h1>

          <p className="mt-3 max-w-2xl text-gray-500">
            Manage projects, monitor task progress, review activities, evaluate
            members, and access your tools quickly.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading dashboard...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card title="Projects" value={totalProjects} description="Managed projects" />
              <Card title="Active" value={activeProjects} description="Currently ongoing" />
              <Card title="Tasks" value={totalTasks} description="Total assigned work" />
              <Card title="Completed" value={completedTasks} description="Finished tasks" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="rounded-3xl border border-[#D6E4FF] bg-[#EAF2FF] p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-black">
                      <Icon size={24} />
                    </div>

                    <h2 className="text-xl font-black text-gray-900">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                      {item.description}
                    </p>
                  </Link>
                )
              })}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Recent Activities"
                  description="Latest updates from your managed projects."
                />

                {activities.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                    No recent activity yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {activity.description}
                        </p>

                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Project Progress"
                  description="Quick view of your project completion."
                />

                {projects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                    No projects yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.slice(0, 5).map((project) => {
                      const taskCount = Number(project.task_count || 0)
                      const completed = Number(project.completed_task_count || 0)
                      const progress =
                        taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0

                      return (
                        <Link
                          key={project.project_id}
                          to={`/general/manager/projects/${project.project_id}`}
                          className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-[#EAF2FF]"
                        >
                          <div className="mb-2 flex justify-between gap-3">
                            <p className="font-black text-gray-900">
                              {project.title}
                            </p>

                            <span className="text-sm font-black text-[#00B8B0]">
                              {progress}%
                            </span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-gray-300">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralManagerDashboard