interface NotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const Notification = ({
  message,
  type,
  onClose,
}: NotificationProps) => {
  return (
    <div
      className={`fixed right-6 top-6 z-50 flex min-w-80 items-center justify-between gap-4 rounded-lg px-4 py-3 shadow-lg ${
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {type === "success" ? "✓" : "✕"}
        </span>

        <span>{message}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-lg font-bold opacity-80 hover:opacity-100"
        aria-label="Zamknij powiadomienie"
      >
        ×
      </button>
    </div>
  );
};

export default Notification;