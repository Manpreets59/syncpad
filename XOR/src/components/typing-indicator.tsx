import { useEffect, useState } from 'react';

interface TypingUser {
  name: string;
  timestamp: number;
}

export function TypingIndicator({ socket, roomId }: { socket: any; roomId: string }) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = ({ name }: { name: string }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.name !== name);
        return [...filtered, { name, timestamp: Date.now() }];
      });
    };

    const handleUserStoppedTyping = ({ name }: { name: string }) => {
      setTypingUsers(prev => prev.filter(user => user.name !== name));
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);

    // Cleanup old typing indicators every 3 seconds
    const interval = setInterval(() => {
      setTypingUsers(prev => 
        prev.filter(user => Date.now() - user.timestamp < 3000)
      );
    }, 3000);

    return () => {
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      clearInterval(interval);
    };
  }, [socket]);

  return (
    <div className="typing-indicator">
      {typingUsers.map(user => (
        <div key={user.name} className="typing-user">
          <span className="text-sm text-gray-400">{user.name} is typing...</span>
        </div>
      ))}
    </div>
  );
}