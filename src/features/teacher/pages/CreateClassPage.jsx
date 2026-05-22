import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { generateClassCode } from '../../../utils/generateClassCode'

function CreateClassPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    className: '',
    section: '',
    description: '',
    academicYear: '',
    semester: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function createUniqueClassCode() {
    let code = generateClassCode()
    let isUnique = false

    while (!isUnique) {
      const { data } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', code)
        .maybeSingle()

      if (!data) {
        isUnique = true
      } else {
        code = generateClassCode()
      }
    }

    return code
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

    const classCode = await createUniqueClassCode()

    const { error } = await supabase.from('classes').insert({
      teacher_id: user.id,
      class_name: form.className,
      section: form.section,
      description: form.description,
      academic_year: form.academicYear,
      semester: form.semester,
      class_code: classCode,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    navigate('/teacher/classes')
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Create Class"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to="/teacher/classes"
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Classes
          </Link>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Create Class
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Create a class where students can join using an auto-generated
            class code.
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
              Class Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Fill in the details below to create a new class.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Class Name
                </label>

                <input
                  name="className"
                  value={form.className}
                  onChange={handleChange}
                  placeholder="Example: Capstone Project 1"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Section
                </label>

                <input
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  placeholder="Example: BSIT 3A"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Class Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the purpose, subject, or instructions for this class."
                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Academic Year
                </label>

                <input
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  placeholder="Example: 2025-2026"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Semester
                </label>

                <select
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                  required
                >
                  <option value="">Select Semester</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
              <p className="font-black text-gray-900">
                Auto-generated Class Code
              </p>

              <p className="mt-1 text-sm text-gray-600">
                A unique class code will be generated automatically after you
                create this class.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Class'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/teacher/classes')}
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

export default CreateClassPage