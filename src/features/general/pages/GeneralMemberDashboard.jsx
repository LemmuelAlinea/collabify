import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, CheckSquare, BarChart3, User2Icon } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalMemberNavigation } from '../config/generalNavigation'

function GeneralMemberDashboard() {
  const [tasks, setTasks] = useState([])
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
const { data: profileData } = await supabase
  .from('profiles')
  .select('first_name')
  .eq('id', user.id)
  .single()

setProfile(profileData)
    const { data: taskRows, error } = await supabase.rpc(
      'get_general_member_tasks',
      {
        member_uuid: user.id,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setTasks(taskRows || [])

    const projectIds = [
      ...new Set((taskRows || []).map((task) => task.project_id)),
    ]

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

  const totalProjects = new Set(tasks.map((task) => task.project_id)).size
  const totalTasks = tasks.length
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length
  const completedTasks = tasks.filter((task) => task.status === 'completed').length

  const quickLinks = [
    {
      title: 'My Projects',
      description: 'Open projects you belong to.',
      path: '/general/member/projects',
      icon: FolderKanban,
    },
    {
      title: 'My Tasks',
      description: 'Start tasks and upload work.',
      path: '/general/member/tasks',
      icon: CheckSquare,
    },
    {
      title: 'Analytics',
      description: 'Track your contribution.',
      path: '/general/member/analytics',
      icon: BarChart3,
    },
    {
      title: 'Profile',
      description: 'Manage your account.',
      path: '/general/member/settings',
      icon: User2Icon,
    },
  ]

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Member Dashboard"
      navigation={generalMemberNavigation}
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
            View assigned projects, start tasks, upload work, track progress,
            and monitor your recent activity.
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
              <Card title="Projects" value={totalProjects} description="Assigned projects" />
              <Card title="Tasks" value={totalTasks} description="Assigned to you" />
              <Card title="In Progress" value={inProgressTasks} description="Currently working" />
              <Card title="Completed" value={completedTasks} description="Finished tasks" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  title="Upcoming / Active Tasks"
                  description="Tasks you should work on next."
                />

                {tasks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                    No assigned tasks yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks
                      .filter((task) => task.status !== 'completed')
                      .slice(0, 5)
                      .map((task) => (
                        <Link
                          key={task.id}
                          to={`/general/member/projects/${task.project_id}/tasks/${task.id}`}
                          className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-[#EAF2FF]"
                        >
                          <p className="font-black text-gray-900">
                            {task.title}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {task.project_title}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-[#00B8B0]">
                            {task.status}
                          </p>
                        </Link>
                      ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Recent Activities"
                  description="Latest updates from your assigned projects."
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
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralMemberDashboard