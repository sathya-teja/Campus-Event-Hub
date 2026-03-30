import { Mail, Github, Linkedin, MapPin, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100">

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand */}
          <div className="md:col-span-5">
            <div
  className="flex items-center gap-2 mb-4 cursor-pointer"
  onClick={() => navigate("/")}
>
  <img
    src="/fav.svg"
    alt="logo"
    className="w-9 h-9 object-contain"
  />

  <div className="flex flex-col leading-none">
    <span className="text-gray-900 font-bold text-lg tracking-tight">
      Campus{" "}
      <span className="text-blue-600">
        EventHub
      </span>
    </span>

    <span className="text-[10px] text-gray-500">
      Discover. Celebrate. Connect.
    </span>
  </div>
</div>
            <p className="text-sm leading-relaxed text-gray-500 max-w-sm mb-6">
              A modern platform for discovering, managing, and participating in
              inter-college events across every campus.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                { icon: <Mail size={15} />,     label: "Email" },
                { icon: <Github size={15} />,   label: "GitHub" },
                { icon: <Linkedin size={15} />, label: "LinkedIn" },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-blue-600 hover:text-white flex items-center justify-center text-gray-500 transition-all duration-200"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-gray-900 text-sm font-semibold mb-4 uppercase tracking-wider">
              Navigate
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Home",     path: "/" },
                { label: "Events",   path: "/events" },
                { label: "Register", path: "/register" },
                { label: "Login",    path: "/login" },
              ].map(({ label, path }) => (
                <li key={label}>
                  <button
                    onClick={() => navigate(path)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors group"
                  >
                    <ArrowRight
                      size={12}
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                    />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h4 className="text-gray-900 text-sm font-semibold mb-4 uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-gray-500">
                <Mail size={15} className="mt-0.5 flex-shrink-0 text-blue-600" />
                <a 
  href="mailto:campuseventhub.app@gmail.com"
  className="hover:text-blue-600 transition-colors"
>
  campuseventhub.app@gmail.com
</a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-500">
                <MapPin size={15} className="mt-0.5 flex-shrink-0 text-blue-600" />
                <span>Andhra Pradesh, India</span>
              </li>
            </ul>

            <button
              onClick={() => navigate("/register")}
              className="mt-6 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30"
            >
              Get Started Free <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-6" />

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          © {year} CampusEventHub. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <button className="hover:text-gray-600 transition-colors">Privacy Policy</button>
          <button className="hover:text-gray-600 transition-colors">Terms of Service</button>
        </div>
      </div>

    </footer>
  );
}