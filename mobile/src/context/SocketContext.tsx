import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '../api/client';
import { io as Io } from 'socket.io-client';

interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  emit: (event: string, data?: any, callback?: Function) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  emit: () => {},
  on: () => {},
  off: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<any>(null);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let mounted = true;

    try {
      const io = Io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
      });

      io.on('connect', () => {
        if (mounted) {
          setIsConnected(true);
          socketRef.current = io;
          forceUpdate(n => n + 1);
        }
      });

      io.on('disconnect', () => {
        if (mounted) setIsConnected(false);
      });

      io.on('connect_error', (err: any) => {
        console.warn('[Socket] Connection error:', err?.message);
      });

      if (mounted) {
        socketRef.current = io;

        listenersRef.current.forEach((handlers, event) => {
          handlers.forEach((handler) => {
            io.on(event, handler);
          });
        });
      }
    } catch (err) {
      console.warn('[Socket] Init failed:', err);
    }

    return () => {
      mounted = false;
      listenersRef.current.clear();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event: string, data?: any, callback?: Function) => {
    if (socketRef.current?.connected) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (handler) {
      listenersRef.current.get(event)?.delete(handler);
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    } else {
      listenersRef.current.delete(event);
      if (socketRef.current) {
        socketRef.current.removeAllListeners(event);
      }
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
