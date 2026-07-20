"use client";

import dynamic from "next/dynamic";

const SettingsScreen = dynamic(
  () =>
    import("./components/settings").then((module) => module.SettingsScreen),
  { ssr: false },
);

export default function Home() {
  return <SettingsScreen />;
}
