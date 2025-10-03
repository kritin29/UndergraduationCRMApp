'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Student = {
  name: string;
  email: string;
  phone?: string;
  grade?: number;
  country?: string;
  application_status?: string;
  not_contacted_7days?: boolean;
  high_intent?: boolean;
  needs_essay_help?: boolean;
};

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id;

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<Student, Error>({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('Missing student id');
      const res = await axios.get(`http://127.0.0.1:8000/api/students/${studentId}`);
      return res.data.student;
    },
    enabled: !!studentId,
  });

  const [student, setStudent] = useState<Student>({
    name: '',
    email: '',
    phone: '',
    grade: 11,
    country: 'IN',
    application_status: 'Exploring',
    not_contacted_7days: false,
    high_intent: false,
    needs_essay_help: false,
  });

  useEffect(() => {
    if (data) {
      setStudent({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        grade: data.grade || 11,
        country: data.country || 'IN',
        application_status: data.application_status || 'Exploring',
        not_contacted_7days: data.not_contacted_7days || false,
        high_intent: data.high_intent || false,
        needs_essay_help: data.needs_essay_help || false,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (updated: Student) =>
      axios.patch(`http://127.0.0.1:8000/api/students/${studentId}`, updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      router.push('/');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setStudent({ ...student, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setStudent({ ...student, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(student);
  };

  if (isLoading) return <p className="p-6">Loading student...</p>;
  if (isError) return <p className="p-6 text-red-500">Error loading student</p>;

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Student</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          placeholder="Name"
          value={student.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          name="email"
          placeholder="Email"
          type="email"
          value={student.email}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          name="phone"
          placeholder="Phone"
          value={student.phone}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <select
          name="grade"
          value={student.grade}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value={11}>11</option>
          <option value={12}>12</option>
        </select>
        <select
          name="country"
          value={student.country}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="IN">India</option>
          <option value="US">USA</option>
          <option value="CA">Canada</option>
          <option value="AE">UAE</option>
          <option value="UK">UK</option>
        </select>
        <select
          name="application_status"
          value={student.application_status}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="Exploring">Exploring</option>
          <option value="Shortlisting">Shortlisting</option>
          <option value="Applying">Applying</option>
          <option value="Submitted">Submitted</option>
        </select>

        {/* Boolean flags */}
        <div className="space-y-2 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Flags</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="not_contacted_7days"
              checked={student.not_contacted_7days || false}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span>Not Contacted in 7 Days</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="high_intent"
              checked={student.high_intent || false}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span>High Intent</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="needs_essay_help"
              checked={student.needs_essay_help || false}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span>Needs Essay Help</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}