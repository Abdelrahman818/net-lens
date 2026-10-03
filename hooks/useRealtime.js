"use client";

import { useEffect, useRef, useState } from "react";

import {
  getRealtimeStatus,
  subscribeRealtime,
  subscribeRealtimeStatus,
} from "@/lib/realtime";

export default function useRealtime(onEvent) {
  const eventHandler = useRef(onEvent);
  const [status, setStatus] = useState(getRealtimeStatus);

  useEffect(() => {
    eventHandler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const removeEventListener = subscribeRealtime((event) => {
      eventHandler.current?.(event);
    });
    const removeStatusListener = subscribeRealtimeStatus(setStatus);
    return () => {
      removeEventListener();
      removeStatusListener();
    };
  }, []);

  return { status };
}
