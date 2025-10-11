'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function BillingPage() {
  const [billingData, setBillingData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  const [dietRate, setDietRate] = useState(0)
  const [showDietRateModal, setShowDietRateModal] = useState(false)
  const [tempDietRate, setTempDietRate] = useState('')

  useEffect(() => {
    fetchBillingData()
    const savedRate = localStorage.getItem('monthlyDietRate')
    if (savedRate) {
      setDietRate(parseFloat(savedRate))
    }
  }, [])

  useEffect(() => {
    handleFilter()
  }, [fromDate, toDate, searchQuery, billingData])

  const fetchBillingData = async () => {
    try {
      setLoading(true)

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_no, father_name, email, dob')
        .order('name', { ascending: true })

      if (studentsError) throw studentsError

      const { data: punches, error: punchesError } = await supabase
        .from('meal_punches')
        .select('student_id, roll_no, amount, meal_date, is_duplicate')

      if (punchesError) throw punchesError

      const billingMap = {}
      
      students.forEach(student => {
        billingMap[student.id] = {
          ...student,
          totalAmount: 0,
          mealCount: 0,
          regularMeals: 0,
          extraAmount: 0,
          punches: []
        }
      })

      punches.forEach(punch => {
        if (billingMap[punch.student_id]) {
          billingMap[punch.student_id].totalAmount += punch.amount || 0
          billingMap[punch.student_id].mealCount += 1
          billingMap[punch.student_id].punches.push(punch)
          
          if (punch.is_duplicate) {
            billingMap[punch.student_id].extraAmount = (billingMap[punch.student_id].extraAmount || 0) + (punch.amount || 0)
          } else {
            billingMap[punch.student_id].regularMeals = (billingMap[punch.student_id].regularMeals || 0) + 1
          }
        }
      })

      const billingArray = Object.values(billingMap)
      setBillingData(billingArray)
      setFilteredData(billingArray)
    } catch (error) {
      console.error('Error fetching billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    let filtered = [...billingData]

    if (fromDate || toDate) {
      filtered = filtered.map(student => {
        const filteredPunches = student.punches.filter(punch => {
          const punchDate = new Date(punch.meal_date)
          const from = fromDate ? new Date(fromDate) : null
          const to = toDate ? new Date(toDate) : null

          if (from && to) {
            return punchDate >= from && punchDate <= to
          } else if (from) {
            return punchDate >= from
          } else if (to) {
            return punchDate <= to
          }
          return true
        })

        const totalAmount = filteredPunches.reduce((sum, p) => sum + (p.amount || 0), 0)
        const mealCount = filteredPunches.length
        const regularMeals = filteredPunches.filter(p => !p.is_duplicate).length
        const extraAmount = filteredPunches
          .filter(p => p.is_duplicate)
          .reduce((sum, p) => sum + (p.amount || 0), 0)

        return {
          ...student,
          totalAmount,
          mealCount,
          regularMeals,
          extraAmount,
          filteredPunches
        }
      })
    }

    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.father_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredData(filtered)
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }

    const sorted = [...filteredData].sort((a, b) => {
      if (key === 'totalAmount' || key === 'mealCount' || key === 'regularMeals') {
        return direction === 'asc' ? a[key] - b[key] : b[key] - a[key]
      } else {
        const aValue = a[key]?.toLowerCase() || ''
        const bValue = b[key]?.toLowerCase() || ''
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
    })

    setSortConfig({ key, direction })
    setFilteredData(sorted)
  }

  const handleDownloadExcel = () => {
    const excelData = filteredData.map((student, index) => {
      const regularMealAmount = student.regularMeals * dietRate
      const finalAmount = regularMealAmount + (student.extraAmount || 0)
      
      return {
        'S.No': index + 1,
        'Name': student.name || '',
        'Roll Number': student.roll_no || '',
        'Father\'s Name': student.father_name || '',
        'Email': student.email || '',
        'Date of Birth': student.dob || '',
        'Diet Rate': dietRate.toFixed(2),
        'Regular Meals': student.regularMeals || 0,
        'Regular Meal Amount': regularMealAmount.toFixed(2),
        'Extra Amount': (student.extraAmount || 0).toFixed(2),
        'Final Amount': finalAmount.toFixed(2)
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    const colWidths = [
      { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 30 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Billing Report')

    let filename = 'billing_report'
    if (fromDate && toDate) {
      filename += `_${fromDate}_to_${toDate}`
    } else if (fromDate) {
      filename += `_from_${fromDate}`
    } else if (toDate) {
      filename += `_until_${toDate}`
    }
    filename += '.xlsx'

    XLSX.writeFile(wb, filename)
  }

  const clearFilters = () => {
    setFromDate('')
    setToDate('')
    setSearchQuery('')
    setFilteredData(billingData)
  }

  const getTotalAmount = () => {
    return filteredData.reduce((sum, student) => {
      const regularMealAmount = (student.regularMeals || 0) * dietRate
      const finalAmount = regularMealAmount + (student.extraAmount || 0)
      return sum + finalAmount
    }, 0)
  }

  const getTotalMeals = () => {
    return filteredData.reduce((sum, student) => sum + student.mealCount, 0)
  }

  const getTotalRegularMeals = () => {
    return filteredData.reduce((sum, student) => sum + (student.regularMeals || 0), 0)
  }

  const getTotalExtraAmount = () => {
    return filteredData.reduce((sum, student) => sum + (student.extraAmount || 0), 0)
  }

  const handleSaveDietRate = () => {
    if (!tempDietRate || isNaN(tempDietRate) || parseFloat(tempDietRate) <= 0) {
      alert('Please enter a valid diet rate')
      return
    }
    
    const rate = parseFloat(tempDietRate)
    setDietRate(rate)
    localStorage.setItem('monthlyDietRate', rate.toString())
    setShowDietRateModal(false)
    setTempDietRate('')
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
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
      {showDietRateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl border-4 border-white/30 max-w-md w-full relative">
            <button
              onClick={() => setShowDietRateModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Set Average Diet Rate
            </h2>

            <p className="text-white/80 text-sm mb-4">
              Enter the average diet rate per meal for the billing period. This rate will be used to calculate the final amount for regular meals.
            </p>

            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-2 block">
                Diet Rate per Meal (₹)
              </label>
              <input
                type="number"
                value={tempDietRate}
                onChange={(e) => setTempDietRate(e.target.value)}
                placeholder="e.g., 50"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-blue-500 text-lg font-bold text-center"
              />
            </div>

            {dietRate > 0 && (
              <div className="mb-4 bg-blue-500/20 border border-blue-400 rounded-lg p-3">
                <p className="text-blue-200 text-sm">
                  Current rate: <strong>₹{dietRate.toFixed(2)}</strong> per meal
                </p>
              </div>
            )}

            <button
              onClick={handleSaveDietRate}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-lg transition-all"
            >
              Save Diet Rate
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                💰 Billing Dashboard
              </h1>
              <p className="text-blue-200">Student meal billing and expense tracking</p>
            </div>
            <Link href="/admin">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                ← Back to Dashboard
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
              <p className="text-yellow-200 text-sm mb-1">Diet Rate</p>
              <div className="flex items-center justify-between">
                <p className="text-white text-3xl font-bold">₹{dietRate.toFixed(2)}</p>
                <button
                  onClick={() => {
                    setTempDietRate(dietRate.toString())
                    setShowDietRateModal(true)
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30">
              <p className="text-green-200 text-sm mb-1">Total Students</p>
              <p className="text-white text-3xl font-bold">{filteredData.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
              <p className="text-blue-200 text-sm mb-1">Regular Meals</p>
              <p className="text-white text-3xl font-bold">{getTotalRegularMeals()}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
              <p className="text-purple-200 text-sm mb-1">Final Amount</p>
              <p className="text-white text-3xl font-bold">₹{getTotalAmount().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="text-white/80 text-sm font-semibold mb-2 block">Search</label>
              <input
                type="text"
                placeholder="Name, Roll No, Father Name, Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-white/80 text-sm font-semibold mb-2 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-white/80 text-sm font-semibold mb-2 block">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              {(fromDate || toDate || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold transition-all"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleDownloadExcel}
                disabled={filteredData.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                📥 Excel
              </button>
            </div>
          </div>

          {(fromDate || toDate) && (
            <div className="mt-4 bg-blue-500/20 border border-blue-400 rounded-lg p-3">
              <p className="text-white text-sm">
                📅 Showing data 
                {fromDate && ` from ${new Date(fromDate).toLocaleDateString('en-IN')}`}
                {toDate && ` to ${new Date(toDate).toLocaleDateString('en-IN')}`}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 overflow-x-auto">
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-white text-xl font-semibold mb-2">No data found</p>
              <p className="text-blue-200">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-white/20">
                  <th className="text-left py-3 px-3 text-white font-bold text-sm">S.No</th>
                  <th 
                    className="text-left py-3 px-3 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Name {getSortIcon('name')}
                  </th>
                  <th 
                    className="text-left py-3 px-3 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('roll_no')}
                  >
                    Roll No {getSortIcon('roll_no')}
                  </th>
                  <th className="text-left py-3 px-3 text-white font-bold text-sm">Father Name</th>
                  <th 
                    className="text-center py-3 px-3 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('regularMeals')}
                  >
                    Regular Meals {getSortIcon('regularMeals')}
                  </th>
                  <th className="text-right py-3 px-3 text-white font-bold text-sm">
                    Regular Amount
                  </th>
                  <th className="text-right py-3 px-3 text-white font-bold text-sm">
                    Extra Amount
                  </th>
                  <th 
                    className="text-right py-3 px-3 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('totalAmount')}
                  >
                    Final Amount {getSortIcon('totalAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((student, index) => {
                  const regularMealAmount = (student.regularMeals || 0) * dietRate
                  const extraAmount = student.extraAmount || 0
                  const finalAmount = regularMealAmount + extraAmount
                  
                  return (
                    <tr 
                      key={student.id} 
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-3 text-white/80">{index + 1}</td>
                      <td className="py-3 px-3 text-white font-semibold">{student.name}</td>
                      <td className="py-3 px-3 text-blue-300 font-mono">{student.roll_no}</td>
                      <td className="py-3 px-3 text-white/80">{student.father_name}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                          {student.regularMeals || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-green-400 font-semibold">
                          ₹{regularMealAmount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-yellow-400 font-semibold">
                          ₹{extraAmount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-white font-bold text-lg">
                          ₹{finalAmount.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/30 bg-white/5">
                  <td colSpan={4} className="py-3 px-3 text-white font-bold text-right">
                    TOTAL:
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="bg-blue-500/50 text-white px-4 py-2 rounded-full font-bold">
                      {getTotalRegularMeals()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-green-400 font-bold text-lg">
                      ₹{(getTotalRegularMeals() * dietRate).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-yellow-400 font-bold text-lg">
                      ₹{getTotalExtraAmount().toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-white font-bold text-xl">
                      ₹{getTotalAmount().toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mt-6">
          <h2 className="text-xl font-bold text-white mb-3">📝 Instructions</h2>
          <ul className="text-blue-200 space-y-2">
            <li>• Set Diet Rate: Click the Edit button to set average meal cost</li>
            <li>• Regular Meals: Count of non-duplicate meals multiplied by diet rate</li>
            <li>• Extra Amount: Total of all duplicate meal charges</li>
            <li>• Final Amount: Regular Meals Amount + Extra Amount</li>
            <li>• Use date filters to view billing for specific time periods</li>
            <li>• Search by student name, roll number, or father name</li>
            <li>• Click column headers to sort data</li>
            <li>• Download Excel file with detailed breakdown including diet rate</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-purple-400/30 mt-6">
          <h2 className="text-xl font-bold text-white mb-3">💡 Billing Calculation</h2>
          <div className="text-white space-y-2">
            <p className="font-semibold mb-2">Formula:</p>
            <div className="bg-white/10 rounded-lg p-4 font-mono text-sm">
              <p className="text-green-300">Regular Meal Amount = Regular Meals × Diet Rate</p>
              <p className="text-yellow-300">Extra Amount = Sum of all duplicate meal charges</p>
              <p className="text-blue-300 font-bold mt-2">Final Amount = Regular Meal Amount + Extra Amount</p>
            </div>
            <p className="text-sm text-blue-200 mt-3">
              Example: If a student has 30 regular meals at ₹50 each, plus ₹200 in extra charges:
              <br />
              Final Amount = (30 × ₹50) + ₹200 = ₹1,500 + ₹200 = ₹1,700
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
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