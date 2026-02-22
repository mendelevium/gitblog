type MessageMap = {
  TOKEN_CHANGED: { token: string | null };
  REPO_CHANGED: { owner: string; name: string } | null;
  OPEN_EDITOR: undefined;
};

type MessageType = keyof MessageMap;

interface Message<T extends MessageType = MessageType> {
  type: T;
  payload: MessageMap[T];
}

export function sendMessage<T extends MessageType>(type: T, payload: MessageMap[T]): Promise<void> {
  return chrome.runtime.sendMessage({ type, payload });
}

export function onMessage<T extends MessageType>(
  type: T,
  handler: (payload: MessageMap[T]) => void | Promise<void>,
): () => void {
  const listener = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === type) {
      const result = handler(message.payload as MessageMap[T]);
      if (result instanceof Promise) {
        result.then(() => sendResponse()).catch(() => sendResponse());
        return true; // keep channel open for async
      }
      sendResponse();
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
