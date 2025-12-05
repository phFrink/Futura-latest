'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, XCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default function TestRealtimePage() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    addLog('Starting real-time test...', 'info');

    // Set up real-time listener
    const channel = supabase
      .channel('notifications_realtime_test', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications_tbl',
        },
        (payload) => {
          addLog(' NEW NOTIFICATION RECEIVED!', 'success');
          addLog(`Title: ${payload.new.title}`, 'success');
          addLog(`Message: ${payload.new.message}`, 'success');
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe((status) => {
        addLog(`Subscription status: ${status}`, 'info');

        if (status === 'SUBSCRIBED') {
          addLog(' Real-time subscription ACTIVE!', 'success');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          addLog(' Real-time subscription ERROR!', 'error');
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          addLog(' Real-time subscription TIMED OUT!', 'error');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          addLog(' Real-time subscription CLOSED!', 'warning');
          setIsConnected(false);
        }
      });

    return () => {
      addLog(' Cleaning up subscription...', 'info');
      supabase.removeChannel(channel);
    };
  }, []);

  const createTestNotification = async () => {
    addLog('Creating test notification via API...', 'info');

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Test at ${new Date().toLocaleTimeString()}`,
          message: 'This is a real-time test notification',
          icon: '🧪',
          priority: 'high',
          recipient_role: 'admin',
        }),
      });

      const result = await response.json();

      if (result.success) {
        addLog(' Notification created successfully!', 'success');
        addLog(' Waiting for real-time update...', 'info');
      } else {
        addLog(` Failed to create notification: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(` Error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Real-Time Notification Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <span className="font-semibold">Connection Status:</span>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-semibold">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-600 font-semibold">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Create Test Button */}
          <div className="flex gap-4">
            <Button onClick={createTestNotification} className="flex-1">
              Create Test Notification
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold mb-2">How to Test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Wait for " Real-time subscription ACTIVE!" in the logs below</li>
              <li>Click "Create Test Notification" button</li>
              <li>Watch the logs - you should see "NEW NOTIFICATION RECEIVED!" appear instantly</li>
              <li>If it appears, real-time is working!</li>
            </ol>
          </div>

          {/* Received Notifications */}
          {notifications.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">Notifications Received via Real-Time:</h3>
              <div className="space-y-2">
                {notifications.map((notif, index) => (
                  <div key={index} className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="font-semibold">{notif.icon} {notif.title}</div>
                    <div className="text-sm text-slate-600">{notif.message}</div>
                    <div className="text-xs text-slate-400">{new Date(notif.created_at).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          <div>
            <h3 className="font-bold mb-2">Activity Logs:</h3>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.type === 'success'
                      ? 'text-green-400'
                      : log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'warning'
                      ? 'text-yellow-400'
                      : 'text-slate-300'
                  }`}
                >
                  [{log.timestamp}] {log.message}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
