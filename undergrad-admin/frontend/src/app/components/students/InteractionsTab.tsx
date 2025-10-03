'use client';

import React from 'react';

type Interaction = {
  type: string;
  ts?: string;
  details?: string;
};

export default function InteractionsTab({ interactions }: { interactions: Interaction[] }) {
  if (!interactions || interactions.length === 0) {
    return <p className="text-gray-500">No interactions recorded.</p>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'login':
        return '🔐';
      case 'ai_question':
        return '💬';
      case 'document_submitted':
        return '📄';
      default:
        return '•';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'login':
        return 'Login Activity';
      case 'ai_question':
        return 'AI Question';
      case 'document_submitted':
        return 'Document Submitted';
      default:
        return type;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-blue-100 text-blue-700';
      case 'ai_question':
        return 'bg-purple-100 text-purple-700';
      case 'document_submitted':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative">
      {/* Big heading - same effect as NotesTab */}
      <div className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold mb-0">Interactions</h3>
      </div>

      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      
      <div className="space-y-4">
        {interactions.map((it, idx) => (
          <div key={idx} className="relative pl-14">
            {/* Timeline dot */}
            <div className="absolute left-4 top-3 w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>
            
            <div className="p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getIcon(it.type)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(it.type)}`}>
                      {getTypeLabel(it.type)}
                    </span>
                  </div>
                  <div className="text-gray-700 text-sm">{it.details}</div>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {it.ts ? new Date(it.ts).toLocaleString() : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}