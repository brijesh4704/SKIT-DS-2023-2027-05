"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Droplets,
  X,
  AlertTriangle,
  HeartPulse,
  Info,
} from "lucide-react";


import {
  API_BASE_URL,
  authHeaders,
  clearAuth,
  getToken,
} from "../../lib/api";

import "./notification.css";

type NotificationItem = {
  _id: string;
  type:
    | "BLOOD_REQUEST"
    | "DONOR_ACCEPTED"
    | "DONOR_REJECTED"
    | "REQUEST_FULFILLED"
    | "REQUEST_CANCELLED"
    | "GENERAL";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  bloodRequest?: {
    _id?: string;
    patientName?: string;
    bloodGroup?: string;
    hospitalName?: string;
    urgency?: string;
    status?: string;
  } | null;
};

type NotificationBellProps = {
  className?: string;
};

export default function NotificationBell({
  className = "",
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // ======================================================
  // FETCH NOTIFICATIONS
  // ======================================================

  const loadNotifications = async () => {
    const token = getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          method: "GET",
          headers: authHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load notifications"
        );
      }

      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (error) {
      console.error(
        "Notification fetch error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    loadNotifications();

    // Refresh notifications every 30 seconds
    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // ======================================================
  // CLOSE WHEN CLICKING OUTSIDE
  // ======================================================

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ======================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ======================================================

  const markAsRead = async (
    notificationId: string
  ) => {
    const token = getToken();

    if (!token) {
      clearAuth();
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to mark notification as read"
        );
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1)
      );
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );
    }
  };

  // ======================================================
  // MARK ALL AS READ
  // ======================================================

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    const token = getToken();

    if (!token) {
      clearAuth();
      window.location.href = "/login";
      return;
    }

    try {
      setMarkingAll(true);

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to mark all notifications as read"
        );
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Mark all notifications error:",
        error
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ======================================================
  // NOTIFICATION ICON
  // ======================================================

  const getNotificationIcon = (
    type: NotificationItem["type"]
  ) => {
    switch (type) {
      case "BLOOD_REQUEST":
        return <Droplets size={17} />;

      case "DONOR_ACCEPTED":
        return <HeartPulse size={17} />;

      case "DONOR_REJECTED":
        return <X size={17} />;

      case "REQUEST_FULFILLED":
        return <Check size={17} />;

      case "REQUEST_CANCELLED":
        return <AlertTriangle size={17} />;

      default:
        return <Info size={17} />;
    }
  };

  // ======================================================
  // NOTIFICATION ICON CLASS
  // ======================================================

  const getNotificationClass = (
    type: NotificationItem["type"]
  ) => {
    switch (type) {
      case "BLOOD_REQUEST":
        return "notification-icon blood-request";

      case "DONOR_ACCEPTED":
        return "notification-icon accepted";

      case "DONOR_REJECTED":
        return "notification-icon rejected";

      case "REQUEST_FULFILLED":
        return "notification-icon fulfilled";

      case "REQUEST_CANCELLED":
        return "notification-icon cancelled";

      default:
        return "notification-icon general";
    }
  };

  // ======================================================
  // RELATIVE TIME
  // ======================================================

  const getRelativeTime = (date?: string) => {
    if (!date) return "";

    const timestamp = new Date(date).getTime();

    if (Number.isNaN(timestamp)) {
      return "";
    }

    const difference = Math.max(
      0,
      Date.now() - timestamp
    );

    const seconds = Math.floor(
      difference / 1000
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(
      seconds / 60
    );

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
      }
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={`notification-wrapper ${className}`}
    >
      {/* ==================================================
          BELL BUTTON
          ================================================== */}

      <button
        type="button"
        className="notification-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* ==================================================
          NOTIFICATION PANEL
          ================================================== */}

      {open && (
        <div className="notification-panel">
          {/* Header */}

          <div className="notification-panel-header">
            <div>
              <span className="notification-eyebrow">
                BLOODLINK AI
              </span>

              <h3>Notifications</h3>

              <p>
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount > 1 ? "s" : ""
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            <button
              type="button"
              className="notification-close"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mark all */}

          {unreadCount > 0 && (
            <div className="notification-actions">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
              >
                <CheckCheck size={14} />

                {markingAll
                  ? "Marking..."
                  : "Mark all as read"}
              </button>
            </div>
          )}

          {/* Notification list */}

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">
                <div className="notification-loading">
                  <Bell size={20} />
                </div>

                <strong>
                  Loading notifications
                </strong>

                <span>
                  Checking your BloodLink activity...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <Bell size={22} />
                </div>

                <strong>
                  No notifications yet
                </strong>

                <span>
                  New blood requests and activity
                  will appear here.
                </span>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    type="button"
                    key={notification._id}
                    className={`notification-item ${
                      !notification.isRead
                        ? "unread"
                        : ""
                    }`}
                    onClick={() => {
                      if (
                        !notification.isRead
                      ) {
                        markAsRead(
                          notification._id
                        );
                      }
                    }}
                  >
                    <div
                      className={getNotificationClass(
                        notification.type
                      )}
                    >
                      {getNotificationIcon(
                        notification.type
                      )}
                    </div>

                    <div className="notification-content">
                      <div className="notification-title-row">
                        <strong>
                          {notification.title}
                        </strong>

                        {!notification.isRead && (
                          <span className="notification-unread-dot" />
                        )}
                      </div>

                      <p>
                        {notification.message}
                      </p>

                      {notification.bloodRequest && (
                        <div className="notification-request-meta">
                          {notification.bloodRequest
                            .bloodGroup && (
                            <span>
                              🩸{" "}
                              {
                                notification
                                  .bloodRequest
                                  .bloodGroup
                              }
                            </span>
                          )}

                          {notification.bloodRequest
                            .hospitalName && (
                            <span>
                              {
                                notification
                                  .bloodRequest
                                  .hospitalName
                              }
                            </span>
                          )}

                          {notification.bloodRequest
                            .urgency && (
                            <span>
                              {
                                notification
                                  .bloodRequest
                                  .urgency
                              }
                            </span>
                          )}
                        </div>
                      )}

                      <small>
                        {getRelativeTime(
                          notification.createdAt
                        )}
                      </small>
                    </div>
                  </button>
                )
              )
            )}
          </div>

          {/* Footer */}

          {notifications.length > 0 && (
            <div className="notification-panel-footer">
              <span>
                Showing your latest activity
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}