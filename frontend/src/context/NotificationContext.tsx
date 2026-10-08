import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error";

interface Notification {
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notification: Notification | null;
  showNotification: (
    message: string,
    type: NotificationType
  ) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notification, setNotification] =
    useState<Notification | null>(null);

  const showNotification = useCallback(
    (message: string, type: NotificationType) => {
      setNotification({
        message,
        type,
      });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeout = setTimeout(() => {
      hideNotification();
    }, 4000);

    return () => {
      clearTimeout(timeout);
    };
  }, [notification, hideNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notification,
        showNotification,
        hideNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification musi być używany wewnątrz NotificationProvider."
    );
  }

  return context;
};
