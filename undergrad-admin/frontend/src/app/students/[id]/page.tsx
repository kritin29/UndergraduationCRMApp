// src/app/students/[id]/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import NotesTab from '../../components/students/NotesTab';
import InteractionsTab from '../../components/students/InteractionsTab';
import CommunicationsTab from '../../components/students/CommunicationsTab';
import TasksTab from '../../components/students/TasksTab';

type Student = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  grade?: number;
  country?: string;
  application_status?: string;
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params?.id === 'string' ? params.id : undefined;

  const [activeTab, setActiveTab] = useState<'notes' | 'interactions' | 'communications' | 'tasks'>('notes');

  const query = useQuery<
    { student?: Student | null; notes?: any[]; interactions?: any[]; communications?: any[]; tasks?: any[] } | null,
    Error
  >({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('Missing student id');
      const res = await axios.get(`http://127.0.0.1:8000/api/students/${studentId}`);
      return res.data ?? null;
    },
    enabled: !!studentId,
    staleTime: 1000 * 60,
  });

  if (!studentId) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="student-detail-container text-center">
          <p className="text-red-500">No student selected.</p>
          <button className="mt-3 text-blue-600 font-semibold" onClick={() => router.push('/')}>Back to list</button>
        </div>
      </div>
    );
  }

  if (query.isLoading) return (
    <div className="gradient-bg min-h-screen flex items-center justify-center">
      <div className="student-detail-container text-center">
        <p>Loading student...</p>
      </div>
    </div>
  );
  
  if (query.isError) return (
    <div className="gradient-bg min-h-screen flex items-center justify-center">
      <div className="student-detail-container text-center">
        <p className="text-red-500">Error loading student: {query.error?.message}</p>
      </div>
    </div>
  );

  const data = query.data;
  if (!data) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="student-detail-container text-center">
          <p className="text-red-500">No data returned from server.</p>
          <button className="mt-3 text-blue-600 font-semibold" onClick={() => query.refetch()}>Try again</button>
        </div>
      </div>
    );
  }

  const student = data.student ?? null;
  if (!student) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <div className="student-detail-container text-center">
          <p className="text-red-500">Student not found.</p>
          <button className="mt-3 text-blue-600 font-semibold" onClick={() => router.push('/')}>Back to list</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen p-4">
      <div className="student-detail-container">
        <div className="mb-6">
          <button className="bg-blue-600 text-white mb-3 font-semibold hover:text-blue-800 transition-colors" onClick={() => router.push('/')}>
            ← Back to Students
          </button>
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <p className="text-gray-600">
            {student.email ?? '—'} • {student.phone ?? '—'} • Grade {student.grade ?? '—'} • {student.country ?? '—'}
          </p>
          <div className="mt-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${
              student.application_status === 'Exploring' ? 'bg-gray-500' :
              student.application_status === 'Shortlisting' ? 'bg-blue-600' :
              student.application_status === 'Applying' ? 'bg-yellow-500 text-black' :
              'bg-green-600'
            }`}>
              {student.application_status ?? 'Unknown'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { key: 'notes', label: 'Notes' },
            { key: 'interactions', label: 'Interactions' },
            { key: 'communications', label: 'Communications' },
            { key: 'tasks', label: 'Tasks' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`tab-button px-6 py-3 font-semibold ${
                activeTab === t.key ? 'active' : ''
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'notes' && <NotesTab notes={data.notes ?? []} studentId={studentId} />}
          {activeTab === 'interactions' && <InteractionsTab interactions={data.interactions ?? []} />}
          {activeTab === 'communications' && (
            <CommunicationsTab 
              communications={data.communications ?? []} 
              studentId={studentId}
              student={student}
            />
          )}
          {activeTab === 'tasks' && <TasksTab tasks={data.tasks ?? []} studentId={studentId} />}
        </div>
      </div>
    </div>
  );
}