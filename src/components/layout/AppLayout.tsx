import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function AppLayout(): ReactNode {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#f4f4eb] text-forest-900 dark:bg-[#14271d] dark:text-forest-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          onMenuClick={() => setSidebarOpen(true)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
        <main className="flex-1 overflow-x-hidden bg-transparent p-4 pt-5 lg:p-7">
          <div className="mx-auto max-w-7xl">
            <Outlet context={{ searchValue }} />
          </div>
        </main>
      </div>
    </div>
  );
}
