import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ReactNode } from 'react';

interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ tabs, defaultValue, value, onValueChange }: TabsProps) {
  return (
    <TabsPrimitive.Root
      className="flex flex-col h-full w-full bg-ide-bg text-ide-text"
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
    >
      <TabsPrimitive.List className="flex border-b border-ide-border bg-ide-panel select-none">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="px-4 py-2 border-r border-ide-border text-sm font-medium transition-colors hover:bg-ide-hover data-[state=active]:bg-ide-bg data-[state=active]:border-b-transparent focus:outline-none cursor-pointer"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          value={tab.value}
          className="flex-1 overflow-auto focus:outline-none"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
