import { useEffect, useState } from "react";
import { authFetch } from "../utils/auth";

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

        const res = await authFetch(`/api/users/${savedUser.id}/notifications?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });
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
    window.addEventListener("pageshow", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("elitecruit_notif_update", handleSync);

    // Periodic check every 15 seconds
    const interval = setInterval(fetchCount, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("pageshow", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("elitecruit_notif_update", handleSync);
      clearInterval(interval);
    };
  }, []);

  return unreadCount;
}
