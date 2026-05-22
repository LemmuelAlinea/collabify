import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

function JoinClassModal({ isOpen, onClose, onJoined }) {
  const [classCode, setClassCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleJoinClass(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const cleanedCode = classCode.trim().toUpperCase()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setLoading(false)
      return
    }

    const { data: foundClass, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('class_code', cleanedCode)
      .maybeSingle()

    if (classError) {
      setMessage(classError.message)
      setLoading(false)
      return
    }

    if (!foundClass) {
      setMessage('Invalid class code.')
      setLoading(false)
      return
    }

    const { error: joinError } = await supabase
      .from('class_members')
      .insert({
        class_id: foundClass.id,
        student_id: user.id,
      })

    if (joinError) {
      if (joinError.code === '23505') {
        setMessage('You already joined this class.')
      } else {
        setMessage(joinError.message)
      }

      setLoading(false)
      return
    }

    setClassCode('')
    setLoading(false)
    onJoined()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#001A5A] text-white border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <p className="text-cyan-300 font-semibold uppercase tracking-widest">
          Student Access
        </p>

        <h2 className="text-3xl font-black mt-2 mb-2">
          Join Class
        </h2>

        <p className="text-gray-300 mb-5">
          Enter the class code provided by your teacher.
        </p>

        {message && (
          <div className="mb-4 bg-white/10 border border-white/20 rounded-xl p-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleJoinClass} className="space-y-4">
          <input
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="Example: JHB-290-039"
            className="w-full border border-white/20 bg-white/10 rounded-xl p-3 uppercase outline-none placeholder:text-gray-400"
            required
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black px-4 py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Class'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/20 px-4 py-3 rounded-xl hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JoinClassModal