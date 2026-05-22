import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalMemberNavigation } from '../config/generalNavigation'


function GeneralMemberProjectsPage() {
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

    const { data, error } = await supabase.rpc('get_general_member_projects', {
      member_uuid: user.id,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setProjects(data || [])
    setLoading(false)
  }

  const activeProjects = projects.filter(
    (project) => project.status === 'active'
  )

  const planningProjects = projects.filter(
    (project) => project.status === 'planning'
  )

  const completedProjects = projects.filter(
    (project) => project.status === 'completed'
  )

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="My Projects"
      navigation={generalMemberNavigation}
    >
      <div className="space-y-6 text-black">
        <div>
          <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            My Projects
          </h1>

          <p className="text-gray-500 mt-2">
            View general workplace projects where you are assigned as a member.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading projects...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                title="Assigned Projects"
                value={projects.length}
                description="Projects you belong to"
              />

              <Card
                title="Planning"
                value={planningProjects.length}
                description="Projects being prepared"
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

            <div className="rounded-3xl border border-gray-200 bg-gray-100 p-6 backdrop-blur shadow-xl">
              <SectionHeader
                title="Project List"
                description="Your assigned general workplace projects."
              />

              {projects.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-500">
                  You are not assigned to any general projects yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projects.map((project) => {
                    const managerName = `${
                      project.manager_first_name || ''
                    } ${project.manager_last_name || ''}`.trim()

                    const sponsorName = `${
                      project.sponsor_first_name || ''
                    } ${project.sponsor_last_name || ''}`.trim()

                    return (
                      <div
                        key={project.id}
                        className="rounded-3xl border border-gray-200 bg-white p-5 hover:border-cyan-400 transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black text-black">
                              {project.title}
                            </h3>

                            <p className="text-sm text-gray-500 mt-1">
                              {project.project_type || 'general'}
                            </p>
                          </div>

                          <span className="text-xs rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-700 font-semibold">
                            {project.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mt-4 line-clamp-3">
                          {project.description ||
                            'No description provided.'}
                        </p>

                        <div className="mt-5 space-y-2 text-sm">
                          <div className="rounded-2xl bg-gray-100 p-3">
                            <p className="text-gray-500">Manager</p>

                            <p className="font-bold text-black">
                              {managerName ||
                                project.manager_email ||
                                'Unknown'}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-100 p-3">
                            <p className="text-gray-500">Sponsor</p>

                            <p className="font-bold text-black">
                              {sponsorName ||
                                project.sponsor_email ||
                                'No sponsor'}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-100 p-3">
                            <p className="text-gray-500">Deadline</p>

                            <p className="font-bold text-black">
                              {project.deadline
                                ? new Date(
                                    project.deadline
                                  ).toLocaleDateString()
                                : 'None'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <Link
                            to={`/general/member/projects/${project.id}`}
                            className="inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-all"
                          >
                            Open Project
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

export default GeneralMemberProjectsPage