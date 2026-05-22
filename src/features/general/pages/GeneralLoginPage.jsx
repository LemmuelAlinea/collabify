import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'


function GeneralLoginPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
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
    if (role === 'project_member') return '/general/member/dashboard'
    return '/login'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      setMessage('Profile not found.')
      setLoading(false)
      return
    }

    if (!['project_manager', 'project_sponsor', 'project_member'].includes(profile.role)) {
      setMessage('This account is not registered for the General Workplace.')
      setLoading(false)
      return
    }

    navigate(getDashboardPath(profile.role))
  }

  return (
    <div className="min-h-screen bg-[#001E6C] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-8">
        <p className="text-cyan-300 font-semibold uppercase tracking-widest">
          General Workplace
        </p>

        <h1 className="text-4xl font-black mt-3">
          Login
        </h1>

        <p className="text-gray-300 mt-2 mb-6">
          Access your general project workspace.
        </p>

        {message && (
          <div className="mb-4 border border-white/20 bg-white/10 rounded-xl p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black p-3 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login to General Workplace'}
          </button>
        </form>

        <p className="text-sm text-gray-300 mt-6 text-center">
          No general account yet?{' '}
          <Link to="/general/register" className="text-cyan-300 font-semibold">
            Register
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

export default GeneralLoginPage