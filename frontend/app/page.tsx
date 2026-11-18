"use client";

import {
  AlertCircle,
  Archive,
  ArrowUp,
  BarChart3,
  CheckCheck,
  ChevronRight,
  FileText,
  Hash,
  Link2,
  Loader2,
  Lock,
  Maximize2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Mic,
  Microscope,
  Minimize2,
  MoreVertical,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  Star,
  TriangleAlert,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "@/components/ThemeProvider";
const API =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const USER_ID = "d966b8fa-4a1f-48a8-a71d-3ad3cc76971a";
const PAPER_ID = "fce118f6-84ab-4429-8d58-d1fdbc280701";

const INITIAL_CONVERSATION_ID =
  "1f83eddb-6d64-45fe-8f58-ae93c28e6906";

const ACTIVE_CONVERSATION_KEY = "researchpilot_active_conversation_id";
const MAX_PDF_SIZE = 20 * 1024 * 1024;
const MAX_PAPER_UPLOADS = 8;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  sources?: Source[];
};

type Source = {
  chunk_index?: number;
  page_number?: number;
  [key: string]: unknown;
};

type Paper = {
  id: string;
  title: string;
  pdf_url?: string | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
  resultIndex?: number;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type Conversation = {
  id: string;
  user_id: string;
  paper_id?: string | null;
  paper_ids?: string[];
  title: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  archived_at?: string | null;
  messages: Message[];
  last_message?: Message | null;
  unreadCount?: number;
};

const initialConversation: Conversation = {
  id: INITIAL_CONVERSATION_ID,
  user_id: USER_ID,
  paper_id: PAPER_ID,
  title: "AI-assisted research workspace",
  created_at: "",
  updated_at: "",
  messages: [],
  unreadCount: 0,
};

const suggestedQuestions = [
  {
    icon: Search,
    text: "What is the main research problem?",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: BarChart3,
    text: "Summarize the key findings.",
    color: "from-purple-500 to-pink-400",
  },
  {
    icon: Microscope,
    text: "Explain the methodology.",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: TriangleAlert,
    text: "What are the limitations?",
    color: "from-orange-500 to-red-400",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatTime(date?: string) {
  if (!date) return "";

  try {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                     */
/* -------------------------------------------------------------------------- */

function Avatar({
  name,
  size = "md",
  gradient = "from-violet-500 to-fuchsia-500",
  status,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  gradient?: string;
  status?: "online" | "offline" | "away" | "busy";
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
  };

  const statusColors = {
    online: "bg-emerald-400",
    offline: "bg-slate-500",
    away: "bg-yellow-400",
    busy: "bg-red-400",
  };

  return (
    <div className="relative shrink-0">
      <div
        className={`${sizes[size]} flex items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} font-bold text-white shadow-lg shadow-violet-500/20 transition-transform duration-300 hover:scale-105`}
      >
        {name.charAt(0).toUpperCase()}
      </div>

      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#080b14] ${statusColors[status]}`}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

function ActionButton({
  children,
  variant = "secondary",
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30",
    secondary:
      "border border-white/10 bg-white/[0.05] text-slate-200 hover:border-violet-500/30 hover:bg-white/[0.09]",
    ghost:
      "text-slate-400 hover:bg-white/[0.05] hover:text-white",
    danger:
      "border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Message bubble                                                             */
/* -------------------------------------------------------------------------- */

function MessageBubble({
  message,
  onOpenSource,
}: {
  message: Message;
  onOpenSource: (source: Source) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`group flex gap-3 ${
        isUser ? "justify-end" : "justify-start"
      } animate-message-in`}
    >
      {!isUser && (
        <Avatar
          name="R"
          size="sm"
          gradient="from-cyan-500 to-blue-600"
        />
      )}

      <div
        className={`relative max-w-[88%] md:max-w-[78%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-3xl px-5 py-4 text-sm leading-7 ${
            isUser
              ? "chat-user-bubble text-[15px] font-medium"
              : "chat-assistant-bubble text-[14px]"
          }`}
        >
          {!isUser && (
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
              <span className="text-cyan-400">
                ResearchPilot
              </span>
              <span className="h-1 w-1 rounded-full bg-cyan-400" />
              <span className="text-slate-500">AI</span>

            </div>
          )}

          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ children }) => <h1 className="mb-3 text-xl font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-3 text-lg font-semibold">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
                a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">{children}</a>,
                code: ({ children, className }) =>
                  className ? <code className="block overflow-x-auto rounded-xl bg-black/35 p-3 font-mono text-xs text-cyan-100">{children}</code> : <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-cyan-100">{children}</code>,
                table: ({ children }) => <div className="mb-3 overflow-x-auto"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
                th: ({ children }) => <th className="border border-white/10 bg-white/5 p-2">{children}</th>,
                td: ({ children }) => <td className="border border-white/10 p-2">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {message.sources.map((source, index) => (
                <button type="button" key={`${source.page_number ?? "p"}-${source.chunk_index ?? index}`} onClick={() => onOpenSource(source)} className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-medium text-cyan-200 transition hover:bg-cyan-400/15">
                  Page {source.page_number ?? "–"} · Chunk {source.chunk_index ?? "–"}
                </button>
              ))}
            </div>
          )}

          <div
            className={`mt-2 flex items-center gap-1 text-[9px] ${
              isUser ? "chat-user-time" : "text-slate-600"
            }`}
          >
            {formatTime(message.created_at)}

            {isUser && (
              <CheckCheck
                size={12}
                className="text-cyan-300"
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({
  onQuestion,
}: {
  onQuestion: (question: string) => void;
}) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-7">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />

        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-3xl shadow-2xl shadow-blue-500/20">
          <Sparkles />
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
        Conversation ready
      </div>

      <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
        What would you like to know?
      </h2>

      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
        Ask about a research paper or start a general conversation.
        Research answers use document evidence; general answers use
        AI knowledge and do not claim unsupported paper citations.
      </p>

      <div className="mt-6 grid w-full max-w-2xl gap-3 md:grid-cols-3">
        {[
          { label: "Citations", value: "128", accent: "cyan" },
          { label: "Relevance", value: "91%", accent: "violet" },
          { label: "Insights", value: "24", accent: "emerald" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-white/[0.045]"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid w-full max-w-2xl gap-3 md:grid-cols-2">
        {suggestedQuestions.map(
          ({ icon: Icon, text, color }) => (
            <button
              type="button"
              key={text}
              onClick={() => onQuestion(text)}
              className="suggestion-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.045] hover:shadow-2xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.07]`}
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <Icon
                    aria-hidden="true"
                    size={28}
                    strokeWidth={1.8}
                    className="suggestion-card-icon text-indigo-600"
                  />

                  <ArrowUp
                    size={15}
                    className="suggestion-card-arrow -rotate-45 text-indigo-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </div>

                <div className="suggestion-card-label mt-4 text-sm font-semibold transition">
                  {text}
                </div>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
}

function PreferenceToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="preference-toggle h-6 w-11 shrink-0 rounded-full p-1 transition"
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsScreen({
  onClose,
  enterToSend,
  setEnterToSend,
  autoScroll,
  setAutoScroll,
  voiceInputEnabled,
  setVoiceInputEnabled,
  theme,
  setTheme,
}: {
  onClose: () => void;
  enterToSend: boolean;
  setEnterToSend: () => void;
  autoScroll: boolean;
  setAutoScroll: () => void;
  voiceInputEnabled: boolean;
  setVoiceInputEnabled: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}) {
  return (
    <section className="settings-screen fixed inset-0 z-[100] overflow-y-auto">
      <div className="mx-auto min-h-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-8 flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Workspace</p>
            <h2 className="mt-2 text-2xl font-bold">Settings</h2>
            <p className="mt-2 text-sm text-slate-400">Customize your ResearchPilot workspace.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
<section className="settings-card rounded-3xl border border-white/10 bg-slate-950/70 p-6">
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
    Appearance
  </p>

  <div className="mt-4">
    <p className="text-sm font-medium text-white">
      Theme
    </p>

    <p className="mt-1 text-xs text-slate-500">
      Choose how ResearchPilot should appear.
    </p>

    <div className="mt-4 grid grid-cols-3 gap-2">
      {(["light", "dark", "system"] as const).map(
        (option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            aria-pressed={theme === option}
            className="theme-option rounded-xl border px-3 py-3 text-sm font-medium capitalize transition"
          >
            {option}
          </button>
        )
      )}
    </div>
  </div>
</section>

          <section className="settings-card rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Voice</p>
            <div className="mt-4">
              <PreferenceToggle checked={voiceInputEnabled} onChange={setVoiceInputEnabled} label="Voice input" description="Use your microphone to write messages." />
            </div>
          </section>

          <section className="settings-card rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chat</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PreferenceToggle checked={enterToSend} onChange={setEnterToSend} label="Enter to send" description="Press Enter to send messages; use Shift + Enter for a new line." />
              <PreferenceToggle checked={autoScroll} onChange={setAutoScroll} label="Auto scroll" description="Follow new messages automatically." />
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-violet-400">Done</button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const { theme, setTheme } = useTheme();

  const [conversation, setConversation] =
    useState<Conversation | null>(initialConversation);

  const [conversations, setConversations] = useState<
    Conversation[]
  >([initialConversation]);
  const [showSettings, setShowSettings] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [aiProviderConfigured, setAiProviderConfigured] = useState(false);

  const [mobileSidebar, setMobileSidebar] =
    useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(310);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resizingSidebar, setResizingSidebar] = useState(false);

  const [showDetails, setShowDetails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [conversationView, setConversationView] = useState<"active" | "archived">("active");
  const [saved, setSaved] = useState(false);

  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper>({
    id: PAPER_ID,
    title: initialConversation.title,
  });
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const inputRef =
    useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const voiceBaseInputRef = useRef("");
  const voiceCommittedTextRef = useRef("");

  function toggleSidebarVisibility() {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobileSidebar((visible) => !visible);
      return;
    }

    setSidebarCollapsed((collapsed) => !collapsed);
  }

  useEffect(() => {
    if (!resizingSidebar) return;

    const handlePointerMove = (event: PointerEvent) => {
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(Math.min(440, Math.max(240, event.clientX - sidebarLeft)));
    };
    const stopResizing = () => setResizingSidebar(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, [resizingSidebar]);

  /* ---------------------------------------------------------------------- */
  /* Backend health                                                         */
  /* ---------------------------------------------------------------------- */

  const checkBackend = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/health`, {
        cache: "no-store",
      });

      setBackendOnline(response.ok);
      if (response.ok) {
        const data = await response.json().catch(() => null);
        setAiProviderConfigured(Boolean(data?.ai?.configured));
      } else {
        setAiProviderConfigured(false);
      }
    } catch {
      setBackendOnline(false);
      setAiProviderConfigured(false);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Load conversation                                                       */
  /* ---------------------------------------------------------------------- */

  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(
          `${API}/api/conversations/${id}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return null;
        }

        const data = await response.json();

        const loaded: Conversation = {
          ...data,
          messages: Array.isArray(data.messages) ? data.messages : [],
          unreadCount: 0,
        };

        setConversation(loaded);
        localStorage.setItem(ACTIVE_CONVERSATION_KEY, loaded.id);

        if (loaded.paper_id) {
          fetch(`${API}/api/papers/${loaded.paper_id}`)
            .then((response) => response.ok ? response.json() : null)
            .then((paper) => paper && setSelectedPaper(paper))
            .catch(() => undefined);
        }

        setConversations((previous) => {
          const exists = previous.some(
            (item) => item.id === loaded.id
          );

          const updated = exists
            ? previous.map((item) =>
                item.id === loaded.id ? loaded : item
              )
            : [loaded, ...previous];

          return updated;
        });

        return loaded;
      } catch {
        setBackendOnline(false);
        return null;
      }
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Initial setup                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const healthCheckTimer = window.setTimeout(() => {
      void checkBackend();
    }, 0);

    fetch(`${API}/api/conversations?user_id=${USER_ID}`, { cache: "no-store" })
      .then(async (response) => {
        setBackendOnline(response.ok);
        return response.ok ? response.json() : [];
      })
      .then((items) => {
        const valid = Array.isArray(items)
          ? items.map((item) => ({
              ...item,
              messages: item.last_message ? [item.last_message] : [],
              unreadCount: 0,
            })) as Conversation[]
          : [];
        setConversations(valid);

        const activeId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        const storedActive = valid.find((item) => item.id === activeId);
        const active = storedActive || valid[0] || null;
        if (active) {
          void loadConversation(active.id);
        } else {
          setConversation(null);
        }
      })
      .catch(() => {
        setBackendOnline(false);
        setConversations([]);
        setConversation(null);
      });

    return () => window.clearTimeout(healthCheckTimer);
  }, [checkBackend, loadConversation]);

  /* ---------------------------------------------------------------------- */
  /* Auto scroll                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!autoScroll) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [autoScroll, conversation?.messages, loading]);

  useEffect(() => {
    const syncFullscreenState = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setEmojiOpen(false);
      setShowSettings(false);
      setShowSources(false);
      setShowPdfViewer(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) setEmojiOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Create conversation                                                    */
  /* ---------------------------------------------------------------------- */

  async function createConversation(paperInput?: Paper | Paper[]): Promise<Conversation | null> {
    const papers = paperInput
      ? Array.isArray(paperInput) ? paperInput : [paperInput]
      : [];
    const primaryPaper = papers[0];

    try {
      const response = await fetch(
        `${API}/api/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: USER_ID,
            paper_id: primaryPaper?.id,
            paper_ids: papers.length ? papers.map((paper) => paper.id) : undefined,
            title: papers.length > 1
              ? `Comparison: ${papers.length} research papers`
              : primaryPaper?.title || "New Conversation",
          }),
        }
      );

      if (!response.ok) {
  const errorText = await response.text();

  console.error("CREATE CONVERSATION API ERROR:", {
    status: response.status,
    body: errorText,
  });

throw new Error(
  `Conversation creation failed (${response.status}): ${
    errorText || "Unknown error"
  }`
);
}

      const data = await response.json();

      const newConversation: Conversation = {
        ...data,
        messages: [],
        unreadCount: 0,
      };

      setConversations((previous) => {
        const updated = [
          newConversation,
          ...previous.filter(
            (item) => item.id !== newConversation.id
          ),
        ];

        return updated;
      });

      setConversation(newConversation);
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, newConversation.id);
      if (primaryPaper) setSelectedPaper(primaryPaper);
      setInput("");
      setSources([]);
      setShowSources(false);
      setMobileSidebar(false);
      return newConversation;
    } catch (error) {
      console.error(
        "Create conversation error:",
        error
      );

      alert(
  "Unable to create a conversation. Please check that the backend is running."
);
      return null;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Send message                                                           */
  /* ---------------------------------------------------------------------- */

  async function generatePaperSummary() {
    if (!conversation || loading) return;
    if (!conversation.paper_id && !selectedPaper.id) {
      alert("Upload or select a research paper before generating a summary.");
      return;
    }

    setLoading(true);
    try {
      const paperId = conversation.paper_id || selectedPaper.id;
      const response = await fetch(`${API}/api/papers/${paperId}/summary`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Summary failed (${response.status}).`);

      const summary = [
        data.summary && `**Summary**\n${data.summary}`,
        data.key_contributions && `**Key contributions**\n${data.key_contributions}`,
        data.methodology && `**Methodology**\n${data.methodology}`,
        data.limitations && `**Limitations**\n${data.limitations}`,
      ].filter(Boolean).join("\n\n");

      const assistantMessage: Message = {
        id: `summary-${Date.now()}`,
        role: "assistant",
        content: summary || "No summary was returned.",
        created_at: new Date().toISOString(),
        sources: [],
      };

      setConversation((previous) => previous ? {
        ...previous,
        messages: [...previous.messages, assistantMessage],
        updated_at: assistantMessage.created_at || new Date().toISOString(),
      } : previous);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not generate the summary.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();

    if (!message || loading) {
      return;
    }

    let activeConversation = conversation;

    if (!activeConversation || activeConversation.id === INITIAL_CONVERSATION_ID) {
      const created = await createConversation();
      if (!created) return;
      activeConversation = created;
    }

    if (!activeConversation) {
      return;
    }

    setInput("");
    setLoading(true);

    const tempId = `temp-${Date.now()}`;

    const temporaryMessage: Message = {
      id: tempId,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    setConversation((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        messages: [
          ...previous.messages,
          temporaryMessage,
        ],
      };
    });

    try {
      const response = await fetch(
        `${API}/api/conversations/${activeConversation.id}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "user",
            content: message,
          }),
        }
      );

if (!response.ok) {
  const errorText = await response.text();

  let detail = errorText;

  try {
    const parsed = JSON.parse(errorText);
    detail = parsed.detail || errorText;
  } catch {
    // Response wasn't JSON
  }

  console.error("Chat API error:", {
    endpoint: `${API}/api/conversations/${activeConversation.id}/chat`,
    status: response.status,
    detail,
    responseBody: errorText,
  });

  throw new Error(
    `Chat failed (${response.status}): ${detail}`
  );
}

      const data = await response.json();

      const realUserMessage: Message = {
        id: data.user_message.id,
        role: "user",
        content: data.user_message.content,
        created_at:
          data.user_message.created_at ||
          new Date().toISOString(),
      };

      const assistantMessage: Message = {
        id: data.assistant_message.id,
        role: "assistant",
        content: data.assistant_message.content,
        created_at:
          data.assistant_message.created_at ||
          new Date().toISOString(),
        sources: Array.isArray(data.assistant_message.sources) ? data.assistant_message.sources : data.sources || [],
      };

      setSources(Array.isArray(data.sources) ? data.sources : []);

      setConversation((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          messages: [
            ...previous.messages.filter(
              (item) => item.id !== tempId
            ),
            realUserMessage,
            assistantMessage,
          ],
          updated_at:
            assistantMessage.created_at ||
            previous.updated_at,
        };
      });

      setConversations((previous) => {
        const updated = previous.map((item) =>
          item.id === activeConversation.id
            ? {
                ...item,
                messages: [
                  ...item.messages.filter(
                    (msg) => msg.id !== tempId
                  ),
                  realUserMessage,
                  assistantMessage,
                ],
                updated_at:
                  assistantMessage.created_at ||
                  item.updated_at,
              }
            : item
        );

        return updated;
      });

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : `Request failed: ${String(error)}`;

      console.error("Chat error:", {
        message: errorMessage,
        api: API,
        conversationId: activeConversation.id,
        paperId: activeConversation.paper_id,
      });

      setConversation((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          messages: previous.messages.filter(
            (item) => item.id !== tempId
          ),
        };
      });

      alert(errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")
        ? `AI quota is temporarily exhausted. ${errorMessage}`
        : `Unable to get an answer. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Select conversation                                                    */
  /* ---------------------------------------------------------------------- */

  async function selectConversation(
    item: Conversation
  ) {
    setMobileSidebar(false);
    setConversation({
      ...item,
      unreadCount: 0,
    });

    setShowSources(false);
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, item.id);

    await loadConversation(item.id);
  }

  async function setConversationArchived(item: Conversation, archived: boolean) {
    try {
      const endpoint = archived ? "archive" : "unarchive";
      const response = await fetch(
        `${API}/api/conversations/${item.id}/${endpoint}?user_id=${USER_ID}`,
        { method: "POST" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Could not update conversation (${response.status}).`);
      }

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === item.id
            ? { ...conversation, archived, archived_at: archived ? new Date().toISOString() : null }
            : conversation
        )
      );

      if (archived && conversation?.id === item.id) {
        setConversation(null);
        localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
      }
      setConversationView(archived ? "archived" : "active");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update the conversation.");
    }
  }

  async function clearConversationHistory() {
    if (!conversations.length) return;
    if (!window.confirm("Clear all previous conversations? This cannot be undone.")) return;

    try {
      const response = await fetch(`${API}/api/conversations/clear?user_id=${USER_ID}`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Could not clear history (${response.status}).`);
      }
      setConversations([]);
      setConversation(null);
      localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
      setMobileSidebar(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not clear conversation history.");
    }
  }

  async function handlePdfUpload(files: FileList | File[]) {
    setUploadError("");
    setUploadState("idle");

    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    if (selectedFiles.length > MAX_PAPER_UPLOADS) {
      setUploadError(`You can compare up to ${MAX_PAPER_UPLOADS} papers at once.`);
      setUploadState("error");
      return;
    }

    const invalidFile = selectedFiles.find((file) =>
      file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
    );
    if (invalidFile) {
      setUploadError(`${invalidFile.name} is not a PDF file.`);
      setUploadState("error");
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_PDF_SIZE);
    if (oversizedFile) {
      setUploadError(`${oversizedFile.name} exceeds the 20 MB limit.`);
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API}/api/uploads/papers`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.files) || data.files.length !== selectedFiles.length) {
        throw new Error(data.detail || "Upload failed.");
      }

      const papers: Paper[] = data.files.map((uploaded: { paper_id: string; original_filename: string }) => ({
        id: uploaded.paper_id,
        title: uploaded.original_filename.replace(/\.pdf$/i, ""),
        pdf_url: `/api/papers/${uploaded.paper_id}/pdf`,
      }));
      await createConversation(papers);
      setUploadState("success");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      setUploadState("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openSource(source: Source) {
    setSelectedPage(source.page_number ?? null);
    setShowPdfViewer(true);
  }

  function toggleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    if (!voiceInputEnabled) {
      alert("Voice input is disabled in Settings.");
      return;
    }

    const browserWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    voiceBaseInputRef.current = input.trimEnd();
    voiceCommittedTextRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let finalTranscript = voiceCommittedTextRef.current;
      let interimTranscript = "";

      const firstResult = event.resultIndex ?? 0;
      for (let index = firstResult; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      voiceCommittedTextRef.current = finalTranscript;

      const spokenText = `${finalTranscript}${interimTranscript}`.trim();
      const base = voiceBaseInputRef.current.trimEnd();
      setInput(base ? `${base} ${spokenText}`.trim() : spokenText);
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => {
      const base = voiceBaseInputRef.current.trimEnd();
      const committed = voiceCommittedTextRef.current.trim();
      setInput(base ? `${base} ${committed}`.trim() : committed);
      setIsRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen mode could not be changed:", error);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Search                                                                  */
  /* ---------------------------------------------------------------------- */

  const filteredConversations =
    conversations.filter((item) =>
      Boolean(item.archived) === (conversationView === "archived")
      && item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <main
      data-theme={theme}
      className={`research-app min-h-screen overflow-hidden ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      } ${
        resizingSidebar ? "sidebar-is-resizing" : ""
      } ${
        isFullscreen
          ? "fixed inset-0 z-50"
          : ""
      }`}
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[140px]" />

        <div className="absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />

        <div className="absolute bottom-[-250px] left-[40%] h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[150px]" />
      </div>

      {/* Sources modal */}
      {showSources && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f1b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                  <FileText size={14} />
                  Retrieved Sources
                </div>

                <h3 className="mt-1 text-lg font-semibold">
                  Paper sections used by ResearchPilot
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowSources(false)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Close retrieved sources"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              {sources.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-500">
                  Sources will appear here after you ask a
                  question.
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <div
                      key={`${source.chunk_index ?? index}-${source.page_number ?? index}`}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600">
                            <FileText size={14} />
                          </div>

                          <span className="text-sm font-medium text-white">
                            Source {index + 1}
                          </span>
                        </div>

                        {source.page_number !==
                          undefined && (
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                            Page {source.page_number}
                          </span>
                        )}
                      </div>

                      {source.chunk_index !==
                        undefined && (
                        <div className="mt-3 text-xs text-slate-500">
                          Chunk {source.chunk_index}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative flex h-screen min-w-0 overflow-hidden">
        {mobileSidebar && (
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={() => setMobileSidebar(false)}
            className="mobile-sidebar-backdrop fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
          />
        )}

        <button
          type="button"
          onClick={toggleSidebarVisibility}
          style={{
            left: sidebarCollapsed ? 12 : Math.max(12, sidebarWidth - 52),
          }}
          className="workspace-sidebar-toggle sidebar-toggle hidden rounded-xl p-2 transition lg:flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Close sidebar"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="conversation-sidebar"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar                                                          */}
        {/* ---------------------------------------------------------------- */}

        <aside
          id="conversation-sidebar"
          ref={sidebarRef}
          style={{ width: sidebarCollapsed ? 64 : sidebarWidth }}
          className={`research-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-white/[0.07] bg-[#080b14]/95 backdrop-blur-2xl transition-[transform,width] duration-300 lg:relative lg:translate-x-0 ${
            sidebarCollapsed ? "sidebar-collapsed" : ""
          } ${
            mobileSidebar
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="sidebar-brand flex h-[82px] shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
            <div className="flex items-center gap-3">
              <div className="sidebar-brand-mark relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
                <img
                  src="/researchpilot-logo.png?v=5"
                  alt="ResearchPilot"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <div className="text-[16px] font-bold tracking-tight">
                  ResearchPilot
                </div>

                <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                  AI Research Workspace
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileSidebar(false)}
              className="mobile-sidebar-close rounded-xl p-2 text-slate-500 transition hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close conversation history"
            >
              <X size={20} />
            </button>

          </div>

          {/* New conversation */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => void createConversation()}
              className="new-conversation-button group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.02] px-4 py-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-violet-500/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
                  <Plus size={18} />
                </div>

                <div>
                  <div className="new-conversation-title text-sm font-semibold">
                    New conversation
                  </div>
                  <div className="new-conversation-subtitle text-[10px]">
                    Start a fresh research session
                  </div>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-400"
              />
            </button>
          </div>

          {/* Search conversations */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 transition focus:border-violet-500/30"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="conversation-list flex-1 overflow-y-auto px-3">
            <div className="conversation-view-switch mb-3 grid grid-cols-2 gap-1 rounded-xl p-1" role="tablist" aria-label="Conversation view">
              <button
                type="button"
                role="tab"
                aria-selected={conversationView === "active"}
                onClick={() => setConversationView("active")}
                className="conversation-view-button"
              >
                Active
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={conversationView === "archived"}
                onClick={() => setConversationView("archived")}
                className="conversation-view-button"
              >
                Archive
              </button>
            </div>
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Conversations
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void clearConversationHistory()}
                  disabled={!conversations.length}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Clear conversation history"
                  title="Clear conversation history"
                >
                  <Trash2 size={13} />
                </button>
                <MessageSquare size={13} className="text-slate-600" />
              </div>
            </div>

            <div className="space-y-1.5">
              {filteredConversations.map((item) => {
                const active =
                  conversation?.id === item.id;

                const lastMessage =
                  item.messages?.[
                    item.messages.length - 1
                  ];

                return (
                  <div
                    key={item.id}
                    className={`conversation-item group relative w-full rounded-2xl border p-3 text-left transition-all duration-300 ${
                      active
                        ? "border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.08] via-blue-500/[0.06] to-violet-500/[0.08] shadow-lg shadow-cyan-500/5"
                        : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.025]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void selectConversation(item)}
                      className="conversation-main-button flex w-full items-center gap-3 text-left"
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/20"
                            : "bg-white/[0.06]"
                        }`}
                      >
                        {active ? (
                          <Zap size={17} />
                        ) : (
                          <MessageSquare size={17} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="conversation-title truncate text-[13px] font-medium text-slate-200">
                          {item.title}
                        </div>

                        <div className="conversation-subtitle mt-1 truncate text-[10px]">
                          {lastMessage
                            ? lastMessage.content
                            : "No messages yet"}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void setConversationArchived(item, !Boolean(item.archived));
                      }}
                      className="conversation-archive-button absolute right-2 top-2 rounded-lg p-1.5 opacity-0 transition"
                      aria-label={item.archived ? "Unarchive conversation" : "Archive conversation"}
                      title={item.archived ? "Unarchive" : "Archive"}
                    >
                      {item.archived ? <ChevronRight size={13} /> : <Archive size={13} />}
                    </button>
                  </div>
                );
              })}

              {filteredConversations.length ===
                0 && (
                <div className="px-3 py-8 text-center text-xs text-slate-600">
                  No conversations found.
                </div>
              )}
            </div>
          </div>

          {/* User profile */}
          <div className="border-t border-white/[0.07] p-4">
              <div className="sidebar-profile flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="sidebar-profile-mark relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <UserRound size={18} strokeWidth={2} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--app-sidebar)] bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  Researcher
                </div>
                <div className="text-[10px] text-slate-600">
                  Local workspace
                </div>
              </div>

<button
  type="button"
  onClick={() => setShowSettings(true)}
  className="rounded-xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
  aria-label="Open settings"
>
  <Settings size={15} />
</button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <button
              type="button"
              aria-label="Resize sidebar"
              onPointerDown={(event) => {
                event.preventDefault();
                setResizingSidebar(true);
              }}
              className={`sidebar-resize-handle absolute right-0 top-0 h-full w-3 translate-x-1/2 cursor-col-resize ${resizingSidebar ? "sidebar-is-resizing" : ""}`}
            />
          )}
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* Main area                                                        */}
        {/* ---------------------------------------------------------------- */}

        <section className={`workspace-panel relative flex min-w-0 flex-1 flex-col overflow-hidden ${sidebarCollapsed ? "sidebar-collapsed-workspace" : ""}`}>
          {/* Header */}
          <header className="flex h-[82px] shrink-0 items-center border-b border-white/[0.07] bg-[#080b14]/80 px-4 backdrop-blur-2xl lg:px-6">
            <button
              type="button"
              onClick={() =>
                setMobileSidebar(true)
              }
              className="mr-3 rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Open conversation history"
              aria-expanded={mobileSidebar}
              aria-controls="conversation-sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="paper-header-icon hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 sm:flex">
                <FileText size={18} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-400">
                  Research Paper
                  <span className="text-slate-700">
                    /
                  </span>
                  <span className="text-slate-600">
                        ResearchPilot
                  </span>
                </div>

                <h1 className="truncate text-base font-bold text-white md:text-lg">
                  {selectedPaper.title || conversation?.title || "ResearchPilot AI"}
                </h1>
              </div>
            </div>

            <div className="mr-2 hidden items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/[0.06] px-3 py-1.5 sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]"
                    : "bg-red-400"
                }`}
              />

              <span className="text-[10px] font-medium text-slate-300">
                {backendOnline
                  ? "Backend connected"
                  : "Backend offline"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setShowSources(true)
                }
                className="hidden rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-400 transition hover:border-cyan-500/20 hover:text-white md:flex md:items-center md:gap-2"
              >
                <FileText size={14} />
                Sources
              </button>

              <button
                type="button"
                onClick={() =>
                  setSaved((value) => !value)
                }
                aria-label={saved ? "Remove saved conversation" : "Save conversation"}
                aria-pressed={saved}
                className={`rounded-xl p-2.5 transition ${
                  saved
                    ? "text-yellow-400"
                    : "text-slate-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Star
                  size={17}
                  fill={
                    saved ? "currentColor" : "none"
                  }
                />
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-white/5 hover:text-white sm:block"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 size={17} />
                ) : (
                  <Maximize2 size={17} />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowDetails(
                    (value) => !value
                  )
                }
                className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-white/5 hover:text-white xl:block"
                aria-label={showDetails ? "Hide paper details" : "Show paper details"}
                aria-expanded={showDetails}
              >
                <MoreVertical size={17} />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Chat */}
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
                <div className="mx-auto w-full max-w-[900px]">
                  <div className="mb-6 flex justify-center">
                    <div className="rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-1.5 text-[9px] uppercase tracking-[0.18em] text-slate-600 backdrop-blur-xl">
                      Today
                    </div>
                  </div>

                  <div className="premium-hero mb-6 overflow-hidden rounded-[28px] border border-white/[0.10] bg-[linear-gradient(135deg,#163c45,#1f5b58,#4c7770)] p-6 shadow-[0_24px_60px_rgba(8,30,35,0.38)] backdrop-blur-xl">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="max-w-2xl">
                        <div className="premium-pill inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                          <Sparkles size={12} />
                          AI Research Copilot
                        </div>

                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-4xl">
                          Turn dense papers into clear,
                          actionable insight.
                        </h2>

                        <p className="premium-hero-copy mt-3 max-w-xl text-sm leading-6">
                          Ask follow-up questions, trace evidence to source passages,
                          and move from reading to real understanding with a calmer,
                          more guided research workflow.
                        </p>
                      </div>

                      <div className="grid w-full max-w-md grid-cols-3 gap-3">
                        {[
                          { label: "Recall", value: "94%" },
                          { label: "Speed", value: "2.1x" },
                          { label: "Focus", value: "High" },
                        ].map((metric) => (
                          <div
                            key={metric.label}
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-left shadow-[0_10px_30px_rgba(11,16,30,0.35)]"
                          >
                            <div className="premium-metric-label text-[9px] uppercase tracking-[0.18em]">
                              {metric.label}
                            </div>
                            <div className="mt-2 text-xl font-bold text-white">
                              {metric.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    {[
                      {
                        label: "Paper health",
                        value: "97%",
                        meta: "Indexed and ready",
                        tone: "cyan",
                      },
                      {
                        label: "Research depth",
                        value: "High",
                        meta: "Grounded retrieval",
                        tone: "violet",
                      },
                      {
                        label: "Workflow",
                        value: "Live",
                        meta: "Streaming answers",
                        tone: "emerald",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="workspace-stat-card rounded-3xl border border-white/[0.75] bg-white/[0.96] p-4 shadow-[0_14px_40px_rgba(8,11,20,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white"
                      >
                        <div className="workspace-stat-label text-[10px] font-semibold uppercase tracking-[0.2em]">
                          {stat.label}
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-2">
                          <span className="workspace-stat-value text-2xl font-bold">
                            {stat.value}
                          </span>
                          <span className="workspace-stat-meta rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[9px]">
                            {stat.meta}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!conversation ||
                  conversation.messages.length ===
                    0 ? (
                    <EmptyState
                      onQuestion={sendMessage}
                    />
                  ) : (
                    <div className="space-y-5">
                      {conversation.messages.map(
                        (message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            onOpenSource={openSource}
                          />
                        )
                      )}

                      {loading && (
                        <div className="flex items-start gap-3 animate-message-in">
                          <Avatar
                            name="R"
                            size="sm"
                            gradient="from-cyan-500 to-blue-600"
                          />

                          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.04] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:300ms]" />
                              </div>

                              <span className="text-xs text-slate-500">
                                ResearchPilot is thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div
                        ref={messagesEndRef}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-white/[0.07] bg-[#080b14]/90 px-4 py-4 backdrop-blur-2xl lg:px-8">
                <div className="mx-auto max-w-[900px]">
                  <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20 transition-all duration-300 focus-within:border-emerald-500/30 focus-within:bg-white/[0.035] focus-within:shadow-emerald-500/5">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) =>
                        setInput(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          enterToSend
                        ) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={conversation?.paper_id ? "Ask anything about this paper..." : "Ask anything — research or general questions..."}
                      rows={2}
                      disabled={loading}
                      className="min-h-[74px] w-full resize-none bg-transparent px-5 py-4 pr-32 text-sm leading-6 text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
                    />

                    <div className="absolute bottom-3 left-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload a PDF"
                        className="composer-action-button rounded-xl p-2 transition"
                      >
                        <Paperclip size={16} />
                      </button>

                      <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={(event) => {
                        if (event.target.files?.length) void handlePdfUpload(event.target.files);
                      }} />

                      <div ref={emojiPickerRef} className="relative">
                        <button type="button" onClick={() => setEmojiOpen((value) => !value)} className="rounded-xl p-2 text-slate-600 transition hover:bg-white/5 hover:text-white" aria-label="Add emoji">
                          <Smile size={16} />
                        </button>
                        {emojiOpen && <div className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-xl border border-white/10 bg-[#0b0f1b] p-2 shadow-xl">
                          {["😊", "📚", "🔍", "💡", "✅", "📄", "✨", "🤔"].map((emoji) => <button key={emoji} type="button" onClick={() => { setInput((previous) => previous + emoji); setEmojiOpen(false); inputRef.current?.focus(); }} className="rounded p-1 text-lg hover:bg-white/10">{emoji}</button>)}
                        </div>}
                      </div>

                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        disabled={!voiceInputEnabled}
                        aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                        className={`rounded-xl p-2 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
                          isRecording
                            ? "bg-red-500/20 text-red-400"
                            : "text-slate-600 hover:text-white"
                        }`}
                      >
                        <Mic size={16} />
                      </button>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <button
                        type="button"
                        onClick={() =>
                          sendMessage()
                        }
                        disabled={
                          !input.trim() ||
                          loading ||
                          !conversation
                        }
                        className="composer-send-button flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:translate-y-0"
                      >
                        {loading ? (
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Send size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isRecording && (
                    <div className="mt-2 flex items-center gap-2 px-2 text-xs text-red-400">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      Listening...
                    </div>
                  )}

                  {uploadState !== "idle" && <p className={`mt-2 px-2 text-xs ${uploadState === "error" ? "text-red-400" : uploadState === "success" ? "text-emerald-400" : "text-cyan-300"}`}>
                    {uploadState === "uploading" ? "Uploading and indexing your PDF…" : uploadState === "success" ? "PDF uploaded. Your new research conversation is ready." : uploadError}
                  </p>}

                  <div className="mt-2 flex items-center justify-center gap-2 text-[9px] text-slate-700">
                    <span>
                      Enter to send
                    </span>

                    <span>·</span>

                    <span>
                      Shift + Enter for new line
                    </span>

                    <span className="hidden items-center gap-1 md:flex">
                      ·
                      <Lock size={9} />
                      Grounded in paper sections
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Details panel                                                    */}
            {/* ---------------------------------------------------------------- */}

            {showDetails && (
              <aside className="paper-details-panel hidden w-[300px] shrink-0 border-l border-white/[0.07] bg-[#080b14]/70 xl:block">
                <div className="h-full overflow-y-auto p-5">
                  <div className="paper-details-header mb-5 flex items-center justify-between border-b border-white/[0.07] pb-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      Reading desk
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowDetails(false)
                      }
                      className="rounded-lg p-1 text-slate-600 hover:bg-white/5 hover:text-white"
                      aria-label="Hide paper details"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Paper card */}
                  <div className="paper-details-card mb-5 rounded-2xl border p-4">
                    <div className="paper-details-kicker mb-3 flex items-center justify-between text-[9px] font-semibold uppercase">
                      <span>Selected paper</span>
                      <span className="paper-format-label rounded-md px-2 py-1">PDF</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="paper-details-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <FileText size={19} />
                      </div>

                      <div className="min-w-0 pt-0.5">
                        <h2 className="paper-details-title text-[13px] font-semibold leading-5">
                          {selectedPaper.title}
                        </h2>
                        <p className="paper-details-meta mt-1 text-[10px]">
                          IIED · July 2026
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document stats */}
                  <div className="mb-6 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPdfViewer(true)}
                      aria-label="Open paper PDF"
                      className="paper-stat-card paper-stat-action rounded-2xl border p-4 text-left"
                    >
                      <div className="text-xl font-bold text-cyan-400">
                        PDF
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
                        Document
                      </div>
                    </button>

                    <div className="paper-stat-card rounded-2xl border p-4">
                      <div className="text-xl font-bold text-violet-400">
                        128
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
                        Chunks
                      </div>
                    </div>
                  </div>

                  {/* Topics */}
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      <Hash size={12} />
                      Topics
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        "Machine learning",
                        "Literature review",
                        "Research methods",
                        "Scientific insights",
                      ].map((topic) => (
                        <button
                          type="button"
                          key={topic}
                          onClick={() => void sendMessage(`Explain the paper's ${topic.toLowerCase()} in detail.`)}
                          aria-label={`Ask about ${topic}`}
                          className="paper-topic-button rounded-full border px-3 py-1.5 text-[10px] transition"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      <Zap size={12} />
                      Quick actions
                    </div>

                    <div className="paper-quick-actions space-y-2">
                      <ActionButton
                        variant="primary"
                        className="paper-summary-action w-full"
                        onClick={() => void generatePaperSummary()}
                      >
                        <Sparkles size={15} />
                        Generate summary
                      </ActionButton>

                      <ActionButton
                        variant="secondary"
                        className="paper-sources-action w-full"
                        onClick={() =>
                          setShowSources(true)
                        }
                      >
                        <Link2 size={15} />
                        View sources
                      </ActionButton>

                      <ActionButton
                        variant="ghost"
                        className="paper-question-action w-full"
                        onClick={() =>
                          sendMessage(
                            "What is the main research problem addressed in this paper?"
                          )
                        }
                      >
                        <MessageSquare size={15} />
                        Research question
                      </ActionButton>
                    </div>
                  </div>

                  {/* Backend status */}
                  <div className="backend-status-card mt-8 rounded-2xl border p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          backendOnline
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {backendOnline ? (
                          <CheckCheck size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-300">
                          Backend
                        </div>

                        <div className="text-[10px] text-slate-600">
                          {backendOnline
                            ? (aiProviderConfigured ? "FastAPI + AI connected" : "FastAPI connected · Offline assistant active")
                            : "Connection unavailable"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void checkBackend()}
                        className="backend-retry rounded-lg p-2 transition"
                        aria-label="Retry backend connection"
                        title="Retry backend connection"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </section>
      </div>
{showSettings && (
  <SettingsScreen
    onClose={() => setShowSettings(false)}

    enterToSend={enterToSend}
    setEnterToSend={() =>
      setEnterToSend((value) => !value)
    }

    autoScroll={autoScroll}
    setAutoScroll={() =>
      setAutoScroll((value) => !value)
    }

    voiceInputEnabled={voiceInputEnabled}
    setVoiceInputEnabled={() =>
      setVoiceInputEnabled((value) => !value)
    }

    theme={theme}
    setTheme={setTheme}
  />
)}
      {showPdfViewer && (
        <div className="fixed inset-0 z-[110] bg-black/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f1b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div><p className="text-sm font-semibold">{selectedPaper.title}</p><p className="text-xs text-slate-500">{selectedPage ? `Requested page ${selectedPage}` : "PDF reader"}</p></div>
              <button type="button" onClick={() => setShowPdfViewer(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close PDF reader"><X size={18} /></button>
            </div>
            {selectedPaper.pdf_url ? <iframe title={`${selectedPaper.title} PDF`} src={`${API}${selectedPaper.pdf_url}${selectedPage ? `#page=${selectedPage}` : ""}`} className="min-h-0 flex-1 bg-white" /> : <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-400">A PDF file is not available for this paper.</div>}
          </div>
        </div>
      )}
    </main>
  );
}