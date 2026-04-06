import Link from "next/link"

export default function FooterSection() {
  return (
    <footer className="border-t border-gray-800 bg-black text-white py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Left side - Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold">
            S
          </div>
          <span className="font-semibold text-white">Syncpad</span>
          <span className="text-gray-500 ml-2">© {new Date().getFullYear()}</span>
        </div>

        {/* Center - Quick Links */}
        <div className="flex gap-6 text-sm text-gray-400">
          <Link
            href="/"
            className="hover:text-white transition-colors duration-200"
          >
            Home
          </Link>
          <Link
            href="/Collaborate"
            className="hover:text-white transition-colors duration-200"
          >
            Collaborate
          </Link>
        </div>

        {/* Right side - GitHub Link */}
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/Manpreets59/suncpad"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"
              />
            </svg>
            <span className="text-sm">GitHub</span>
          </Link>
        </div>
      </div>

      {/* Bottom divider with license */}
      <div className="border-t border-gray-800 mt-6 pt-6">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-gray-500">
          <p>Built with ❤️ for collaborative coding • Open source</p>
        </div>
      </div>
    </footer>
  )
}
