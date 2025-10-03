// src/app/components/students/CommunicationsTab.tsx
'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Comm = {
  id?: string;
  channel: string;
  body: string;
  logged_by?: string;
  ts?: string;
};

type Student = {
  id: string;
  name: string;
  email?: string;
};

export default function CommunicationsTab({ 
  communications, 
  studentId,
  student 
}: { 
  communications: Comm[]; 
  studentId: string;
  student: Student;
}) {
  const [channel, setChannel] = useState<'call' | 'email' | 'sms'>('call');
  const [body, setBody] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: (payload: { channel: string; body: string; logged_by: string }) =>
      axios.post(`http://127.0.0.1:8000/api/students/${studentId}/communications`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const emailMutation = useMutation({
    mutationFn: (payload: { subject: string; body: string }) =>
      axios.post(`http://127.0.0.1:8000/api/students/${studentId}/trigger-email`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowEmailModal(false);
      setEmailSubject('');
      setEmailBody('');
    },
  });

  const saving = logMutation.isPending;
  const failed = logMutation.isError;
  const sendingEmail = emailMutation.isPending;
  const emailError = emailMutation.isError;

  const handleLog = () => {
    if (!body.trim()) return;
    logMutation.mutate({ channel, body, logged_by: 'Admin' });
    setBody('');
  };

  const openEmailModal = () => {
    setEmailSubject(`Application Follow-up - ${student.name}`);
    setEmailBody(`Hi ${student.name},\n\nI hope this email finds you well. I wanted to follow up regarding your college application journey.\n\n[Add your message here]\n\nBest regards,\nThe Undergraduation Team`);
    setShowEmailModal(true);
  };

  const handleSendEmail = () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    emailMutation.mutate({ subject: emailSubject, body: emailBody });
  };

  return (
    <div>
      {/* Quick Log Form */}
      <div className="mb-4 p-4 bg-white border rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Log Communication</h3>
        <div className="flex gap-2 items-start flex-wrap">
          <select 
            value={channel} 
            onChange={(e) => setChannel(e.target.value as any)} 
            className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="call">Phone Call</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Brief note (e.g., 'Discussed essay topics' or 'Left voicemail')"
            className="flex-1 min-w-[200px] p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleLog} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" 
            disabled={saving}
          >
            {saving ? 'Logging...' : 'Log'}
          </button>
        </div>
        {failed && <p className="text-red-500 mt-2 text-sm">Failed to log communication</p>}
      </div>

      {/* Send Email Button */}
      <div className="mb-6">
        <button
          onClick={openEmailModal}
          className="btn-info px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
        >
          <span>✉️</span>
          Send Follow-up Email
        </button>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div
          style={{
            zIndex: 9999,
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.65)',
            padding: 16,
            boxSizing: 'border-box'
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Send Email to {student.name}</h2>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  aria-label="Close modal"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">To:</label>
                <div className="p-2 bg-gray-100 rounded text-gray-700">
                  {student.name} ({student.email || 'No email on file'})
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject:</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email subject"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Message:</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={12}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Email body"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Mock Mode:</strong> This email will not actually be sent. It will be logged in communications for tracking purposes only.
                </p>
              </div>

              {emailError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-red-600 text-sm">Failed to send email. Please try again.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold" // Changed to blue
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}      
      
      {/* Communications History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Communication History</h3>
        {(!communications || communications.length === 0) && (
          <p className="text-gray-500 text-center py-8">No communications logged yet.</p>
        )}
        {communications?.map((c, idx) => (
          <div key={c.id ?? idx} className="p-4 rounded-lg border bg-white shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  c.channel === 'email' ? 'bg-indigo-100 text-indigo-700' :
                  c.channel === 'call' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {c.channel?.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {c.ts ? new Date(c.ts).toLocaleString() : ''}
                </span>
              </div>
            </div>
            <div className="text-gray-700 text-sm whitespace-pre-wrap">{c.body}</div>
            <div className="text-xs text-gray-400 mt-2">Logged by {c.logged_by ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}