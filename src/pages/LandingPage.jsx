
import { useState } from 'react'
import { Link } from 'react-router-dom'

import logo from '../assets/collabify-logo.png'
import kanbanIcon from '../assets/kanban-icon.png'
import analyticsIcon from '../assets/analytics-icon.png'
import checklistIcon from '../assets/checklist-icon.png'
import teamIcon from '../assets/team-icon.png'
import clockIcon from '../assets/clock-icon.png'

function LandingPage() {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#001E6C] text-white overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#001E6C]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Collabify"
              className="w-12 h-12 object-contain"
            />

            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
              Collabify
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#home" className="hover:text-cyan-300 transition-colors">
              Home
            </a>

            <a href="#about" className="hover:text-cyan-300 transition-colors">
              About
            </a>

            <a href="#services" className="hover:text-cyan-300 transition-colors">
              Services
            </a>

            <a href="#contact" className="hover:text-cyan-300 transition-colors">
              Contact
            </a>

            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="hover:text-cyan-300 transition-colors"
            >
              Project
            </button>

            <Link
              to="/login"
              className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <section
        id="home"
        className="min-h-screen flex items-center relative pt-24"
      >
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-cyan-300 font-semibold tracking-widest uppercase mb-4">
              AI-Powered Collaboration Platform
            </p>

            <h1 className="text-6xl lg:text-8xl font-black leading-none mb-6 bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
              Collabify
            </h1>

            <p className="text-xl text-gray-200 leading-relaxed max-w-xl mb-10">
              A dual-workplace AI-powered platform that makes project
              management, collaboration, analytics, and teamwork smarter and
              more efficient for both educational and institutional projects.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="bg-gradient-to-r from-cyan-400 to-green-400 text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
              >
                Start Project
              </button>

              <a
                href="#about"
                className="border border-white/20 px-8 py-4 rounded-2xl font-semibold hover:bg-white/10 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>

<div className="relative flex items-center justify-center min-h-[360px] lg:min-h-[650px] mt-10 lg:mt-0">
  <div className="relative w-full h-[650px]">

<img
  src={teamIcon}
  alt="Team"
  className="absolute top-1 left-1 w-[550px] animate-float"
/>

    <img
      src={checklistIcon}
      alt="Checklist"
      className="absolute top-15 left-8 w-[200px] animate-floatSlow"
    />

    <img
      src={analyticsIcon}
      alt="Analytics"
      className="absolute top-0 left-75 w-[200px] animate-float"
    />

    <img
      src={kanbanIcon}
      alt="Kanban"
      className="absolute top-70 right-0 w-40 animate-floatSlow"
    />

    <img
      src={clockIcon}
      alt="Clock"
      className="absolute bottom-15 left-28 w-36 animate-float"
    />

    <div className="absolute inset-0 bg-cyan-400/10 blur-3xl rounded-full" />
  </div>
</div>
        </div>
      </section>

      <section
        id="about"
        className="py-28 bg-gradient-to-b from-[#001E6C] to-[#002B8A]"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-cyan-300 font-semibold uppercase tracking-widest mb-4">
              About Collabify
            </p>

            <h2 className="text-5xl font-black mb-6">
              One Platform. Two Workplaces.
            </h2>

            <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
              Collabify combines educational collaboration and institutional
              project management into one intelligent AI-powered workplace.
              Students, teachers, project managers, sponsors, and members can
              manage projects efficiently with real-time collaboration,
              analytics, task tracking, and AI assistance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:border-cyan-300/40 transition-all">
              <div className="flex items-center gap-5 mb-6">
                <img
                  src={teamIcon}
                  alt="Educational"
                  className="w-24 h-24 object-contain"
                />

                <div>
                  <h3 className="text-3xl font-bold mb-2">
                    Educational Workplace
                  </h3>

                  <p className="text-gray-300">
                    For teachers and students.
                  </p>
                </div>
              </div>

              <ul className="space-y-3 text-gray-200 leading-relaxed">
                <li>• Classroom project management</li>
                <li>• AI-powered task generation</li>
                <li>• Student analytics and evaluations</li>
                <li>• Group collaboration and chat</li>
                <li>• Teacher AI Assistant</li>
              </ul>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:border-green-300/40 transition-all">
              <div className="flex items-center gap-5 mb-6">
                <img
                  src={analyticsIcon}
                  alt="General"
                  className="w-24 h-24 object-contain"
                />

                <div>
                  <h3 className="text-3xl font-bold mb-2">
                    General Workplace
                  </h3>

                  <p className="text-gray-300">
                    For institutional and organizational projects.
                  </p>
                </div>
              </div>

              <ul className="space-y-3 text-gray-200 leading-relaxed">
                <li>• Project sponsor monitoring</li>
                <li>• Project manager task control</li>
                <li>• Team collaboration workspace</li>
                <li>• Progress analytics and reporting</li>
                <li>• AI project insights and evaluations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="py-28 bg-[#001E6C]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-cyan-300 font-semibold uppercase tracking-widest mb-4">
              Services
            </p>

            <h2 className="text-5xl font-black mb-6">
              Smart Features for Smarter Collaboration
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/10 rounded-3xl p-8 border border-white/10 hover:scale-105 transition-transform">
              <img
                src={kanbanIcon}
                alt="Tasks"
                className="w-28 h-28 object-contain mb-6"
              />

              <h3 className="text-2xl font-bold mb-4">
                Task Management
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Organize tasks, assign members, and track progress efficiently.
              </p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 border border-white/10 hover:scale-105 transition-transform">
              <img
                src={clockIcon}
                alt="Time"
                className="w-28 h-28 object-contain mb-6"
              />

              <h3 className="text-2xl font-bold mb-4">
                Deadline Tracking
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Monitor deadlines and reduce project delays with smart tracking.
              </p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 border border-white/10 hover:scale-105 transition-transform">
              <img
                src={checklistIcon}
                alt="Checklist"
                className="w-28 h-28 object-contain mb-6"
              />

              <h3 className="text-2xl font-bold mb-4">
                AI Evaluations
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Generate intelligent evaluations and performance analytics.
              </p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 border border-white/10 hover:scale-105 transition-transform">
              <img
                src={teamIcon}
                alt="Team"
                className="w-28 h-28 object-contain mb-6"
              />

              <h3 className="text-2xl font-bold mb-4">
                Collaboration
              </h3>

              <p className="text-gray-300 leading-relaxed">
                Real-time communication and seamless teamwork across projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-28 bg-[#002B8A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-cyan-300 font-semibold uppercase tracking-widest mb-4">
            Contact
          </p>

          <h2 className="text-5xl font-black mb-8">
            Ready to Collaborate Smarter?
          </h2>

          <p className="text-xl text-gray-300 leading-relaxed mb-10">
            Start managing academic and institutional projects with AI-powered
            collaboration today.
          </p>

          <Link
            to="/login"
            className="inline-flex bg-gradient-to-r from-cyan-400 to-green-400 text-black px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-transform"
          >
            Get Started
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 bg-[#001A5A]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Collabify"
              className="w-10 h-10 object-contain"
            />

            <p className="text-gray-300 text-sm">
              © 2026 Collabify. All rights reserved.
            </p>
          </div>

          <p className="text-gray-400 text-sm">
            AI-Powered Project Collaboration Platform
          </p>
        </div>
      </footer>

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-white text-black rounded-3xl max-w-4xl w-full p-10 relative">
            <button
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-black text-2xl"
            >
              ×
            </button>

            <div className="text-center mb-12">
              <h2 className="text-5xl font-black mb-4">
                Choose Your Workplace
              </h2>

              <p className="text-gray-600 text-lg">
                Select the workplace that fits your project environment.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Link
                to="/login"
                className="border border-gray-300 rounded-3xl p-8 hover:border-cyan-400 hover:shadow-2xl transition-all"
              >
                <img
                  src={teamIcon}
                  alt="Educational"
                  className="w-36 h-36 object-contain mx-auto mb-6"
                />

                <h3 className="text-3xl font-black mb-4 text-center">
                  Educational Workplace
                </h3>

                <p className="text-gray-600 text-center leading-relaxed">
                  Manage classroom projects, student groups, evaluations, AI
                  task generation, and educational collaboration.
                </p>
              </Link>

              <Link
                to="/general/login"
                className="border border-gray-300 rounded-3xl p-8 hover:border-green-400 hover:shadow-2xl transition-all"
              >
                <img
                  src={analyticsIcon}
                  alt="General"
                  className="w-36 h-36 object-contain mx-auto mb-6"
                />

                <h3 className="text-3xl font-black mb-4 text-center">
                  General Workplace
                </h3>

                <p className="text-gray-600 text-center leading-relaxed">
                  Manage institutional projects, teams, sponsors, analytics,
                  deadlines, and AI-powered workplace collaboration.
                </p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingPage
