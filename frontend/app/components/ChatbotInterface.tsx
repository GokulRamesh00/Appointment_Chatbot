'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  type: 'user' | 'bot'
  content: string
  timestamp: string
  metadata?: any
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'

export default function ChatbotInterface() {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Initialize chat session when component mounts
    if (user && token) {
      initializeChatSession()
    }
  }, [user, token])

  const initializeChatSession = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chatbot/token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setSessionToken(response.data.sessionToken)
      
      // Add welcome message
      setMessages([{
        type: 'bot',
        content: `Hello ${user?.firstName}! I'm your appointment scheduling assistant. How can I help you today?`,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Failed to initialize chat session:', error)
      toast.error('Failed to start chat session')
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionToken || isLoading) return

    const userMessage: Message = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chatbot/message`,
        {
          message: inputMessage,
          sessionToken: sessionToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const botMessage: Message = {
        type: 'bot',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        metadata: response.data.metadata
      }

      setMessages(prev => [...prev, botMessage])

      // Show success message if appointment was created
      if (response.data.metadata?.appointment_created) {
        toast.success('Appointment scheduled successfully!')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      
      const errorMessage: Message = {
        type: 'bot',
        content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Appointment Assistant</h3>
            <p className="text-sm text-gray-500">AI-powered scheduling help</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md`}>
                {message.type === 'bot' && (
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-primary-600" />
                  </div>
                )}
                
                <div className={`px-4 py-2 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                {message.type === 'user' && (
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3 h-3 text-primary-600" />
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-primary-600" />
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="flex-1 input"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="btn btn-primary flex items-center justify-center px-4"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
