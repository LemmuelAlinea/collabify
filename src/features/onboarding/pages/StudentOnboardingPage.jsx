import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

function StudentOnboardingPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    course: '',
    section: '',
    skills: '',
    interests: '',
    strengths: '',
    preferredRoles: '',
    experience: '',
  })

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchExistingOnboarding()
  }, [])

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  function convertToArray(value) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function convertArrayToText(value) {
    if (Array.isArray(value)) return value.join(', ')
    return value || ''
  }

  async function fetchExistingOnboarding() {
    setFetching(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('User not found.')
      setFetching(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('course, section, skills, interests, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role && profile.role !== 'student') {
      setMessage('Only students can access onboarding.')
      setFetching(false)
      return
    }

    const { data: onboarding } = await supabase
      .from('student_onboarding')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle()

    setForm({
      course: onboarding?.course || profile?.course || '',
      section: onboarding?.section || profile?.section || '',
      skills: convertArrayToText(onboarding?.skills || profile?.skills),
      interests: convertArrayToText(onboarding?.interests || profile?.interests),
      strengths: convertArrayToText(onboarding?.strengths),
      preferredRoles: convertArrayToText(onboarding?.preferred_roles),
      experience: onboarding?.experience || '',
    })

    setFetching(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('User not found.')
      setLoading(false)
      return
    }

    const skillsArray = convertToArray(form.skills)
    const interestsArray = convertToArray(form.interests)
    const strengthsArray = convertToArray(form.strengths)
    const preferredRolesArray = convertToArray(form.preferredRoles)

    const { error: onboardingError } = await supabase
      .from('student_onboarding')
      .upsert(
        {
          student_id: user.id,
          course: form.course.trim(),
          section: form.section.trim(),
          skills: skillsArray,
          interests: interestsArray,
          strengths: strengthsArray,
          preferred_roles: preferredRolesArray,
          experience: form.experience.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'student_id',
        }
      )

    if (onboardingError) {
      setMessage(onboardingError.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        course: form.course.trim(),
        section: form.section.trim(),
        skills: skillsArray.join(', '),
        interests: interestsArray.join(', '),
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    navigate('/student/dashboard')
  }

  async function handleSkipForNow() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('User not found.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    navigate('/student/dashboard')
  }

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6FAFF] text-gray-600">
        Loading onboarding...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6FAFF] px-4 py-8 text-gray-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-400 to-green-400 text-black shadow-sm">
            <Sparkles size={30} />
          </div>

          <p className="mt-6 bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
            Student Onboarding
          </p>

          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Set Up Your Collaboration Profile
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Complete your profile so Collabify can support better grouping,
            task assignment, analytics, and project collaboration.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <InfoBox
              title="Better Grouping"
              description="Your skills and strengths help teachers understand your fit in project groups."
            />
            <InfoBox
              title="Smarter Analytics"
              description="Your profile adds more context to contribution and performance insights."
            />
            <InfoBox
              title="Personalized Tasks"
              description="Preferred roles can help guide task distribution in future project workflows."
            />
          </div>
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-black text-black">Student Details</h2>
          <p className="mt-1 text-sm text-gray-600">
            Use commas for skills, interests, strengths, and preferred roles.
          </p>

          {message && (
            <div className="mt-5 rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Course / Program"
                name="course"
                placeholder="Example: BSIT"
                value={form.course}
                onChange={handleChange}
                required
              />

              <Input
                label="Section"
                name="section"
                placeholder="Example: BSIT 3A"
                value={form.section}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Skills"
              name="skills"
              placeholder="Example: UI Design, React, Documentation"
              value={form.skills}
              onChange={handleChange}
            />

            <Input
              label="Interests"
              name="interests"
              placeholder="Example: Frontend, Database, AI"
              value={form.interests}
              onChange={handleChange}
            />

            <Input
              label="Strengths"
              name="strengths"
              placeholder="Example: Leadership, Research, Coding"
              value={form.strengths}
              onChange={handleChange}
            />

            <Input
              label="Preferred Roles"
              name="preferredRoles"
              placeholder="Example: Developer, Designer, Tester"
              value={form.preferredRoles}
              onChange={handleChange}
            />

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Project Experience
              </label>
              <textarea
                name="experience"
                placeholder="Describe your project experience."
                value={form.experience}
                onChange={handleChange}
                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Onboarding'}
              </button>

              <button
                type="button"
                onClick={handleSkipForNow}
                disabled={loading}
                className="flex-1 rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Skip for Now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Input({ label, name, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
      />
    </div>
  )
}

function InfoBox({ title, description }) {
  return (
    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
      <p className="font-black text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  )
}

export default StudentOnboardingPage