import { useEffect, useState } from "react";

export function useUnreadNotificationsCount(): number {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
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

        const res = await fetch(`/api/users/${savedUser.id}/notifications`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list = Array.isArray(data?.notifications) ? data.notifications : [];
            const unread = list.filter((n: any) => !n.is_read).length;
            setUnreadCount(unread);
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
    window.addEventListener("focus", handleSync);
    window.addEventListener("elitecruit_notif_update", handleSync);

    // Periodic check every 15 seconds
    const interval = setInterval(fetchCount, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("elitecruit_notif_update", handleSync);
      clearInterval(interval);
    };
  }, []);

  return unreadCount;
}
