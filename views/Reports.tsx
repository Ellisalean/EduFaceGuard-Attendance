import React, { useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Search } from 'lucide-react';
import { AttendanceRecord, User } from '../types';

const Reports: React.FC = () => {
  const [filter, setFilter] = useState('');
  
  // Fetch Data
  const attendanceLogs = StorageService.getAttendance();
  const users = StorageService.getUsers();

  // Process Data for Charts
  const chartData = useMemo(() => {
    // Group by course
    const courseStats: Record<string, number> = {};
    attendanceLogs.forEach(log => {
      courseStats[log.course] = (courseStats[log.course] || 0) + 1;
    });
    
    return Object.keys(courseStats).map(course => ({
      name: course,
      attendance: courseStats[course]
    }));
  }, [attendanceLogs]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = attendanceLogs.filter(l => l.timestamp.startsWith(today));
    // Unique users today
    const presentCount = new Set(todayLogs.map(l => l.userId)).size;
    const totalUsers = users.length || 1; // avoid divide by zero
    
    return [
      { name: 'Present', value: presentCount },
      { name: 'Absent', value: totalUsers - presentCount },
    ];
  }, [attendanceLogs, users]);

  // Filtered Table Data
  const filteredLogs = attendanceLogs.filter(log => 
    log.userName.toLowerCase().includes(filter.toLowerCase()) || 
    log.course.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleExport = () => {
    const headers = ['ID,Name,Role,Course,Time,Type'];
    const rows = filteredLogs.map(l => 
      `${l.userId},"${l.userName}",${l.userRole},"${l.course}",${l.timestamp},${l.type}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard & Reports</h1>
        <button 
          onClick={handleExport}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-700 transition shadow-sm"
        >
          <Download size={18} className="mr-2" /> Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total Users</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{users.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total Check-ins</p>
          <p className="text-3xl font-bold text-brand-600 mt-2">{attendanceLogs.length}</p>
        </div>
         {/* More KPI cards could go here */}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Attendance by Course */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="font-bold text-gray-700 mb-4">Attendance Volume by Course</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="attendance" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Presence */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="font-bold text-gray-700 mb-4">Today's Presence</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={todayStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {todayStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Recent Logs</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search user or course..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{log.userName}</td>
                    <td className="px-6 py-3 text-gray-500">{log.userRole}</td>
                    <td className="px-6 py-3 text-gray-500">{log.course}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                        {log.type.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Reports;