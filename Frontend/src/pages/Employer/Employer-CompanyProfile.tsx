import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, SideIcon } from "../../components/Icons";
import { useEmployerCompanyLabel } from "../../hooks/useEmployerCompanyLabel";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { useUnreadMessagesCount } from "../../hooks/useUnreadMessagesCount";
import EmployerChatbotDrawer, { EmployerFAQItem as FAQItem } from "../../components/EmployerChatbotDrawer";
import CalendarDrawer from "../../components/CalendarDrawer";
import ImageAdjustModal from "../../components/ImageAdjustModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import "../Applicant/Applicant-Dashboard.css";
import "./Employer-Dashboard.css";
import "./Employer-CompanyProfile.css";
import { ALL_PHILIPPINES_PROVINCES, getCitiesByProvince, CAVITE_CITIES } from "../../utils/filters";

type EmployerIconName =
  | "dashboard"
  | "jobposts"
  | "applicant"
  | "screening"
  | "discovery"
  | "nearby"
  | "shortlisted"
  | "faq"
  | "feedback"
  | "company"
  | "messages"
  | "notifications"
  | "profile"
  | "chat"
  | "logout";

function EmployerIcon({ name }: { name: EmployerIconName }) {
  const icons: Record<EmployerIconName, JSX.Element> = {
    dashboard: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    jobposts: <path d="M3 8h18v11H3V8Zm5-3h8v3H8V5Zm4 5v4m-2-2h4" />,
    applicant: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    screening: <path d="M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.5-1.5-4.1-4.1A7 7 0 0 0 11 4Z" />,
    discovery: <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4l-8 5-8-5V6l8 5 8-5v2Z" />,
    nearby: <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />,
    shortlisted: <path d="M12 2 5 5v6c0 5.5 3.9 9.9 7 11 3.1-1.1 7-5.5 7-11V5l-7-3Zm-1 12-3-3 1.4-1.4 1.6 1.6 3.6-3.6L16 9l-5 5Z" />,
    faq: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1.6-6.5a2.5 2.5 0 0 0-2.1-2.5 2.5 2.5 0 0 0-2.5 2.5H7.5a4 4 0 0 1 4-4 4 4 0 0 1 4 4c0 1.5-1 2.3-1.9 3-.7.5-1.1.9-1.1 1.5h-2c0-1.5 1-2.3 1.9-3 .7-.5 1.2-.9 1.2-1.5Z" />,
    feedback: <path d="M4 11h3v9H4v-9Zm5 9V9.5L12.5 6h4.2c1 0 1.7 1 1.4 2l-1 3h2.6c1.1 0 1.9 1 1.5 2l-1.8 5.6c-.2.6-.8 1-1.4 1H9Z" />,
    company: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />,
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    chat: <path d="M4 5h16v10H9l-5 4v-4H4V5Zm3 4h10M7 12h7" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

type BranchLocation = {
  id: string;
  branch_name: string;
  province?: string;
  city: string;
  address: string;
  contact_number: string;
  email: string;
  is_main: boolean;
};

type EmployerProfileForm = {
  business_name: string;
  industry: string;
  company_size: string;
  company_description: string;
  business_email: string;
  is_email_verified?: boolean;
  contact_number: string;
  province?: string;
  city?: string;
  company_address: string;
  company_logo_path?: string | null;
  company_cover_path?: string | null;
  branches: BranchLocation[];
};

const emptyEmployerProfile: EmployerProfileForm = {
  business_name: "",
  industry: "",
  company_size: "",
  company_description: "",
  business_email: "",
  is_email_verified: true,
  contact_number: "",
  province: "Cavite",
  city: "Indang",
  company_address: "Indang",
  company_logo_path: null,
  company_cover_path: null,
  branches: [],
};

function normalizeEmployerProfile(source: any, fallback: EmployerProfileForm): EmployerProfileForm {
  let branchesArr: BranchLocation[] = [];
  if (Array.isArray(source?.branches)) {
    branchesArr = source.branches;
  } else if (typeof source?.branches_json === "string" && source.branches_json.trim()) {
    try {
      const parsed = JSON.parse(source.branches_json);
      if (Array.isArray(parsed)) branchesArr = parsed;
    } catch {
      branchesArr = [];
    }
  }

  const selectedProvince = (source?.province && String(source.province).trim()) || fallback.province || "Cavite";
  const rawCity = (source?.city && String(source.city).trim()) || (source?.company_address && String(source.company_address).split(",")[0].trim()) || fallback.city || "Indang";
  const selectedCity = rawCity;
  const fullAddress = (source?.company_address && String(source.company_address).trim()) || (selectedCity && selectedProvince ? `${selectedCity}, ${selectedProvince}` : selectedCity);

  if (branchesArr.length === 0 && source?.city && String(source.city).trim()) {
    const bName = source?.business_name ? `${String(source.business_name).trim()} (Main Branch)` : "Main Headquarters";
    branchesArr = [
      {
        id: `branch-main-${source?.user_id || "default"}`,
        branch_name: bName,
        province: selectedProvince,
        city: selectedCity,
        address: fullAddress,
        contact_number: source?.contact_number ?? fallback.contact_number ?? "",
        email: source?.business_email ?? source?.email ?? fallback.business_email ?? "",
        is_main: true,
      },
    ];
  }

  return {
    business_name: source?.business_name ?? fallback.business_name,
    industry: source?.industry ?? fallback.industry,
    company_size: source?.company_size ?? fallback.company_size,
    company_description: source?.company_description ?? fallback.company_description,
    business_email: source?.business_email ?? source?.email ?? fallback.business_email,
    is_email_verified: source?.is_email_verified !== undefined ? Boolean(source.is_email_verified) : (fallback.is_email_verified ?? true),
    contact_number: source?.contact_number ?? fallback.contact_number,
    province: selectedProvince,
    city: selectedCity,
    company_address: fullAddress,
    company_logo_path: source?.company_logo_path ?? fallback.company_logo_path ?? null,
    company_cover_path: source?.company_cover_path ?? fallback.company_cover_path ?? null,
    branches: branchesArr,
  };
}

export default function EmployerCompanyProfile() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const unreadNotifCount = useUnreadNotificationsCount();
  const unreadMessagesCount = useUnreadMessagesCount();

  // Section Navigation (3 Tabs)
  const [activeSection, setActiveSection] = useState<"branding" | "overview" | "branches">("branding");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Branch Manager Form State
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranchData, setEditBranchData] = useState<BranchLocation | null>(null);

  const handleStartEditBranch = (b: BranchLocation) => {
    setEditingBranchId(b.id);
    setEditBranchData({ ...b });
  };

  const handleSaveEditedBranch = async () => {
    if (!editBranchData || !editingBranchId) return;
    if (!editBranchData.branch_name.trim()) {
      setWarningPopup("Please enter branch name.");
      return;
    }

    let updatedBranches = draft.branches.map((b) => {
      if (b.id === editingBranchId) {
        return editBranchData;
      }
      return editBranchData.is_main ? { ...b, is_main: false } : b;
    });

    updateDraft("branches", updatedBranches);
    setEditingBranchId(null);
    setEditBranchData(null);
    await saveProfile(updatedBranches);
  };
  const [newBranch, setNewBranch] = useState<Omit<BranchLocation, "id">>({
    branch_name: "",
    province: "Cavite",
    city: CAVITE_CITIES[0] || "Alfonso",
    address: "",
    contact_number: "",
    email: "",
    is_main: false,
  });

  const companyProfileFaqs: FAQItem[] = [
    {
      question: "Why is completing the company profile important?",
      answer: "A complete profile with company logo, description, address, and website increases applicant trust and improves candidate application rates.",
    },
    {
      question: "How do I manage multiple branch locations?",
      answer: "Go to Tab 3 (Contact & Branches) to add, update, or remove additional branch offices in Cavite alongside your main headquarters.",
    },
  ];
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [pageMessage, setPageMessage] = useState("");
  const [warningPopup, setWarningPopup] = useState("");
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const hasShownInitialSetupPromptRef = useRef(false);

  // Email OTP Verification States
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState<string>("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    onConfirm: () => {},
  });
  const [profile, setProfile] = useState<EmployerProfileForm>(emptyEmployerProfile);
  const [draft, setDraft] = useState(profile);
  const companyLabel = useEmployerCompanyLabel("Employer");
  const effectiveCompanyLabel = profile.business_name || companyLabel;

  const missingFieldItems = useMemo(() => {
    const list: { key: string; label: string; section: "branding" | "overview" | "branches"; sectionName: string }[] = [];
    if (!profile.industry || !String(profile.industry).trim()) {
      list.push({ key: "industry", label: "Industry", section: "branding", sectionName: "Company & Branding" });
    }
    if (!profile.company_size || !String(profile.company_size).trim()) {
      list.push({ key: "company_size", label: "Company Size", section: "branding", sectionName: "Company & Branding" });
    }
    if (!profile.company_description || !String(profile.company_description).trim()) {
      list.push({ key: "company_description", label: "Company Description / Overview", section: "overview", sectionName: "Overview & Contact" });
    }
    if (!Array.isArray(profile.branches) || profile.branches.length === 0) {
      list.push({ key: "branches", label: "At least 1 Branch Location", section: "branches", sectionName: "Branch Locations" });
    }
    return list;
  }, [profile]);

  const missingMandatedFields = useMemo(() => missingFieldItems.map((item) => item.label), [missingFieldItems]);

  const completionChecks = useMemo(() => {
    const hasIndustry = Boolean(profile.industry && String(profile.industry).trim());
    const hasCompanySize = Boolean(profile.company_size && String(profile.company_size).trim());
    const hasDescription = Boolean(profile.company_description && String(profile.company_description).trim());
    const hasBranches = Boolean(Array.isArray(profile.branches) && profile.branches.length > 0);

    const allChecks = [hasIndustry, hasCompanySize, hasDescription, hasBranches];
    const done = allChecks.filter(Boolean).length;
    const percent = Math.round((done / allChecks.length) * 100);
    const colorBand = percent <= 50 ? "red" : percent <= 80 ? "yellow" : "green";

    return {
      hasIndustry,
      hasCompanySize,
      hasDescription,
      hasBranches,
      percent,
      colorBand,
    };
  }, [profile]);

  const isProfileComplete = hasLoadedProfile && (completionChecks.percent >= 100 || missingFieldItems.length === 0);
  const isProfileSetupIncomplete = hasLoadedProfile && !isProfileComplete;

  useEffect(() => {
    if (!hasLoadedProfile) return;
    try {
      const rawUser = localStorage.getItem("elitecruit-user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const updated = {
          ...parsed,
          isProfileComplete: missingMandatedFields.length === 0,
          missingProfileFields: missingMandatedFields,
        };
        localStorage.setItem("elitecruit-user", JSON.stringify(updated));
      }
    } catch {}

    if (
      missingMandatedFields.length > 0 &&
      !hasShownInitialSetupPromptRef.current &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("setup") === "required"
    ) {
      hasShownInitialSetupPromptRef.current = true;
      setWarningPopup(
        `Welcome to EliteCruit! Please complete your required company profile details (${missingMandatedFields.join(", ")}) before navigating to other pages.`
      );
    }
  }, [hasLoadedProfile, missingMandatedFields]);

  // Auto-dismiss banner message after 5 seconds
  useEffect(() => {
    if (!pageMessage) return;
    const timer = setTimeout(() => {
      setPageMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [pageMessage]);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("elitecruit-user");
    if (!savedUserRaw) {
      setPageMessage("Sign in as employer to manage company profile.");
      return;
    }

    try {
      const savedUser = JSON.parse(savedUserRaw) as { id?: number; role?: string };
      if (savedUser.role !== "employer" || !savedUser.id) {
        setPageMessage("This page is available to employer accounts.");
        return;
      }
      setUserId(savedUser.id);
    } catch {
      setPageMessage("Unable to read account session.");
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/employers/${userId}/profile`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || "Unable to load employer profile.");
        const loaded = normalizeEmployerProfile(data?.profile, emptyEmployerProfile);
        const isVerified = loaded.is_email_verified !== false;
        setIsEmailVerified(isVerified);
        if (isVerified && loaded.business_email) {
          setVerifiedEmailAddress(loaded.business_email.trim().toLowerCase());
        }
        setProfile(loaded);
        setDraft(loaded);
        setHasLoadedProfile(true);
      })
      .catch((error) => setPageMessage(error instanceof Error ? error.message : "Unable to load employer profile."));
  }, [userId]);

  const updateDraft = (name: keyof typeof draft, value: any) => {
    if (name === "business_email") {
      const cleanEmail = String(value).trim().toLowerCase();
      const origEmail = profile.is_email_verified !== false && profile.business_email
        ? String(profile.business_email).trim().toLowerCase()
        : "";
      const isMatch = Boolean(
        (verifiedEmailAddress && cleanEmail === verifiedEmailAddress) ||
        (origEmail && cleanEmail === origEmail)
      );
      setIsEmailVerified(isMatch);
      setDraft((current) => ({ ...current, business_email: value }));
      return;
    }
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleSendEmailOtp = async () => {
    const targetEmail = (draft.business_email || profile.business_email || "").trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setWarningPopup("Please enter a valid business email address to verify.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setOtpDevHint(null);
    try {
      const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: targetEmail, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send verification code.");
      }
      if (data.devCode) {
        setOtpDevHint(data.devCode);
      }
      setIsOtpModalOpen(true);
      setOtpCodeInput("");
      setOtpCooldown(60);
    } catch (err: any) {
      setWarningPopup(err.message || "Unable to send verification OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const targetEmail = (draft.business_email || profile.business_email || "").trim();
    const cleanCode = otpCodeInput.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: targetEmail, code: cleanCode, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid verification code.");
      }
      setIsEmailVerified(true);
      setVerifiedEmailAddress(targetEmail.toLowerCase());
      setDraft((prev) => ({ ...prev, is_email_verified: true, business_email: targetEmail }));
      setIsOtpModalOpen(false);
      setPageMessage("Business email address verified! Click 'Save Contact' to save your changes.");
    } catch (err: any) {
      setOtpError(err.message || "Verification failed. Please check the code and try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const saveProfile = async (overrideBranches?: BranchLocation[]) => {
    if (!userId) return;
    if (!overrideBranches && !isEmailVerified) {
      setWarningPopup("Please verify your new business email address before saving.");
      return;
    }
    setIsSaving(true);
    setPageMessage("");
    try {
      const targetBranches = overrideBranches ?? draft.branches;
      let resolvedProvince = draft.province || "Cavite";
      let resolvedCity = draft.city || draft.company_address || "Indang";
      let syncedBranches = [...targetBranches];

      if (overrideBranches) {
        const mainBr = overrideBranches.find((b) => b.is_main);
        if (mainBr) {
          resolvedProvince = mainBr.province || resolvedProvince;
          resolvedCity = mainBr.city || resolvedCity;
        }
      } else if (isEditingContact) {
        const mainIdx = syncedBranches.findIndex((b) => b.is_main);
        if (mainIdx >= 0) {
          syncedBranches[mainIdx] = {
            ...syncedBranches[mainIdx],
            province: resolvedProvince,
            city: resolvedCity,
            address: `${resolvedCity}, ${resolvedProvince}`,
            contact_number: draft.contact_number || syncedBranches[mainIdx].contact_number,
            email: draft.business_email || syncedBranches[mainIdx].email,
          };
        } else if (resolvedCity) {
          syncedBranches.unshift({
            id: `branch-main-${userId}`,
            branch_name: `${(draft.business_name || "Company").trim()} (Main Branch)`,
            province: resolvedProvince,
            city: resolvedCity,
            address: `${resolvedCity}, ${resolvedProvince}`,
            contact_number: draft.contact_number || "",
            email: draft.business_email || "",
            is_main: true,
          });
        }
      }

      const payload = {
        ...draft,
        province: resolvedProvince,
        city: resolvedCity,
        company_address: `${resolvedCity}, ${resolvedProvince}`,
        branches: syncedBranches,
      };
      const response = await fetch(`/api/employers/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to save employer profile.");
      const saved = normalizeEmployerProfile(data?.profile, payload);
      setProfile(saved);
      setDraft(saved);
      setIsEmailVerified(true);
      if (saved.business_email) {
        const cleanSavedEmail = saved.business_email.trim().toLowerCase();
        setVerifiedEmailAddress(cleanSavedEmail);
        try {
          const rawUser = localStorage.getItem("elitecruit-user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            localStorage.setItem("elitecruit-user", JSON.stringify({ ...parsed, email: saved.business_email.trim() }));
          }
        } catch {}
      }
      setIsEditingProfile(false);
      setIsEditingOverview(false);
      setIsEditingContact(false);
      setPageMessage("Company profile updated successfully.");
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to save employer profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [adjustModalConfig, setAdjustModalConfig] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    type: "logo" | "cover";
    aspectRatio: number;
    title: string;
    outputWidth: number;
    outputHeight: number;
    isCircular: boolean;
  }>({
    isOpen: false,
    imageSrc: null,
    type: "logo",
    aspectRatio: 1,
    title: "Adjust Company Logo",
    outputWidth: 600,
    outputHeight: 600,
    isCircular: false,
  });
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      setPageMessage("Please select a valid image file (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPageMessage("Company logo file size exceeds 5 MB limit.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAdjustModalConfig({
      isOpen: true,
      imageSrc: objectUrl,
      type: "logo",
      aspectRatio: 1,
      title: "Adjust Company Logo",
      outputWidth: 600,
      outputHeight: 600,
      isCircular: false,
    });
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleOpenAdjustLogo = () => {
    if (!profile.company_logo_path) return;
    setAdjustModalConfig({
      isOpen: true,
      imageSrc: profile.company_logo_path,
      type: "logo",
      aspectRatio: 1,
      title: "Adjust Company Logo",
      outputWidth: 600,
      outputHeight: 600,
      isCircular: false,
    });
  };

  const executeDeleteLogo = async () => {
    if (!userId || isUploadingLogo || isApplyingAdjustment) return;
    setIsUploadingLogo(true);
    try {
      const res = await fetch(`/api/employers/${userId}/logo`, { method: "DELETE" });
      if (res.ok) {
        setProfile((prev) => ({ ...prev, company_logo_path: null }));
        setDraft((prev) => ({ ...prev, company_logo_path: null }));
        setPageMessage("Company logo removed.");
      }
    } catch {
      setPageMessage("Failed to remove company logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteLogo = () => {
    if (!userId || isUploadingLogo || isApplyingAdjustment) return;
    setConfirmDialog({
      isOpen: true,
      title: "Remove Company Logo",
      message: "Are you sure you want to remove your company logo?",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: executeDeleteLogo,
    });
  };

  const handleCoverSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      setPageMessage("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPageMessage("Company cover image file size exceeds 10 MB limit.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAdjustModalConfig({
      isOpen: true,
      imageSrc: objectUrl,
      type: "cover",
      aspectRatio: 2.6,
      title: "Adjust Company Cover Image",
      outputWidth: 1200,
      outputHeight: 460,
      isCircular: false,
    });
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleOpenAdjustCover = () => {
    if (!profile.company_cover_path) return;
    setAdjustModalConfig({
      isOpen: true,
      imageSrc: profile.company_cover_path,
      type: "cover",
      aspectRatio: 2.6,
      title: "Adjust Company Cover Image",
      outputWidth: 1200,
      outputHeight: 460,
      isCircular: false,
    });
  };

  const executeDeleteCover = async () => {
    if (!userId || isUploadingCover || isApplyingAdjustment) return;
    setIsUploadingCover(true);
    try {
      const res = await fetch(`/api/employers/${userId}/cover`, { method: "DELETE" });
      if (res.ok) {
        setProfile((prev) => ({ ...prev, company_cover_path: null }));
        setDraft((prev) => ({ ...prev, company_cover_path: null }));
        setPageMessage("Company cover image removed.");
      }
    } catch {
      setPageMessage("Failed to remove company cover image.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleDeleteCover = () => {
    if (!userId || isUploadingCover || isApplyingAdjustment) return;
    setConfirmDialog({
      isOpen: true,
      title: "Remove Company Cover",
      message: "Are you sure you want to remove your company cover image?",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: executeDeleteCover,
    });
  };

  const handleSaveAdjustedImage = async (blob: Blob) => {
    if (!userId) return;
    setIsApplyingAdjustment(true);
    setPageMessage("");

    try {
      const formData = new FormData();
      if (adjustModalConfig.type === "logo") {
        formData.append("logo", blob, "company-logo.jpg");
        const response = await fetch(`/api/employers/${userId}/logo`, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to save adjusted company logo.");
        const logoUrl = `/api/employers/${userId}/logo?t=${Date.now()}`;
        setProfile((prev) => ({ ...prev, company_logo_path: logoUrl }));
        setDraft((prev) => ({ ...prev, company_logo_path: logoUrl }));
        setPageMessage("Company logo updated and adjusted successfully.");
      } else {
        formData.append("cover", blob, "company-cover.jpg");
        const response = await fetch(`/api/employers/${userId}/cover`, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to save adjusted company cover image.");
        const coverUrl = `/api/employers/${userId}/cover?t=${Date.now()}`;
        setProfile((prev) => ({ ...prev, company_cover_path: coverUrl }));
        setDraft((prev) => ({ ...prev, company_cover_path: coverUrl }));
        setPageMessage("Company cover image updated and adjusted successfully.");
      }
      setAdjustModalConfig((prev) => ({ ...prev, isOpen: false, imageSrc: null }));
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "Unable to save adjusted image.");
    } finally {
      setIsApplyingAdjustment(false);
    }
  };

  // Branch Operations
  const handleAddBranch = async () => {
    if (!newBranch.branch_name.trim()) {
      setWarningPopup("Please enter branch name.");
      return;
    }
    const branchItem: BranchLocation = {
      id: `br-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...newBranch,
    };

    // If set as main, mark other branches as non-main
    let updatedBranches = [...draft.branches];
    if (branchItem.is_main) {
      updatedBranches = updatedBranches.map((b) => ({ ...b, is_main: false }));
    }

    updatedBranches.push(branchItem);
    updateDraft("branches", updatedBranches);

    setNewBranch({
      branch_name: "",
      province: "Cavite",
      city: CAVITE_CITIES[0] || "Alfonso",
      address: "",
      contact_number: "",
      email: "",
      is_main: false,
    });
    setIsAddingBranch(false);

    // Auto-save updated branch list to database
    await saveProfile(updatedBranches);
  };

  const handleRemoveBranch = (id: string) => {
    const target = draft.branches.find((b) => b.id === id);
    if (target?.is_main) {
      setWarningPopup("Main branch cannot be removed.");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Remove Branch",
      message: `Are you sure you want to remove ${target?.branch_name ? `"${target.branch_name}"` : "this branch"}?`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        const updated = draft.branches.filter((b) => b.id !== id);
        updateDraft("branches", updated);
        await saveProfile(updated);
      },
    });
  };

  return (
    <div className="appdash-page employer-page sidebar-visible">
      <aside
        className="appdash-sidebar"
        aria-label="Employer Navigation"
        onClickCapture={(e) => {
          if (!isProfileSetupIncomplete) return;
          const anchor = (e.target as HTMLElement).closest("a");
          if (!anchor) return;
          const href = (anchor.getAttribute("href") || "").toLowerCase();
          if (!href || href === "/employer-company-profile" || href === "/employer/company-profile" || href.startsWith("#")) return;
          e.preventDefault();
          e.stopPropagation();
          setWarningPopup(
            `Please complete and save your required company profile information before leaving this page: ${missingMandatedFields.join(", ")}.`
          );
        }}
      >
        <a href="/" className="appdash-brand"><strong>EliteCruit</strong><span>Employer Workspace</span></a>

        <div className="employer-links-wrap">
          <ul className="appdash-secondary-list">
            <li><a href="/employer-dashboard"><span className="item-icon"><EmployerIcon name="dashboard" /></span><span>Dashboard</span></a></li>
            <li><a href="/employer-job-posts"><span className="item-icon"><EmployerIcon name="jobposts" /></span><span>Job Posts</span></a></li>
            <li className="employer-screening-item">
              <a
                href="/employer-applicant-management"
                className="employer-screening-title"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest(".title-caret-btn")) {
                    e.preventDefault();
                    setIsScreeningOpen((prev) => !prev);
                  }
                }}
              >
                <span className="title-main">
                  <span className="item-icon"><EmployerIcon name="applicant" /></span>
                  <span>Applicant Management</span>
                </span>
                <span className="title-caret-btn" title="Toggle sub-menu">
                  <ChevronIcon direction={isScreeningOpen ? "down" : "up"} />
                </span>
              </a>
              {isScreeningOpen && (
                <ul className="appdash-menu-list">
                  <li><a href="/employer-applicant-management#applicant-screening"><span className="item-icon"><EmployerIcon name="screening" /></span><span>Applicant Screening</span></a></li>
                  <li><a href="/employer-applicant-management#shortlisted-candidates"><span className="item-icon"><EmployerIcon name="shortlisted" /></span><span>Shortlisted Candidates</span></a></li>
                  <li><a href="/employer-applicant-management#direct-invitations"><span className="item-icon"><EmployerIcon name="discovery" /></span><span>Recruitment List</span></a></li>
                </ul>
              )}
            </li>
            <li><a href="/employer-applicant-finder"><span className="item-icon"><EmployerIcon name="nearby" /></span><span>Applicant Finder</span></a></li>
            <li><a href="/employer-notices-faqs"><span className="item-icon"><EmployerIcon name="faq" /></span><span>Notices & FAQs</span></a></li>
            <li><a href="/messages"><span className="item-icon"><EmployerIcon name="messages" /></span><span>Messages</span>{unreadMessagesCount > 0 && <span className="item-badge">{unreadMessagesCount}</span>}</a></li>
            <li><a href="/notifications"><span className="item-icon"><EmployerIcon name="notifications" /></span><span>Notifications</span>{unreadNotifCount > 0 && <span className="item-badge">{unreadNotifCount}</span>}</a></li>
            <li><a href="/feedback"><span className="item-icon"><EmployerIcon name="feedback" /></span><span>Feedback</span></a></li>
          </ul>
        </div>

        <div className="appdash-profile-control">
          <button type="button" className="appdash-profile-anchor" onClick={() => setIsProfileMenuOpen((v) => !v)}>
            <span className="item-icon"><EmployerIcon name="profile" /></span>
            <span className="profile-user-copy"><strong>{companyLabel}</strong><small>Employer</small></span>
            <ChevronIcon direction={isProfileMenuOpen ? "down" : "up"} />
          </button>
          {isProfileMenuOpen && (
            <div className="appdash-profile-menu">
              <a href="/employer-company-profile"><EmployerIcon name="profile" />Company Profile</a>
              <a href="/settings"><SideIcon name="settings" />Settings</a>
              <button
                type="button"
                className="appdash-profile-menu-btn"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <EmployerIcon name="logout" />Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="appdash-main company-main">
        <header className="appdash-topbar">
          <div className="appdash-top-left"><div><strong>Company Profile</strong></div></div>
          <div className="appdash-top-right">
            <div className="chatbot-wrapper">
              <EmployerChatbotDrawer
                isOpen={isChatbotOpen}
                onToggle={() => setIsChatbotOpen((prev) => !prev)}
                pageTitle="Company Profile"
                customFaqs={companyProfileFaqs}
              />
            </div>
            <CalendarDrawer />
          </div>
        </header>

        {/* COMPANY PROFILE COMPLETENESS CARD (Disappears when finished; lists only incomplete items) */}
        {isProfileSetupIncomplete && missingFieldItems.length > 0 && (
          <section className="posting-complete-card" aria-label="Company Profile Completeness">
            <div className="complete-head">
              <h2>Profile Completeness</h2>
              <span className={`complete-percent ${completionChecks.colorBand}`}>
                {completionChecks.percent}% Complete
              </span>
            </div>
            <p>Complete required company details to unlock job posting and candidate search.</p>
            <div className="complete-bar">
              <i className={completionChecks.colorBand} style={{ width: `${completionChecks.percent}%` }} />
            </div>
            <div className="complete-checks list-layout">
              <ul className="completeness-list">
                {missingFieldItems.map((item) => (
                  <li key={item.key} className="completeness-item">
                    <span className="completeness-bullet">○</span>
                    <span className="completeness-text">{item.label}</span>
                    <button
                      type="button"
                      className="completeness-jump-btn"
                      onClick={() => setActiveSection(item.section)}
                    >
                      Set in {item.sectionName} →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 3-STEP PILL TAB NAVIGATION BAR */}
        <nav className="company-section-nav" aria-label="Company Profile Sections">
          <button
            type="button"
            className={`section-nav-btn ${activeSection === "branding" ? "active" : ""}`}
            onClick={() => setActiveSection("branding")}
          >
            <span className="nav-num">1</span>
            <span>Company & Branding</span>
          </button>
          <button
            type="button"
            className={`section-nav-btn ${activeSection === "overview" ? "active" : ""}`}
            onClick={() => setActiveSection("overview")}
          >
            <span className="nav-num">2</span>
            <span>Overview & Contact</span>
          </button>
          <button
            type="button"
            className={`section-nav-btn ${activeSection === "branches" ? "active" : ""}`}
            onClick={() => setActiveSection("branches")}
          >
            <span className="nav-num">3</span>
            <span>Branch Locations</span>
          </button>
        </nav>

        {pageMessage && <p className="profile-message" style={{ margin: "0 10px 12px" }}>{pageMessage}</p>}

        {/* MODAL WARNING POPUP NOTIFICATION (Stays open until user clicks OK) */}
        {warningPopup && (
          <div className="system-popup-overlay" onClick={() => setWarningPopup("")}>
            <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
              <div className="system-popup-icon-wrap warning">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="system-popup-title">Warning</h3>
              <p className="system-popup-message">{warningPopup}</p>
              <div className="system-popup-actions">
                <button type="button" className="system-popup-btn" onClick={() => setWarningPopup("")}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CONFIRMATION DIALOG (In-app System Confirmation) */}
        {confirmDialog.isOpen && (
          <div className="system-popup-overlay" onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}>
            <div className="system-popup-card" onClick={(e) => e.stopPropagation()}>
              <div className="system-popup-icon-wrap danger">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <h3 className="system-popup-title">{confirmDialog.title}</h3>
              <p className="system-popup-message">{confirmDialog.message}</p>
              <div className="system-popup-actions">
                <button
                  type="button"
                  className="system-popup-btn secondary"
                  onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                >
                  {confirmDialog.cancelLabel || "Cancel"}
                </button>
                <button
                  type="button"
                  className="system-popup-btn danger"
                  onClick={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                    action();
                  }}
                >
                  {confirmDialog.confirmLabel || "Remove"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: COMPANY & BRANDING */}
        {activeSection === "branding" && (
          <>
            <section className="company-card company-section">
              <div className="branding-grid">
                <div className="cover-preview">
                  {profile.company_cover_path && (
                    <img
                      src={profile.company_cover_path}
                      alt="Company Cover"
                      className="cover-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "grid";
                        }
                      }}
                    />
                  )}
                  <div
                    className="cover-placeholder"
                    style={{ display: profile.company_cover_path ? "none" : "grid" }}
                  >
                    Cover image placeholder
                  </div>
                  <div className="brand-id">
                    <span className="brand-logo" style={{ overflow: "hidden", position: "relative" }}>
                      {profile.company_logo_path && (
                        <img
                          src={profile.company_logo_path}
                          alt="Company Logo"
                          className="brand-logo-img"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                            }
                          }}
                        />
                      )}
                      <span style={{ display: profile.company_logo_path ? "none" : "inline" }}>▣</span>
                    </span>
                    <div>
                      <strong>{effectiveCompanyLabel}</strong>
                      <small>{draft.industry || "Industry not set"}</small>
                    </div>
                    <a href="/feedback" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }} title="View candidate feedback & ratings">
                      <span className="rating-score-box">
                        <span className="star-icon">★</span>
                        {(profile as any)?.rating ? Number((profile as any).rating).toFixed(1) : "0.0"}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#38bdf8", fontWeight: 600 }}>Reviews ↗</span>
                    </a>
                  </div>
                </div>
                <div className="upload-pane">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoSelect}
                  />
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/png,image/jpeg,image/webp,image/*"
                    style={{ display: "none" }}
                    onChange={handleCoverSelect}
                  />
                  <div className="upload-card">
                    <div>
                      <strong>Company Logo</strong>
                      <small>PNG, JPG, SVG up to 5 MB.</small>
                    </div>
                    <div className="upload-card-actions">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo || isApplyingAdjustment}
                      >
                        {isUploadingLogo ? "Uploading..." : profile.company_logo_path ? "Change" : "Upload"}
                      </button>
                      {profile.company_logo_path && (
                        <>
                          <button
                            type="button"
                            className="upload-adjust-btn"
                            onClick={handleOpenAdjustLogo}
                            disabled={isUploadingLogo || isApplyingAdjustment}
                            title="Adjust logo crop/zoom"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            className="upload-remove-btn"
                            onClick={handleDeleteLogo}
                            disabled={isUploadingLogo || isApplyingAdjustment}
                            title="Remove logo"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="upload-card">
                    <div>
                      <strong>Company Cover Image</strong>
                      <small>PNG, JPG up to 10 MB.</small>
                    </div>
                    <div className="upload-card-actions">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isUploadingCover || isApplyingAdjustment}
                      >
                        {isUploadingCover ? "Uploading..." : profile.company_cover_path ? "Change" : "Upload"}
                      </button>
                      {profile.company_cover_path && (
                        <>
                          <button
                            type="button"
                            className="upload-adjust-btn"
                            onClick={handleOpenAdjustCover}
                            disabled={isUploadingCover || isApplyingAdjustment}
                            title="Adjust cover crop/zoom"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            className="upload-remove-btn"
                            onClick={handleDeleteCover}
                            disabled={isUploadingCover || isApplyingAdjustment}
                            title="Remove cover"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Company Details matching 873598157 / 873500981 */}
            <section className="company-card company-section">
              <div className="section-head">
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0c2a47" }}>Company Details</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "#64748b" }}>Public information shown to applicants.</p>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#00385e",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 18px",
                    fontWeight: 700,
                    fontSize: "0.86rem",
                    cursor: "pointer",
                  }}
                  onClick={() => isEditingProfile ? saveProfile() : setIsEditingProfile(true)}
                >
                  {isEditingProfile ? (isSaving ? "Saving..." : "Save") : "Edit"}
                </button>
              </div>

              <div className="form-grid" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                    Company name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    value={draft.business_name}
                    onChange={(e) => updateDraft("business_name", e.target.value)}
                    readOnly={!isEditingProfile}
                    placeholder="e.g. Doe's Store"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                  <small style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                    Use your registered business or trading name.
                  </small>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                    Industry <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={draft.industry || ""}
                    onChange={(e) => updateDraft("industry", e.target.value)}
                    disabled={!isEditingProfile}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  >
                    <option value="">Select industry</option>
                    <option value="Retail">Retail</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Software & Computer Services">Software & Computer Services</option>
                    <option value="Telecommunications">Telecommunications</option>
                    <option value="BPO & Customer Operations">BPO & Customer Operations</option>
                    <option value="Financial Services & Banking">Financial Services & Banking</option>
                    <option value="Healthcare & Pharmaceuticals">Healthcare & Pharmaceuticals</option>
                    <option value="Manufacturing & Production">Manufacturing & Production</option>
                    <option value="Education & Training">Education & Training</option>
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Hospitality & Tourism">Hospitality & Tourism</option>
                    <option value="Other">Other</option>
                  </select>
                  <small style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                    Select the category that best describes your company.
                  </small>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                    Company size
                  </label>
                  <select
                    value={draft.company_size || ""}
                    onChange={(e) => updateDraft("company_size", e.target.value)}
                    disabled={!isEditingProfile}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  >
                    <option value="">Select company size</option>
                    <option value="1-10 employees">1-10 employees</option>
                    <option value="11-50 employees">11-50 employees</option>
                    <option value="50-200 employees">50-200 employees</option>
                    <option value="201-500 employees">201-500 employees</option>
                    <option value="500+ employees">500+ employees</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                    Company email
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      value={draft.business_email || "contact@doesstore.test"}
                      readOnly
                      style={{ width: "100%", boxSizing: "border-box", paddingRight: "100px" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        background: "#dcfce7",
                        color: "#15803d",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ✔ Verified
                    </span>
                  </div>
                  <small style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                    Changing this email requires verification.
                  </small>
                  <button
                    type="button"
                    style={{
                      marginTop: "8px",
                      background: "transparent",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      color: "#0c2a47",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActiveSection("overview");
                      setIsEditingContact(true);
                    }}
                  >
                    Change email
                  </button>
                </div>
              </div>
            </section>

            {/* Brand Assets Section matching 873598157 */}
            <section className="company-card company-section">
              <div className="section-head">
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0c2a47" }}>Brand assets</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "#64748b" }}>
                    Add your company logo and cover image. These will be displayed on your public profile.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.92rem", color: "#0f172a" }}>Company logo</strong>
                      <small style={{ fontSize: "0.78rem", color: "#64748b" }}>PNG, JPG, SVG up to 5 MB.</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      color: "#0c2a47",
                      cursor: "pointer",
                    }}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Upload
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.92rem", color: "#0f172a" }}>Company cover image</strong>
                      <small style={{ fontSize: "0.78rem", color: "#64748b" }}>PNG, JPG up to 5 MB.</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      color: "#0c2a47",
                      cursor: "pointer",
                    }}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    Upload
                  </button>
                </div>

                {/* Info Callout Banner */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1e40af",
                    fontSize: "0.86rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>ℹ</span>
                  <span>This profile belongs to <strong>{effectiveCompanyLabel || "Doe's Store"}</strong>, not to an individual employer account.</span>
                </div>

                {/* Warning Callout Banner */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    fontSize: "0.86rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                  <span>Complete all required fields before continuing to Overview &amp; Contact.</span>
                </div>

                {/* Footer Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                    onClick={() => setDraft(profile)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "#00385e",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 24px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={saveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* TAB 2: OVERVIEW & CONTACT INFORMATION */}
        {activeSection === "overview" && (
          <>
            <section className="company-card company-section">
              <div className="section-head">
                <h2>Company Contact Information</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className={isEditingContact && !isEmailVerified ? "disabled-btn" : ""}
                    onClick={() => {
                      if (isEditingContact) {
                        if (!isEmailVerified) {
                          setWarningPopup("Please verify your new business email address before saving.");
                          return;
                        }
                        saveProfile();
                      } else {
                        setIsEditingContact(true);
                      }
                    }}
                    disabled={isSaving || (isEditingContact && !isEmailVerified)}
                    title={isEditingContact && !isEmailVerified ? "Email verification required before saving" : ""}
                  >
                    {isEditingContact ? (isSaving ? "Saving..." : "Save Contact") : "Edit Contact"}
                  </button>
                  {isEditingContact && (
                    <button
                      type="button"
                      className="cancel-contact-btn"
                      onClick={() => {
                        setDraft(profile);
                        setIsEmailVerified(profile.is_email_verified !== false);
                        setIsEditingContact(false);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <p>Business contact details and primary headquarters location.</p>
              <div className="form-grid two-col">
                <div className="email-field-block">
                  <div className="email-field-header">
                    <span>Primary Business Email</span>
                    {isEmailVerified ? (
                      <span className="email-status-badge verified" title="Email is verified">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="email-status-badge unverified" title="Email is not verified">
                        Unverified
                      </span>
                    )}
                  </div>
                  <div className="email-input-wrapper">
                    <input
                      type="email"
                      value={draft.business_email}
                      onChange={(e) => updateDraft("business_email", e.target.value)}
                      readOnly={!isEditingContact}
                      placeholder="contact@company.com"
                    />
                    {!isEmailVerified && (
                      <button
                        type="button"
                        className="email-verify-btn"
                        onClick={handleSendEmailOtp}
                        disabled={isSendingOtp}
                        title="Verify business email address with OTP"
                      >
                        {isSendingOtp ? "Sending..." : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
                <label>
                  Primary Contact Number
                  <input
                    value={draft.contact_number}
                    onChange={(e) => updateDraft("contact_number", e.target.value)}
                    readOnly={!isEditingContact}
                  />
                </label>
                <label>
                  Province
                  <select
                    value={draft.province || "Cavite"}
                    disabled={!isEditingContact}
                    onChange={(e) => {
                      const prov = e.target.value;
                      const cities = getCitiesByProvince(prov);
                      const nextCity = cities[0] || "";
                      setDraft((current) => ({
                        ...current,
                        province: prov,
                        city: nextCity,
                        company_address: nextCity,
                      }));
                    }}
                  >
                    {ALL_PHILIPPINES_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  City / Municipality
                  <select
                    value={draft.city || draft.company_address || ""}
                    disabled={!isEditingContact}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setDraft((current) => ({
                        ...current,
                        city: newCity,
                        company_address: newCity,
                      }));
                    }}
                  >
                    <option value="">Select primary city / municipality</option>
                    {getCitiesByProvince(draft.province || "Cavite").map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="company-card company-section">
              <div className="section-head">
                <h2>Company Overview</h2>
                <button type="button" onClick={() => isEditingOverview ? saveProfile() : setIsEditingOverview(true)}>
                  {isEditingOverview ? (isSaving ? "Saving..." : "Save Overview") : "Edit Overview"}
                </button>
              </div>
              <p>Tell prospective candidates about your company's mission, values, and organizational background.</p>
              <label>
                Company Description & Culture
                <textarea
                  rows={6}
                  value={draft.company_description}
                  onChange={(e) => updateDraft("company_description", e.target.value)}
                  readOnly={!isEditingOverview}
                  placeholder="Describe your company history, work environment, mission, and benefits..."
                />
              </label>
            </section>
          </>
        )}

        {/* TAB 3: MULTI-BRANCH LOCATIONS */}
        {activeSection === "branches" && (
          <section className="company-card company-section branch-locations-section">
            <div className="section-head">
              <div>
                <h2>Company Branch Locations</h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.83rem", color: "#475569" }}>
                  Manage secondary office locations, regional hubs, and branch recruitment sites across Cavite.
                </p>
              </div>
              <button
                type="button"
                className="add-branch-trigger-btn"
                onClick={() => setIsAddingBranch((prev) => !prev)}
                style={{ flexShrink: 0 }}
              >
                {isAddingBranch ? "Cancel" : "+ Add Branch"}
              </button>
            </div>

            {/* ADD NEW BRANCH FORM CARD */}
            {isAddingBranch && (
              <div className="add-branch-box" style={{ marginTop: "16px" }}>
                <h4>Add New Branch Office</h4>
                <div className="form-grid two-col">
                  <label>
                    Branch Name *
                    <input
                      type="text"
                      placeholder="e.g. Dasmariñas Hub / Rosario Branch"
                      value={newBranch.branch_name}
                      onChange={(e) => setNewBranch((b) => ({ ...b, branch_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    Branch Contact (Optional)
                    <input
                      type="text"
                      placeholder="e.g. +63 912 345 6789"
                      value={newBranch.contact_number}
                      onChange={(e) => setNewBranch((b) => ({ ...b, contact_number: e.target.value }))}
                    />
                  </label>
                  <label>
                    Province *
                    <select
                      value={newBranch.province || "Cavite"}
                      onChange={(e) => {
                        const prov = e.target.value;
                        const cities = getCitiesByProvince(prov);
                        setNewBranch((b) => ({
                          ...b,
                          province: prov,
                          city: cities[0] || "",
                        }));
                      }}
                    >
                      {ALL_PHILIPPINES_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    City / Municipality *
                    <select
                      value={newBranch.city}
                      onChange={(e) => setNewBranch((b) => ({ ...b, city: e.target.value }))}
                    >
                      {getCitiesByProvince(newBranch.province || "Cavite").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Building / Street (Optional)
                    <input
                      type="text"
                      placeholder="e.g. Building 4, Aguinaldo Highway, Dasmariñas, Cavite"
                      value={newBranch.address}
                      onChange={(e) => setNewBranch((b) => ({ ...b, address: e.target.value }))}
                    />
                  </label>
                </div>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", color: "#0f3f64" }}>
                    <input
                      type="checkbox"
                      checked={newBranch.is_main}
                      onChange={(e) => setNewBranch((b) => ({ ...b, is_main: e.target.checked }))}
                    />
                    Mark as Headquarter / Main Branch
                  </label>
                  <button type="button" className="save-branch-btn" onClick={handleAddBranch} style={{ marginLeft: "auto" }}>
                    Save Branch Location
                  </button>
                </div>
              </div>
            )}

            {/* BRANCHES LIST / GRID */}
            <div style={{ marginTop: "20px" }}>
              <div className="branches-grid">
                {draft.branches.map((b) => (
                  <div key={b.id} className={`branch-card ${b.is_main ? "main-hq" : ""}`}>
                    {editingBranchId === b.id && editBranchData ? (
                      <div className="edit-branch-box" style={{ padding: "4px 0" }}>
                        <h4 style={{ margin: "0 0 10px", color: "#0369a1", fontSize: "0.92rem", fontWeight: "700" }}>Edit Branch Office</h4>
                        <div className="form-grid two-col">
                          <label>
                            Branch Name *
                            <input
                              type="text"
                              value={editBranchData.branch_name}
                              onChange={(e) => setEditBranchData((prev) => prev ? ({ ...prev, branch_name: e.target.value }) : null)}
                            />
                          </label>
                          <label>
                            Branch Contact (Optional)
                            <input
                              type="text"
                              value={editBranchData.contact_number || ""}
                              onChange={(e) => setEditBranchData((prev) => prev ? ({ ...prev, contact_number: e.target.value }) : null)}
                            />
                          </label>
                          <label>
                            Province *
                            <select
                              value={editBranchData.province || "Cavite"}
                              onChange={(e) => {
                                const prov = e.target.value;
                                const cities = getCitiesByProvince(prov);
                                setEditBranchData((prev) => prev ? ({
                                  ...prev,
                                  province: prov,
                                  city: cities[0] || "",
                                }) : null);
                              }}
                            >
                              {ALL_PHILIPPINES_PROVINCES.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            City / Municipality *
                            <select
                              value={editBranchData.city}
                              onChange={(e) => setEditBranchData((prev) => prev ? ({ ...prev, city: e.target.value }) : null)}
                            >
                              {getCitiesByProvince(editBranchData.province || "Cavite").map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label style={{ gridColumn: "1 / -1" }}>
                            Building / Street (Optional)
                            <input
                              type="text"
                              value={editBranchData.address || ""}
                              onChange={(e) => setEditBranchData((prev) => prev ? ({ ...prev, address: e.target.value }) : null)}
                            />
                          </label>
                        </div>
                        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", color: "#0f3f64" }}>
                            <input
                              type="checkbox"
                              checked={!!editBranchData.is_main}
                              onChange={(e) => setEditBranchData((prev) => prev ? ({ ...prev, is_main: e.target.checked }) : null)}
                            />
                            Mark as Headquarter / Main Branch
                          </label>
                          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBranchId(null);
                                setEditBranchData(null);
                              }}
                              style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", cursor: "pointer", fontSize: "0.78rem", fontWeight: "700" }}
                            >
                              Cancel
                            </button>
                            <button type="button" className="save-branch-btn" onClick={handleSaveEditedBranch}>
                              Update Branch
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="branch-card-header">
                          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0284c7" strokeWidth="2">
                              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                            </svg>
                            {b.branch_name}
                          </strong>
                          <span className={`branch-badge ${b.is_main ? "main" : "sub"}`}>
                            {b.is_main ? "Main Branch" : "Sub-Branch"}
                          </span>
                        </div>
                        <div className="branch-info-horizontal" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginTop: "6px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 24px" }}>
                            <div className="branch-info-row">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0284c7" strokeWidth="2">
                                <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                              </svg>
                              <span>
                                <strong>Location:</strong> {b.city}
                                {b.province && !b.city.includes(b.province) ? `, ${b.province}` : ""}
                              </span>
                            </div>
                            {b.address && (
                              <div className="branch-info-row">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0284c7" strokeWidth="2">
                                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                                </svg>
                                <span><strong>Address:</strong> {b.address}</span>
                              </div>
                            )}
                            {b.contact_number && (
                              <div className="branch-info-row">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0284c7" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span><strong>Branch Contact:</strong> {b.contact_number}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                            <button
                              type="button"
                              onClick={() => handleStartEditBranch(b)}
                              className="branch-edit-btn"
                            >
                              Edit Branch
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBranch(b.id)}
                              className="branch-delete-btn"
                            >
                              Remove Branch
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {draft.branches.length === 0 && (
                <div className="empty-branches-notice" style={{ padding: "28px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "8px", background: "#f8fafc", color: "#64748b", margin: "14px 0" }}>
                  <div style={{ display: "grid", placeItems: "center", marginBottom: "8px" }}>
                    <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#64748b" strokeWidth="1.5">
                      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h2m2 0h2M9 15h2m2 0h2" />
                    </svg>
                  </div>
                  <strong>No Branch Locations Added Yet</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>Click '+ Add Branch' above to register your secondary office locations.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* IMAGE ADJUST MODAL */}
      <ImageAdjustModal
        isOpen={adjustModalConfig.isOpen}
        imageSrc={adjustModalConfig.imageSrc}
        title={adjustModalConfig.title}
        aspectRatio={adjustModalConfig.aspectRatio}
        outputWidth={adjustModalConfig.outputWidth}
        outputHeight={adjustModalConfig.outputHeight}
        isCircular={adjustModalConfig.isCircular}
        onSave={handleSaveAdjustedImage}
        onCancel={() => setAdjustModalConfig((prev) => ({ ...prev, isOpen: false, imageSrc: null }))}
        isSaving={isApplyingAdjustment}
      />

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out of your employer account?"
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/";
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* EMAIL OTP VERIFICATION MODAL */}
      {isOtpModalOpen && (
        <div className="system-popup-overlay" onClick={() => setIsOtpModalOpen(false)}>
          <div className="system-popup-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="system-popup-icon-wrap info" style={{ background: "#e0f2fe", border: "1px solid #bae6fd" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="system-popup-title">Verify Email Address</h3>
            <p className="system-popup-message" style={{ marginBottom: "12px" }}>
              A 6-digit OTP code has been sent to:
              <br />
              <strong style={{ color: "#0284c7" }}>{draft.business_email || profile.business_email}</strong>
            </p>

            <div className="otp-input-container">
              <input
                type="text"
                className="otp-code-input"
                maxLength={6}
                value={otpCodeInput}
                autoFocus
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCodeInput(numOnly);
                  if (otpError) setOtpError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otpCodeInput.length === 6) {
                    handleVerifyEmailOtp();
                  }
                }}
                placeholder="••••••"
              />

              {otpError && <div className="otp-error-msg">{otpError}</div>}

              {otpDevHint && (
                <div className="otp-dev-hint">
                  Dev Code: <strong>{otpDevHint}</strong>
                </div>
              )}

              <div className="otp-resend-wrap">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleSendEmailOtp}
                  disabled={otpCooldown > 0 || isSendingOtp}
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>

            <div className="system-popup-actions" style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                className="system-popup-btn secondary"
                onClick={() => setIsOtpModalOpen(false)}
                disabled={isVerifyingOtp}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="system-popup-btn primary"
                onClick={handleVerifyEmailOtp}
                disabled={isVerifyingOtp || otpCodeInput.length !== 6}
                style={{ flex: 1, background: "#0284c7", borderColor: "#0284c7", color: "#ffffff" }}
              >
                {isVerifyingOtp ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
