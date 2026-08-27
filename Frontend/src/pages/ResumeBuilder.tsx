import React, { ChangeEvent, useMemo, useState } from "react";
import "./ResumeBuilder.css";

type Resume = {
  personal: { name: string; email: string; phone: string; location: string; linkedin: string; website: string };
  summary: string;
  experience: { company: string; title: string; start: string; end: string; description: string[] }[];
  education: { institution: string; degree: string; start: string; end: string }[];
  skills: string[];
  projects: { name: string; description: string; url: string }[];
  certifications: string[];
};

const emptyResume: Resume = { personal: { name: "", email: "", phone: "", location: "", linkedin: "", website: "" }, summary: "", experience: [], education: [], skills: [], projects: [], certifications: [] };

export default function ResumeBuilder() {
  const [resume, setResume] = useState<Resume>(emptyResume);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Upload a PDF, DOCX, or text resume to begin.");
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<"ats" | "modern" | "executive">("ats");
  const contact = useMemo(() => [resume.personal.email, resume.personal.phone, resume.personal.location, resume.personal.linkedin, resume.personal.website].filter(Boolean).join("  •  "), [resume.personal]);

  async function uploadResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setLoading(true); setStatus("Extracting document text and building your structured resume…");
    try {
      const form = new FormData(); form.append("document", file);
      const response = await fetch("/api/resume/parse", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not parse that file.");
      setResume(data.resume); setStatus(data.source === "ai" ? "Parsed with AI. Review details, then export." : "Basic extraction complete. Add OPENAI_API_KEY to the backend for richer parsing.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not parse that file."); }
    finally { setLoading(false); }
  }

  function updatePersonal(field: keyof Resume["personal"], value: string) { setResume((current) => ({ ...current, personal: { ...current.personal, [field]: value } })); }

  return <main className="resume-builder-page">
    <header className="builder-header"><a href="/applicant-dashboard">← Candidate workspace</a><div><span>EliteCruit</span><h1>Resume Builder</h1></div><button onClick={() => window.print()} className="export-button" disabled={!resume.personal.name}>Export / Save PDF</button></header>
    <section className="builder-workspace">
      <aside className="builder-controls">
        <label className="upload-drop"><input type="file" accept=".pdf,.docx,.txt,.md" onChange={uploadResume} />{loading ? "Parsing…" : "Upload resume"}<small>{fileName || "PDF, DOCX, TXT (max 10 MB)"}</small></label>
        <p className="parse-status">{status}</p>
        <fieldset><legend>Template</legend><div className="template-row">{(["ats", "modern", "executive"] as const).map((item) => <button key={item} onClick={() => setTemplate(item)} className={template === item ? "selected" : ""}>{item}</button>)}</div></fieldset>
        <section className="editor-section"><h2>Personal details</h2>{(["name", "email", "phone", "location", "linkedin", "website"] as const).map((field) => <label key={field}>{field}<input value={resume.personal[field]} onChange={(e) => updatePersonal(field, e.target.value)} /></label>)}</section>
        <section className="editor-section"><h2>Professional summary</h2><textarea value={resume.summary} onChange={(e) => setResume({ ...resume, summary: e.target.value })} rows={5} /></section>
        <section className="editor-section"><h2>Skills</h2><textarea value={resume.skills.join(", ")} onChange={(e) => setResume({ ...resume, skills: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} rows={4} placeholder="React, Node.js, AWS" /></section>
      </aside>
      <section className="preview-surface"><article className={`resume-sheet ${template}`}>
        <header className="resume-title"><h1>{resume.personal.name || "Your Name"}</h1><p>{contact || "Email • Phone • Location • LinkedIn"}</p></header>
        {resume.summary && <ResumeSection title="Professional Summary"><p>{resume.summary}</p></ResumeSection>}
        {resume.experience.length > 0 && <ResumeSection title="Experience">{resume.experience.map((item, index) => <div className="resume-entry" key={index}><div><strong>{item.title}</strong><span>{item.company}</span></div><em>{[item.start, item.end].filter(Boolean).join(" – ")}</em>{item.description.map((line, lineIndex) => <p className="bullet" key={lineIndex}>{line}</p>)}</div>)}</ResumeSection>}
        {resume.education.length > 0 && <ResumeSection title="Education">{resume.education.map((item, index) => <div className="resume-entry" key={index}><div><strong>{item.degree}</strong><span>{item.institution}</span></div><em>{[item.start, item.end].filter(Boolean).join(" – ")}</em></div>)}</ResumeSection>}
        {resume.skills.length > 0 && <ResumeSection title="Skills"><p className="skills">{resume.skills.join(" · ")}</p></ResumeSection>}
        {resume.projects.length > 0 && <ResumeSection title="Projects">{resume.projects.map((item, index) => <div className="resume-entry" key={index}><strong>{item.name}</strong><p>{item.description}</p></div>)}</ResumeSection>}
        {resume.certifications.length > 0 && <ResumeSection title="Certifications"><p>{resume.certifications.join(" · ")}</p></ResumeSection>}
      </article></section>
    </section>
  </main>;
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="resume-section"><h2>{title}</h2>{children}</section>; }
