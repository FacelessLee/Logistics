'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isVisible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setIsVisible(false);
    setInstallEvent(null);
  };

  return (
    <aside className="install-prompt" aria-label="Install Navithon Logistics">
      <div>
        <strong>Keep support close</strong>
        <span>Install Navithon for faster chat access.</span>
      </div>
      <button onClick={install}><Download size={15} /> Install</button>
      <button className="install-prompt-dismiss" onClick={() => setIsVisible(false)} aria-label="Dismiss install prompt"><X size={15} /></button>
    </aside>
  );
}
