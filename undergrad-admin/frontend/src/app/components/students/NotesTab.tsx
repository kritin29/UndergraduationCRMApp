'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Note = {
  id?: string;
  author: string;
  text: string;
  ts?: string;
};

export default function NotesTab({ notes, studentId }: { notes: Note[]; studentId: string }) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingAuthor, setEditingAuthor] = useState('');
  const queryClient = useQueryClient();

  // Add note
  const addMutation = useMutation({
    mutationFn: (payload: { author: string; text: string }) =>
      axios.post(`http://127.0.0.1:8000/api/students/${studentId}/notes`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Update note
  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; author?: string; text?: string }) =>
      axios.patch(`http://127.0.0.1:8000/api/students/${studentId}/notes/${payload.id}`, {
        author: payload.author,
        text: payload.text,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditingId(null);
      setEditingText('');
      setEditingAuthor('');
    },
  });

  // Delete note
  const deleteMutation = useMutation({
    mutationFn: (nid: string) =>
      axios.delete(`http://127.0.0.1:8000/api/students/${studentId}/notes/${nid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const saving = addMutation.isPending;
  const addFailed = addMutation.isError;
  const updating = updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  const handleAdd = () => {
    if (!text.trim()) return;
    addMutation.mutate({ author: 'Admin', text });
    setText('');
  };

  const startEdit = (n: Note, noteIndex: number) => {
    const nid = n.id ?? String(noteIndex);
    setEditingId(nid);
    setEditingText(n.text || '');
    setEditingAuthor(n.author || 'Admin');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
    setEditingAuthor('');
  };

  const saveEdit = (nid: string) => {
    if (!nid) return;
    updateMutation.mutate({ id: nid, author: editingAuthor, text: editingText });
  };

  const handleDelete = (nid?: string) => {
    if (!nid) return;
    if (!confirm('Delete this note? This action cannot be undone.')) return;
    deleteMutation.mutate(nid);
  };

  return (
    <div>
      {/* Add Note Form */}
      <div className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Add Internal Note</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write an internal note about this student (e.g., 'Strong interest in engineering programs' or 'Needs help with Common App essay')..."
          className="w-full p-3 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Add Note'}
          </button>
          {addFailed && <p className="text-red-500 text-sm">Could not save note</p>}
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Internal Notes</h3>
        {(!notes || notes.length === 0) && (
          <p className="text-gray-500 text-center py-8">No notes yet. Add your first note above.</p>
        )}
        {notes?.map((n, idx) => {
          const nid = n.id ?? String(idx);
          const isEditing = editingId === nid;
          return (
            <div key={nid} className="p-4 rounded-lg border bg-white shadow-sm">
              {!isEditing ? (
                <>
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {n.author}
                      </span>
                      <span className="text-xs text-gray-500">
                        {n.ts ? new Date(n.ts).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(n, idx)}
                        className="btn-warning px-3 py-1 text-xs rounded font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(nid)}
                        className="btn-danger px-3 py-1 text-xs rounded font-semibold"
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-700 text-sm whitespace-pre-wrap">{n.text}</div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Author:</label>
                      <input
                        value={editingAuthor}
                        onChange={(e) => setEditingAuthor(e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Author name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Note:</label>
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(nid)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={updating}
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}