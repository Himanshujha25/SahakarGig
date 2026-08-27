import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import LangToggle from "../components/LangToggle";
import AdminSidebar from "../components/AdminSidebar";
import Icon from "../components/Icon";
import socket from "../lib/socket";

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex text-body-md overflow-hidden">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 z-50 transition-opacity"
        />
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-surface-container-low z-50 p-4 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                <Icon name="handshake" className="text-[22px]" />
              </div>
              <div>
                <h2 className="font-headline-md text-sm font-bold text-primary">Cooperative Admin</h2>
                <p className="text-xs text-on-surface-variant">Central District</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-on-surface-variant rounded-lg hover:bg-surface-variant/50"
            >
              <Icon name="close" className="" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 py-4 overflow-y-auto">
            <NavLink
              to="/admin"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg font-bold ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
                }`
              }
            >
              <Icon name="dashboard" className="" />
              <span className="font-label-sm text-label-sm">Dashboard</span>
            </NavLink>
            <NavLink
              to="/admin/verifications"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg font-bold ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
                }`
              }
            >
              <Icon name="verified_user" className="" />
              <span className="font-label-sm text-label-sm">Verifications</span>
            </NavLink>
            <NavLink
              to="/admin/disputes"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg font-bold ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
                }`
              }
            >
              <Icon name="report_problem" className="" />
              <span className="font-label-sm text-label-sm">Disputes</span>
            </NavLink>
            <NavLink
              to="/admin/commission"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg font-bold ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
                }`
              }
            >
              <Icon name="analytics" className="" />
              <span className="font-label-sm text-label-sm">Analytics</span>
            </NavLink>
            <NavLink
              to="/admin/providers"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg font-bold ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
                }`
              }
            >
              <Icon name="leaderboard" className="" />
              <span className="font-label-sm text-label-sm">Leaderboard</span>
            </NavLink>
          </nav>

          <div className="pt-4 border-t border-outline-variant space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-on-surface-variant font-semibold">Language</span>
              <LangToggle />
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg text-error hover:bg-error-container text-left"
            >
              <Icon name="logout" className=" text-[20px]" />
              <span className="font-label-sm text-label-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Canvas */}
      <main className="flex-1 lg:ml-[260px] h-screen overflow-y-auto bg-background relative pb-20 lg:pb-0">
        {/* Top App Bar (Mobile Only) */}
        <header className="lg:hidden sticky top-0 w-full z-30 bg-surface border-b border-outline-variant px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
              <Icon name="handshake" className="text-[18px]" />
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">
              SahakarGig Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-on-surface-variant rounded-lg hover:bg-surface-variant/50 cursor-pointer"
            >
              <Icon name="menu" className="" />
            </button>
          </div>
        </header>

        {/* Child Routes Outlet */}
        <Outlet />
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface px-4 py-3 pb-safe border-t border-outline-variant shadow-[0_-4px_12px_rgba(0,0,0,0.05)] rounded-t-xl">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-transform duration-150 ${
              isActive ? "text-primary font-bold" : "text-on-surface-variant"
            }`
          }
        >
          {() => (
            <>
              <Icon name="dashboard" />
              <span className="font-label-sm text-[10px] mt-1">Dashboard</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/admin/verifications"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-transform duration-150 ${
              isActive ? "text-primary font-bold" : "text-on-surface-variant"
            }`
          }
        >
          {() => (
            <>
              <Icon name="verified_user" />
              <span className="font-label-sm text-[10px] mt-1">Verifications</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/admin/disputes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-transform duration-150 ${
              isActive ? "text-primary font-bold" : "text-on-surface-variant"
            }`
          }
        >
          {() => (
            <>
              <Icon name="report_problem" />
              <span className="font-label-sm text-[10px] mt-1">Disputes</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/admin/commission"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-transform duration-150 ${
              isActive ? "text-primary font-bold" : "text-on-surface-variant"
            }`
          }
        >
          {() => (
            <>
              <Icon name="analytics" />
              <span className="font-label-sm text-[10px] mt-1">Analytics</span>
            </>
          )}
        </NavLink>
      </nav>

    </div>
  );
}
