import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

function AdminLoginPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleLogin(e) {
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

    if (profileError || profile?.role !== 'platform_admin') {
      await supabase.auth.signOut()
      setMessage('Access denied. This login is only for platform admins.')
      setLoading(false)
      return
    }

    navigate('/admin/dashboard')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001E6C] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-400 to-green-400 text-black">
          <ShieldCheck size={32} />
        </div>

        <div className="mt-6 text-center">
          <p className="bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-sm font-black uppercase tracking-[0.25em] text-transparent">
            Collabify Admin
          </p>

          <h1 className="mt-2 text-4xl font-black text-gray-900">
            Admin Login
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Platform system access only.
          </p>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">
              Admin Email
            </label>

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@collabify.com"
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">
              Password
            </label>

            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              required
            />
          </div>

          <button
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Checking access...' : 'Login as Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLoginPage