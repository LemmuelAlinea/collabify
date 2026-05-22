import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Password updated successfully. You can now login again.')
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-gray-300 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-gray-600 mb-6">
          Enter your new password.
        </p>

        {message && (
          <div className="mb-4 border border-gray-300 bg-gray-100 p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded"
            required
          />

          <button className="w-full bg-black text-white p-3 rounded">
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage