"use client";

import { Tab, Tabs } from "@nextui-org/react";

export function DashboardTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-6 border-b border-default-200">
      <Tabs
        selectedKey={active}
        onSelectionChange={(k) => onChange(String(k) as T)}
        variant="underlined"
        color="primary"
        classNames={{
          tabList: "gap-4",
          tab: "h-11 font-semibold",
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.id} id={t.id} title={t.label} />
        ))}
      </Tabs>
    </div>
  );
}
