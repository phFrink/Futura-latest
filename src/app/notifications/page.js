'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/common/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  Filter,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, urgent, high, normal, low
  const [userRole, setUserRole] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  useEffect(() => {
    loadUserRole();
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter, priorityFilter, userRole]);

  const loadUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const role = session.user.user_metadata?.role?.toLowerCase();
      setUserRole(role);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=100');
      const result = await response.json();

      if (result.success) {
        setNotifications(result.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Filter by role - show notifications for user's role or admin
    if (userRole) {
      filtered = filtered.filter(n =>
        !n.recipient_role ||
        n.recipient_role === 'all' ||
        n.recipient_role === userRole ||
        n.recipient_role === 'admin'
      );
    }

    // Filter by status
    if (filter === 'unread') {
      filtered = filtered.filter(n => n.status === 'unread');
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.status === 'read');
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (id) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'read' })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, status: 'read' } : n)
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = filteredNotifications
      .filter(n => n.status === 'unread')
      .map(n => n.id);

    for (const id of unreadIds) {
      await markAsRead(id);
    }

    await loadNotifications();
  };

  const deleteNotification = (notification) => {
    setNotificationToDelete(notification);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete) return;

    try {
      const response = await fetch(`/api/notifications?id=${notificationToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationToDelete.id));
        setShowDeleteModal(false);
        setNotificationToDelete(null);
        toast.success('Notification deleted successfully!');
      } else {
        const result = await response.json();
        toast.error(result.message || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setNotificationToDelete(null);
  };

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear ALL notifications? This cannot be undone!')) {
      return;
    }

    try {
      const response = await fetch('/api/notifications?clearAll=true', {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications([]);
        toast.success('All notifications cleared successfully!');
      } else {
        const result = await response.json();
        toast.error(result.message || 'Failed to clear notifications');
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast.error('Error clearing notifications. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4" />;
      case 'high':
        return <Info className="w-4 h-4" />;
      case 'normal':
        return <Bell className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => n.status === 'unread').length,
    urgent: notifications.filter(n => n.priority === 'urgent').length,
  };

  return (
    <MainLayout currentPageName="Notifications">
      <div className="p-6 space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Unread</p>
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold">{stats.unread}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Urgent</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Your Role</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{userRole || 'Loading...'}</p>
                </div>
                <Info className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                All Notifications
              </CardTitle>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filter === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={filter === 'unread' ? 'default' : 'outline'}
                    onClick={() => setFilter('unread')}
                  >
                    Unread ({stats.unread})
                  </Button>
                  <Button
                    size="sm"
                    variant={filter === 'read' ? 'default' : 'outline'}
                    onClick={() => setFilter('read')}
                  >
                    Read
                  </Button>
                </div>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>

                {/* Actions */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadNotifications}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>

                {stats.unread > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark All Read
                  </Button>
                )}

                {/* Clear All Button - Admin Only */}
                {userRole === 'admin' && notifications.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={clearAllNotifications}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
                <p className="text-sm text-slate-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-900 mb-1">No notifications</p>
                <p className="text-sm text-slate-500">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications to display'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      notification.status === 'unread' ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0 mt-1">
                        {notification.icon || '📢'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-slate-900">
                              {notification.title}
                            </h4>
                            {notification.status === 'unread' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Priority Badge */}
                            <Badge className={`${getPriorityColor(notification.priority)} text-xs flex items-center gap-1`}>
                              {getPriorityIcon(notification.priority)}
                              {notification.priority}
                            </Badge>

                            {/* Actions */}
                            {notification.status === 'unread' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <CheckCheck className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNotification(notification)}
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.source_table_display_name && (
                              <span className="px-2 py-1 bg-slate-100 rounded">
                                {notification.source_table_display_name}
                              </span>
                            )}
                            {notification.recipient_role && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded capitalize">
                                {notification.recipient_role}
                              </span>
                            )}
                          </div>

                          {notification.action_url && (
                            <Link
                              href={notification.action_url}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              View Details →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Delete Notification
                    </h3>
                    <p className="text-sm text-slate-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelDelete}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="mb-6">
                <p className="text-slate-600 mb-3">
                  Are you sure you want to delete this notification?
                </p>
                {notificationToDelete && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      {notificationToDelete.title}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {notificationToDelete.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="px-4 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
