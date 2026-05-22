import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

function CreateTaskForm({ projectId, groupId, onTaskCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
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

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        group_id: groupId || null,
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_date: form.dueDate || null,
        created_by: user.id,
        source: 'manual',
        status: 'unclaimed',
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: user.id,
      activity_type: 'task_created',
      description: `Task "${form.title}" was created manually.`,
    })

    setForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
    })

    setLoading(false)
    onTaskCreated()
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-white backdrop-blur shadow-xl">
      <p className="text-cyan-300 font-semibold uppercase tracking-widest">
        Task Management
      </p>

      <h2 className="text-2xl font-black mt-2">
        Create Manual Task
      </h2>

      <p className="text-sm text-gray-300 mt-1 mb-5">
        This is for testing the task system before AI task generation.
      </p>

      {message && (
        <div className="mb-4 border border-white/20 bg-white/10 rounded-xl p-3 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Task title"
          className="w-full border border-white/20 bg-white/10 rounded-xl p-3 outline-none placeholder:text-gray-400"
          required
        />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Task description"
          className="w-full border border-white/20 bg-white/10 rounded-xl p-3 min-h-24 outline-none placeholder:text-gray-400"
        />

        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
          className="w-full border border-white/20 bg-white/10 rounded-xl p-3 outline-none"
        >
          <option className="text-black" value="low">Low Priority</option>
          <option className="text-black" value="medium">Medium Priority</option>
          <option className="text-black" value="high">High Priority</option>
        </select>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-300">
            Due Date
          </label>

          <input
            name="dueDate"
            type="datetime-local"
            value={form.dueDate}
            onChange={handleChange}
            className="w-full border border-white/20 bg-white/10 rounded-xl p-3 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-400 to-green-400 text-black font-black px-4 py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  )
}

export default CreateTaskForm