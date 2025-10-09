'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function AdminFeedbackPage() {
  const [feedbackData, setFeedbackData] = useState({})
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [detailedFeedbacks, setDetailedFeedbacks] = useState([])

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner']

  useEffect(() => {
    fetchFeedbackData()
  }, [])

  const fetchFeedbackData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('meal_feedback')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (error) throw error

      // Process feedback data to calculate averages
      const processedData = {}
      
      days.forEach(day => {
        mealTypes.forEach(mealType => {
          const key = `${day}-${mealType}`
          const feedbacks = data?.filter(
            f => f.day_of_week === day && f.meal_type === mealType
          ) || []

          if (feedbacks.length > 0) {
            const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0)
            const avgRating = (totalRating / feedbacks.length).toFixed(1)
            
            processedData[key] = {
              avgRating: avgRating,
              count: feedbacks.length,
              menuItems: feedbacks[0]?.menu_items || 'No menu',
              feedbacks: feedbacks
            }
          }
        })
      })

      setFeedbackData(processedData)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCellClick = (day, mealType) => {
    const key = `${day}-${mealType}`
    const data = feedbackData[key]
    
    if (!data || data.count === 0) return

    setSelectedFeedback({
      day,
      mealType,
      menuItems: data.menuItems,
      avgRating: data.avgRating,
      count: data.count
    })
    setDetailedFeedbacks(data.feedbacks)
    setShowDetailsModal(true)
  }

  const handleModalClose = () => {
    setShowDetailsModal(false)
    setSelectedFeedback(null)
    setDetailedFeedbacks([])
  }

  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: '🌅',
      lunch: '🍽️',
      snacks: '☕',
      dinner: '🌙'
    }
    return icons[mealType] || '🍴'
  }

  const getMealColor = (mealType) => {
    const colors = {
      breakfast: 'bg-yellow-500/10 border-yellow-400/30 hover:bg-yellow-500/20',
      lunch: 'bg-green-500/10 border-green-400/30 hover:bg-green-500/20',
      snacks: 'bg-purple-500/10 border-purple-400/30 hover:bg-purple-500/20',
      dinner: 'bg-blue-500/10 border-blue-400/30 hover:bg-blue-500/20'
    }
    return colors[mealType] || 'bg-gray-500/10 border-gray-400/30 hover:bg-gray-500/20'
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-400'
    if (rating >= 3.5) return 'text-blue-400'
    if (rating >= 2.5) return 'text-yellow-400'
    if (rating >= 1.5) return 'text-orange-400'
    return 'text-red-400'
  }

  const getStarDisplay = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    
    return (
      <span className="text-xl">
        {'⭐'.repeat(fullStars)}
        {hasHalfStar && '⭐'}
        {'☆'.repeat(emptyStars)}
      </span>
    )
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4 md:p-8">
      {/* Feedback Details Modal */}
      {showDetailsModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-white/30 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all z-10"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{getMealIcon(selectedFeedback.mealType)}</span>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white capitalize">
                    {selectedFeedback.mealType} - {selectedFeedback.day}
                  </h2>
                  <p className="text-blue-200 text-sm">Total Responses: {selectedFeedback.count}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/30">
                <p className="text-white/70 text-xs font-semibold mb-2">Menu:</p>
                <p className="text-white text-sm whitespace-pre-line">{selectedFeedback.menuItems}</p>
              </div>

              {/* Average Rating */}
              <div className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 backdrop-blur-sm rounded-xl p-4 border-2 border-yellow-400/50 text-center">
                <p className="text-white/80 text-sm mb-1">Average Rating</p>
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-4xl font-bold ${getRatingColor(selectedFeedback.avgRating)}`}>
                    {selectedFeedback.avgRating}
                  </span>
                  {getStarDisplay(parseFloat(selectedFeedback.avgRating))}
                </div>
              </div>
            </div>

            {/* Individual Feedbacks */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-3">📝 Individual Feedback</h3>
              {detailedFeedbacks.map((feedback, index) => (
                <div
                  key={feedback.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-bold">
                        {feedback.student_name?.charAt(0) || '?'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                        <div>
                          <p className="text-white font-bold">{feedback.student_name}</p>
                          <p className="text-blue-200 text-xs">Roll: {feedback.roll_no}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getRatingColor(feedback.rating)}`}>
                            {feedback.rating}
                          </span>
                          <span className="text-lg">{'⭐'.repeat(feedback.rating)}</span>
                        </div>
                      </div>
                      <p className="text-white/60 text-xs mb-3">{formatDate(feedback.submitted_at)}</p>

                      {/* Disliked Items */}
                      {feedback.disliked_items && (
                        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 mb-2">
                          <p className="text-red-200 text-xs font-semibold mb-1">😞 What they didn't like:</p>
                          <p className="text-white text-sm">{feedback.disliked_items}</p>
                        </div>
                      )}

                      {/* Alternative Suggestions */}
                      {feedback.alternative_suggestions && (
                        <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3">
                          <p className="text-green-200 text-xs font-semibold mb-1">💡 Alternative suggestions:</p>
                          <p className="text-white text-sm">{feedback.alternative_suggestions}</p>
                        </div>
                      )}

                      {!feedback.disliked_items && !feedback.alternative_suggestions && (
                        <p className="text-white/50 text-sm italic">No additional comments provided</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                📊 Meal Feedback Dashboard
              </h1>
              <p className="text-blue-200">View average ratings and student feedback</p>
            </div>
            <Link href="/admin">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                ← Back to Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-purple-400/30 mb-6">
          <p className="text-white text-sm">
            💡 <strong>Click on any meal</strong> to see detailed feedback, individual ratings, complaints, and suggestions from students.
          </p>
        </div>

        {/* Feedback Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 shadow-2xl border border-white/20 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-4 border border-white/20 rounded-tl-xl font-bold text-lg">
                  Day / Meal
                </th>
                {mealTypes.map((mealType) => (
                  <th
                    key={mealType}
                    className={`${getMealColor(mealType)} text-white p-4 border border-white/20 font-bold text-lg min-w-[200px]`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{getMealIcon(mealType)}</span>
                      <span className="capitalize">{mealType}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 border border-white/20 font-bold text-lg">
                    {day}
                  </td>
                  {mealTypes.map((mealType) => {
                    const key = `${day}-${mealType}`
                    const data = feedbackData[key]
                    const hasData = data && data.count > 0
                    
                    return (
                      <td
                        key={mealType}
                        className={`${getMealColor(mealType)} border border-white/20 p-3 ${
                          hasData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        } transition-all`}
                        onClick={() => hasData && handleCellClick(day, mealType)}
                      >
                        {hasData ? (
                          <div className="min-h-[120px] flex flex-col justify-between">
                            <div className="mb-3">
                              <p className="text-white text-xs mb-2 line-clamp-2">
                                {data.menuItems}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <span className={`text-3xl font-bold ${getRatingColor(data.avgRating)}`}>
                                  {data.avgRating}
                                </span>
                                <span className="text-lg">⭐</span>
                              </div>
                              <div className="bg-white/30 rounded-lg px-3 py-1 text-center">
                                <span className="text-white text-xs font-semibold">
                                  {data.count} {data.count === 1 ? 'response' : 'responses'}
                                </span>
                              </div>
                              <div className="mt-2 text-center">
                                <span className="text-white/70 text-xs hover:text-white transition-colors">
                                  👁️ View Details
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="min-h-[120px] flex items-center justify-center">
                            <p className="text-white/50 text-sm text-center">
                              No feedback yet
                            </p>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">📈 Rating Scale</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-1">1.0-1.9</div>
              <div className="text-white text-sm">Poor</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-1">2.0-2.9</div>
              <div className="text-white text-sm">Below Average</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">3.0-3.9</div>
              <div className="text-white text-sm">Average</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">4.0-4.4</div>
              <div className="text-white text-sm">Good</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">4.5-5.0</div>
              <div className="text-white text-sm">Excellent</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </div>
  )
}