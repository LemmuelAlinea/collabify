import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'


function GeneralRegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'project_member',
  })

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  function getDashboardPath(role) {
    if (role === 'project_manager') return '/general/manager/dashboard'
    if (role === 'project_sponsor') return '/general/sponsor/dashboard'
    return '/general/member/dashboard'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const user = data.user

    if (!user) {
      setMessage('Registration successful. Please check your email to confirm your account.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      role: form.role,
      is_onboarded: true,
    })

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    navigate(getDashboardPath(form.role))
  }

  return (
    <div className="min-h-screen bg-[#001E6C] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-8">
        <p className="text-cyan-300 font-semibold uppercase tracking-widest">
          General Workplace
        </p>

        <h1 className="text-4xl font-black mt-3">
          Create Account
        </h1>

        <p className="text-gray-300 mt-2 mb-6">
          Register as a project sponsor, manager, or member.
        </p>

        {message && (
          <div className="mb-4 border border-white/20 bg-white/10 rounded-xl p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="First name"
              className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
              required
            />

            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Last name"
              className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
              required
            />
          </div>

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
            required
          />

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
            required
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none text-white"
          >
            <option className="text-black" value="project_member">
              Project Member
            </option>
            <option className="text-black" value="project_manager">
              Project Manager
            </option>
            <option className="text-black" value="project_sponsor">
              Project Sponsor
            </option>
          </select>

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black p-3 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create General Account'}
          </button>
        </form>

        <p className="text-sm text-gray-300 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/general/login" className="text-cyan-300 font-semibold">
            Login
          </Link>
        </p>

        <p className="text-sm text-gray-300 mt-2 text-center">
          Educational user?{' '}
          <Link to="/login" className="text-green-300 font-semibold">
            Go to Educational Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default GeneralRegisterPage