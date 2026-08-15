"use client";

import {
  AlertCircle,
  ArrowUp,
  CheckCheck,
  ChevronRight,
  FileText,
  Hash,
  Link2,
  Loader2,
  Lock,
  Maximize2,
  Menu,
  MessageSquare,
  Mic,
  Minimize2,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
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
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  last_message?: Message | null;
  unreadCount?: number;
};

const initialConversation: Conversation = {
  id: INITIAL_CONVERSATION_ID,
  user_id: USER_ID,
  paper_id: PAPER_ID,
  title: "Growing Your Internal Finance",
  created_at: "",
  updated_at: "",
  messages: [],
  unreadCount: 0,
};

const suggestedQuestions = [
  {
    icon: "🔍",
    text: "What is the main research problem?",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: "📊",
    text: "Summarize the key findings.",
    color: "from-purple-500 to-pink-400",
  },
  {
    icon: "🔬",
    text: "Explain the methodology.",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: "⚠️",
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
              ? "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600 text-white shadow-xl shadow-violet-900/20"
              : "border border-white/[0.07] bg-white/[0.035] text-slate-200 shadow-xl shadow-black/10 backdrop-blur-xl"
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
              remarkPlugins={[remarkGfm]}
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
              isUser ? "text-white/60" : "text-slate-600"
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
        Ask ResearchPilot anything about the selected
        research paper. Answers are grounded in retrieved
        sections from the document.
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-3 md:grid-cols-2">
        {suggestedQuestions.map(
          ({ icon, text, color }) => (
            <button
              type="button"
              key={text}
              onClick={() => onQuestion(text)}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.045] hover:shadow-2xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.07]`}
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{icon}</span>

                  <ArrowUp
                    size={15}
                    className="-rotate-45 text-slate-700 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400"
                  />
                </div>

                <div className="mt-4 text-sm font-medium text-slate-400 transition group-hover:text-white">
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
        className={`h-6 w-11 shrink-0 rounded-full p-1 transition ${
          checked ? "bg-indigo-500" : "bg-slate-700"
        }`}
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
    <section className="fixed inset-0 z-[100] overflow-y-auto bg-[#070a12] text-white">
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
<section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
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
            className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition ${
              theme === option
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                : "border-white/10 bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {option}
          </button>
        )
      )}
    </div>
  </div>
</section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Voice</p>
            <div className="mt-4">
              <PreferenceToggle checked={voiceInputEnabled} onChange={setVoiceInputEnabled} label="Voice input" description="Use your microphone to write messages." />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:col-span-2">
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

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  const [showDetails, setShowDetails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
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
  const inputRef =
    useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const voiceBaseInputRef = useRef("");

  /* ---------------------------------------------------------------------- */
  /* Backend health                                                         */
  /* ---------------------------------------------------------------------- */

  const checkBackend = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/health`, {
        cache: "no-store",
      });

      setBackendOnline(response.ok);
    } catch {
      setBackendOnline(false);
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
        const active = valid.find((item) => item.id === activeId) || valid[0];
        if (active) void loadConversation(active.id);
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

  async function createConversation(paper?: Paper) {
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
            paper_id: paper?.id || selectedPaper.id,
            title: paper ? paper.title : "New Conversation",
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
      if (paper) setSelectedPaper(paper);
      setInput("");
      setSources([]);
      setShowSources(false);
      setMobileSidebar(false);
    } catch (error) {
      console.error(
        "Create conversation error:",
        error
      );

      alert(
  "Unable to get an answer. Please check that the backend and RAG service are running."
);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Send message                                                           */
  /* ---------------------------------------------------------------------- */

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();

    if (!message || !conversation || loading) {
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
        `${API}/api/conversations/${conversation.id}/chat`,
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
    status: response.status,
    detail,
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
          item.id === conversation.id
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
      console.error("Chat error:", error);

      setConversation((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          messages: previous.messages.filter(
            (item) => item.id !== tempId
          ),
        };
      });

      alert(
        "Unable to get an answer. Please check that the backend and RAG service are running."
      );
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
    setConversation({
      ...item,
      unreadCount: 0,
    });

    setMobileSidebar(false);
    setShowSources(false);
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, item.id);

    await loadConversation(item.id);
  }

  async function handlePdfUpload(file: File) {
    setUploadError("");
    setUploadState("idle");

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please select a PDF file.");
      setUploadState("error");
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setUploadError("PDF must be 20 MB or smaller.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await fetch(`${API}/api/uploads/papers`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.files?.[0]?.paper_id) throw new Error(data.detail || "Upload failed.");

      const paper: Paper = {
        id: data.files[0].paper_id,
        title: file.name.replace(/\.pdf$/i, ""),
        pdf_url: `/api/papers/${data.files[0].paper_id}/pdf`,
      };
      await createConversation(paper);
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
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      const separator = voiceBaseInputRef.current ? " " : "";
      setInput(`${voiceBaseInputRef.current}${separator}${transcript.trimStart()}`);
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
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
      item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <main
      className={`min-h-screen overflow-hidden bg-[#070a12] text-white ${
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

      <div className="relative flex h-screen">
        {/* ---------------------------------------------------------------- */}
        {/* Sidebar                                                          */}
        {/* ---------------------------------------------------------------- */}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[310px] flex-col border-r border-white/[0.07] bg-[#080b14]/95 backdrop-blur-2xl transition-transform duration-300 lg:relative lg:translate-x-0 ${
            mobileSidebar
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-lg font-bold shadow-lg shadow-blue-500/20">
                R

                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#080b14] bg-emerald-400" />
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
              onClick={() =>
                setMobileSidebar(false)
              }
              className="rounded-xl p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* New conversation */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => void createConversation()}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.02] px-4 py-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-violet-500/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
                  <Plus size={18} />
                </div>

                <div>
                  <div className="text-sm font-semibold">
                    New conversation
                  </div>
                  <div className="text-[10px] text-slate-500">
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
          <div className="flex-1 overflow-y-auto px-3">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Conversations
              </span>

              <MessageSquare
                size={13}
                className="text-slate-600"
              />
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
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      selectConversation(item)
                    }
                    className={`group relative w-full rounded-2xl border p-3 text-left transition-all duration-300 ${
                      active
                        ? "border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.08] via-blue-500/[0.06] to-violet-500/[0.08] shadow-lg shadow-cyan-500/5"
                        : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
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
                        <div className="truncate text-[13px] font-medium text-slate-200">
                          {item.title}
                        </div>

                        <div className="mt-1 truncate text-[10px] text-slate-600">
                          {lastMessage
                            ? lastMessage.content
                            : "No messages yet"}
                        </div>
                      </div>
                    </div>
                  </button>
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
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <Avatar
                name="R"
                size="md"
                gradient="from-violet-500 to-fuchsia-600"
                status="online"
              />

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
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* Main area                                                        */}
        {/* ---------------------------------------------------------------- */}

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex h-[82px] shrink-0 items-center border-b border-white/[0.07] bg-[#080b14]/80 px-4 backdrop-blur-2xl lg:px-6">
            <button
              type="button"
              onClick={() =>
                setMobileSidebar(true)
              }
              className="mr-3 rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-400 sm:flex">
                <FileText size={18} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-400">
                  Research Paper
                  <span className="text-slate-700">
                    /
                  </span>
                  <span className="text-slate-600">
                    IIED
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
              >
                <MoreVertical size={17} />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="flex min-h-0 flex-1">
            {/* Chat */}
            <div className="relative flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
                <div className="mx-auto w-full max-w-[900px]">
                  <div className="mb-6 flex justify-center">
                    <div className="rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-1.5 text-[9px] uppercase tracking-[0.18em] text-slate-600 backdrop-blur-xl">
                      Today
                    </div>
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
                  <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20 transition-all duration-300 focus-within:border-violet-500/30 focus-within:bg-white/[0.035] focus-within:shadow-violet-500/5">
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
                      placeholder="Ask anything about this paper..."
                      rows={2}
                      disabled={loading}
                      className="min-h-[74px] w-full resize-none bg-transparent px-5 py-4 pr-32 text-sm leading-6 text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
                    />

                    <div className="absolute bottom-3 left-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload a PDF"
                        className="rounded-xl p-2 text-slate-600 transition hover:bg-white/5 hover:text-white"
                      >
                        <Paperclip size={16} />
                      </button>

                      <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handlePdfUpload(file);
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
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:translate-y-0"
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
              <aside className="hidden w-[300px] shrink-0 border-l border-white/[0.07] bg-[#080b14]/70 xl:block">
                <div className="h-full overflow-y-auto p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      Paper details
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowDetails(false)
                      }
                      className="rounded-lg p-1 text-slate-600 hover:bg-white/5 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Paper card */}
                  <div className="relative mb-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-cyan-500/[0.08] via-blue-500/[0.05] to-violet-500/[0.08] p-5">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />

                    <div className="relative">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-blue-500/20">
                        <FileText size={21} />
                      </div>

                      <h2 className="text-sm font-semibold leading-5 text-white">
                        {selectedPaper.title}
                      </h2>

                      <p className="mt-1 text-[10px] text-slate-500">
                        IIED · July 2026
                      </p>
                    </div>
                  </div>

                  {/* Document stats */}
                  <div className="mb-6 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="text-xl font-bold text-cyan-400">
                        PDF
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
                        Document
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
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
                        "Internal Finance",
                        "FFPOs",
                        "Savings",
                        "Finance",
                      ].map((topic) => (
                        <button
                          type="button"
                          key={topic}
                          className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-500 transition hover:border-cyan-500/20 hover:bg-cyan-500/[0.05] hover:text-cyan-300"
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

                    <div className="space-y-2">
                      <ActionButton
                        variant="primary"
                        className="w-full"
                        onClick={() =>
                          sendMessage(
                            "Give me a concise summary of this research paper."
                          )
                        }
                      >
                        <Sparkles size={15} />
                        Generate summary
                      </ActionButton>

                      <ActionButton
                        variant="secondary"
                        className="w-full"
                        onClick={() =>
                          setShowSources(true)
                        }
                      >
                        <Link2 size={15} />
                        View sources
                      </ActionButton>

                      <ActionButton
                        variant="ghost"
                        className="w-full"
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
                  <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
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

                      <div>
                        <div className="text-xs font-medium text-slate-300">
                          Backend
                        </div>

                        <div className="text-[10px] text-slate-600">
                          {backendOnline
                            ? "FastAPI connected"
                            : "Connection unavailable"}
                        </div>
                      </div>
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