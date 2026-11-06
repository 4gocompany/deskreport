import Markdown from 'react-markdown';

// Resposta dos agentes em Markdown. O react-markdown não renderiza HTML bruto, então o texto do agente não vira script na tela
export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="leading-relaxed break-words space-y-1.5 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_a]:text-blue-400 [&_a]:underline [&_strong]:font-semibold [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_code]:bg-zinc-950/60 [&_code]:rounded [&_code]:px-1 [&_pre]:bg-zinc-950/60 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:overflow-x-auto [&_pre_code]:p-0">
      <Markdown>{content}</Markdown>
    </div>
  );
}
