import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Check, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

const SHEETDB_URL = "https://sheetdb.io/api/v1/98egmgei2fopp";

interface BuildAgentModalProps {
  open: boolean;
  onClose: () => void;
}

type Capability =
  | "Outbound"
  | "NLP"
  | "RAG"
  | "Automation"
  | "Analytics"
  | "Voice"
  | "Email"
  | "WebScrape"
  | "LLM"
  | "Integrations";

interface AgentTemplate {
  id: string;
  title: string;
  summary: string;
  category: keyof typeof CATEGORIES_MAP;
  capabilities: Capability[];
  popular?: boolean;
}

const CATEGORIES_MAP = {
  sales: { label: "Business & Sales", description: "Prospect, outreach, close" },
  ops: { label: "Productivity & Knowledge", description: "Notes, docs, projects" },
  dev: { label: "Developer & Technical", description: "Ship faster with AI" },
  learning: { label: "Education & Learning", description: "Teach and train" },
  finance: { label: "Finance & Legal", description: "Money, tax, docs" },
  wellness: { label: "Wellness & Lifestyle", description: "Life admin & coaching" },
  voice: { label: "Voice-Powered", description: "Phone agents & call AI" },
  marketing: { label: "Marketing & Growth", description: "Acquire users & scale" },
  industry: { label: "Operations & Industry", description: "Cross-industry use cases" },
  automation: { label: "AI + Automation", description: "Upgrade workflows" },
  custom: { label: "Custom Builder", description: "Your unique need" },
} as const;

type CategoryKey = keyof typeof CATEGORIES_MAP;

const TEMPLATES: AgentTemplate[] = [
  // Business & Sales
  { id: "sales-outreach", title: "Sales Outreach Agent", summary: "Automates LinkedIn/email campaigns & lead follow-ups.", category: "sales", capabilities: ["Outbound", "Email", "LLM", "Automation"] },
  { id: "customer-support", title: "Customer Support Agent", summary: "Answers FAQs, integrates with websites & CRMs.", category: "sales", capabilities: ["NLP", "RAG", "Email", "Integrations"] },
  { id: "recruiter", title: "Recruiter Agent", summary: "Screens resumes, automates candidate outreach.", category: "sales", capabilities: ["Automation", "LLM", "Integrations"] },
  { id: "ecommerce", title: "E-commerce Assistant Agent", summary: "Tracks orders, handles returns, chats with customers.", category: "sales", capabilities: ["Integrations", "LLM", "Automation"] },
  { id: "marketing-content", title: "Marketing Content Agent", summary: "Generates blog posts, social media posts, ad copies.", category: "sales", capabilities: ["LLM", "Analytics"] },
  { id: "crm-updater", title: "CRM Updater Agent", summary: "Syncs emails, calls, and leads into Salesforce/HubSpot.", category: "sales", capabilities: ["Automation", "Integrations"] },
  { id: "invoice-billing", title: "Invoice & Billing Agent", summary: "Generates invoices, sends reminders, reconciles payments.", category: "sales", capabilities: ["Automation", "Integrations", "Analytics"] },

  // Productivity & Knowledge
  { id: "meeting-notes", title: "Meeting Notes Agent", summary: "Transcribes calls, extracts action items, sends follow-ups.", category: "ops", capabilities: ["Voice", "Email", "LLM"] },
  { id: "research-analyst", title: "Research Analyst Agent", summary: "Summarizes market reports, competitor analysis.", category: "ops", capabilities: ["WebScrape", "LLM"] },
  { id: "data-insights", title: "Data Insights Agent", summary: "Turns CSV/Excel into charts, dashboards, summaries.", category: "ops", capabilities: ["Analytics", "LLM"] },
  { id: "project-manager", title: "Project Manager Agent", summary: "Creates tasks, assigns deadlines, tracks progress.", category: "ops", capabilities: ["Automation", "Integrations"] },
  { id: "knowledge-base", title: "Knowledge Base Agent", summary: "Answers company-specific questions using uploaded docs.", category: "ops", capabilities: ["RAG", "LLM"] },
  { id: "email-inbox", title: "Email Inbox Agent", summary: "Sorts, prioritizes, drafts replies automatically.", category: "ops", capabilities: ["Email", "Automation"] },
  { id: "document-drafting", title: "Document Drafting Agent", summary: "Generates contracts, reports, summaries on demand.", category: "ops", capabilities: ["LLM"] },

  // Developer & Technical
  { id: "qa-testing", title: "QA/Testing Agent", summary: "Generates & runs test cases for apps automatically.", category: "dev", capabilities: ["Automation", "LLM"] },
  { id: "code-reviewer", title: "Code Reviewer Agent", summary: "Reviews PRs, flags bugs, and suggests fixes.", category: "dev", capabilities: ["LLM", "Automation"] },
  { id: "devops", title: "DevOps Agent", summary: "Monitors servers, auto-scales infra, alerts on downtime.", category: "dev", capabilities: ["Automation", "Integrations"] },
  { id: "api-tester", title: "API Tester Agent", summary: "Runs scheduled API tests, mocks endpoints.", category: "dev", capabilities: ["Automation", "Analytics"] },
  { id: "bug-tracker", title: "Bug Tracker Agent", summary: "Reads bug reports, categorizes, and assigns priorities.", category: "dev", capabilities: ["Automation", "Integrations"] },
  { id: "release-notes", title: "Release Notes Agent", summary: "Auto-generates changelogs & deployment summaries.", category: "dev", capabilities: ["LLM"] },

  // Education
  { id: "tutor", title: "Tutor Agent", summary: "Explains math, coding, and science concepts step-by-step.", category: "learning", capabilities: ["LLM", "NLP"] },
  { id: "language-learning", title: "Language Learning Agent", summary: "Teaches via chat, quizzes, practice conversations.", category: "learning", capabilities: ["LLM", "NLP"] },
  { id: "exam-prep", title: "Exam Prep Agent", summary: "Creates mock tests & study guides.", category: "learning", capabilities: ["LLM", "Analytics"] },
  { id: "research-assistant", title: "Research Assistant Agent", summary: "Helps students summarize papers & citations.", category: "learning", capabilities: ["RAG", "LLM"] },
  { id: "creative-writing", title: "Creative Writing Agent", summary: "Helps with essays, stories, and assignments.", category: "learning", capabilities: ["LLM"] },

  // Finance
  { id: "budgeting", title: "Budgeting & Expense Agent", summary: "Categorizes expenses, suggests savings.", category: "finance", capabilities: ["Analytics", "LLM"] },
  { id: "tax-assistant", title: "Tax Assistant Agent", summary: "Answers tax questions, organizes receipts.", category: "finance", capabilities: ["LLM", "Integrations"] },
  { id: "investment-research", title: "Investment Research Agent", summary: "Summarizes stock/crypto market insights.", category: "finance", capabilities: ["Analytics", "LLM"] },
  { id: "contract-review", title: "Contract Review Agent", summary: "Explains clauses, flags risks in contracts.", category: "finance", capabilities: ["RAG", "LLM"] },
  { id: "loan-mortgage", title: "Loan & Mortgage Agent", summary: "Explains repayment options, compares lenders.", category: "finance", capabilities: ["Analytics", "LLM"] },

  // Wellness
  { id: "wellness-coach", title: "Wellness Coach Agent", summary: "Suggests fitness routines, tracks habits.", category: "wellness", capabilities: ["Automation", "LLM"] },
  { id: "nutritionist", title: "Nutritionist Agent", summary: "Creates meal plans based on preferences.", category: "wellness", capabilities: ["LLM"] },
  { id: "therapy-support", title: "Therapy Support Agent", summary: "Conversational mental health support (non-clinical).", category: "wellness", capabilities: ["NLP", "LLM"] },
  { id: "travel-planner", title: "Travel Planner Agent", summary: "Finds flights, hotels, and builds itineraries.", category: "wellness", capabilities: ["WebScrape", "LLM"] },
  { id: "personal-shopping", title: "Personal Shopping Agent", summary: "Finds best deals, recommends products.", category: "wellness", capabilities: ["WebScrape", "LLM"] },

  // Voice
  { id: "voice-outreach", title: "Voice Outreach Agent", summary: "Makes automated sales calls, books meetings.", category: "voice", capabilities: ["Voice", "Outbound"] },
  { id: "voice-support", title: "Voice Customer Support Agent", summary: "Answers inbound calls, handles FAQs.", category: "voice", capabilities: ["Voice", "RAG"] },
  { id: "call-transcription", title: "Call Transcription & Summary Agent", summary: "Records calls, transcribes, extracts insights.", category: "voice", capabilities: ["Voice", "LLM"] },
  { id: "voice-survey", title: "Voice Survey Agent", summary: "Conducts automated phone surveys, collects responses.", category: "voice", capabilities: ["Voice", "Analytics"] },
  { id: "voice-reminder", title: "Voice Reminder Agent", summary: "Calls customers with reminders.", category: "voice", capabilities: ["Voice", "Automation"] },

  // Marketing
  { id: "social-media", title: "Social Media Agent", summary: "Auto-posts, replies, grows followers.", category: "marketing", capabilities: ["Automation", "LLM"] },
  { id: "seo-agent", title: "SEO Agent", summary: "Analyzes website, suggests optimization.", category: "marketing", capabilities: ["Analytics", "WebScrape"] },
  { id: "ads-agent", title: "Ads Agent", summary: "Creates & optimizes ad campaigns.", category: "marketing", capabilities: ["Analytics", "LLM"] },
  { id: "lead-research", title: "Lead Research Agent", summary: "Scrapes web & social for new leads.", category: "marketing", capabilities: ["WebScrape", "Automation"] },
  { id: "influencer-outreach", title: "Influencer Outreach Agent", summary: "Finds and contacts influencers.", category: "marketing", capabilities: ["WebScrape", "Outbound"] },

  // Industry
  { id: "inventory-monitoring", title: "Inventory Monitoring Agent", summary: "Tracks stock levels, predicts restock needs.", category: "industry", capabilities: ["Analytics", "Automation"] },
  { id: "logistics", title: "Logistics Agent", summary: "Tracks shipments, delivery times, alerts delays.", category: "industry", capabilities: ["Automation", "Integrations"] },
  { id: "compliance", title: "Compliance Agent", summary: "Monitors regulations, flags risks.", category: "industry", capabilities: ["RAG", "LLM"] },
  { id: "healthcare", title: "Healthcare Assistant Agent", summary: "Appointment booking, reminders, prescriptions.", category: "industry", capabilities: ["Automation", "Integrations"] },
  { id: "real-estate", title: "Real Estate Agent Assistant", summary: "Scrapes listings, books showings, answers queries.", category: "industry", capabilities: ["WebScrape", "LLM"] },

  // Automation
  { id: "workflow-orchestrator", title: "Workflow Orchestrator Agent", summary: "Connects apps & automates.", category: "automation", capabilities: ["Automation", "Integrations"] },
  { id: "email-management", title: "Email Management Agent", summary: "Reads inbox, drafts replies, auto-categorizes.", category: "automation", capabilities: ["Email", "Automation"] },
  { id: "document-reviewer", title: "Document Reviewer Agent", summary: "Reviews PDFs, contracts, reports.", category: "automation", capabilities: ["RAG", "LLM"] },
  { id: "task-reminder", title: "Task & Reminder Agent", summary: "Manages to-dos, deadlines.", category: "automation", capabilities: ["Automation", "Integrations"] },
  { id: "customer-feedback", title: "Customer Feedback Agent", summary: "Monitors reviews/social mentions, summarizes sentiment.", category: "automation", capabilities: ["Analytics", "WebScrape"] },

  // Custom
  { id: "custom-agent", title: "Custom Agent Builder", summary: "Tell us your need, we’ll build it for you.", category: "custom", capabilities: ["LLM", "Integrations", "Automation"], popular: true },
];

const TONE_OPTIONS = ["Friendly", "Professional", "Persuasive", "Technical"] as const;
const INTEGRATIONS = ["Slack", "Gmail/Outlook", "HubSpot", "Salesforce", "Notion", "Google Sheets", "Stripe", "Twilio", "Zapier/n8n"];

export function BuildAgentModal({ open, onClose }: BuildAgentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [category, setCategory] = useState<CategoryKey | "">("");
  const [templateId, setTemplateId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [form, setForm] = useState({
    requirements: "",
    integrations: [] as string[],
    tone: "" as (typeof TONE_OPTIONS)[number] | "",
    customTitle: "",
    notes: "",
    userName: "",
    userEmail: "",
    userPhone: "",
    hostingOption: "" as "recurring_cloud" | "one_time_build" | "",
    planPrice: 0,
  });

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => (category ? t.category === category : true))
      .filter((t) => [t.title, t.summary].join(" ").toLowerCase().includes(search.toLowerCase()));
  }, [category, search]);

  const activeTemplate = useMemo(() => TEMPLATES.find((t) => t.id === templateId), [templateId]);

  async function handleSubmit() {
    setSubmitError(null);
    if (!form.userEmail) return setSubmitError("Email required");
    if (!form.userName) return setSubmitError("Name required");

    setSubmitting(true);
    const payload = {
      data: {
        id: crypto.randomUUID(),
        submitted_at: new Date().toISOString(),
        user_name: form.userName,
        user_email: form.userEmail,
        user_phone: form.userPhone,
        category,
        template_id: templateId || "custom-agent",
        template_title: activeTemplate?.title || form.customTitle || "Custom Agent",
        capabilities_json: JSON.stringify(activeTemplate?.capabilities ?? []),
        agent_name: form.customTitle || activeTemplate?.title || "Custom Agent",
        requirements: form.requirements,
        integrations_json: JSON.stringify(form.integrations),
        tone: form.tone,
        notes: form.notes,
        hosting_option: form.hostingOption,
        plan_price: form.planPrice,
      },
    };

    try {
      const res = await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitting(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      setSubmitError(e.message || "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-screen max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="sticky top-0 z-10 bg-card/95 shadow-sm p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5" /> Build Your Custom Agent
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("rounded-full border px-3 py-1 text-center", step >= i ? "border-primary bg-primary/10 font-medium" : "border-border text-muted-foreground")}>
                Step {i}
              </div>
            ))}
          </div>
          <Separator className="my-4" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {/* Step 1: Category */}
          {step === 1 && (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Choose a category:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(CATEGORIES_MAP) as CategoryKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={cn("text-left rounded-xl border p-4 hover:border-primary transition", category === key ? "border-primary bg-accent" : "border-border")}
                  >
                    <div className="font-medium">{CATEGORIES_MAP[key].label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{CATEGORIES_MAP[key].description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Template */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder='Search templates (e.g., "support", "voice")'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[320px] rounded-md border">
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTemplates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={cn("group cursor-pointer rounded-lg border p-4 hover:shadow-sm transition", templateId === t.id ? "border-primary bg-accent" : "border-border")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium leading-tight">{t.title}</div>
                          <p className="mt-1 text-xs text-muted-foreground">{t.summary}</p>
                        </div>
                        {t.popular && <Badge variant="secondary">Popular</Badge>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {t.capabilities.map((c) => (
                          <Badge key={c} variant="outline" className="text-[10px]">
                            {c}
                          </Badge>
                        ))}
                      </div>
                      {templateId === t.id && (
                        <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                          <Check className="h-3.5 w-3.5" /> Selected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 3 && (
            <div className="space-y-5">
              <Input placeholder="Agent name" value={form.customTitle} onChange={(e) => setForm({ ...form, customTitle: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Your name" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
                <Input placeholder="Email" type="email" value={form.userEmail} onChange={(e) => setForm({ ...form, userEmail: e.target.value })} />
                <Input placeholder="Phone" value={form.userPhone} onChange={(e) => setForm({ ...form, userPhone: e.target.value })} />
              </div>
              <Textarea placeholder="What should this agent do?" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((tone) => (
                  <Badge key={tone} variant={form.tone === tone ? "default" : "outline"} onClick={() => setForm({ ...form, tone })} className="cursor-pointer">
                    {tone}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2">
                <label>Hosting</label>
                <div className="flex flex-col gap-2">
                  <label>
                    <input type="radio" checked={form.hostingOption === "recurring_cloud"} onChange={() => setForm({ ...form, hostingOption: "recurring_cloud", planPrice: 49 })} /> Cloud ($49/mo)
                  </label>
                  <label>
                    <input type="radio" checked={form.hostingOption === "one_time_build"} onChange={() => setForm({ ...form, hostingOption: "one_time_build", planPrice: 399 })} /> One-time ($399)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
{step === 4 && (
  <div className="space-y-6">
    {!submitSuccess ? (
      <>
        <div className="font-bold text-lg">{form.customTitle || activeTemplate?.title}</div>
        <div className="text-sm text-muted-foreground">{form.requirements || "No requirements provided"}</div>
        <div className="text-sm">Email: <span className="font-medium">{form.userEmail}</span></div>
        <div className="text-sm">Hosting: <span className="font-medium">{form.hostingOption} (${form.planPrice})</span></div>
        {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
      </>
    ) : (
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
        <Check className="h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold">Your AI Agent is being prepared!</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Thanks <span className="font-medium">{form.userName}</span>, your custom agent <span className="font-medium">{form.customTitle || activeTemplate?.title}</span> is now in the works.  
          You’ll receive all setup details and next steps at <span className="font-medium">{form.userEmail}</span>.
        </p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    )}
  </div>
)}

        </div>

        <DialogFooter className="px-6 pb-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep((s) => (s + 1) as any)} disabled={step === 1 && !category}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-primary">
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BuildAgentModal;
