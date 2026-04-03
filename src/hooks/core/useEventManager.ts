import { useEffect, useRef, useCallback } from 'react';

interface EventManagerOptions {
  throttleDelay?: number;
  enableThrottling?: boolean;
}

// 通用事件处理器类型
type EventHandler<T extends Event = Event> = (event: T) => void;

// 事件类型映射
interface EventTypeMap {
  mousemove: MouseEvent;
  mousedown: MouseEvent;
  mouseup: MouseEvent;
  click: MouseEvent;
  dblclick: MouseEvent;
  keydown: KeyboardEvent;
  keyup: KeyboardEvent;
  keypress: KeyboardEvent;
  focus: FocusEvent;
  blur: FocusEvent;
  change: Event;
  input: Event;
  submit: Event;
  resize: UIEvent;
  scroll: UIEvent;
  load: Event;
  error: ErrorEvent;
}

// 支持自定义事件类型
type EventType = keyof EventTypeMap | string;
type EventPayload<T extends EventType> = T extends keyof EventTypeMap ? EventTypeMap[T] : Event;

/**
 * 统一的事件管理器hook
 * 避免重复的事件监听器，提供节流功能
 */
export function useEventManager(options: EventManagerOptions = {}) {
  const { throttleDelay = 16, enableThrottling = true } = options; // 默认60fps

  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const activeListenersRef = useRef<Set<string>>(new Set());

  // 添加事件监听器
  const addEventListener = useCallback(<T extends EventType>(
    eventType: T,
    handler: EventHandler<EventPayload<T>>,
    target: EventTarget = document
  ) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    
    const handlers = listenersRef.current.get(eventType)!;
    handlers.add(handler as EventHandler);

    // 如果这是第一个监听器，添加到DOM
    if (handlers.size === 1 && !activeListenersRef.current.has(eventType)) {
      const eventHandler = enableThrottling 
        ? createThrottledHandler(eventType, throttleDelay)
        : createHandler(eventType);
      
      target.addEventListener(eventType, eventHandler);
      activeListenersRef.current.add(eventType);
    }

    // 返回清理函数
    return () => {
      handlers.delete(handler as EventHandler);
      
      // 如果没有更多监听器，从DOM移除
      if (handlers.size === 0 && activeListenersRef.current.has(eventType)) {
        target.removeEventListener(eventType, createHandler(eventType));
        activeListenersRef.current.delete(eventType);
      }
    };
  }, [enableThrottling, throttleDelay]);

  // 创建事件处理器
  const createHandler = useCallback((eventType: string) => {
    return (event: Event) => {
      const handlers = listenersRef.current.get(eventType);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Error in ${eventType} handler:`, error);
          }
        });
      }
    };
  }, []);

  // 创建节流事件处理器
  const createThrottledHandler = useCallback((eventType: string, delay: number) => {
    const handler = createHandler(eventType);
    let lastCallTime = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return (event: Event) => {
      const now = Date.now();
      const remaining = delay - (now - lastCallTime);

      if (remaining <= 0) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        lastCallTime = now;
        handler(event);
        return;
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        handler(event);
      }, remaining);
    };
  }, [createHandler]);

  // 移除所有监听器
  const removeAllListeners = useCallback(() => {
    activeListenersRef.current.forEach(eventType => {
      document.removeEventListener(eventType, createHandler(eventType));
    });
    
    listenersRef.current.clear();
    activeListenersRef.current.clear();
  }, [createHandler]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      removeAllListeners();
    };
  }, [removeAllListeners]);

  return {
    addEventListener,
    removeAllListeners,
    getActiveListeners: () => Array.from(activeListenersRef.current),
    getListenerCount: (eventType: string) => listenersRef.current.get(eventType)?.size || 0
  };
}

/**
 * 专门用于鼠标事件的hook
 */
export function useMouseEventManager() {
  const eventManager = useEventManager({ throttleDelay: 16 }); // 60fps for mouse events

  const addMouseMoveListener = useCallback((handler: (event: MouseEvent) => void) => {
    return eventManager.addEventListener('mousemove', handler);
  }, [eventManager]);

  const addMouseUpListener = useCallback((handler: (event: MouseEvent) => void) => {
    return eventManager.addEventListener('mouseup', handler);
  }, [eventManager]);

  const addMouseDownListener = useCallback((handler: (event: MouseEvent) => void) => {
    return eventManager.addEventListener('mousedown', handler);
  }, [eventManager]);

  return {
    addMouseMoveListener,
    addMouseUpListener,
    addMouseDownListener,
    ...eventManager
  };
}
