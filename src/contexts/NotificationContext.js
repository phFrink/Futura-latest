'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Tables to monitor for new data
  const monitoredTables = [
    { table: 'properties', name: 'Property' },
    { table: 'homeowner_tbl', name: 'Homeowner' },
    { table: 'service_request_tbl', name: 'Service Request' },
    { table: 'inquiry_tbl', name: 'Inquiry' },
    { table: 'complaint_tbl', name: 'Complaint' },
    { table: 'announcement_tbl', name: 'Announcement' },
    { table: 'reservation_tbl', name: 'Reservation' },
    { table: 'transaction_tbl', name: 'Transaction' }
  ];

  useEffect(() => {
    // Set up real-time listeners for all tables
    const subscriptions = monitoredTables.map(({ table, name }) => {
      return supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: table
          },
          (payload) => {
            const newNotification = {
              id: Date.now() + Math.random(),
              type: 'new_data',
              table: table,
              tableName: name,
              data: payload.new,
              timestamp: new Date().toISOString(),
              read: false
            };

            setNotifications(prev => [newNotification, ...prev.slice(0, 99)]); // Keep last 100 notifications
            setUnreadCount(prev => prev + 1);

            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification(`New ${name} Added`, {
                body: `A new ${name.toLowerCase()} has been created.`,
                icon: '/favicon.ico'
              });
            }
          }
        )
        .subscribe();
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, []);

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;