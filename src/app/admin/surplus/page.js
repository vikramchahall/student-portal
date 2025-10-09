'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' // Make sure to use your actual supabase import
import { useRouter } from 'next/navigation'

export default function SurplusManagement() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, accepted, rejected

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('surplus_bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('surplus_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error

      // Refresh data
      await fetchBookings()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🌅',
      lunch: '🍱',
      snacks: '🍪',
      dinner: '🌙'
    }
    return icons[type] || '🍽️'
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/50',
      accepted: 'bg-green-500/20 text-green-200 border-green-500/50',
      rejected: 'bg-red-500/20 text-red-200 border-red-500/50'
    }
    return colors[status] || 'bg-gray-500/20 text-gray-200 border-gray-500/50'
  }

  const filteredBookings = bookings.filter(booking => 
    filter === 'all' ? true : booking.status === filter
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">
                🌍 Surplus Meal Management
              </h1>
              <p className="text-blue-200 text-lg">
                Manage booking requests and track your impact
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')} // Navigates to the admin dashboard
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md whitespace-nowrap"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'accepted', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 rounded-xl font-semibold capitalize transition-all whitespace-nowrap ${
                filter === status
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {status} {status !== 'all' && `(${bookings.filter(b => b.status === status).length})`}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading bookings...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-5xl">{getMealIcon(booking.meal_type)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-white capitalize">
                          {booking.meal_type}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-3 text-white/80">
                        <div>
                          <p className="text-sm text-white/60">Requester</p>
                          <p className="font-semibold">{booking.requester_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/60">Organization</p>
                          <p className="font-semibold">{booking.organization_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/60">Phone</p>
                          <p className="font-semibold">{booking.phone_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/60">Quantity</p>
                          <p className="font-semibold text-xl text-green-300">
                            {booking.quantity_needed} meals
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-white/60">Date</p>
                          <p className="font-semibold">
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-white/60">Requested On</p>
                          <p className="font-semibold">
                            {new Date(booking.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex flex-col gap-2 md:w-48">
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'accepted')}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:scale-105"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:scale-105"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {booking.status === 'accepted' && (
                    <div className="md:w-48 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                      <p className="text-green-200 font-semibold">✓ Approved</p>
                      <p className="text-green-300 text-sm mt-1">Donation Complete</p>
                    </div>
                  )}

                  {booking.status === 'rejected' && (
                    <div className="md:w-48 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center">
                      <p className="text-red-200 font-semibold">✕ Declined</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
            <span className="text-6xl mb-4 block">📭</span>
            <p className="text-white text-xl">No {filter !== 'all' ? filter : ''} bookings found</p>
            <p className="text-white/60 text-sm mt-2">
              {filter === 'pending' 
                ? 'All requests have been processed'
                : 'Booking requests will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

