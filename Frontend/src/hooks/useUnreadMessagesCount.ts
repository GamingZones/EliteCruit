import { useEffect, useState } from "react";

export function useUnreadMessagesCount(): number {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      const savedUserRaw = localStorage.getItem("elitecruit-user");
      if (!savedUserRaw) {
        if (isMounted) setUnreadCount(0);
        return;
      }
      try {
        const savedUser = JSON.parse(savedUserRaw);
        if (!savedUser?.id) {
          if (isMounted) setUnreadCount(0);
          return;
        }

        const res = await fetch(`/api/users/${savedUser.id}/unread-messages-count`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUnreadCount(Number(data?.unreadCount || 0));
          }
        } else {
          if (isMounted) setUnreadCount(0);
        }
      } catch {
        if (isMounted) setUnreadCount(0);
      }
    };

    fetchCount();

    const handleSync = () => fetchCount();
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchCount();
      }
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener("elitecruit_messages_update", handleSync);
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic check every 15 seconds (pauses when tab is inactive)
    const interval = setInterval(fetchCount, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("elitecruit_messages_update", handleSync);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  return unreadCount;
}
