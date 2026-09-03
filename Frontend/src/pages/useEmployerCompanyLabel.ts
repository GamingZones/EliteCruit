import { useEffect, useState } from "react";

type SavedUser = {
  id?: number;
  role?: string;
  email?: string;
  businessName?: string;
  business_name?: string;
  companyName?: string;
};

export function useEmployerCompanyLabel(defaultLabel = "Employer") {
  const [companyLabel, setCompanyLabel] = useState(defaultLabel);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setCompanyLabel(defaultLabel);
      return;
    }

    let parsedUser: SavedUser | null = null;
    try {
      parsedUser = JSON.parse(savedUserRaw) as SavedUser;
    } catch {
      setCompanyLabel(defaultLabel);
      return;
    }

    const localName =
      parsedUser?.businessName ||
      parsedUser?.business_name ||
      parsedUser?.companyName ||
      "";

    if (localName) {
      setCompanyLabel(localName);
    } else if (parsedUser?.email) {
      setCompanyLabel(parsedUser.email);
    }

    if (!parsedUser?.id || (parsedUser?.role && parsedUser.role !== "employer")) {
      return;
    }

    fetch(`/api/employers/${parsedUser.id}/profile`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load employer profile");
        }
        return response.json();
      })
      .then((data) => {
        const apiName =
          data?.profile?.business_name ||
          data?.profile?.businessName ||
          "";

        if (!apiName) {
          return;
        }

        setCompanyLabel(apiName);
        const mergedUser = { ...parsedUser, businessName: apiName };
        localStorage.setItem("elitecruit-user", JSON.stringify(mergedUser));
      })
      .catch(() => {
        // Keep local label fallback when API is not available.
      });
  }, [defaultLabel]);

  return companyLabel;
}
