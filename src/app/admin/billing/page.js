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

  useEffect(() => {
    fetchBillingData()
  }, [])

  useEffect(() => {
    handleFilter()
  }, [fromDate, toDate, searchQuery, billingData])

  const fetchBillingData = async () => {
    try {
      setLoading(true)

      // Fetch all students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, roll_no, father_name, email, dob')
        .order('name', { ascending: true })

      if (studentsError) throw studentsError

      // Fetch all meal punches
      const { data: punches, error: punchesError } = await supabase
        .from('meal_punches')
        .select('student_id, roll_no, amount, meal_date')

      if (punchesError) throw punchesError

      // Calculate billing for each student
      const billingMap = {}
      
      students.forEach(student => {
        billingMap[student.id] = {
          ...student,
          totalAmount: 0,
          mealCount: 0,
          punches: []
        }
      })

      punches.forEach(punch => {
        if (billingMap[punch.student_id]) {
          billingMap[punch.student_id].totalAmount += punch.amount || 0
          billingMap[punch.student_id].mealCount += 1
          billingMap[punch.student_id].punches.push(punch)
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

    // Apply date filter
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

        return {
          ...student,
          totalAmount,
          mealCount,
          filteredPunches
        }
      })
    }

    // Apply search filter
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
      if (key === 'totalAmount' || key === 'mealCount') {
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
    // Prepare data for Excel
    const excelData = filteredData.map((student, index) => ({
      'S.No': index + 1,
      'Name': student.name || '',
      'Roll Number': student.roll_no || '',
      'Father\'s Name': student.father_name || '',
      'Email': student.email || '',
      'Date of Birth': student.dob || '',
      'Total Meals': student.mealCount,
      'Total Amount (₹)': student.totalAmount.toFixed(2)
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    const colWidths = [
      { wch: 6 },  // S.No
      { wch: 25 }, // Name
      { wch: 15 }, // Roll Number
      { wch: 25 }, // Father's Name
      { wch: 30 }, // Email
      { wch: 12 }, // DOB
      { wch: 12 }, // Total Meals
      { wch: 15 }  // Total Amount
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Billing Report')

    // Generate filename with date range
    let filename = 'billing_report'
    if (fromDate && toDate) {
      filename += `_${fromDate}_to_${toDate}`
    } else if (fromDate) {
      filename += `_from_${fromDate}`
    } else if (toDate) {
      filename += `_until_${toDate}`
    }
    filename += '.xlsx'

    // Download file
    XLSX.writeFile(wb, filename)
  }

  const clearFilters = () => {
    setFromDate('')
    setToDate('')
    setSearchQuery('')
    setFilteredData(billingData)
  }

  const getTotalAmount = () => {
    return filteredData.reduce((sum, student) => sum + student.totalAmount, 0)
  }

  const getTotalMeals = () => {
    return filteredData.reduce((sum, student) => sum + student.mealCount, 0)
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30">
              <p className="text-green-200 text-sm mb-1">Total Students</p>
              <p className="text-white text-3xl font-bold">{filteredData.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
              <p className="text-blue-200 text-sm mb-1">Total Meals Served</p>
              <p className="text-white text-3xl font-bold">{getTotalMeals()}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
              <p className="text-purple-200 text-sm mb-1">Total Revenue</p>
              <p className="text-white text-3xl font-bold">₹{getTotalAmount().toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-4">
              <label className="text-white/80 text-sm font-semibold mb-2 block">Search</label>
              <input
                type="text"
                placeholder="Name, Roll No, Father's Name, Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* From Date */}
            <div className="md:col-span-3">
              <label className="text-white/80 text-sm font-semibold mb-2 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* To Date */}
            <div className="md:col-span-3">
              <label className="text-white/80 text-sm font-semibold mb-2 block">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
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

        {/* Billing Table */}
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
                  <th className="text-left py-4 px-4 text-white font-bold text-sm">S.No</th>
                  <th 
                    className="text-left py-4 px-4 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Name {getSortIcon('name')}
                  </th>
                  <th 
                    className="text-left py-4 px-4 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('roll_no')}
                  >
                    Roll No {getSortIcon('roll_no')}
                  </th>
                  <th className="text-left py-4 px-4 text-white font-bold text-sm">Father's Name</th>
                  <th className="text-left py-4 px-4 text-white font-bold text-sm">Email</th>
                  <th className="text-left py-4 px-4 text-white font-bold text-sm">DOB</th>
                  <th 
                    className="text-center py-4 px-4 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('mealCount')}
                  >
                    Total Meals {getSortIcon('mealCount')}
                  </th>
                  <th 
                    className="text-right py-4 px-4 text-white font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total Amount {getSortIcon('totalAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4 text-white/80">{index + 1}</td>
                    <td className="py-4 px-4 text-white font-semibold">{student.name}</td>
                    <td className="py-4 px-4 text-blue-300 font-mono">{student.roll_no}</td>
                    <td className="py-4 px-4 text-white/80">{student.father_name}</td>
                    <td className="py-4 px-4 text-white/80 text-sm">{student.email}</td>
                    <td className="py-4 px-4 text-white/80">{student.dob}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                        {student.mealCount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-green-400 font-bold text-lg">
                        ₹{student.totalAmount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/30 bg-white/5">
                  <td colSpan="6" className="py-4 px-4 text-white font-bold text-right">
                    TOTAL:
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-blue-500/50 text-white px-4 py-2 rounded-full font-bold">
                      {getTotalMeals()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-green-400 font-bold text-xl">
                      ₹{getTotalAmount().toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mt-6">
          <h2 className="text-xl font-bold text-white mb-3">📝 Instructions</h2>
          <ul className="text-blue-200 space-y-2">
            <li>• Use the date filters to view billing for a specific time period</li>
            <li>• Search by student name, roll number, father's name, or email</li>
            <li>• Click on column headers to sort data (Name, Roll No, Total Meals, Total Amount)</li>
            <li>• Download the filtered data as Excel file using the Excel button</li>
            <li>• Clear button resets all filters to show complete data</li>
          </ul>
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