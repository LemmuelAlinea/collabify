import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'
import { PageSkeleton } from '../../../components/ui/Skeleton'
import { ChevronLeft } from 'lucide-react'

function GeneralCreateProjectPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    projectType: 'general',
    priority: 'medium',
    status: 'planning',
    startDate: '',
    deadline: '',
    objectives: '',
    expectedOutput: '',
  })

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleCreateProject(e) {
    e.preventDefault()
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

    const { data: project, error } = await supabase
      .from('general_projects')
      .insert({
        project_manager_id: user.id,
        title: form.title,
        description: form.description,
        project_type: form.projectType,
        priority: form.priority,
        status: form.status,
        start_date: form.startDate || null,
        deadline: form.deadline || null,
        objectives: form.objectives,
        expected_output: form.expectedOutput,
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: project.id,
      user_id: user.id,
      activity_type: 'project_created',
      description: `Project "${form.title}" was created.`,
    })

    setLoading(false)
    setPageLoading(true)

    setTimeout(() => {
      navigate('/general/manager/projects')
    }, 800)
  }

  if (pageLoading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Create Project"
        navigation={generalManagerNavigation}
      >
        <PageSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Create Project"
      navigation={generalManagerNavigation}
    >
      <div className="space-y-7 text-gray-900">
        <div>
          <Link
            to="/general/manager/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Projects
          </Link>

          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Create General Project
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Set up an institutional or organizational school project.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {message}
          </div>
        )}

        <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
          <SectionHeader
            title="Project Information"
            description="Provide the basic details for this general workplace project."
          />

          <form onSubmit={handleCreateProject} className="mt-5 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Project Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: School Website Redesign"
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#00CFC8]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the project purpose, scope, and context."
                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#00CFC8]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Project Type
                </label>

                <select
                  name="projectType"
                  value={form.projectType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="general">General</option>
                  <option value="event">Event</option>
                  <option value="research">Research</option>
                  <option value="administrative">Administrative</option>
                  <option value="it_system">IT / System Development</option>
                  <option value="facility">Facility / Maintenance</option>
                  <option value="documentation">Documentation</option>
                  <option value="community">Community Extension</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Priority
                </label>

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Start Date
                </label>

                <input
                  name="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Deadline
                </label>

                <input
                  name="deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Objectives
                </label>

                <textarea
                  name="objectives"
                  value={form.objectives}
                  onChange={handleChange}
                  placeholder="List the objectives or goals of this project."
                  className="min-h-32 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#00CFC8]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Expected Output
                </label>

                <textarea
                  name="expectedOutput"
                  value={form.expectedOutput}
                  onChange={handleChange}
                  placeholder="Describe the expected final output or deliverable."
                  className="min-h-32 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#00CFC8]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>

              <Link
                to="/general/manager/projects"
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-center text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default GeneralCreateProjectPage