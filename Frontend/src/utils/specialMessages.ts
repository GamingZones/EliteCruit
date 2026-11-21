export interface ParsedSpecialMessage {
  type:
    | "formal_offer"
    | "offer_response"
    | "interview_scheduled"
    | "interview_rescheduled"
    | "interview_cancelled"
    | "interview_reschedule_request"
    | "plain";
  jobTitle?: string;
  interviewId?: number;
  companyName?: string;
  isAccepted?: boolean;
  startDate?: string;
  stage?: string;
  date?: string;
  time?: string;
  interviewType?: string;
  location?: string;
  notes?: string;
  reason?: string;
  cleanBody: string;
}

export function parseSpecialMessage(text: string): ParsedSpecialMessage {
  if (!text) return { type: "plain", cleanBody: "" };

  // 1. Formal Employment Offer
  if (
    text.startsWith("[Formal Employment Offer") ||
    text.startsWith("[Formal Job Offer") ||
    text.includes("[Formal Employment Offer") ||
    text.includes("[Formal Job Offer") ||
    text.includes("Congratulations! We are pleased to inform you that your application for the position of") ||
    (text.includes("Dear ") && text.includes("has been accepted") && text.includes("position of")) ||
    (text.includes("Dear ") && text.includes("extend an employment offer") && text.includes("position of")) ||
    (text.includes("reviewed your profile") && (text.includes("invite you to apply") || text.includes("extend an employment offer")))
  ) {
    let jobTitle = "";
    let companyName = "";
    const offerMatch = text.match(/\[(?:Formal Employment Offer|Formal Job Offer):\s*(.*?)\]/i);
    if (offerMatch) jobTitle = offerMatch[1].trim();

    const companyMatch = text.match(/Company:\s*(.*?)\n/i);
    if (companyMatch) companyName = companyMatch[1].trim();

    if (!jobTitle) {
      const posMatch = text.match(/position of ["'](.*?)["']/i) || text.match(/open position:?\s*["']?(.*?)["']?\.?$/im);
      if (posMatch) jobTitle = posMatch[1].trim().replace(/^["']|["']\.?$/g, "").trim();
    }
    if (!companyName) {
      const atCompMatch =
        text.match(/at (.*?) has been accepted/i) ||
        text.match(/at (.*?)\./i) ||
        text.match(/Best regards,\s*\n\s*(.*?)$/m) ||
        text.match(/^(?:Hello!\s*)?(.*?)\s+has reviewed/im);
      if (atCompMatch) companyName = atCompMatch[1].trim();
    }

    let cleanBody = text;
    if (cleanBody.startsWith("[")) {
      cleanBody = cleanBody.replace(/^\[(?:Formal Employment Offer|Formal Job Offer):[^\]]*\]\s*/i, "");
      cleanBody = cleanBody.replace(/^Company:[^\n]*\n+/i, "");
    }

    return {
      type: "formal_offer",
      jobTitle: jobTitle || "Employment Position",
      companyName: companyName || "Employer",
      cleanBody: cleanBody.trim(),
    };
  }

  // 2. Candidate Formal Response Letter (Offer or Invitation Response)
  if (
    text.startsWith("[Official Job Offer Response:") ||
    text.startsWith("[Formal Invitation Response:") ||
    text.startsWith("[Formal Response:") ||
    text.includes("[Official Job Offer Response:") ||
    text.includes("[Formal Invitation Response:") ||
    text.includes("[Formal Response:")
  ) {
    const isAccepted = text.includes("ACCEPTED");
    let jobTitle = "";

    const posMatch = text.match(/Position:\s*(.*?)(?:\n|$)/i);
    if (posMatch) jobTitle = posMatch[1].trim();

    let cleanBody = text;
    const splitIndex = cleanBody.indexOf("\n\n");
    if (splitIndex !== -1 && cleanBody.startsWith("[")) {
      cleanBody = cleanBody.slice(splitIndex + 2).trim();
    }

    return {
      type: "offer_response",
      jobTitle: jobTitle || "Applied Position",
      isAccepted,
      cleanBody:
        cleanBody ||
        (isAccepted
          ? "Candidate has accepted the formal offer."
          : "Candidate has declined the formal offer."),
    };
  }

  // 3. Interview Scheduled
  if (
    text.startsWith("[Interview Scheduled]:") ||
    text.includes("[Interview Scheduled]:") ||
    (text.includes("[System Notice]:") &&
      text.toLowerCase().includes("scheduled") &&
      !text.toLowerCase().includes("cancelled") &&
      !text.toLowerCase().includes("rescheduled"))
  ) {
    let title = "";
    let stage = "";
    let date = "";
    let time = "";
    let type = "";
    let loc = "";
    let notes = "";

    const titleMatch = text.match(/\[Interview Scheduled\]:\s*(.*?)(?:\n|$)/i);
    if (titleMatch) title = titleMatch[1].trim();

    const stageMatch = text.match(/Stage:\s*(.*?)(?:\n|$)/i);
    if (stageMatch) stage = stageMatch[1].trim();

    const dateMatch = text.match(/Date:\s*(.*?)(?:\n|$)/i);
    if (dateMatch) date = dateMatch[1].trim();

    const timeMatch = text.match(/Time:\s*(.*?)(?:\n|$)/i);
    if (timeMatch) time = timeMatch[1].trim();

    const typeMatch = text.match(/Type:\s*(.*?)(?:\n|$)/i);
    if (typeMatch) type = typeMatch[1].trim();

    const locMatch = text.match(/(?:Location\/Link|Location):\s*(.*?)(?:\n|$)/i);
    if (locMatch) loc = locMatch[1].trim();

    const notesMatch = text.match(/Notes:\s*(.*?)$/i);
    if (notesMatch) notes = notesMatch[1].trim();

    return {
      type: "interview_scheduled",
      jobTitle: title || "Interview",
      stage: stage || "Technical Evaluation",
      date,
      time,
      interviewType: type || "On-Site",
      location: loc,
      notes,
      cleanBody: text,
    };
  }

  // 4. Interview Cancelled
  if (
    text.startsWith("[Interview Cancelled]:") ||
    text.includes("[Interview Cancelled]:") ||
    (text.includes("[System Notice]:") && text.toLowerCase().includes("was cancelled"))
  ) {
    let title = "";
    let origSchedule = "";
    let reason = "";

    const titleMatch = text.match(/\[Interview Cancelled\]:\s*(.*?)(?:\n|$)/i);
    if (titleMatch) title = titleMatch[1].trim();

    const schedMatch =
      text.match(/Original Schedule:\s*(.*?)(?:\n|$)/i) ||
      text.match(/scheduled for\s*(.*?)\s*was cancelled/i);
    if (schedMatch) origSchedule = schedMatch[1].trim();

    const reasonMatch =
      text.match(/Reason:\s*["']?(.*?)["']?\.?$/im) ||
      text.match(/Reason:\s*(.*?)$/im);
    if (reasonMatch) {
      reason = reasonMatch[1].trim().replace(/^["']|["']\.?$/g, "").trim();
    }

    return {
      type: "interview_cancelled",
      jobTitle: title || "Interview",
      date: origSchedule,
      reason: reason || "Interviewer unavailable",
      cleanBody: text,
    };
  }

  // 5. Interview Rescheduled
  if (
    text.startsWith("[Interview Rescheduled]:") ||
    text.includes("[Interview Rescheduled]:") ||
    (text.includes("[System Notice]:") && text.toLowerCase().includes("has been rescheduled"))
  ) {
    let title = "";
    let newSched = "";
    let type = "";
    let loc = "";
    let notes = "";

    const titleMatch = text.match(/\[Interview Rescheduled\]:\s*(.*?)(?:\n|$)/i);
    if (titleMatch) title = titleMatch[1].trim();

    const schedMatch =
      text.match(/New Schedule:\s*(.*?)(?:\n|$)/i) ||
      text.match(/rescheduled to\s*(.*?)\./i);
    if (schedMatch) newSched = schedMatch[1].trim();

    const typeMatch = text.match(/Type:\s*(.*?)(?:\n|$)/i);
    if (typeMatch) type = typeMatch[1].trim();

    const locMatch = text.match(/(?:Location\/Link|Location):\s*(.*?)(?:\n|$)/i);
    if (locMatch) loc = locMatch[1].trim();

    const notesMatch =
      text.match(/(?:Reason|Notes|Reason for rescheduling):\s*["']?(.*?)["']?\.?$/im) ||
      text.match(/(?:Reason|Notes|Reason for rescheduling):\s*["']?(.*?)["']?(?:\n|$)/im) ||
      text.match(/Notes:\s*(.*?)$/i);
    if (notesMatch) {
      notes = notesMatch[1].trim().replace(/^["']|["']\.?$/g, "").trim();
    }

    return {
      type: "interview_rescheduled",
      jobTitle: title || "Interview",
      date: newSched,
      interviewType: type || "On-Site",
      location: loc,
      notes: notes || "I have a prior commitment at the original interview time. Requested schedule adjustment.",
      reason: notes || "I have a prior commitment at the original interview time. Requested schedule adjustment.",
      cleanBody: text,
    };
  }

  // 6. Interview Reschedule Request
  if (
    text.startsWith("[Meeting Reschedule Request]:") ||
    text.startsWith("[Interview Reschedule Request]:") ||
    (text.includes("[System Notice]:") && text.toLowerCase().includes("wants to reschedule the meeting"))
  ) {
    let title = "";
    let interviewId: number | undefined;
    let date = "";
    let time = "";
    let reason = "";

    const titleMatch = text.match(/\[(?:Meeting|Interview) Reschedule Request\]:\s*(.*?)(?:\n|$)/i);
    if (titleMatch) title = titleMatch[1].trim();

    const idMatch = text.match(/Interview ID:\s*(\d+)/i);
    if (idMatch) interviewId = parseInt(idMatch[1], 10);

    const dateMatch = text.match(/Date:\s*(.*?)(?:\n|$)/i);
    if (dateMatch) date = dateMatch[1].trim();

    const timeMatch = text.match(/Time:\s*(.*?)(?:\n|$)/i);
    if (timeMatch) time = timeMatch[1].trim();

    const reasonMatch = text.match(/Reason:\s*["']?(.*?)["']?\.?$/im);
    if (reasonMatch) reason = reasonMatch[1].trim();

    return {
      type: "interview_reschedule_request",
      jobTitle: title || "Interview",
      interviewId,
      date,
      time,
      reason: reason || "The candidate requested to reschedule this meeting.",
      cleanBody: text,
    };
  }

  return {
    type: "plain",
    cleanBody: text,
  };
}
