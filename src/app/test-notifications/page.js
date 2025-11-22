'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestNotificationsPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      setResult(data);
      console.log('Fetched notifications:', data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  const createTestNotification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🧪 Test Notification',
          message: `Test notification created at ${new Date().toLocaleTimeString()}`,
          icon: '🧪',
          priority: 'high',
          recipient_role: 'admin',
        }),
      });
      const data = await response.json();
      setResult(data);
      console.log('Created notification:', data);

      // Auto-refresh after 1 second
      setTimeout(fetchNotifications, 1000);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  const createUserRegistrationNotification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_type: 'user_registration',
          source_table: 'auth.users',
          source_table_display_name: 'User Registration',
          title: 'New User Registered',
          message: 'John Doe (john@example.com) has successfully registered for an account.',
          icon: '👤',
          priority: 'normal',
          recipient_role: 'admin',
          data: {
            user_id: 'test-user-id',
            email: 'john@example.com',
            full_name: 'John Doe',
            first_name: 'John',
            last_name: 'Doe',
            phone: '09123456789',
            registered_at: new Date().toISOString(),
          },
          action_url: '/certified-homeowner',
        }),
      });
      const data = await response.json();
      setResult(data);
      console.log('Created user registration notification:', data);

      // Auto-refresh after 1 second
      setTimeout(fetchNotifications, 1000);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchNotifications} disabled={loading}>
              Fetch All Notifications
            </Button>
            <Button onClick={createTestNotification} disabled={loading} variant="secondary">
              Create Test Notification
            </Button>
            <Button onClick={createUserRegistrationNotification} disabled={loading} variant="outline">
              Create User Registration Notification
            </Button>
          </div>

          {loading && <p className="text-blue-600">Loading...</p>}

          {result && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Result:</h3>
              <pre className="bg-slate-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-bold mb-2">Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Fetch All Notifications" to see current notifications in database</li>
              <li>Click "Create Test Notification" to add a test notification</li>
              <li>Click "Create User Registration Notification" to simulate a user signup</li>
              <li>Check the notification bell icon in the top-right corner of the page</li>
              <li>Open browser console (F12) to see debug logs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
