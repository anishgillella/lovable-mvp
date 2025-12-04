import { useState, useCallback } from 'react';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { MainLayout } from '@/components/layout';
import { ChatContainer } from '@/components/chat';
import { PreviewPanel } from '@/components/preview';

function AppContent({ onAPIKeyChange }: { onAPIKeyChange: (key: string) => void }) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const { tokenStats } = useChat();

  return (
    <MainLayout onAPIKeyChange={onAPIKeyChange} tokenStats={tokenStats}>
      <div className="h-full flex">
        {/* Chat Panel */}
        <div 
          className={`
            ${isPreviewExpanded ? 'hidden' : 'w-full md:w-[400px] lg:w-[450px]'} 
            flex-shrink-0 border-r border-surface-800 bg-surface-900/50
          `}
        >
          <ChatContainer />
        </div>

        {/* Preview Panel */}
        <div className="flex-1 min-w-0 bg-surface-950">
          <PreviewPanel 
            isExpanded={isPreviewExpanded}
            onToggleExpand={() => setIsPreviewExpanded(!isPreviewExpanded)}
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default function App() {
  // Use a key to force re-render when API key changes
  const [apiKeyVersion, setApiKeyVersion] = useState(0);

  const handleAPIKeyChange = useCallback((_key: string) => {
    // Force ChatProvider to re-mount with new API key
    setApiKeyVersion((v) => v + 1);
  }, []);

  return (
    <ChatProvider key={apiKeyVersion}>
      <AppContent onAPIKeyChange={handleAPIKeyChange} />
    </ChatProvider>
  );
}
