import { ReactNode } from "react";

interface SidebarProps {
  children: ReactNode;
  width?: number;
}

export default function Sidebar({ children, width = 256 }: SidebarProps) {
  return (
    <div 
      style={{ width }} 
      className="bg-dark-panel border-r border-dark-border flex flex-col"
    >
      {children}
    </div>
  );
}
