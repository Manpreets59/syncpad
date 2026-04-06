"use client"

import { executeCode } from "@/services/compilerAPI"
import { toast } from "react-hot-toast"

import { useState, useEffect, useRef, useCallback } from "react"
import Editor from "react-simple-code-editor"
import Prism from "prismjs"
import { initSocket } from "@/socket"
import { useRouter } from "next/navigation"

import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-markup"

import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-java"
import "prismjs/components/prism-python"
import "prismjs/themes/prism-tomorrow.css"

interface RemoteCursor {
  userId: string;
  name: string;
  line: number;
  column: number;
}

interface CursorColor {
  [key: string]: string;
}

export const CodeEditor = ({
  value = "",
  language = "javascript",
  onChange,
  roomId: propRoomId,
  onRunCodeReady,
}: {
  value?: string
  language?: string
  onChange?: (value: string) => void
  roomId?: string
  onRunCodeReady?: (runCode: () => void) => void
}) => {
  const [output, setOutput] = useState<string>("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [code, setCode] = useState(value)
  const [roomId, setRoomId] = useState<string | undefined>(propRoomId)
  const [socket, setSocket] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [roomUsers, setRoomUsers] = useState<any[]>([]); // Store all users in room
  const router = useRouter()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ name: string; timestamp: number; }[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [cursorColors, setCursorColors] = useState<CursorColor>({});
  const editorRef = useRef<HTMLDivElement>(null);

  interface LanguageMapping {
  id: number;
  name: string;
  extensions: string[];
  identifiers: string[];
}

const LANGUAGE_CONFIG: LanguageMapping[] = [
  {
    id: 105, // C++ (GCC 14.1.0)
    name: "cpp",
    extensions: [".cpp", ".hpp", ".cc", ".h"],
    identifiers: ["#include", "using namespace", "cout", "cin"]
  },
  {
    id: 102, // JavaScript (Node.js 22.08.0)
    name: "javascript",
    extensions: [".js"],
    identifiers: ["const ", "let ", "function", "=>"]
  },
  {
    id: 101, // TypeScript (5.6.2)
    name: "typescript",
    extensions: [".ts", ".tsx"],
    identifiers: ["interface ", "type ", "namespace"]
  },
  {
    id: 109, // Python (3.13.2)
    name: "python",
    extensions: [".py"],
    identifiers: ["def ", "import ", "from ", "class "]
  },
  {
    id: 91, // Java (JDK 17.0.6)
    name: "java",
    extensions: [".java"],
    identifiers: ["public class", "import java", "package "]
  }
];

// Generate a color for a user based on their ID
const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C8A6'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

  // Socket initialization effect
  useEffect(() => {
    const init = async () => {
      const socketInstance = await initSocket()
      console.log('🔌 Socket connected:', socketInstance.id);
      setSocket(socketInstance)
      setCurrentUserId(socketInstance.id)
    }
    init()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

    // Typing indicator setup
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = ({ name }: { name: string }) => {
      console.log('✍️ User typing:', name);
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.name !== name);
        return [...filtered, { name, timestamp: Date.now() }];
      });
    };

    const handleUserStoppedTyping = ({ name }: { name: string }) => {
      console.log('⏸️ User stopped typing:', name);
      setTypingUsers(prev => prev.filter(user => user.name !== name));
    };

    // Handle room update - when users join/leave
    const handleUpdateRoom = (users: any[]) => {
      console.log('👥 Room updated. Users:', users);
      setRoomUsers(users);
    };

    // Handle profile update
    const handleUpdateProfiles = (profiles: any) => {
      console.log('📋 Profiles updated:', profiles);
    };

    // Handle cursor updates from other users
    const handleCursorUpdate = ({ userId, name, line, column }: RemoteCursor) => {
      console.log('🎯 Cursor update:', { userId, name, line, column, currentUserId, shouldShow: userId !== currentUserId });

      if (userId === currentUserId) {
        console.log('⊘ Ignoring own cursor');
        return;
      }

      // Update colors first
      setCursorColors(prevColors => {
        if (!prevColors[userId]) {
          return { ...prevColors, [userId]: generateUserColor(userId) };
        }
        return prevColors;
      });

      // Then update cursors
      setRemoteCursors(prev => {
        const filtered = prev.filter(c => c.userId !== userId);
        return [...filtered, { userId, name, line, column }];
      });
    };

    // Handle cursor removal when user disconnects
    const handleCursorRemoved = (userId: string) => {
      console.log('❌ Cursor removed for:', userId);
      setRemoteCursors(prev => prev.filter(c => c.userId !== userId));
    };

    // Sync all cursors when joining
    const handleCursorSync = (cursors: RemoteCursor[]) => {
      console.log('🔄 Syncing cursors:', cursors);
      const colors: CursorColor = {};
      cursors.forEach(cursor => {
        if (cursor.userId !== currentUserId) {
          colors[cursor.userId] = generateUserColor(cursor.userId);
        }
      });
      setCursorColors(colors);
      setRemoteCursors(cursors.filter(c => c.userId !== currentUserId));
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('updateRoom', handleUpdateRoom);
    socket.on('updateProfiles', handleUpdateProfiles);
    socket.on('cursorUpdate', handleCursorUpdate);
    socket.on('cursorRemoved', handleCursorRemoved);
    socket.on('cursorSync', handleCursorSync);

    // Cleanup old typing indicators
    const interval = setInterval(() => {
      setTypingUsers(prev => prev.filter(user => Date.now() - user.timestamp < 3000));
    }, 3000);

    return () => {
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('updateRoom', handleUpdateRoom);
      socket.off('updateProfiles', handleUpdateProfiles);
      socket.off('cursorUpdate', handleCursorUpdate);
      socket.off('cursorRemoved', handleCursorRemoved);
      socket.off('cursorSync', handleCursorSync);
      clearInterval(interval);
    };
  }, [socket, currentUserId]);
  
    // Debounced typing handler
  const emitTyping = useCallback((name: string) => {
    if (socket && roomId) {
      socket.emit('userTyping', { roomId, name });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('userStoppedTyping', { roomId, name });
      }, 1500);
    }
  }, [socket, roomId]);



  // Room ID effect
  useEffect(() => {
    if (!propRoomId) {
      const currentUserData = localStorage.getItem("currentUser")
      const storedRoomId = currentUserData ? JSON.parse(currentUserData).roomId : undefined
      if (storedRoomId) {
        setRoomId(storedRoomId)
      } else {
        console.error("Room ID is missing in both props and localStorage. Redirecting to login.")
        router.push("/")
      }
    }
  }, [propRoomId, router])

  // Socket room management effect
  useEffect(() => {
    if (!socket || !roomId) {
      return
    }

    const currentUserData = localStorage.getItem("currentUser")
    const name = currentUserData ? JSON.parse(currentUserData).name : "Anonymous"

    socket.emit("joinRoom", { roomId, name })

    socket.on("codeUpdate", (updatedCode: string) => {
      console.log("Received code update:", updatedCode)
      setCode(updatedCode)
    })

    // Request current cursors from other users
    setTimeout(() => {
      socket.emit("requestCursors", { roomId });
    }, 500);

    return () => {
      socket.off("codeUpdate")
      socket.emit("leaveRoom", roomId)
    }
  }, [socket, roomId])

  const detectLanguage = (code: string, defaultLang: string): number => {
    // Find language by code content
    for (const lang of LANGUAGE_CONFIG) {
      if (lang.identifiers.some(id => code.includes(id))) {
        return lang.id;
      }
    }

    // Find language by selected language name
    const selectedLang = LANGUAGE_CONFIG.find(l => l.name === defaultLang);
    return selectedLang?.id || 102; // Default to Node.js if no match
  };

  const runCode = useCallback(async () => {
    setIsExecuting(true);
    const languageId = detectLanguage(code, language);

    try {
      const result = await executeCode(code, languageId);
      if (result.error) {
        toast.error('Execution failed');
        setOutput(result.error);
      } else {
        setOutput(result.output);
        toast.success("Code executed successfully!");
      }
    } catch (error) {
      toast.error("Failed to execute code");
      setOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [code, language]);

  // Expose runCode to parent
  useEffect(() => {
    if (onRunCodeReady) {
      onRunCodeReady(runCode);
    }
  }, [runCode, onRunCodeReady]);

  // Code execution effect - keyboard shortcut
  useEffect(() => {
    const handleCodeExecution = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        runCode();
      }
    };

    document.addEventListener("keydown", handleCodeExecution);
    return () => {
      document.removeEventListener("keydown", handleCodeExecution);
    };
  }, [runCode]);

   const handleValueChange = (newCode: string) => {
    setCode(newCode);
    onChange?.(newCode);

    if (socket && roomId) {
      // Emit code change (keep existing functionality)
      console.log("Emitting code change:", newCode);
      socket.emit("codeChange", { roomId, code: newCode });

      // Handle typing indicator
      const currentUser = localStorage.getItem("currentUser");
      const name = currentUser ? JSON.parse(currentUser).name : "Anonymous";
      
      // Emit typing event
      socket.emit('userTyping', { roomId, name });

      // Clear previous timeout if it exists
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to emit stopped typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('userStoppedTyping', { roomId, name });
        typingTimeoutRef.current = null;
      }, 1500);
    }
  };
  // Determine which language to use for highlighting
  const getLanguage = (lang: string) => {
    switch (lang) {
      case "javascript":
        return Prism.languages.javascript
      case "jsx":
        return Prism.languages.jsx
      case "typescript":
        return Prism.languages.typescript
      case "tsx":
        return Prism.languages.tsx
      case "css":
        return Prism.languages.css
      case "html":
        return Prism.languages.markup
      // Add new language cases
      case "cpp":
        return Prism.languages.cpp
      case "java":
        return Prism.languages.java
      case "python":
        return Prism.languages.python
      default:
        return Prism.languages.javascript
    }
  }

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Track cursor position changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !socket || !roomId || !currentUserId) return;

    const currentUserData = localStorage.getItem("currentUser")
    const name = currentUserData ? JSON.parse(currentUserData).name : "Anonymous"

    let debounceTimer: NodeJS.Timeout;

    const handleCursorMove = () => {
      const textarea = editor.querySelector('textarea');
      if (!textarea) return;

      try {
        const position = textarea.selectionStart;
        const codeBeforeCursor = code.substring(0, position);
        const lines = codeBeforeCursor.split('\n');
        const line = lines.length - 1;
        const column = lines[lines.length - 1].length;

        // Debounce cursor updates (100ms)
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log('📍 Emitting cursor:', { name, line, column, position });
          socket.emit("cursorChange", { roomId, name, line, column });
        }, 100);
      } catch (err) {
        console.error('Error tracking cursor:', err);
      }
    };

    editor.addEventListener('click', handleCursorMove);
    editor.addEventListener('keyup', handleCursorMove);

    return () => {
      clearTimeout(debounceTimer);
      editor.removeEventListener('click', handleCursorMove);
      editor.removeEventListener('keyup', handleCursorMove);
    };
  }, [code, socket, roomId, currentUserId]);


 return (
    <div className="flex h-full relative">
      <div className="w-3/4 h-full relative" ref={editorRef}>
        <div className="absolute left-0 top-0 w-1 h-full bg-black/50 z-20">
          {/* Line number indicators for remote cursors */}
          {remoteCursors
            .filter(cursor => cursor.userId !== currentUserId)
            .map(cursor => (
            <div
              key={cursor.userId}
              className="absolute w-full h-6 left-0 transition-all duration-100"
              style={{
                top: `calc(16px + ${cursor.line * 1.5}em)`,
                borderLeftWidth: '3px',
                borderLeftColor: cursorColors[cursor.userId] || '#CCCCCC',
                backgroundColor: `${cursorColors[cursor.userId] || '#CCCCCC'}20`,
              }}
              title={`${cursor.name} on line ${cursor.line}`}
            />
          ))}
        </div>

        <Editor
          value={code}
          onValueChange={handleValueChange}
          highlight={code => Prism.highlight(code, Prism.languages[language], language)}
          padding={16}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 18,
            backgroundColor: "#2d2d2d",
            minHeight: "500px",
            height: "100%",
            color: "#ccc",
            paddingLeft: '40px',
          }}
          className="min-h-[500px] h-full w-full relative"
        />
      </div>
      <div className="w-1/4 p-4 bg-[#2d2d2d] flex flex-col">
        <h2 className="text-lg text-white mb-4">👥 Team Activity</h2>

        {/* Active Teammates Section */}
        <div className="mb-4 p-3 bg-black/50 rounded">
          <h3 className="text-sm text-gray-400 mb-2">Editing:</h3>
          {remoteCursors.filter(c => c.userId !== currentUserId).length > 0 ? (
            remoteCursors
              .filter(c => c.userId !== currentUserId)
              .map(cursor => (
              <div
                key={cursor.userId}
                className="text-xs py-1 px-2 mb-1 rounded"
                style={{
                  backgroundColor: `${cursorColors[cursor.userId] || '#CCCCCC'}30`,
                  borderLeft: `3px solid ${cursorColors[cursor.userId] || '#CCCCCC'}`,
                  color: '#fff',
                }}
              >
                <span className="font-semibold">{cursor.name}</span> • Line {cursor.line}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">Solo session</p>
          )}
        </div>

        {/* Typing Indicator Section */}
        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-2">Typing:</h3>
          <div className="h-16 typing-indicator">
            {typingUsers.map(user => (
              <div key={user.name} className="typing-user text-xs">
                <span>
                  {user.name} is typing
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Output Section */}
        <div className="flex-1 overflow-auto">
          <h3 className="text-sm text-white mb-2">Output:</h3>
          {output ? (
            <pre className="text-xs text-white bg-black/50 p-2 rounded overflow-auto max-h-64">{output}</pre>
          ) : (
            <p className="text-xs text-gray-500">No output yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
