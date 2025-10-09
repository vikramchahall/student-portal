'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function MenuPage() {
  const [menuData, setMenuData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editingCell, setEditingCell] = useState(null)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner']

  useEffect(() => {
    fetchMenuData()
  }, [])

  const fetchMenuData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('weekly_menu')
        .select('*')

      if (error) throw error

      // Convert array to object for easier access
      const menuObj = {}
      data?.forEach(item => {
        const key = `${item.day_of_week}-${item.meal_type}`
        menuObj[key] = item.menu_items
      })

      setMenuData(menuObj)
    } catch (error) {
      console.error('Error fetching menu:', error)
      setMessage({ type: 'error', text: 'Failed to load menu data' })
    } finally {
      setLoading(false)
    }
  }

  const handleCellChange = (day, mealType, value) => {
    const key = `${day}-${mealType}`
    setMenuData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveMenu = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Prepare data for upsert
      const upsertData = []
      days.forEach(day => {
        mealTypes.forEach(mealType => {
          const key = `${day}-${mealType}`
          const menuItems = menuData[key] || ''
          
          upsertData.push({
            day_of_week: day,
            meal_type: mealType,
            menu_items: menuItems
          })
        })
      })

      // Upsert all menu items
      const { error } = await supabase
        .from('weekly_menu')
        .upsert(upsertData, {
          onConflict: 'day_of_week,meal_type'
        })

      if (error) throw error

      setMessage({ type: 'success', text: '✅ Menu saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error saving menu:', error)
      setMessage({ type: 'error', text: '❌ Failed to save menu. Please try again.' })
    } finally {
      setSaving(false)
    }
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
      breakfast: 'bg-yellow-500/10 border-yellow-400/30',
      lunch: 'bg-green-500/10 border-green-400/30',
      snacks: 'bg-purple-500/10 border-purple-400/30',
      dinner: 'bg-blue-500/10 border-blue-400/30'
    }
    return colors[mealType] || 'bg-gray-500/10 border-gray-400/30'
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
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                📋 Weekly Menu Management
              </h1>
              <p className="text-blue-200">Create and manage weekly meal menu</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveMenu}
                disabled={saving}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    💾 Save Menu
                  </>
                )}
              </button>
              <Link href="/admin">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                  ← Back
                </button>
              </Link>
            </div>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mt-4 rounded-xl p-4 ${
              message.type === 'success' 
                ? 'bg-green-500/20 border border-green-500 text-green-200' 
                : 'bg-red-500/20 border border-red-500 text-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Menu Table */}
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
              {days.map((day, dayIndex) => (
                <tr key={day} className="hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 border border-white/20 font-bold text-lg">
                    {day}
                  </td>
                  {mealTypes.map((mealType) => {
                    const key = `${day}-${mealType}`
                    const isEditing = editingCell === key
                    return (
                      <td
                        key={mealType}
                        className={`${getMealColor(mealType)} border border-white/20 p-2`}
                        onClick={() => setEditingCell(key)}
                      >
                        <textarea
                          value={menuData[key] || ''}
                          onChange={(e) => handleCellChange(day, mealType, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          placeholder="Enter menu items..."
                          className={`w-full min-h-[100px] p-3 rounded-lg bg-white/20 border-2 ${
                            isEditing ? 'border-blue-400 ring-4 ring-blue-400/30' : 'border-white/30'
                          } text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/30 resize-y transition-all`}
                          rows={4}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mt-6">
          <h2 className="text-xl font-bold text-white mb-3">📝 Instructions</h2>
          <ul className="text-blue-200 space-y-2">
            <li>• Click on any cell to start editing the menu for that day and meal type</li>
            <li>• You can enter multiple items, one per line or separated by commas</li>
            <li>• Click outside the cell or press Tab to move to the next field</li>
            <li>• Click the "Save Menu" button to save all changes to the database</li>
            <li>• Empty cells are allowed - they will be saved as blank entries</li>
          </ul>
        </div>

        {/* Quick Fill Example */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-purple-400/30 mt-6">
          <h2 className="text-xl font-bold text-white mb-3">💡 Example Menu Items</h2>
          <div className="grid md:grid-cols-2 gap-4 text-white">
            <div>
              <p className="font-semibold text-yellow-300 mb-2">🌅 Breakfast Ideas:</p>
              <p className="text-sm">Poha, Tea<br/>Paratha, Curd<br/>Idli, Sambar, Chutney</p>
            </div>
            <div>
              <p className="font-semibold text-green-300 mb-2">🍽️ Lunch Ideas:</p>
              <p className="text-sm">Rice, Dal, Roti, Sabzi<br/>Rajma Chawal, Salad<br/>Chole, Rice, Raita</p>
            </div>
            <div>
              <p className="font-semibold text-purple-300 mb-2">☕ Snacks Ideas:</p>
              <p className="text-sm">Tea, Biscuits<br/>Samosa, Chutney<br/>Pakora, Tea</p>
            </div>
            <div>
              <p className="font-semibold text-blue-300 mb-2">🌙 Dinner Ideas:</p>
              <p className="text-sm">Roti, Paneer Sabzi, Dal<br/>Rice, Kadhi, Papad<br/>Pulao, Raita, Salad</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        textarea::-webkit-scrollbar {
          width: 6px;
        }
        textarea::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        textarea::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 10px;
        }
        textarea::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </div>
  )
}