'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Calendar, Clock, MapPin, Edit, Trash2, Plus } from 'lucide-react'

interface Appointment {
  id: number
  title: string
  description?: string
  appointmentDate: string
  durationMinutes: number
  status: string
  appointmentType: string
  location?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'

export default function AppointmentList() {
  const { token } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setAppointments(response.data.appointments)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const deleteAppointment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return

    try {
      await axios.delete(`${API_BASE_URL}/api/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      setAppointments(prev => prev.filter(apt => apt.id !== id))
      toast.success('Appointment deleted successfully')
    } catch (error) {
      console.error('Failed to delete appointment:', error)
      toast.error('Failed to delete appointment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments yet</h3>
          <p className="text-gray-600 mb-4">
            Start by scheduling your first appointment using the chat assistant or create one manually.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            Create Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(appointment.appointmentDate)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.durationMinutes} minutes</span>
                    </div>
                    
                    {appointment.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{appointment.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <span className="capitalize">{appointment.appointmentType}</span>
                    </div>
                  </div>
                  
                  {appointment.description && (
                    <p className="mt-3 text-gray-700">{appointment.description}</p>
                  )}
                  
                  {appointment.notes && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      Note: {appointment.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setEditingAppointment(appointment)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAppointment(appointment.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingAppointment) && (
        <AppointmentForm
          appointment={editingAppointment}
          onClose={() => {
            setShowCreateForm(false)
            setEditingAppointment(null)
          }}
          onSuccess={() => {
            fetchAppointments()
            setShowCreateForm(false)
            setEditingAppointment(null)
          }}
        />
      )}
    </div>
  )
}

// Appointment Form Component
function AppointmentForm({ 
  appointment, 
  onClose, 
  onSuccess 
}: { 
  appointment?: Appointment | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { token } = useAuth()
  const [formData, setFormData] = useState({
    title: appointment?.title || '',
    description: appointment?.description || '',
    appointmentDate: appointment?.appointmentDate ? 
      new Date(appointment.appointmentDate).toISOString().slice(0, 16) : '',
    durationMinutes: appointment?.durationMinutes || 60,
    appointmentType: appointment?.appointmentType || 'general',
    location: appointment?.location || '',
    notes: appointment?.notes || ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = appointment 
        ? `${API_BASE_URL}/api/appointments/${appointment.id}`
        : `${API_BASE_URL}/api/appointments`
      
      const method = appointment ? 'PUT' : 'POST'
      
      await axios({
        method,
        url,
        data: {
          ...formData,
          appointmentDate: new Date(formData.appointmentDate).toISOString()
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      toast.success(appointment ? 'Appointment updated successfully' : 'Appointment created successfully')
      onSuccess()
    } catch (error) {
      console.error('Failed to save appointment:', error)
      toast.error('Failed to save appointment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {appointment ? 'Edit Appointment' : 'Create New Appointment'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.appointmentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                  className="input"
                  min="15"
                  max="480"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.appointmentType}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointmentType: e.target.value }))}
                  className="input"
                >
                  <option value="general">General</option>
                  <option value="medical">Medical</option>
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input"
                rows={2}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary flex-1 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  appointment ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
