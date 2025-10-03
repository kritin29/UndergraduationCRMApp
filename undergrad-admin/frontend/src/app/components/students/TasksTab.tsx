// src/app/components/students/TasksTab.tsx
'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Task = {
  id?: string;
  title: string;
  due_at?: string;
  notes?: string;
  assigned_to?: string;
  created_by?: string;
  created_at?: string;
  status?: string;
  priority?: string;
};

const TEAM_MEMBERS = [
  'dev@example.com',
  'admin@example.com',
  'advisor1@example.com',
  'advisor2@example.com',
  'Everyone',
];

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function TasksTab({ tasks, studentId }: { tasks: Task[]; studentId: string }) {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('dev@example.com');
  const [priority, setPriority] = useState('medium');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');

  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: (payload: { title: string; due_at?: string; notes?: string; assigned_to?: string; priority?: string }) =>
      axios.post(`http://127.0.0.1:8000/api/students/${studentId}/tasks`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: (payload: { id: string; title?: string; due_at?: string; notes?: string; assigned_to?: string; status?: string; priority?: string }) =>
      axios.patch(`http://127.0.0.1:8000/api/students/${studentId}/tasks/${payload.id}`, {
        title: payload.title,
        due_at: payload.due_at,
        notes: payload.notes,
        assigned_to: payload.assigned_to,
        status: payload.status,
        priority: payload.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setEditingId(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: (tid: string) =>
      axios.delete(`http://127.0.0.1:8000/api/students/${studentId}/tasks/${tid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
    },
  });

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;
    createTask.mutate({
      title,
      due_at: dueAt || undefined,
      notes: notes || undefined,
      assigned_to: assignedTo,
      priority: priority,
    });
    setTitle('');
    setDueAt('');
    setNotes('');
    setAssignedTo('dev@example.com');
    setPriority('medium');
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id ?? null);
    setEditTitle(task.title || '');
    setEditDueAt(task.due_at ? task.due_at.split('T')[0] : '');
    setEditNotes(task.notes || '');
    setEditAssignedTo(task.assigned_to || '');
    setEditStatus(task.status || 'open');
    setEditPriority(task.priority || 'medium');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateTask.mutate({
      id: editingId,
      title: editTitle,
      due_at: editDueAt || undefined,
      notes: editNotes,
      assigned_to: editAssignedTo,
      status: editStatus,
      priority: editPriority,
    });
  };

  const markComplete = (taskId?: string) => {
    if (!taskId) return;
    updateTask.mutate({ id: taskId, status: 'completed' });
  };

  const handleDelete = (tid?: string) => {
    if (!tid) return;
    if (!confirm('Delete this task? This action cannot be undone.')) return;
    deleteTask.mutate(tid);
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      {/* Create Task Form */}
      <form onSubmit={handleCreate} className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
        <h3 className="font-semibold text-lg text-blue-900">Schedule New Task/Reminder</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <input
            className="col-span-2 p-2 border rounded"
            placeholder="Task title (e.g., Follow up on essay draft)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Due Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Assign To</label>
            <select
              className="w-full p-2 border rounded"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {TEAM_MEMBERS.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Priority</label>
            <select
              className="w-full p-2 border rounded"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          className="w-full p-2 border rounded"
          rows={2}
          placeholder="Additional notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={createTask.isPending}
          >
            {createTask.isPending ? 'Creating…' : '➕ Create Task'}
          </button>
          {createTask.isError && (
            <div className="text-red-500 text-sm flex items-center">Failed to create task</div>
          )}
        </div>
      </form>

      {/* Tasks List */}
      <div className="space-y-3">
        {(!tasks || tasks.length === 0) && (
          <p className="text-gray-500 text-center py-8">No tasks or reminders scheduled yet.</p>
        )}
        
        {tasks?.map((task, idx) => {
          const tid = task.id ?? String(idx);
          const isEditing = editingId === tid;
          const isCompleted = task.status === 'completed';

          return (
            <div
              key={tid}
              className={`p-4 rounded-lg border-2 shadow-sm transition-all ${
                isCompleted ? 'bg-gray-50 border-gray-300 opacity-75' : 'bg-white border-gray-200'
              }`}
            >
              {!isEditing ? (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityBadge(task.priority)}`}>
                          {task.priority || 'medium'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(task.status)}`}>
                          {task.status || 'open'}
                        </span>
                      </div>

                      {task.notes && (
                        <p className="text-sm text-gray-700 mb-2">{task.notes}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.due_at && (
                          <span>📅 Due: {new Date(task.due_at).toLocaleDateString()}</span>
                        )}
                        <span>👤 {task.assigned_to || task.created_by || '—'}</span>
                        <span>🕐 Created: {task.created_at ? new Date(task.created_at).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!isCompleted && (
                        <button
                          onClick={() => markComplete(task.id)}
                          className="btn-success px-3 py-1 text-xs rounded font-semibold"
                          disabled={updateTask.isPending}
                        >
                          ✓ Complete
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(task)}
                        className="btn-warning px-3 py-1 text-xs rounded font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="btn-danger px-3 py-1 text-xs rounded font-semibold"
                        disabled={deleteTask.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <input
                    className="w-full p-2 border rounded"
                    placeholder="Task title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded"
                        value={editDueAt}
                        onChange={(e) => setEditDueAt(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Assign To</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                      >
                        {TEAM_MEMBERS.map((member) => (
                          <option key={member} value={member}>
                            {member}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Status</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ').charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Priority</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <textarea
                    className="w-full p-2 border rounded"
                    rows={2}
                    placeholder="Notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      disabled={updateTask.isPending}
                    >
                      {updateTask.isPending ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}