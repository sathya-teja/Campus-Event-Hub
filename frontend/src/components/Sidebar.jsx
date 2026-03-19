import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiX, FiLogOut } from "react-icons/fi";

/*
  Props (fully backwards compatible):
    title        string
    activeTab    string
    setActiveTab fn
    items        [{ key, label, icon }]
    mobileOpen   bool
    setMobileOpen fn
    collapsed    bool
    setCollapsed fn

  NEW optional prop:
    onLogout     fn  — if passed, a logout button appears in the footer.
                       If not passed, no footer renders.
*/
export default function Sidebar({
  title,
  activeTab,
  setActiveTab,
  items,
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  onLogout,
}) {
  const isCollapsed = collapsed ?? false;

  return (
    <>
      {/* ── Mobile overlay ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-16 left-0
          h-[calc(100vh-4rem)]
          bg-white
          border-r border-gray-100
          shadow-sm
          z-40
          flex flex-col
          transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-[68px]" : "w-64"}
        `}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div
          className={`
            flex items-center h-14 flex-shrink-0
            border-b border-gray-100
            ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}
          `}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-gray-800 truncate">
                {title}
              </h3>
            </div>
          )}

          {/* Desktop collapse toggle */}
          {setCollapsed && (
            <button
              onClick={() => setCollapsed(!isCollapsed)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg
                         text-gray-400 hover:text-blue-600 hover:bg-blue-50
                         transition-all flex-shrink-0"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed
                ? <FiChevronRight size={15} />
                : <FiChevronLeft  size={15} />}
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <FiX size={15} />
          </button>
        </div>

        {/* ── Nav items — scrollable ──────────────────────── */}
        <nav className="flex flex-col gap-0.5 p-2.5 flex-1 overflow-y-auto overflow-x-hidden">
          {items.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  setMobileOpen(false);
                }}
                title={isCollapsed ? item.label : undefined}
                className={`
                  group relative flex items-center gap-3
                  px-3 py-2.5 rounded-xl
                  text-sm text-left w-full
                  transition-all duration-200 ease-out
                  ${isCollapsed ? "justify-center" : ""}
                  ${isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }
                `}
              >
                {/* Left accent bar — active + expanded only */}
                {!isCollapsed && isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-600" />
                )}

                {/* Icon box */}
                <span
                  className={`
                    flex-shrink-0 flex items-center justify-center
                    w-7 h-7 rounded-lg text-[15px]
                    transition-all duration-200
                    ${isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                    }
                  `}
                >
                  {item.icon}
                </span>

                {/* Label */}
                {!isCollapsed && (
                  <span className="truncate transition-transform duration-200 group-hover:translate-x-0.5">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Footer — logout only ────────────────────────── */}
        {onLogout && (
          <div className="flex-shrink-0 border-t border-gray-100 p-2.5">
            <button
              onClick={onLogout}
              title="Logout"
              className={`
                group flex items-center gap-3
                w-full px-3 py-2.5 rounded-xl
                text-sm font-medium
                text-gray-500 hover:text-red-600 hover:bg-red-50
                transition-all duration-200
                ${isCollapsed ? "justify-center" : ""}
              `}
            >
              {/* Icon box — matches nav item style */}
              <span className="flex-shrink-0 flex items-center justify-center
                               w-7 h-7 rounded-lg text-[15px] bg-gray-100
                               text-gray-400 group-hover:bg-red-50 group-hover:text-red-500
                               transition-all duration-200">
                <FiLogOut size={14} />
              </span>

              {!isCollapsed && (
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  Logout
                </span>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}