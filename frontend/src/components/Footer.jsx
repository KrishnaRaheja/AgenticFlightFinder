import React from 'react';

function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-botanical-card text-botanical-text">
      <div className="max-w-screen-sm mx-auto px-4 py-1 flex items-center justify-center gap-2 text-xs">
        <a
          href="https://github.com/KrishnaRaheja/AgenticFlightFinder"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white"
        >
          GitHub
        </a>
        <span>·</span>
        <span>Theme inspired by Monkeytype’s Botanical palette</span>
      </div>
    </footer>
  );
}

export default Footer;
