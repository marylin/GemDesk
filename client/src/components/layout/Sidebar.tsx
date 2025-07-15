import { ReactNode } from "react";

interface SidebarProps {
  children: ReactNode;
  width?: number;
}

export default function Sidebar({ children, width = 256 }: SidebarProps) {
  return (
    <div 
      className="h-full bg-gray-800 border-r border-gray-700 flex flex-col"
      style={{ width: `${width}px` }}
    >
      {children}
    </div>
  );
}