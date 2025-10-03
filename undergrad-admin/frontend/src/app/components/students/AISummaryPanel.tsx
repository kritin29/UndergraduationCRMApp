// src/app/components/students/AISummaryPanel.tsx
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

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
  generated_at: string;
};

export default function AISummaryPanel({ studentId }: { studentId: string }) {
  const { data, isLoading, error, refetch } = useQuery<{ ai_summary: AISummary }>({
    queryKey: ['ai-summary', studentId],
    queryFn: async () => {
      const res = await axios.get(`http://127.0.0.1:8000/api/students/${studentId}/ai-summary`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getPriorityColor = (score: number) => {
    if (score >= 5) return { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-300' };
    if (score >= 4) return { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-300' };
    if (score >= 3) return { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-300' };
    return { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-300' };
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl animate-pulse">
        <div className="h-6 bg-purple-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-purple-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-purple-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
        <p className="text-red-600">Failed to load AI summary</p>
        <button onClick={() => refetch()} className="mt-2 text-sm text-red-700 underline">
          Try again
        </button>
      </div>
    );
  }

  const summary = data?.ai_summary;
  if (!summary) return null;

  const priorityColors = getPriorityColor(summary.priority_score);

  return (
    <div className="mb-6 p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-200 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">✨</div>
          <h2 className="text-2xl font-bold text-purple-900">AI Summary</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-xs bg-white text-purple-600 border border-purple-300 rounded-full hover:bg-purple-50 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Priority & Engagement */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Priority:</span>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < summary.priority_score ? priorityColors.bg : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors.bg} text-white`}>
            {summary.priority_score}/5
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border-2 ${priorityColors.border}`}>
          {summary.engagement_level}
        </div>
      </div>

      {/* Summary Text */}
      <div className="p-4 bg-white rounded-lg shadow-sm mb-4 border border-purple-100">
        <p className="text-gray-800 leading-relaxed">{summary.summary}</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="p-3 bg-white rounded-lg shadow-sm text-center border border-purple-100">
          <div className="text-2xl font-bold text-purple-600">{summary.key_metrics.total_interactions}</div>
          <div className="text-xs text-gray-600 mt-1">Total Interactions</div>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm text-center border border-purple-100">
          <div className="text-2xl font-bold text-blue-600">{summary.key_metrics.recent_activity}</div>
          <div className="text-xs text-gray-600 mt-1">Recent (7d)</div>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm text-center border border-purple-100">
          <div className="text-2xl font-bold text-green-600">{summary.key_metrics.communications}</div>
          <div className="text-xs text-gray-600 mt-1">Communications</div>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm text-center border border-purple-100">
          <div className="text-2xl font-bold text-orange-600">{summary.key_metrics.open_tasks}</div>
          <div className="text-xs text-gray-600 mt-1">Open Tasks</div>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm text-center border border-purple-100">
          <div className="text-2xl font-bold text-pink-600">{summary.key_metrics.ai_questions_asked}</div>
          <div className="text-xs text-gray-600 mt-1">AI Questions</div>
        </div>
      </div>

      {/* Recommendations */}
      {summary.recommendations && summary.recommendations.length > 0 && (
        <div className="p-4 bg-white rounded-lg shadow-sm border-l-4 border-purple-500">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>💡</span>
            Recommended Next Actions
          </h3>
          <ul className="space-y-2">
            {summary.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-purple-500 font-bold">{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 text-xs text-gray-500 text-right">
        Generated: {new Date(summary.generated_at).toLocaleString()}
      </div>
    </div>
  );
}