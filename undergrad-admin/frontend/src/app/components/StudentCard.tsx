// src/app/components/StudentCard.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type Student = {
  id: string;
  name: string;
  email?: string;
  grade?: number;
  application_status?: string;
  country?: string;
  last_active?: string;
  not_contacted_7days?: boolean;
  high_intent?: boolean;
  needs_essay_help?: boolean;
};

type AISummary = {
  summary: string;
  priority_score: number;
  engagement_level: string;
  recommendations: string[];
  key_metrics: {
    total_interactions: number;
    recent_activity: number;
    communications: number;
    open_tasks: number;
    ai_questions_asked: number;
  };
};

export default function StudentCard({ student }: { student: Student }) {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);

  const { data: aiData, isLoading: aiLoading } = useQuery<{ ai_summary: AISummary }>({
    queryKey: ['ai-summary', student.id],
    queryFn: async () => {
      const res = await axios.get(`http://127.0.0.1:8000/api/students/${student.id}/ai-summary`);
      return res.data;
    },
    enabled: showSummary,
    staleTime: 1000 * 60 * 5,
  });

  const handleClick = () => {
    if (!student?.id) return;
    router.push(`/students/${student.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!student?.id) return;
    router.push(`/students/${student.id}/edit`);
  };

  const toggleSummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSummary(!showSummary);
  };

  const progressPct = student.application_status === "Exploring" ? 25
    : student.application_status === "Shortlisting" ? 50
    : student.application_status === "Applying" ? 75
    : 100;

  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'Exploring': return 'status-badge status-exploring';
      case 'Shortlisting': return 'status-badge status-shortlisting';
      case 'Applying': return 'status-badge status-applying';
      case 'Submitted': return 'status-badge status-submitted';
      default: return 'status-badge status-exploring';
    }
  };

  const getProgressClass = (status?: string) => {
    switch (status) {
      case 'Exploring': return 'progress-fill progress-exploring';
      case 'Shortlisting': return 'progress-fill progress-shortlisting';
      case 'Applying': return 'progress-fill progress-applying';
      case 'Submitted': return 'progress-fill progress-submitted';
      default: return 'progress-fill progress-exploring';
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 5) return 'bg-red-500';
    if (score >= 4) return 'bg-orange-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const aiSummary = aiData?.ai_summary;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      className="card p-4 transition-all cursor-pointer"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-label={`Open ${student.name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{student.name}</h3>
          <p className="text-sm text-gray-600">{student.email ?? '—'}</p>
          <p className="text-xs text-gray-500">{student.country ?? ''}</p>
          <p className="text-xs text-gray-400 mt-1">
            Last Active: {student.last_active ? new Date(student.last_active).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={getStatusClass(student.application_status)}>
            {student.application_status ?? '—'}
          </div>
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar mt-3">
        <div
          className={getProgressClass(student.application_status)}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* AI Summary Toggle */}
      <button
        onClick={toggleSummary}
        className="gradient-btn mt-3 w-full py-2 text-sm rounded font-medium flex items-center justify-center gap-2"
      >
        <span className="text-base">✨</span>
        {showSummary ? 'Hide AI Summary' : 'Show AI Summary'}
      </button>

      {/* AI Summary Content */}
      {showSummary && (
        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg" onClick={(e) => e.stopPropagation()}>
          {aiLoading ? (
            <p className="text-sm text-gray-500">Generating AI summary...</p>
          ) : aiSummary ? (
            <div className="space-y-3">
              {/* Priority Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Priority:</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < aiSummary.priority_score ? getPriorityColor(aiSummary.priority_score) : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getPriorityColor(aiSummary.priority_score)}`}>
                  {aiSummary.engagement_level}
                </span>
              </div>

              {/* Summary Text */}
              <p className="text-sm text-gray-700 leading-relaxed">{aiSummary.summary}</p>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-purple-600">{aiSummary.key_metrics.total_interactions}</div>
                  <div className="text-gray-500">Interactions</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-purple-600">{aiSummary.key_metrics.communications}</div>
                  <div className="text-gray-500">Comms</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-purple-600">{aiSummary.key_metrics.open_tasks}</div>
                  <div className="text-gray-500">Tasks</div>
                </div>
              </div>

              {/* Recommendations */}
              {aiSummary.recommendations && aiSummary.recommendations.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-600">Recommended Actions:</div>
                  {aiSummary.recommendations.map((rec, idx) => (
                    <div key={idx} className="text-xs text-gray-700 flex items-start gap-1">
                      <span className="text-purple-500">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-500">Failed to load AI summary</p>
          )}
        </div>
      )}
    </div>
  );
}