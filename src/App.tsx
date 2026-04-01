import {
  useState,
  useEffect,
  useRef,
  Fragment,
  type MouseEvent,
  type ChangeEvent,
} from "react";
import {
  Plus,
  MessageSquare,
  Image as ImageIcon,
  Trash2,
  Settings,
  Moon,
  Sun,
  Send,
  Download,
  Loader2,
  Menu,
  X,
  ChevronLeft,
  Sparkles,
  BookOpen,
  User,
  Star,
  Newspaper,
  Brain,
  Calculator,
  Beaker,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Camera,
  Key,
  Mail,
  Lock,
  Mic,
  Search,
  Settings2,
  Wand2,
  ChevronDown,
  Code,
  Music,
  Video,
  Layout,
  GraduationCap,
  Zap,
  ShieldCheck,
  MapPin,
  Check,
  Paperclip,
  Triangle,
  Globe,
  Waves,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ThinkingLevel } from "@google/genai";
import { cn } from "@/lib/utils";
import {
  Chat,
  Message,
  AppState,
  UserProfile,
  Favorite,
  DailyDigest,
} from "@/types";
import {
  generateChatResponse,
  generateImage,
  solveMathProblem,
  generateDailyDigest,
  generateChatTitle,
} from "@/services/geminiService";
import { ScienceDiagram } from "@/components/ScienceDiagram";
import { Logo } from "@/components/Logo";
import { Auth } from "@/components/Auth";
import { Canvas } from "@/components/Canvas";

export default function App() {
  const [state, setState] = useState<AppState>({
    chats: [],
    currentChatId: null,
    messages: {},
    theme: "dark",
    view: "chat",
    user: null,
    favorites: [],
    mode: "general",
    selectedTools: [],
  });
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [mathProblem, setMathProblem] = useState("");
  const [mathSolution, setMathSolution] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(
    ThinkingLevel.HIGH,
  );
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro">("flash");
  const [useSearch, setUseSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<
    "chat" | "math" | "programming" | "image" | "learning" | "canvas"
  >("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (state.user) {
      fetchChats();
      fetchFavorites();
    } else {
      setState((prev) => ({
        ...prev,
        chats: [],
        favorites: [],
        messages: {},
        currentChatId: null,
      }));
    }
  }, [state.user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) return;
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        fetchProfile();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (state.currentChatId && !state.messages[state.currentChatId]) {
      fetchMessages(state.currentChatId);
    }
  }, [state.currentChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.currentChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({ ...prev, user: data }));
      } else {
        setState((prev) => ({ ...prev, user: null }));
      }
    } catch (e) {
      setState((prev) => ({ ...prev, user: null }));
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState((prev) => ({
      ...prev,
      user: null,
      view: "chat",
      currentChatId: null,
    }));
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user) return;
    const updatedUser = { ...state.user, ...updates };
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedUser),
    });
    setState((prev) => ({ ...prev, user: updatedUser }));
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          favorites: Array.isArray(data) ? data : [],
        }));
      }
    } catch (e) {
      console.error("Failed to fetch favorites:", e);
    }
  };

  const toggleFavorite = async (
    type: "chat" | "topic",
    targetId: string,
    title: string,
  ) => {
    const existing = state.favorites.find((f) => f.targetId === targetId);
    if (existing) {
      await fetch(`/api/favorites/${existing.id}`, { method: "DELETE" });
      setState((prev) => ({
        ...prev,
        favorites: prev.favorites.filter((f) => f.id !== existing.id),
      }));
    } else {
      const newFav: Favorite = {
        id: generateId(),
        userId: state.user?.id || "default",
        type,
        targetId,
        title,
      };
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFav),
      });
      setState((prev) => ({ ...prev, favorites: [...prev.favorites, newFav] }));
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          chats: Array.isArray(data) ? data : [],
        }));
      }
    } catch (e) {
      console.error("Failed to fetch chats:", e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/messages/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [chatId]: Array.isArray(data) ? data : [],
          },
        }));
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  const createNewChat = async () => {
    const id = generateId();
    const newChat: Chat = {
      id,
      title: "New Chat",
      createdAt: Date.now(),
    };
    await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChat),
    });
    setState((prev) => ({
      ...prev,
      chats: [newChat, ...prev.chats],
      currentChatId: id,
      view: "chat",
    }));
    setIsSidebarOpen(window.innerWidth > 768);
  };

  const deleteChat = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setState((prev) => ({
      ...prev,
      chats: prev.chats.filter((c) => c.id !== id),
      currentChatId: prev.currentChatId === id ? null : prev.currentChatId,
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let chatId = state.currentChatId;
    let isNewChat = false;
    if (!chatId) {
      isNewChat = true;
      const id = generateId();
      const newChat: Chat = { id, title: "New Chat", createdAt: Date.now() };
      await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChat),
      });
      setState((prev) => ({
        ...prev,
        chats: [newChat, ...prev.chats],
        currentChatId: id,
      }));
      chatId = id;
    }

    const userMsg: Message = {
      id: generateId(),
      chatId,
      role: "user",
      content: input,
      timestamp: Date.now(),
      type: "text",
    };

    setState((prev) => ({
      ...prev,
      messages: {
        ...prev.messages,
        [chatId!]: [...(prev.messages[chatId!] || []), userMsg],
      },
    }));
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userMsg),
      });

      // Generate title for new chat or if it's the first message
      const currentMessages = state.messages[chatId!] || [];
      const currentChat = state.chats.find((c) => c.id === chatId);
      if (
        isNewChat ||
        (currentMessages.length === 0 && currentChat?.title === "New Chat")
      ) {
        generateChatTitle(currentInput).then(async (title) => {
          await fetch(`/api/chats/${chatId}/title`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          setState((prev) => ({
            ...prev,
            chats: prev.chats.map((c) =>
              c.id === chatId ? { ...c, title } : c,
            ),
          }));
        });
      }

      if (state.view === "chat") {
        const history = (state.messages[chatId!] || [])
          .concat(userMsg)
          .map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
          }));

        let aiText = "";
        aiText = await generateChatResponse(history, state.user, {
          thinkingLevel,
          model: selectedModel,
          mode: state.mode,
          selectedTools: state.selectedTools,
        });

        const aiMsg: Message = {
          id: generateId(),
          chatId: chatId!,
          role: "model",
          content: aiText || "",
          timestamp: Date.now(),
          type: "text",
        };

        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiMsg),
        });

        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [chatId!]: [...(prev.messages[chatId!] || []), aiMsg],
          },
        }));
      } else if (state.view === "image-gen" || currentMode === "image") {
        const imageUrl = await generateImage(input);
        const aiMsg: Message = {
          id: generateId(),
          chatId: chatId!,
          role: "model",
          content: imageUrl,
          timestamp: Date.now(),
          type: "image",
        };

        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiMsg),
        });

        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [chatId!]: [...(prev.messages[chatId!] || []), aiMsg],
          },
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMathSolve = async () => {
    if (!mathProblem.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const solution = await solveMathProblem(mathProblem);
      setMathSolution(solution || "");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDigest = async () => {
    if (digest || isLoading) return;
    setIsLoading(true);
    try {
      const data = await generateDailyDigest();
      setDigest(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  };

  const handlePlusItemClick = (label: string) => {
    setIsPlusMenuOpen(false);
    if (
      label === "Загрузить файлы" ||
      label === "Фото" ||
      label === "Импортировать код"
    ) {
      if (fileInputRef.current) {
        if (label === "Фото") fileInputRef.current.accept = "image/*";
        else if (label === "Импортировать код")
          fileInputRef.current.accept =
            ".js,.ts,.tsx,.py,.java,.cpp,.h,.css,.html,.json";
        else fileInputRef.current.accept = "*/*";
        fileInputRef.current.click();
      }
    } else if (label === "Добавить с Google Диска") {
      alert("Интеграция с Google Диском будет доступна в ближайшее время.");
    } else if (label === "NotebookLM") {
      alert(
        "NotebookLM — это экспериментальный инструмент. Скоро здесь появится ссылка.",
      );
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInput((prev) => prev + ` [Файл: ${file.name}] `);
    }
  };

  if (!state.user) {
    return (
      <Auth
        theme={state.theme}
        onAuthSuccess={(user) => setState((prev) => ({ ...prev, user }))}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-screen w-full overflow-hidden transition-colors duration-300",
        state.theme === "dark"
          ? "bg-brand-dark text-white"
          : "bg-white text-gray-900",
      )}
    >
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r md:relative",
              state.theme === "dark"
                ? "bg-gray-900 border-gray-800"
                : "bg-gray-50 border-gray-200",
            )}
          >
            <div className="p-4 flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    view: "chat",
                    currentChatId: null,
                  }))
                }
              >
                <div className="w-10 h-10 rounded-xl bg-gray-900/10 dark:bg-white/5 flex items-center justify-center p-1.5">
                  <Logo className="w-full h-full" />
                </div>
                <h1 className="font-display font-bold text-xl tracking-tight">
                  Sava AI
                </h1>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={createNewChat}
              className="mx-4 mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-brand-blue to-brand-purple text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-brand-blue/20"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider opacity-40">
                Recent Chats
              </div>
              {state.chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      currentChatId: chat.id,
                      view: "chat",
                    }));
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors group",
                    state.currentChatId === chat.id
                      ? state.theme === "dark"
                        ? "bg-gray-800 text-white"
                        : "bg-white shadow-sm text-brand-blue"
                      : state.theme === "dark"
                        ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Star
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite("chat", chat.id, chat.title);
                      }}
                      className={cn(
                        "w-4 h-4 hover:text-yellow-500",
                        state.favorites.some((f) => f.targetId === chat.id) &&
                          "text-yellow-500 fill-yellow-500 opacity-100",
                      )}
                    />
                    <Trash2
                      onClick={(e) => deleteChat(e, chat.id)}
                      className="w-4 h-4 hover:text-red-500"
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-800 mt-auto space-y-1">
              {[
                { id: "digest", icon: Newspaper, label: "Daily Digest" },
                { id: "study", icon: BookOpen, label: "Study Assistance" },
                { id: "image-gen", icon: ImageIcon, label: "Image Generator" },
                { id: "profile", icon: User, label: "User Profile" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      view: item.id as any,
                      currentChatId: null,
                    }));
                    if (item.id === "digest") loadDigest();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    state.view === item.id
                      ? "bg-brand-blue/20 text-brand-blue"
                      : "text-gray-400 hover:bg-gray-800",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors"
              >
                {state.theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {state.theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header
          className={cn(
            "h-16 flex items-center px-4 border-b shrink-0",
            state.theme === "dark"
              ? "bg-brand-dark/50 border-gray-800"
              : "bg-white/50 border-gray-200",
          )}
        >
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
              <Menu className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-lg">
              {state.view === "image-gen"
                ? "Image Generator"
                : state.view === "profile"
                  ? "User Profile"
                  : state.view === "study"
                    ? "Study Assistance"
                    : state.view === "digest"
                      ? "Daily Digest"
                      : state.chats.find((c) => c.id === state.currentChatId)
                          ?.title || "New Chat"}
            </h2>
          </div>
        </header>

        {/* Views */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {state.view === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                {currentMode === "canvas" ? (
                  <div className="h-full max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Canvas</h3>
                      <button
                        onClick={() => setCurrentMode("chat")}
                        className="text-sm text-brand-blue hover:underline"
                      >
                        Back to Chat
                      </button>
                    </div>
                    <Canvas theme={state.theme} />
                  </div>
                ) : !state.currentChatId ||
                  state.messages[state.currentChatId]?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-24 h-24 rounded-3xl bg-gray-900/10 dark:bg-white/5 flex items-center justify-center p-4 shadow-2xl"
                    >
                      <Logo className="w-full h-full" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-display font-bold tracking-tight">
                        Welcome back, {state.user?.name}!
                      </h3>
                      <p
                        className={cn(
                          "text-lg",
                          state.theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500",
                        )}
                      >
                        Your personalized assistant is ready to help.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      {[
                        {
                          icon: Calculator,
                          title: "Solve Math",
                          desc: "Step-by-step solutions",
                          mode: "math",
                        },
                        {
                          icon: Code,
                          title: "Programming",
                          desc: "Expert code help",
                          mode: "programming",
                        },
                        {
                          icon: Newspaper,
                          title: "Daily Digest",
                          desc: "Facts, news, and challenges",
                          mode: "digest",
                        },
                        {
                          icon: ImageIcon,
                          title: "Generate Art",
                          desc: "Turn text into images",
                          mode: "image",
                        },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (item.mode === "digest") {
                              setState((prev) => ({ ...prev, view: "digest" }));
                              loadDigest();
                            } else if (item.mode === "math") {
                              setState((prev) => ({ ...prev, view: "study" }));
                            } else {
                              setCurrentMode(item.mode as any);
                            }
                          }}
                          className={cn(
                            "p-4 rounded-2xl border text-left transition-all hover:scale-[1.02]",
                            state.theme === "dark"
                              ? "bg-gray-900 border-gray-800 hover:border-brand-blue/50"
                              : "bg-gray-50 border-gray-200 hover:border-brand-blue/50",
                          )}
                        >
                          <item.icon className="w-6 h-6 mb-2 text-brand-blue" />
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-sm opacity-60">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    {(state.messages[state.currentChatId] || []).map(
                      (msg, idx, arr) => (
                        <Fragment key={msg.id}>
                          <div
                            className={cn(
                              "flex w-full",
                              msg.role === "user"
                                ? "justify-end"
                                : "justify-start",
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                                msg.role === "user"
                                  ? "bg-brand-blue text-white rounded-tr-none"
                                  : state.theme === "dark"
                                    ? "bg-gray-800 text-gray-100 rounded-tl-none"
                                    : "bg-gray-100 text-gray-800 rounded-tl-none",
                              )}
                            >
                              <div className="markdown-body">
                                {msg.content.startsWith("blob:") ||
                                msg.content.endsWith(".wav") ||
                                msg.content.endsWith(".mp3") ? (
                                  <audio
                                    controls
                                    src={msg.content}
                                    className="w-full mt-2"
                                  />
                                ) : msg.content.startsWith("http") &&
                                  (msg.content.includes("veo") ||
                                    msg.content.endsWith(".mp4")) ? (
                                  <video
                                    controls
                                    src={msg.content}
                                    className="w-full rounded-xl mt-2"
                                  />
                                ) : (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                )}
                              </div>
                              <div className="text-[10px] mt-1 opacity-50 text-right">
                                {new Date(msg.timestamp).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </div>
                            </div>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className="beautiful-line" />
                          )}
                        </Fragment>
                      ),
                    )}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 rounded-tl-none flex items-center gap-2",
                            state.theme === "dark"
                              ? "bg-gray-800"
                              : "bg-gray-100",
                          )}
                        >
                          <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
                          <span className="text-sm opacity-60">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </motion.div>
            )}

            {state.view === "image-gen" && (
              <motion.div
                key="image-gen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-display font-bold">
                    AI Image Generator
                  </h3>
                  <p className="opacity-60">
                    Describe your vision and watch it come to life.
                  </p>
                </div>

                {(state.messages[state.currentChatId || ""] || []).filter(
                  (m) => m.type === "image",
                ).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(state.messages[state.currentChatId || ""] || [])
                      .filter((m) => m.type === "image")
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className="group relative rounded-2xl overflow-hidden shadow-xl"
                        >
                          <img
                            src={msg.content}
                            alt="AI Generated"
                            className="w-full h-auto"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <a
                              href={msg.content}
                              download
                              className="p-3 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                            >
                              <Download className="w-6 h-6 text-white" />
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {isLoading && (
                  <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-brand-purple" />
                    <p className="animate-pulse">
                      Generating your masterpiece...
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {state.view === "study" && (
              <motion.div
                key="study"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Math Solver */}
                  <div
                    className={cn(
                      "p-6 rounded-3xl border space-y-4",
                      state.theme === "dark"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Calculator className="w-6 h-6 text-brand-blue" />
                      <h3 className="text-xl font-bold">Math Solver</h3>
                    </div>
                    <textarea
                      value={mathProblem}
                      onChange={(e) => setMathProblem(e.target.value)}
                      placeholder="Enter a math problem (e.g., 2x + 5 = 15)"
                      className={cn(
                        "w-full p-4 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/50 outline-none transition-all",
                        state.theme === "dark" ? "bg-gray-800" : "bg-white",
                      )}
                      rows={3}
                    />
                    <button
                      onClick={handleMathSolve}
                      disabled={!mathProblem.trim() || isLoading}
                      className="w-full py-3 rounded-xl bg-brand-blue text-white font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        "Solve Step-by-Step"
                      )}
                    </button>
                    {mathSolution && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-4 rounded-xl bg-brand-blue/10 border border-brand-blue/20"
                      >
                        <div className="markdown-body">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {mathSolution}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Science Modules */}
                  <div
                    className={cn(
                      "p-6 rounded-3xl border space-y-4",
                      state.theme === "dark"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Beaker className="w-6 h-6 text-brand-purple" />
                      <h3 className="text-xl font-bold">Science Modules</h3>
                    </div>
                    <div className="space-y-3">
                      {["Water Cycle", "Solar System"].map((topic) => (
                        <div key={topic} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{topic}</span>
                            <button
                              onClick={() =>
                                setInput(`Explain the ${topic} in detail.`)
                              }
                              className="text-xs text-brand-blue hover:underline"
                            >
                              Ask Q&A
                            </button>
                          </div>
                          <ScienceDiagram topic={topic} theme={state.theme} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {state.view === "digest" && (
              <motion.div
                key="digest"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                {isLoading && !digest ? (
                  <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
                    <p className="text-lg font-medium">
                      Curating your daily digest...
                    </p>
                  </div>
                ) : (
                  digest && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Fact & Challenge */}
                      <div className="space-y-8">
                        <div
                          className={cn(
                            "p-6 rounded-3xl border relative overflow-hidden",
                            state.theme === "dark"
                              ? "bg-gray-900 border-gray-800"
                              : "bg-gray-50 border-gray-200",
                          )}
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="w-20 h-20" />
                          </div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-brand-blue mb-2">
                            Daily Fact
                          </h4>
                          <p className="text-xl leading-relaxed">
                            {digest.fact}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "p-6 rounded-3xl border",
                            state.theme === "dark"
                              ? "bg-gray-900 border-gray-800"
                              : "bg-gray-50 border-gray-200",
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-brand-purple">
                              Daily Challenge
                            </h4>
                            <span className="px-2 py-1 rounded-md bg-brand-purple/10 text-brand-purple text-[10px] font-bold">
                              {digest.challenge.type}
                            </span>
                          </div>
                          <p className="text-lg mb-6">
                            {digest.challenge.question}
                          </p>
                          <button
                            onClick={() => setShowAnswer(!showAnswer)}
                            className="flex items-center gap-2 text-sm font-bold text-brand-purple hover:opacity-80 transition-opacity"
                          >
                            {showAnswer ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            {showAnswer ? "Hide Answer" : "Show Answer"}
                          </button>
                          <AnimatePresence>
                            {showAnswer && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-4 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-center font-bold text-xl"
                              >
                                {digest.challenge.answer}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* News */}
                      <div
                        className={cn(
                          "p-6 rounded-3xl border",
                          state.theme === "dark"
                            ? "bg-gray-900 border-gray-800"
                            : "bg-gray-50 border-gray-200",
                        )}
                      >
                        <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-6 flex items-center gap-2">
                          <Newspaper className="w-4 h-4" />
                          Top Headlines
                        </h4>
                        <div className="space-y-6">
                          {digest.news.map((item, i) => (
                            <div key={i} className="group cursor-pointer">
                              <h5 className="font-bold group-hover:text-brand-blue transition-colors mb-1">
                                {item.title}
                              </h5>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs opacity-40 flex items-center gap-1 hover:opacity-100"
                              >
                                Read full story{" "}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </motion.div>
            )}

            {state.view === "profile" && state.user && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-3xl bg-linear-to-br from-brand-blue/10 to-brand-purple/10 border border-brand-blue/20">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-4xl font-bold text-white">
                      {state.user.avatar ? (
                        <img
                          src={state.user.avatar}
                          alt={state.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        state.user.name[0]
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const url = prompt("Enter image URL for avatar:");
                        if (url) updateProfile({ avatar: url });
                      }}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-blue text-white shadow-lg hover:scale-110 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <input
                        type="text"
                        value={state.user.name}
                        onChange={(e) =>
                          updateProfile({ name: e.target.value })
                        }
                        className="text-3xl font-bold bg-transparent border-b border-transparent hover:border-brand-blue/30 focus:border-brand-blue focus:outline-none transition-all"
                      />
                    </div>
                    <p className="opacity-60 flex items-center justify-center md:justify-start gap-2">
                      <Mail className="w-4 h-4" />
                      {state.user.email}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                      {state.user.googleId && (
                        <span className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold uppercase tracking-widest">
                          Google Account
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div
                    className={cn(
                      "p-6 rounded-3xl border space-y-6",
                      state.theme === "dark"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200",
                    )}
                  >
                    <div className="space-y-4">
                      <label className="text-sm font-bold uppercase tracking-widest opacity-40">
                        AI Preferences
                      </label>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-xs opacity-60">
                            Learning Style
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {(
                              ["visual", "auditory", "text-based"] as const
                            ).map((style) => (
                              <button
                                key={style}
                                onClick={() =>
                                  updateProfile({ learningStyle: style })
                                }
                                className={cn(
                                  "py-3 rounded-xl text-sm font-medium border transition-all",
                                  state.user?.learningStyle === style
                                    ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20"
                                    : state.theme === "dark"
                                      ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                                      : "bg-white border-gray-200 hover:border-gray-300",
                                )}
                              >
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs opacity-60">
                            Response Tone
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {(["formal", "friendly", "concise"] as const).map(
                              (tone) => (
                                <button
                                  key={tone}
                                  onClick={() =>
                                    updateProfile({ responseTone: tone })
                                  }
                                  className={cn(
                                    "py-3 rounded-xl text-sm font-medium border transition-all",
                                    state.user?.responseTone === tone
                                      ? "bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20"
                                      : state.theme === "dark"
                                        ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                                        : "bg-white border-gray-200 hover:border-gray-300",
                                  )}
                                >
                                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!state.user.googleId && (
                    <div
                      className={cn(
                        "p-6 rounded-3xl border space-y-4",
                        state.theme === "dark"
                          ? "bg-gray-900 border-gray-800"
                          : "bg-gray-50 border-gray-200",
                      )}
                    >
                      <h4 className="text-sm font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Security
                      </h4>
                      <button
                        onClick={async () => {
                          const newPass = prompt("Enter new password:");
                          if (newPass) {
                            await fetch("/api/profile/password", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ password: newPass }),
                            });
                            alert("Password updated successfully");
                          }
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 opacity-40" />
                          <span className="text-sm font-medium">
                            Change Password
                          </span>
                        </div>
                        <ChevronLeft className="w-4 h-4 rotate-180 opacity-40" />
                      </button>
                    </div>
                  )}

                  <div className="beautiful-line opacity-20" />
                  <div
                    className={cn(
                      "p-6 rounded-3xl border space-y-4",
                      state.theme === "dark"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200",
                    )}
                  >
                    <h4 className="text-sm font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Favorites
                    </h4>
                    <div className="space-y-2">
                      {state.favorites.length === 0 ? (
                        <p className="text-sm opacity-40 italic">
                          No favorites yet.
                        </p>
                      ) : (
                        state.favorites.map((fav) => (
                          <div
                            key={fav.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              {fav.type === "chat" ? (
                                <MessageSquare className="w-4 h-4" />
                              ) : (
                                <BookOpen className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">
                                {fav.title}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                toggleFavorite(
                                  fav.type,
                                  fav.targetId,
                                  fav.title,
                                )
                              }
                              className="text-red-500 hover:opacity-80"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="w-full py-4 rounded-2xl border border-red-500/20 text-red-500 font-bold hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        {["chat", "image-gen"].includes(state.view) && (
          <div
            className={cn(
              "p-4 border-t shrink-0",
              state.theme === "dark"
                ? "bg-brand-dark border-gray-800"
                : "bg-white border-gray-200",
            )}
          >
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    state.view === "image-gen"
                      ? "Describe the image you want to generate..."
                      : "Ask Sava AI anything..."
                  }
                  rows={1}
                  className={cn(
                    "w-full resize-none rounded-2xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-all",
                    state.theme === "dark"
                      ? "bg-gray-900 text-white placeholder-gray-500"
                      : "bg-gray-100 text-gray-900 placeholder-gray-400",
                  )}
                  style={{ minHeight: "56px", maxHeight: "200px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-2 bottom-2 mb-2 p-2 rounded-xl transition-all",
                    input.trim() && !isLoading
                      ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:scale-105"
                      : "bg-gray-500 text-gray-300 cursor-not-allowed",
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between px-1 gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="relative">
                    <button
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <Plus className="w-5 h-5 opacity-60" />
                    </button>
                    <AnimatePresence>
                      {isPlusMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                          <div className="p-2 space-y-1">
                            {[
                              { icon: Paperclip, label: "Загрузить файлы" },
                              {
                                icon: Triangle,
                                label: "Добавить с Google Диска",
                              },
                              { icon: ImageIcon, label: "Фото" },
                              { icon: Code, label: "Импортировать код" },
                              { icon: Waves, label: "NotebookLM" },
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => handlePlusItemClick(item.label)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                              >
                                <item.icon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                                <span className="text-sm font-medium">
                                  {item.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        state.selectedTools.length > 0
                          ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20"
                          : "hover:bg-black/5 dark:hover:bg-white/5 opacity-60",
                      )}
                    >
                      <Settings2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        Инструменты{" "}
                        {state.selectedTools.length > 0
                          ? `(${state.selectedTools.length})`
                          : ""}
                      </span>
                      <span className="sm:hidden">Инстр.</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {isToolsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                          <div className="p-3 space-y-2">
                            <div className="text-sm font-bold opacity-90 mb-2">
                              Инструменты
                            </div>
                            {[
                              {
                                icon: ImageIcon,
                                label: "Создание изображений",
                                mode: "image",
                              },
                              { icon: Layout, label: "Canvas", mode: "canvas" },
                              {
                                icon: GraduationCap,
                                label: "Обучение",
                                mode: "learning",
                              },
                            ].map((tool) => (
                              <button
                                key={tool.mode}
                                onClick={() => {
                                  setCurrentMode(tool.mode as any);
                                  setIsToolsOpen(false);
                                  if (tool.mode === "image") {
                                    setState((prev) => ({
                                      ...prev,
                                      view: "image-gen",
                                    }));
                                  } else if (tool.mode === "learning") {
                                    setState((prev) => ({
                                      ...prev,
                                      view: "study",
                                    }));
                                  } else if (tool.mode === "canvas") {
                                    setState((prev) => ({
                                      ...prev,
                                      view: "chat",
                                    }));
                                  } else {
                                    setState((prev) => ({
                                      ...prev,
                                      view: "chat",
                                    }));
                                  }
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <tool.icon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                                  <span className="text-sm font-medium">
                                    {tool.label}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-60">
                      <Zap
                        className={cn(
                          "w-3 h-3",
                          selectedModel === "pro"
                            ? "text-brand-purple"
                            : "text-brand-blue",
                        )}
                      />
                      <span>
                        {selectedModel === "pro"
                          ? "Pro"
                          : thinkingLevel === ThinkingLevel.HIGH
                            ? "Думающая"
                            : "Быстрая"}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
                      <div className="p-3 space-y-1">
                        <div className="px-3 py-2 text-sm font-bold opacity-90">
                          Sava AI 3.0
                        </div>
                        {[
                          {
                            label: "Быстрая",
                            desc: "Быстрые ответы",
                            value: ThinkingLevel.LOW,
                            model: "flash",
                            icon: Zap,
                          },
                          {
                            label: "Думающая",
                            desc: "Решает сложные задачи",
                            value: ThinkingLevel.HIGH,
                            model: "flash",
                            icon: Brain,
                          },
                          {
                            label: "Pro",
                            desc: "Решение сложных математических задач и создание кода с 3.1 Pro",
                            value: ThinkingLevel.HIGH,
                            model: "pro",
                            icon: ShieldCheck,
                          },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => {
                              setThinkingLevel(opt.value);
                              setSelectedModel(opt.model as any);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-3 rounded-xl transition-all flex items-center justify-between group",
                              selectedModel === opt.model &&
                                (opt.model === "pro" ||
                                  thinkingLevel === opt.value)
                                ? "bg-brand-blue/10"
                                : "hover:bg-black/5 dark:hover:bg-white/5",
                            )}
                          >
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  "text-sm font-bold",
                                  selectedModel === opt.model &&
                                    (opt.model === "pro" ||
                                      thinkingLevel === opt.value)
                                    ? "text-brand-blue"
                                    : "",
                                )}
                              >
                                {opt.label}
                              </span>
                              <span className="text-[10px] opacity-60 leading-tight">
                                {opt.desc}
                              </span>
                            </div>
                            {selectedModel === opt.model &&
                              (opt.model === "pro" ||
                                thinkingLevel === opt.value) && (
                                <div className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isRecording
                        ? "text-red-500 animate-pulse bg-red-500/10"
                        : "opacity-60 hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-center mt-2 opacity-40">
              Sava AI can make mistakes. Check important info.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
