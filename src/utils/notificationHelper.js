/**
 * Helper functions for creating dual notifications (sender + receiver)
 */

/**
 * Create notifications for both sender and receiver
 * @param {Object} config - Notification configuration
 * @param {string} config.senderId - UUID of the user who triggered the action
 * @param {string} config.senderName - Name of the sender
 * @param {string} config.receiverId - UUID of the user who should receive the notification
 * @param {string} config.receiverRole - Role of the receiver (optional)
 * @param {string} config.actionType - Type of action (e.g., 'reservation_created', 'inquiry_sent')
 * @param {Object} config.data - Additional data for the notification
 * @param {string} config.relatedRecordId - ID of the related record
 * @param {string} config.sourceTable - Source table name
 */
export async function createDualNotifications(config) {
  const {
    senderId,
    senderName,
    receiverId,
    receiverRole,
    actionType,
    data,
    relatedRecordId,
    sourceTable
  } = config;

  const notifications = [];

  // Notification templates based on action type
  const templates = getNotificationTemplates(actionType, senderName, data);

  // 1. Notification for SENDER
  const senderNotification = {
    recipient_id: senderId,
    sender_id: senderId,
    sender_name: "You",
    notification_category: "sent",
    notification_type: actionType,
    title: templates.sender.title,
    message: templates.sender.message,
    icon: templates.sender.icon,
    priority: templates.priority || "normal",
    source_table: sourceTable,
    related_record_id: relatedRecordId,
    action_url: templates.sender.actionUrl,
    data: data,
    status: "unread"
  };

  // 2. Notification for RECEIVER
  const receiverNotification = {
    recipient_id: receiverId,
    recipient_role: receiverRole,
    sender_id: senderId,
    sender_name: senderName,
    notification_category: "received",
    notification_type: actionType,
    title: templates.receiver.title,
    message: templates.receiver.message,
    icon: templates.receiver.icon,
    priority: templates.priority || "normal",
    source_table: sourceTable,
    related_record_id: relatedRecordId,
    action_url: templates.receiver.actionUrl,
    data: data,
    status: "unread"
  };

  notifications.push(senderNotification, receiverNotification);

  // Send to API
  try {
    const responses = await Promise.all(
      notifications.map(notification =>
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        })
      )
    );

    return {
      success: true,
      notifications: await Promise.all(responses.map(r => r.json()))
    };
  } catch (error) {
    console.error('Error creating dual notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get notification templates based on action type
 */
function getNotificationTemplates(actionType, senderName, data) {
  const templates = {
    // RESERVATION NOTIFICATIONS
    reservation_created: {
      sender: {
        title: "Reservation Submitted",
        message: "Your property tour reservation has been submitted successfully",
        icon: "📅",
        actionUrl: "/client-reservations"
      },
      receiver: {
        title: "New Reservation Request",
        message: `${senderName} has requested a property tour for ${data?.property_name || 'a property'}`,
        icon: "📅",
        actionUrl: "/reservations"
      },
      priority: "high"
    },

    reservation_approved: {
      sender: {
        title: "Reservation Approved",
        message: "Your property tour reservation has been approved",
        icon: "✅",
        actionUrl: "/client-reservations"
      },
      receiver: {
        title: "Reservation Approved",
        message: `You approved the reservation from ${senderName}`,
        icon: "✅",
        actionUrl: "/reservations"
      },
      priority: "normal"
    },

    reservation_rejected: {
      sender: {
        title: "Reservation Declined",
        message: "Your property tour reservation has been declined",
        icon: "❌",
        actionUrl: "/client-reservations"
      },
      receiver: {
        title: "Reservation Declined",
        message: `You declined the reservation from ${senderName}`,
        icon: "❌",
        actionUrl: "/reservations"
      },
      priority: "normal"
    },

    // INQUIRY NOTIFICATIONS
    inquiry_sent: {
      sender: {
        title: "Inquiry Sent",
        message: "Your inquiry has been sent successfully",
        icon: "💬",
        actionUrl: "/client-inquiries"
      },
      receiver: {
        title: "New Inquiry",
        message: `${senderName} sent a new inquiry about ${data?.property_name || 'a property'}`,
        icon: "💬",
        actionUrl: "/inquiries"
      },
      priority: "high"
    },

    inquiry_replied: {
      sender: {
        title: "Reply to Your Inquiry",
        message: "You have received a reply to your inquiry",
        icon: "💬",
        actionUrl: "/client-inquiries"
      },
      receiver: {
        title: "Inquiry Reply Sent",
        message: `You replied to ${senderName}'s inquiry`,
        icon: "💬",
        actionUrl: "/inquiries"
      },
      priority: "normal"
    },

    // CONTRACT NOTIFICATIONS
    contract_signed: {
      sender: {
        title: "Contract Signed",
        message: "You have successfully signed the contract",
        icon: "📝",
        actionUrl: "/client-contracts"
      },
      receiver: {
        title: "Contract Signed",
        message: `${senderName} has signed the contract for ${data?.property_name || 'a property'}`,
        icon: "📝",
        actionUrl: "/contracts"
      },
      priority: "high"
    },

    // PAYMENT NOTIFICATIONS
    payment_made: {
      sender: {
        title: "Payment Submitted",
        message: `Your payment of ₱${data?.amount || '0'} has been submitted`,
        icon: "💰",
        actionUrl: "/client-payments"
      },
      receiver: {
        title: "Payment Received",
        message: `${senderName} made a payment of ₱${data?.amount || '0'}`,
        icon: "💰",
        actionUrl: "/payments"
      },
      priority: "high"
    },

    // DEFAULT TEMPLATE
    default: {
      sender: {
        title: "Action Completed",
        message: "Your action has been completed successfully",
        icon: "✅",
        actionUrl: "/client-home"
      },
      receiver: {
        title: "New Activity",
        message: `${senderName} performed an action`,
        icon: "🔔",
        actionUrl: "/dashboard"
      },
      priority: "normal"
    }
  };

  return templates[actionType] || templates.default;
}

/**
 * Create a simple notification for one user only
 */
export async function createSingleNotification(notification) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...notification,
        notification_category: notification.notification_category || 'system',
        status: notification.status || 'unread'
      })
    });

    const result = await response.json();
    return { success: result.success, notification: result.notification };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
}
