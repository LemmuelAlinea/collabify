import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import logo from '../../../assets/collabify-logo.png'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  async function handleReset(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/forgot-password',
    })

if (error) {
  console.error(error)
  setMessage(error.message)
  return
}

    setMessage('Password reset link sent. Please check your email.')
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
          Account Recovery
        </p>

        <h2 className="text-4xl font-black mt-3">Forgot Password</h2>

        <p className="text-gray-300 mt-2 mb-6">
          Enter your email to receive a reset link.
        </p>

        {message && (
          <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 p-3 outline-none placeholder:text-gray-400"
            required
          />

          <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black p-3">
            Send Reset Link
          </button>
        </form>

        <Link
          to="/login"
          className="block mt-5 text-sm text-cyan-300 font-semibold text-center"
        >
          
        </Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage