// src/app/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState, useMemo } from 'react';
import StudentCard from './components/StudentCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Student = {
  id: string;
  name: string;
  email: string;
  grade: number;
  application_status: string;
  country: string;
  last_active?: string;
  not_contacted_7days?: boolean;
  high_intent?: boolean;
  needs_essay_help?: boolean;
};

export default function HomePage() {
  const router = useRouter();
  
  // Check authentication - must be the FIRST hook
  useEffect(() => {
    const token = localStorage.getItem('admin-auth');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | ''>('');
  const [quickFilter, setQuickFilter] = useState<'not_contacted_7days' | 'high_intent' | 'needs_essay_help' | ''>('');

  const { data: students, isLoading, error } = useQuery<Student[], Error>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await axios.get('http://127.0.0.1:8000/api/students');
      return res.data.students;
    },
  });

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? s.application_status === statusFilter : true;
      const matchesCountry = countryFilter ? s.country === countryFilter : true;
      const matchesGrade = gradeFilter !== '' ? s.grade === gradeFilter : true;
      const matchesQuickFilter = quickFilter ? s[quickFilter] === true : true;
      return matchesSearch && matchesStatus && matchesCountry && matchesGrade && matchesQuickFilter;
    });
  }, [students, search, statusFilter, countryFilter, gradeFilter, quickFilter]);

  if (isLoading) return <div className="p-4">Loading students...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading students</div>;

  const total = students?.length ?? 0;
  const stages = students?.reduce((acc, s) => {
    acc[s.application_status] = (acc[s.application_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const notContacted7 = students?.filter(s => s.not_contacted_7days).length ?? 0;
  const needsEssayHelp = students?.filter(s => s.needs_essay_help).length ?? 0;
  const highIntent = students?.filter(s => s.high_intent).length ?? 0;

  const toggleQuickFilter = (filter: 'not_contacted_7days' | 'high_intent' | 'needs_essay_help' | '') => {
    if (quickFilter === filter) {
      setQuickFilter(''); // Unselect if already selected
    } else {
      setQuickFilter(filter);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky-header p-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-black">Admin CRM Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">Student Management System</div>
              <button 
                onClick={() => {
                  localStorage.removeItem('admin-auth');
                  localStorage.removeItem('admin-user');
                  window.location.href = '/login';
                }}
                className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Students</h1>
          <Link href="/students/create">
            <button className="btn-success px-4 py-2 rounded font-semibold">
              + Add Student
            </button>
          </Link>
        </div>

        {/* Dashboard Stats - FIRST LINE (Application Stages) */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="p-3 bg-blue-100 rounded flex-1 text-center stat-card">
            <div className="font-bold">Total Students: {total}</div>
          </div>
          <div className="p-3 bg-blue-200 rounded flex-1 text-center stat-card">
            <div className="font-bold">Exploring: {stages['Exploring'] || 0}</div>
          </div>
          <div className="p-3 bg-blue-300 rounded flex-1 text-center stat-card">
            <div className="font-bold">Shortlisting: {stages['Shortlisting'] || 0}</div>
          </div>
          <div className="p-3 bg-yellow-200 rounded flex-1 text-center stat-card">
            <div className="font-bold">Applying: {stages['Applying'] || 0}</div>
          </div>
          <div className="p-3 bg-green-200 rounded flex-1 text-center stat-card">
            <div className="font-bold">Submitted: {stages['Submitted'] || 0}</div>
          </div>
        </div>

        {/* Quick Filters - SECOND LINE (Toggleable Filters) */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div 
            onClick={() => toggleQuickFilter('not_contacted_7days')}
            className={`p-3 bg-red-200 rounded flex-1 text-center cursor-pointer filter-toggle ${
              quickFilter === 'not_contacted_7days' ? 'active' : ''
            }`}
          >
            <div className="font-bold">Not Contacted 7d: {notContacted7}</div>
          </div>
          <div 
            onClick={() => toggleQuickFilter('needs_essay_help')}
            className={`p-3 bg-purple-200 rounded flex-1 text-center cursor-pointer filter-toggle ${
              quickFilter === 'needs_essay_help' ? 'active' : ''
            }`}
          >
            <div className="font-bold">Needs Essay Help: {needsEssayHelp}</div>
          </div>
          <div 
            onClick={() => toggleQuickFilter('high_intent')}
            className={`p-3 bg-purple-200 rounded flex-1 text-center cursor-pointer filter-toggle ${
              quickFilter === 'high_intent' ? 'active' : ''
            }`}
          >
            <div className="font-bold">High Intent: {highIntent}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 p-2 border rounded font-medium"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded font-medium"
          >
            <option value="">All statuses</option>
            <option value="Exploring">Exploring</option>
            <option value="Shortlisting">Shortlisting</option>
            <option value="Applying">Applying</option>
            <option value="Submitted">Submitted</option>
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="p-2 border rounded font-medium"
          >
            <option value="">All countries</option>
            <option value="IN">India</option>
            <option value="US">USA</option>
            <option value="CA">Canada</option>
            <option value="AE">UAE</option>
            <option value="UK">UK</option>
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : '')}
            className="p-2 border rounded font-medium"
          >
            <option value="">All grades</option>
            <option value={11}>11</option>
            <option value={12}>12</option>
          </select>
          <select
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value as any)}
            className="p-2 border rounded font-medium"
          >
            <option value="">All Quick Filters</option>
            <option value="not_contacted_7days">Not Contacted 7d</option>
            <option value="high_intent">High Intent</option>
            <option value="needs_essay_help">Needs Essay Help</option>
          </select>
        </div>

        <p className="text-gray-600 mb-2 font-semibold">
          Showing {filteredStudents.length} of {students?.length ?? 0}
        </p>

        {/* Student Cards - 3 PER ROW */}
        <div className="grid grid-cols-3 gap-4">
          {filteredStudents.length === 0 && <p className="text-gray-500 col-span-3">No students found.</p>}
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </div>
    </div>
  );
}