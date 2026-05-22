import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, CheckCircle, BarChart3, User2Icon } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalSponsorNavigation } from '../config/generalNavigation'

function GeneralSponsorDashboard() {
  const [projects, setProjects] = useState([])
  const [approvalRequests, setApprovalRequests] = useState([])
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
    const { data: projectRows, error } = await supabase
      .from('general_projects')
      .select('*')
      .eq('project_sponsor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setProjects(projectRows || [])

    const { data: requestRows } = await supabase.rpc(
      'get_general_sponsor_task_approvals',
      {
        sponsor_uuid: user.id,
      }
    )

    setApprovalRequests(requestRows || [])

    const projectIds = (projectRows || []).map((project) => project.id)

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

  const activeProjects = projects.filter((project) => project.status === 'active').length
  const completedProjects = projects.filter((project) => project.status === 'completed').length

  const quickLinks = [
    {
      title: 'Sponsored Projects',
      description: 'Open your sponsored projects.',
      path: '/general/sponsor/projects',
      icon: FolderKanban,
    },
    {
      title: 'Approvals',
      description: 'Review task approval requests.',
      path: '/general/sponsor/approvals',
      icon: CheckCircle,
    },
    {
      title: 'Analytics',
      description: 'View sponsor project analytics.',
      path: '/general/sponsor/analytics',
      icon: BarChart3,
    },
    {
      title: 'Profile',
      description: 'Manage your account.',
      path: '/general/sponsor/settings',
      icon: User2Icon,
    },
  ]

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Sponsor Dashboard"
      navigation={generalSponsorNavigation}
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
            Review sponsored projects, approve task requests, monitor progress,
            and give revision feedback.
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
              <Card title="Sponsored" value={projects.length} description="Assigned projects" />
              <Card title="Active" value={activeProjects} description="Ongoing projects" />
              <Card title="Completed" value={completedProjects} description="Finished projects" />
              <Card title="Approvals" value={approvalRequests.length} description="Pending reviews" />
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
                  title="Pending Approval Requests"
                  description="Tasks waiting for your review."
                />

                {approvalRequests.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                    No pending approvals.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvalRequests.slice(0, 5).map((request) => (
                      <Link
                        key={request.task_id}
                        to={`/general/sponsor/projects/${request.project_id}/tasks/${request.task_id}`}
                        className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-[#EAF2FF]"
                      >
                        <p className="font-black text-gray-900">
                          {request.task_title}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {request.project_title}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Recent Activities"
                  description="Latest updates from sponsored projects."
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

export default GeneralSponsorDashboard