import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import logo from '../../../assets/collabify-logo.png'

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleRegister(e) {
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

    if (user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        role: form.role,
        is_onboarded: form.role === 'teacher' || form.role === 'admin',
      })

      if (profileError) {
        setMessage(profileError.message)
        setLoading(false)
        return
      }

      if (form.role === 'teacher') {
        await supabase.from('teacher_profiles').insert({
          teacher_id: user.id,
        })
      }
    }

    setMessage('Registration successful. Please check your email for verification.')
    setLoading(false)

    setTimeout(() => {
      navigate('/login')
    }, 1500)
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
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="Collabify" className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
            Collabify
          </h1>
        </div>

        <p className="text-cyan-300 font-semibold uppercase tracking-widest">
          Educational Workplace
        </p>

        <h2 className="text-4xl font-black mt-3">Create Account</h2>

        <p className="text-gray-300 mt-2 mb-6">
          Register as a student or teacher.
        </p>

        {message && (
          <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="First name"
              value={form.firstName}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
              required
            />

            <input
              name="lastName"
              placeholder="Last name"
              value={form.lastName}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
              required
            />
          </div>

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

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none text-white"
          >
            <option className="text-black" value="student">
              Student
            </option>
            <option className="text-black" value="teacher">
              Teacher
            </option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black p-3 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Educational Account'}
          </button>

<button
  type="button"
  onClick={handleGoogleLogin}
  className="w-full rounded-2xl border border-white/20 p-3 mt-3 hover:bg-white/10"
>
  Continue with Google
</button>
        </form>

        <p className="text-sm text-gray-300 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-300 font-semibold">
            Login
          </Link>
        </p>

        <p className="text-sm text-gray-300 mt-2 text-center">
          General workplace user?{' '}
          <Link to="/general/register" className="text-green-300 font-semibold">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage