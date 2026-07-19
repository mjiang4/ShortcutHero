"use client";

import { useEffect } from "react";

import { initializeAnalytics } from "./client";

export function AnalyticsBootstrap() {
  useEffect(() => {
    void initializeAnalytics();
  }, []);

  return null;
}
