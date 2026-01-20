import { ChatPage } from '@/components/pages/ChatPage';

export default function Chat({ params }: { params: { id: string } }) {
  return <ChatPage domainId={params.id} />;
}
