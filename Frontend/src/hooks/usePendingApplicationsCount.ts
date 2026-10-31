import { useEffect, useState } from "react";

export function usePendingApplicationsCount(): number {
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
      const savedUserRaw = localStorage.getItem("elitecruit-user");
      const token = localStorage.getItem("elitecruit-token");
      if (!savedUserRaw) {
        if (isMounted) setPendingCount(0);
        return;
      }
      try {
        const savedUser = JSON.parse(savedUserRaw);
        if (!savedUser?.id) {
          if (isMounted) setPendingCount(0);
          return;
        }

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/employers/${savedUser.id}/applications`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const pending = Number(data?.stats?.pending || 0);
            setPendingCount(pending);
          }
        } else {
          if (isMounted) setPendingCount(0);
        }
      } catch {
        if (isMounted) setPendingCount(0);
      }
    };

    fetchCount();

    const handleSync = () => fetchCount();
    window.addEventListener("focus", handleSync);
    window.addEventListener("elitecruit_application_update", handleSync);

    const interval = setInterval(fetchCount, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("elitecruit_application_update", handleSync);
      clearInterval(interval);
    };
  }, []);

  return pendingCount;
}
