import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { projectTypes } from '../../../config/projectTypes'

function CreateProjectPage() {
  const { classId } = useParams()
  const navigate = useNavigate()

  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    projectType: '',
    deadline: '',
    guidelinesText: '',
    rubricText: '',
  })

  const selectedProjectType = projectTypes.find(
    (type) => type.value === form.projectType
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchClass()
  }, [classId])

  async function fetchClass() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setClassData(data)
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSubmit(e) {
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
      .from('projects')
      .insert({
        class_id: classId,
        teacher_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        project_type: form.projectType,
        deadline: form.deadline,
        guidelines_text: form.guidelinesText.trim() || null,
        rubric_text: form.rubricText.trim() || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    await supabase.from('project_activity_logs').insert({
      project_id: project.id,
      user_id: user.id,
      activity_type: 'project_created',
      description: `Project "${form.title}" was created.`,
    })

    navigate(`/teacher/classes/${classId}`)
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Create Project"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to={`/teacher/classes/${classId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Class
          </Link>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Create Project
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            {classData
              ? `Assign a project to ${classData.class_name} - ${classData.section}.`
              : 'Loading class information...'}
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              Project Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Fill in the project details below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Project Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter project title"
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Project Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the project goals, requirements, and expected outputs."
                className="min-h-32 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Project Type
                </label>

                <select
                  name="projectType"
                  value={form.projectType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                  required
                >
                  <option value="">Select Project Type</option>

                  {projectTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {selectedProjectType && (
                  <div className="mt-3 rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3 text-sm text-gray-700">
                    {selectedProjectType.description}
                  </div>
                )}
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
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Project Guidelines
              </label>

              <textarea
                name="guidelinesText"
                value={form.guidelinesText}
                onChange={handleChange}
                placeholder="Add project instructions, expectations, or deliverables."
                className="min-h-40 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Grading Rubric
              </label>

              <textarea
                name="rubricText"
                value={form.rubricText}
                onChange={handleChange}
                placeholder="Add grading criteria or scoring rubric."
                className="min-h-40 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              />
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
              <p className="font-black text-gray-900">
                Project Assignment
              </p>

              <p className="mt-1 text-sm text-gray-600">
                This project will automatically be assigned to the selected class.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/teacher/classes/${classId}`)}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default CreateProjectPage