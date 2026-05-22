import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalSponsorNavigation } from '../config/generalNavigation'

function GeneralSponsorProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.rpc('get_general_sponsor_projects', {
      sponsor_uuid: user.id,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setProjects(data || [])
    setLoading(false)
  }

  const activeProjects = projects.filter((project) => project.status === 'active')
  const planningProjects = projects.filter((project) => project.status === 'planning')
  const completedProjects = projects.filter((project) => project.status === 'completed')

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Sponsored Projects"
      navigation={generalSponsorNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>

          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Sponsored Projects
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor the general projects where you are assigned as the sponsor.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading sponsored projects...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card
                title="Sponsored Projects"
                value={projects.length}
                description="Assigned to you"
              />

              <Card
                title="Planning"
                value={planningProjects.length}
                description="Preparing projects"
              />

              <Card
                title="Active"
                value={activeProjects.length}
                description="Ongoing projects"
              />

              <Card
                title="Completed"
                value={completedProjects.length}
                description="Finished projects"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Project List"
                description="Projects where you are assigned as project sponsor."
              />

              {projects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                  No sponsored projects assigned yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => {
                    const managerName = `${project.manager_first_name || ''} ${
                      project.manager_last_name || ''
                    }`.trim()

                    const progress =
                      Number(project.task_count) > 0
                        ? Math.round(
                            (Number(project.completed_task_count) /
                              Number(project.task_count)) *
                              100
                          )
                        : 0

                    return (
                      <div
                        key={project.id}
                        className="rounded-3xl border border-[#D6E4FF] bg-[#EAF2FF] p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black text-gray-900">
                              {project.title}
                            </h3>

                            <p className="mt-1 text-sm text-gray-600">
                              {project.project_type || 'general'}
                            </p>
                          </div>

                          <span className="rounded-full border border-[#00CFC8]/30 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0] shadow-sm">
                            {project.status}
                          </span>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm text-gray-700">
                          {project.description || 'No description provided.'}
                        </p>

                        <div className="mt-5 space-y-2 text-sm">
                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <p className="text-gray-500">Project Manager</p>

                            <p className="font-bold text-gray-900">
                              {managerName || project.manager_email || 'Unknown'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                              <p className="text-gray-500">Members</p>

                              <p className="font-bold text-gray-900">
                                {project.member_count}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                              <p className="text-gray-500">Progress</p>

                              <p className="font-bold text-gray-900">
                                {progress}%
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <p className="text-gray-500">Deadline</p>

                            <p className="font-bold text-gray-900">
                              {project.deadline
                                ? new Date(project.deadline).toLocaleDateString()
                                : 'None'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                          <Link
                            to={`/general/sponsor/projects/${project.id}`}
                            className="inline-flex flex-1 justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                          >
                            Open Project
                          </Link>

                          <Link
                            to="/general/sponsor/analytics"
                            className="inline-flex flex-1 justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-2 text-sm font-black text-black transition-all hover:opacity-90"
                          >
                            Analytics
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralSponsorProjectsPage