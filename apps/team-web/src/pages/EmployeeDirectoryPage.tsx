import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { EmployeeCard } from '../components/directory/EmployeeCard';
import { EmployeeProfile } from '../types';
import { Search, Users, Filter, Sparkles, UserPlus } from 'lucide-react';
import { db } from '@buyqk/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const EmployeeDirectoryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
      const list: EmployeeProfile[] = [];
      snap.forEach(d => {
        const data = d.data() as EmployeeProfile;
        if (data && data.fullName && data.fullName.trim().length > 0) {
          list.push({ ...data, uid: d.id });
        }
      });
      setEmployees(list);
    });
    return () => unsubscribe();
  }, []);

  const departments = ['ALL', 'Engineering', 'Product', 'Design', 'Operations', 'HR', 'Marketing'];

  const filteredEmployees = employees.filter((emp) => {
    if (!emp) return false;
    const q = searchQuery.toLowerCase().trim();

    const matchesDept = selectedDept === 'ALL' || (emp.department && emp.department === selectedDept);

    if (!q) return matchesDept;

    const nameMatch = emp.fullName ? emp.fullName.toLowerCase().includes(q) : false;
    const empIdMatch = emp.employeeId ? emp.employeeId.toLowerCase().includes(q) : false;
    const desigMatch = emp.designation ? emp.designation.toLowerCase().includes(q) : false;
    const emailMatch = emp.email ? emp.email.toLowerCase().includes(q) : false;
    const skillMatch = emp.skills && Array.isArray(emp.skills) 
      ? emp.skills.some(sk => sk && sk.toLowerCase().includes(q)) 
      : false;

    const matchesSearch = nameMatch || empIdMatch || desigMatch || emailMatch || skillMatch;

    return matchesSearch && matchesDept;
  });

  const handleQuickChat = (member: EmployeeProfile) => {
    navigate(`/teams/chat?uid=${member.uid}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 font-sans overflow-y-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-500" />
            <h1 className="text-xl sm:text-2xl font-black text-white">BuyQK Employee Directory</h1>
          </div>
          <p className="text-xs text-slate-400">Search teammates across engineering, operations, HR, product & design.</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span>{employees.length} Active Employees</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-blue-900/30">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Employee ID (e.g. 089), Designation, Email, or Skill..."
            className="w-full bg-slate-900 border border-blue-900/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                selectedDept === dept
                  ? 'bg-yellow-500 text-slate-950 shadow-gold-glow font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-900">
            <Users className="w-10 h-10 text-slate-600" />
            <p className="text-xs font-bold text-slate-400">No employee records match your search criteria.</p>
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <EmployeeCard key={emp.uid} member={emp} onQuickChat={handleQuickChat} />
          ))
        )}
      </div>

    </div>
  );
};
