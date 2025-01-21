import React, { useState, useEffect } from "react";
import styles from "./Notification.module.css";

type NotificationProps = {
  message: string;
  type?: "error" | "success" | "info";
  duration?: number; // Duration in milliseconds
  onClose?: () => void;
};

const Notification: React.FC<NotificationProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide down the notification
    setVisible(true);

    // Automatically hide after `duration`
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`${styles.notification} ${styles[type]} ${
        visible ? styles.visible : ""
      }`}
    >
      {message}
    </div>
  );
};

export default Notification;
