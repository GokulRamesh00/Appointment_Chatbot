'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import ChatbotInterface from './components/ChatbotInterface'
import AppointmentList from './components/AppointmentList'
import Header from './components/Header'

export default function Home() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'chat' | 'appointments'>('login')

  useEffect(() => {
    if (user) {
      setActiveTab('chat')
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Appointment Chatbot
              </h1>
              <p className="text-gray-600">
                AI-powered appointment scheduling made simple
              </p>
            </div>

            <div className="card">
              <div className="flex mb-6">
                <button
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-2 px-4 text-center font-medium rounded-lg transition-colors ${
                    activeTab === 'login'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 py-2 px-4 text-center font-medium rounded-lg transition-colors ${
                    activeTab === 'register'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Register
                </button>
              </div>

              {activeTab === 'login' && <LoginForm />}
              {activeTab === 'register' && <RegisterForm />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors mr-4 ${
              activeTab === 'chat'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Chat Assistant
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'appointments'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            My Appointments
          </button>
        </div>

        {activeTab === 'chat' && <ChatbotInterface />}
        {activeTab === 'appointments' && <AppointmentList />}
      </div>
    </div>
  )
}
