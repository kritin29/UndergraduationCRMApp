// src/app/login/page.tsx - Updated with admin check
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// List of allowed admin emails
const ADMIN_EMAILS = [
  'admin@undergraduation.com',
  'team@undergraduation.com', 
  'advisor@undergraduation.com'
];

// Demo password for all admin accounts
const ADMIN_PASSWORD = 'admin123';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Check if email is in admin list and password matches
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
    const isCorrectPassword = password === ADMIN_PASSWORD;
    
    if (isAdminEmail && isCorrectPassword) {
      // Store auth info
      localStorage.setItem('admin-auth', 'demo-token');
      localStorage.setItem('admin-user', email);
      localStorage.setItem('admin-role', 'admin');
      router.push('/');
    } else {
      setError('Access denied. Admin credentials required.');
    }
    
    setLoading(false);
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center">
      <div className="student-detail-container max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin CRM</h1>
          <p className="text-gray-600 mt-2">Internal Team Access Only</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@undergraduation.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {loading ? 'Signing in...' : 'Access Dashboard'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="font-semibold">Demo Credentials:</p>
          <p>Email: admin@undergraduation.com</p>
          <p>Password: admin123</p>
        </div>
      </div>
    </div>
  );
}