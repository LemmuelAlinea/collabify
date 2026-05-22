import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import logo from '../../../assets/collabify-logo.png'

function LoginPage() {
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

    const userId = data.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    if (profile.role === 'student' && !profile.is_onboarded) {
      navigate('/student/onboarding')
    } else if (profile.role === 'student') {
      navigate('/student/dashboard')
    } else if (profile.role === 'teacher') {
      navigate('/teacher/dashboard')
    } else if (profile.role === 'admin') {
      navigate('/admin/dashboard')
    }

    setLoading(false)
  }

async function handleGoogleLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) {
    setMessage(error.message)
  }
}

  return (
    <div className="min-h-screen bg-[#001E6C] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="Collabify" className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
            Collabify
          </h1>
        </div>

        <p className="text-cyan-300 font-semibold uppercase tracking-widest">
          Educational Workplace
        </p>

        <h2 className="text-4xl font-black mt-3">Login</h2>

        <p className="text-gray-300 mt-2 mb-6">
          Access your student or teacher dashboard.
        </p>

        {message && (
          <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black p-3 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

<button
  type="button"
  onClick={handleGoogleLogin}
  className="w-full rounded-2xl border border-white/20 p-3 mt-3 hover:bg-white/10"
>
  Continue with Google
</button>

        <div className="flex justify-between mt-5 text-sm text-gray-300">
          <Link to="/register" className="text-cyan-300 font-semibold">
            Create account
          </Link>

          <Link to="/forgot-password" className="text-green-300 font-semibold">
            Forgot password?
          </Link>
        </div>

        <p className="text-sm text-gray-300 mt-5 text-center">
          General workplace user?{' '}
          <Link to="/general/login" className="text-cyan-300 font-semibold">
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage