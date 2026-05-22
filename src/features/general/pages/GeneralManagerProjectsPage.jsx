import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'
import { PageSkeleton } from '../../../components/ui/Skeleton'

function GeneralManagerProjectsPage() {
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

    const { data, error } = await supabase
      .from('general_projects')
      .select('*')
      .eq('project_manager_id', user.id)
      .order('created_at', { ascending: false })

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
      pageTitle="Projects"
      navigation={generalManagerNavigation}
    >
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-transparent">
                Projects
              </h1>

              <p className="mt-3 max-w-2xl text-gray-500">
                Manage institutional and organizational projects, monitor
                progress, and oversee project execution.
              </p>
            </div>

            <Link
              to="/general/manager/projects/create"
              className="rounded-2xl bg-[#001A5A] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#002A8A]"
            >
              + Create Project
            </Link>
          </div>

          {message && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card
              title="Total Projects"
              value={projects.length}
              description="Created projects"
            />

            <Card
              title="Planning"
              value={planningProjects.length}
              description="Still being prepared"
            />

            <Card
              title="Active"
              value={activeProjects.length}
              description="Currently ongoing"
            />

            <Card
              title="Completed"
              value={completedProjects.length}
              description="Finished projects"
            />
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <SectionHeader
              title={<span className="text-black">Project Overview</span>}
              description="Projects created and managed by you."
            />

            {projects.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500">
                No general projects yet. Create your first project.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {project.title}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500 capitalize">
                          {project.project_type || 'general'}
                        </p>
                      </div>

                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold capitalize text-cyan-700">
                        {project.status}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-600">
                      {project.description || 'No description provided.'}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Priority
                        </p>

                        <p className="mt-1 font-semibold capitalize text-gray-900">
                          {project.priority}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Deadline
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString()
                            : 'None'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        to={`/general/manager/projects/${project.id}`}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
                      >
                        Open Project
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default GeneralManagerProjectsPage