/**
 * Notification Helper Utility
 * Creates notifications for various system events
 */

/**
 * Create a notification in the database
 * Supports single or multiple recipients
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Result with success status
 */
export async function createNotification(supabaseAdmin, notificationData) {
  try {
    const {
      type,
      title,
      message,
      icon = "📢",
      priority = "normal",
      recipientRole = "admin",
      recipientId = null, // Single recipient ID
      recipientIds = [], // Multiple recipient IDs
      data = {},
      actionUrl = null, // Admin/Staff action URL
      clientActionUrl = null, // Client action URL
      sourceTable = "system",
      sourceTableDisplayName = "System",
    } = notificationData;

    // Determine which recipients to notify
    let notificationsToCreate = [];

    // If specific recipient IDs are provided, create one notification per recipient
    if (recipientIds && recipientIds.length > 0) {
      notificationsToCreate = recipientIds.map((userId) => ({
        notification_type: type,
        source_table: sourceTable,
        source_table_display_name: sourceTableDisplayName,
        source_record_id: null,
        title,
        message,
        icon,
        priority,
        status: "unread",
        recipient_role: recipientRole,
        recipient_id: userId,
        data: {
          ...data,
          action_url: actionUrl, // Store admin URL in data
          client_action_url: clientActionUrl, // Store client URL in data
          created_at: new Date().toISOString(),
        },
        action_url: actionUrl,
      }));
    } else if (recipientId) {
      // Single specific recipient
      notificationsToCreate = [
        {
          notification_type: type,
          source_table: sourceTable,
          source_table_display_name: sourceTableDisplayName,
          source_record_id: null,
          title,
          message,
          icon,
          priority,
          status: "unread",
          recipient_role: recipientRole,
          recipient_id: recipientId,
          data: {
            ...data,
            action_url: actionUrl, // Store admin URL in data
            client_action_url: clientActionUrl, // Store client URL in data
            created_at: new Date().toISOString(),
          },
          action_url: actionUrl,
        },
      ];
    } else {
      // No specific recipient - notify by role only
      notificationsToCreate = [
        {
          notification_type: type,
          source_table: sourceTable,
          source_table_display_name: sourceTableDisplayName,
          source_record_id: null,
          title,
          message,
          icon,
          priority,
          status: "unread",
          recipient_role: recipientRole,
          recipient_id: null,
          data: {
            ...data,
            action_url: actionUrl, // Store admin URL in data
            client_action_url: clientActionUrl, // Store client URL in data
            created_at: new Date().toISOString(),
          },
          action_url: actionUrl,
        },
      ];
    }

    // Insert all notifications
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications_tbl")
      .insert(notificationsToCreate)
      .select();

    if (error) {
      console.error("Notification error:", error);
      return { success: false, error };
    }

    console.log(
      `Notification created: "${title}" (${notifications.length} recipient${
        notifications.length > 1 ? "s" : ""
      })`
    );
    return { success: true, data: notifications };
  } catch (error) {
    console.error("Notification exception:", error);
    return { success: false, error };
  }
}

/**
 * Get all users by role
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} role - Role name (admin, sales representative, etc.)
 * @returns {Promise<Array>} Array of user IDs
 */
export async function getUserIdsByRole(supabaseAdmin, role) {
  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    // Filter users by role from user_metadata
    const userIds = users.users
      .filter((user) => {
        const userRole = user.user_metadata?.role?.toLowerCase();
        return userRole === role.toLowerCase();
      })
      .map((user) => user.id);

    console.log(`Found ${userIds.length} users with role "${role}"`);
    return userIds;
  } catch (error) {
    console.error(" Exception fetching users by role:", error);
    return [];
  }
}

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  // User & Authentication
  USER_REGISTERED: (userData) => ({
    type: "user_registration",
    title: "New User Registered",
    message: `${userData.fullName} (${userData.email}) has successfully registered for an account.`,
    icon: "👤",
    priority: "normal",
    recipientRole: "admin",
    sourceTable: "auth.users",
    sourceTableDisplayName: "User Registration",
    actionUrl: "/settings/users",
    data: userData,
  }),

  // Inquiries
  INQUIRY_RECEIVED: (inquiryData) => ({
    type: "inquiry_received",
    title: "New Property Inquiry",
    message: `${inquiryData.clientName} (${
      inquiryData.clientEmail
    }) sent an inquiry about ${inquiryData.propertyTitle || "a property"}.`,
    icon: "❓",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "client_inquiries",
    sourceTableDisplayName: "Client Inquiry",
    actionUrl: "/client-inquiries",
    data: inquiryData,
  }),

  // Reservations
  RESERVATION_SUBMITTED: (reservationData) => ({
    type: "reservation_submitted",
    title: "New Property Reservation",
    message: `${reservationData.clientName} submitted a reservation for ${
      reservationData.propertyTitle || "a property"
    }. Tracking: ${reservationData.trackingNumber}`,
    icon: "📅",
    priority: "high",
    recipientRole: "sales representative",
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-reservation",
    data: reservationData,
  }),

  RESERVATION_APPROVED: (reservationData) => ({
    type: "reservation_approved",
    title: "🎉 Reservation Approved!",
    message: `Congratulations! Your reservation (${reservationData.trackingNumber}) for ${reservationData.propertyTitle} has been approved. Our team will contact you shortly with next steps.`,
    icon: "✅",
    priority: "urgent",
    recipientRole: "sales representative", // This can be overridden when calling
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-reservation", // Admin URL
    clientActionUrl: "/client-reservation", // Client URL
    data: reservationData,
  }),

  RESERVATION_REJECTED: (reservationData) => ({
    type: "reservation_rejected",
    title: "Reservation Update",
    message: `Your reservation (${reservationData.trackingNumber}) for ${
      reservationData.propertyTitle
    } was not approved. ${
      reservationData.notes
        ? "Reason: " + reservationData.notes
        : "Please contact us for more information."
    }`,
    icon: "❌",
    priority: "high",
    recipientRole: "sales representative", // This can be overridden when calling
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-reservation", // Admin URL
    clientActionUrl: "/client-reservation", // Client URL
    data: reservationData,
  }),

  RESERVATION_REVERTED: (reservationData) => ({
    type: "reservation_reverted",
    title: "Reservation Status Updated",
    message: `Your reservation (${reservationData.trackingNumber}) for ${reservationData.propertyTitle} has been reverted back to pending status. Our team will review it again and contact you shortly.`,
    icon: "🔄",
    priority: "high",
    recipientRole: "sales representative", // This can be overridden when calling
    sourceTable: "property_reservations",
    sourceTableDisplayName: "Property Reservation",
    actionUrl: "/client-reservation", // Admin URL
    clientActionUrl: "/client-reservation", // Client URL
    data: reservationData,
  }),

  // Contracts
  CONTRACT_CREATED: (contractData) => ({
    type: "contract_created",
    title: "New Contract Created",
    message: `Contract ${contractData.contractNumber} has been created for ${contractData.clientName}.`,
    icon: "📄",
    priority: "high",
    recipientRole: "admin",
    sourceTable: "property_contracts",
    sourceTableDisplayName: "Property Contract",
    actionUrl: "/billing", // Admin URL
    clientActionUrl: "/client-contract-to-sell", // Client URL
    data: contractData,
  }),

  CONTRACT_TRANSFERRED: (contractData) => ({
    type: "contract_transferred",
    title: "Contract Transferred",
    message: `Contract ${contractData.contractNumber} has been transferred from ${contractData.fromName} to ${contractData.toName}.`,
    icon: "🔄",
    priority: "urgent",
    recipientRole: "admin",
    sourceTable: "property_contracts",
    sourceTableDisplayName: "Contract Transfer",
    actionUrl: "/billing", // Admin URL
    clientActionUrl: "/client-contract-to-sell", // Client URL
    data: contractData,
  }),

  // Payments
  PAYMENT_RECEIVED: (paymentData) => ({
    type: "payment_received",
    title: "Payment Received",
    message: `₱${parseFloat(
      paymentData.amount
    ).toLocaleString()} payment received for ${
      paymentData.contractNumber
    }. OR#: ${paymentData.orNumber}`,
    icon: "💰",
    priority: "normal",
    recipientRole: "collection",
    sourceTable: "contract_payment_transactions",
    sourceTableDisplayName: "Payment Transaction",
    actionUrl: "/transactions",
    data: paymentData,
  }),

  // Tour Bookings
  TOUR_BOOKED: (tourData) => ({
    type: "tour_booked",
    title: "New Tour Booking",
    message: `${tourData.clientName} booked a tour for ${tourData.propertyTitle} on ${tourData.tourDate}.`,
    icon: "🏠",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "tour_bookings",
    sourceTableDisplayName: "Tour Booking",
    actionUrl: "/client-bookings",
    data: tourData,
  }),

  TOUR_APPROVED: (tourData) => ({
    type: "tour_approved",
    title: "Tour Approved",
    message: `Tour booking for ${tourData.propertyTitle} on ${tourData.tourDate} has been approved.`,
    icon: "✅",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "tour_bookings",
    sourceTableDisplayName: "Tour Booking",
    actionUrl: "/reservations", // Admin URL
    clientActionUrl: "/client-bookings", // Client URL
    data: tourData,
  }),

  TOUR_REJECTED: (tourData) => ({
    type: "tour_rejected",
    title: "Tour Rejected",
    message: `Tour booking for ${tourData.propertyTitle} on ${tourData.tourDate} has been rejected.`,
    icon: "❌",
    priority: "normal",
    recipientRole: "sales representative",
    sourceTable: "tour_bookings",
    sourceTableDisplayName: "Tour Booking",
    actionUrl: "/reservations", // Admin URL
    clientActionUrl: "/client-bookings", // Client URL
    data: tourData,
  }),

  // Announcements
  ANNOUNCEMENT_PUBLISHED: (announcementData) => ({
    type: "announcement_published",
    title: "New Announcement Published",
    message: `"${announcementData.title}" has been published to all homeowners.`,
    icon: "📢",
    priority: "normal",
    recipientRole: "admin",
    sourceTable: "homeowner_announcements",
    sourceTableDisplayName: "Announcement",
    actionUrl: "/homeowner-announcement",
    data: announcementData,
  }),

  // Service Requests
  SERVICE_REQUEST_CREATED: (requestData) => ({
    type: "service_request_created",
    title: "New Service Request",
    message: `${requestData.clientName} submitted a service request: "${requestData.title}".`,
    icon: "🔧",
    priority: "normal",
    recipientRole: "admin",
    sourceTable: "request_tbl",
    sourceTableDisplayName: "Service Request",
    actionUrl: "/service-requests",
    data: requestData,
  }),

  SERVICE_REQUEST_APPROVED: (requestData) => ({
    type: "service_request_approved",
    title: "Service Request Approved",
    message: `Your service request "${requestData.title}" has been approved and is now in progress.`,
    icon: "✅",
    priority: "high",
    recipientRole: "home owner",
    sourceTable: "request_tbl",
    sourceTableDisplayName: "Service Request",
    actionUrl: "/service-requests", // Admin URL
    clientActionUrl: "/client-requests", // Client URL
    data: requestData,
  }),

  SERVICE_REQUEST_COMPLETED: (requestData) => ({
    type: "service_request_completed",
    title: "Service Request Completed",
    message: `Your service request "${requestData.title}" has been completed.`,
    icon: "✅",
    priority: "normal",
    recipientRole: "home owner",
    sourceTable: "request_tbl",
    sourceTableDisplayName: "Service Request",
    actionUrl: "/service-requests", // Admin URL
    clientActionUrl: "/client-requests", // Client URL
    data: requestData,
  }),

  SERVICE_REQUEST_DECLINED: (requestData) => ({
    type: "service_request_declined",
    title: "Service Request Declined",
    message: `Your service request "${requestData.title}" has been declined.`,
    icon: "❌",
    priority: "high",
    recipientRole: "home owner",
    sourceTable: "request_tbl",
    sourceTableDisplayName: "Service Request",
    actionUrl: "/service-requests", // Admin URL
    clientActionUrl: "/client-requests", // Client URL
    data: requestData,
  }),

  SERVICE_REQUEST_REVERTED: (requestData) => ({
    type: "service_request_reverted",
    title: "Service Request Status Updated",
    message: `Your service request "${requestData.title}" has been reverted to pending for review.`,
    icon: "🔄",
    priority: "normal",
    recipientRole: "home owner",
    sourceTable: "request_tbl",
    sourceTableDisplayName: "Service Request",
    actionUrl: "/service-requests", // Admin URL
    clientActionUrl: "/client-requests", // Client URL
    data: requestData,
  }),

  // Complaints
  COMPLAINT_FILED: (complaintData) => ({
    type: "complaint_filed",
    title: "New Complaint Filed",
    message: `${complaintData.clientName} filed a complaint: "${complaintData.subject}".`,
    icon: "⚠️",
    priority: "high",
    recipientRole: "admin",
    sourceTable: "complaint_tbl",
    sourceTableDisplayName: "Complaint",
    actionUrl: "/complaints",
    data: complaintData,
  }),

  COMPLAINT_APPROVED: (complaintData) => ({
    type: "complaint_approved",
    title: "Complaint Under Investigation",
    message: `Your complaint "${complaintData.subject}" has been approved and is now under investigation.`,
    icon: "🔍",
    priority: "high",
    recipientRole: "home owner",
    sourceTable: "complaint_tbl",
    sourceTableDisplayName: "Complaint",
    actionUrl: "/complaints", // Admin URL
    clientActionUrl: "/client-complaints", // Client URL
    data: complaintData,
  }),

  COMPLAINT_RESOLVED: (complaintData) => ({
    type: "complaint_resolved",
    title: "Complaint Resolved",
    message: `Your complaint "${complaintData.subject}" has been resolved.`,
    icon: "✅",
    priority: "high",
    recipientRole: "home owner",
    sourceTable: "complaint_tbl",
    sourceTableDisplayName: "Complaint",
    actionUrl: "/complaints", // Admin URL
    clientActionUrl: "/client-complaints", // Client URL
    data: complaintData,
  }),

  COMPLAINT_REJECTED: (complaintData) => ({
    type: "complaint_rejected",
    title: "Complaint Closed",
    message: `Your complaint "${complaintData.subject}" has been reviewed and closed.`,
    icon: "❌",
    priority: "high",
    recipientRole: "home owner",
    sourceTable: "complaint_tbl",
    sourceTableDisplayName: "Complaint",
    actionUrl: "/complaints", // Admin URL
    clientActionUrl: "/client-complaints", // Client URL
    data: complaintData,
  }),

  COMPLAINT_ESCALATED: (complaintData) => ({
    type: "complaint_escalated",
    title: "Complaint Escalated",
    message: `Your complaint "${complaintData.subject}" has been escalated for further review.`,
    icon: "🚨",
    priority: "urgent",
    recipientRole: "home owner",
    sourceTable: "complaint_tbl",
    sourceTableDisplayName: "Complaint",
    actionUrl: "/complaints", // Admin URL
    clientActionUrl: "/client-complaints", // Client URL
    data: complaintData,
  }),

  COMPLAINT_REVERTED: (complaintData) => ({
    type: "complaint_reverted",
    title: "Complaint Status Updated",
    message: `Your complaint "${complaintData.subject}" has been reverted to pending for review.`,
    icon: "🔄",
    priority: "normal",
    recipientRole: "home owner",
    sourceTable: "complaint_tbl",
    sourceTableDisplayName: "Complaint",
    actionUrl: "/complaints", // Admin URL
    clientActionUrl: "/client-complaints", // Client URL
    data: complaintData,
  }),

  // Payments - Homeowner Notifications
  PAYMENT_RECEIVED: (paymentData) => ({
    type: "payment_received",
    title: "Payment Received",
    message: `We received your payment of ${paymentData.currencySymbol || "₱"}${parseFloat(paymentData.amount || 0).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})} for ${paymentData.installmentDescription || "Installment " + (paymentData.installmentNumber || "1")}. Receipt #: ${paymentData.receiptNumber || "Pending"}`,
    icon: "💳",
    priority: "normal",
    recipientRole: "home owner",
    sourceTable: "contract_payment_transactions",
    sourceTableDisplayName: "Payment",
    actionUrl: "/contracts", // Admin URL
    clientActionUrl: "/client-contract-to-sell", // Client URL
    data: paymentData,
  }),

  // Amenity Borrow Requests - Homeowner Notifications
  AMENITY_REQUEST_APPROVED: (amenityData) => ({
    type: "amenity_request_approved",
    title: "Amenity Request Approved",
    message: `Your request to borrow "${amenityData.amenityName}" has been approved. Borrow period: ${amenityData.borrowDate} to ${amenityData.returnDate}. Please visit the amenities office to pick up the item.`,
    icon: "🏠",
    priority: "normal",
    recipientRole: "home owner",
    sourceTable: "amenity_borrow_requests",
    sourceTableDisplayName: "Amenity Request",
    actionUrl: "/amenities", // Admin URL
    clientActionUrl: "/client-amenities", // Client URL
    data: amenityData,
  }),

  AMENITY_REQUEST_DECLINED: (amenityData) => ({
    type: "amenity_request_declined",
    title: "Amenity Request Declined",
    message: `Your request to borrow "${amenityData.amenityName}" has been declined. ${amenityData.reason ? "Reason: " + amenityData.reason : "Please contact the amenities office for more information."}`,
    icon: "📋",
    priority: "normal",
    recipientRole: "home owner",
    sourceTable: "amenity_borrow_requests",
    sourceTableDisplayName: "Amenity Request",
    actionUrl: "/amenities", // Admin URL
    clientActionUrl: "/client-amenities", // Client URL
    data: amenityData,
  }),

  // Generic
  SYSTEM_EVENT: (eventData) => ({
    type: "system_event",
    title: eventData.title,
    message: eventData.message,
    icon: eventData.icon || "ℹ️",
    priority: eventData.priority || "normal",
    recipientRole: eventData.recipientRole || "admin",
    sourceTable: eventData.sourceTable || "system",
    sourceTableDisplayName: eventData.sourceTableDisplayName || "System",
    actionUrl: eventData.actionUrl || null,
    data: eventData.data || {},
  }),
};

/**
 * Check if a user is a certified homeowner
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is certified homeowner
 */
export async function isCertifiedHomeowner(supabaseAdmin, userId) {
  try {
    if (!userId) return false;

    // Check if user has an active contract (which means they are certified)
    const { data: contracts, error } = await supabaseAdmin
      .from("property_contracts")
      .select("contract_id")
      .eq("user_id", userId)
      .eq("contract_status", "active")
      .limit(1);

    if (error) {
      console.error("Error checking homeowner status:", error);
      return false;
    }

    return contracts && contracts.length > 0;
  } catch (error) {
    console.error("Error in isCertifiedHomeowner:", error);
    return false;
  }
}
