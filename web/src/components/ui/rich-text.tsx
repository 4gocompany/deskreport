import Markdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';

// Descrição e comentários chegam em três formatos: HTML do editor, Markdown puro dos agentes
// e Markdown dos agentes embrulhado em <p> com <br> pela API. Tudo vira Markdown antes de exibir,
// e o react-markdown não renderiza HTML bruto, então nada do conteúdo vira script na tela.
export function toMarkdown(content: string) {
  if (!/<[a-z][\s\S]*>/i.test(content)) return content;
  const doc = new DOMParser().parseFromString(content, 'text/html');
  return nodeToMarkdown(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}

function nodeToMarkdown(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent;
      return;
    }
    if (!(child instanceof HTMLElement)) return;

    const tag = child.tagName.toLowerCase();
    const inner = nodeToMarkdown(child);

    if (tag === 'br') out += '\n';
    else if (tag === 'p' || tag === 'div') out += `${inner}\n\n`;
    else if (tag === 'strong' || tag === 'b') out += `**${inner}**`;
    else if (tag === 'em' || tag === 'i') out += `*${inner}*`;
    else if (tag === 'code') out += `\`${inner}\``;
    else if (tag === 'pre') out += `\`\`\`\n${child.textContent}\n\`\`\`\n\n`;
    else if (/^h[1-6]$/.test(tag)) out += `${'#'.repeat(Number(tag[1]))} ${inner}\n\n`;
    else if (tag === 'a') out += `[${inner}](${child.getAttribute('href') || ''})`;
    else if (tag === 'blockquote') out += `${prefixLines(inner.trim(), '> ', '> ')}\n\n`;
    else if (tag === 'ul' || tag === 'ol') out += `${listToMarkdown(child, tag === 'ol')}\n\n`;
    else out += inner;
  });
  return out;
}

function listToMarkdown(list: HTMLElement, ordered: boolean) {
  const items = Array.from(list.children).map((item, index) => {
    const text = nodeToMarkdown(item).trim().replace(/\n{2,}/g, '\n');
    const marker = ordered ? `${index + 1}. ` : '- ';
    return prefixLines(text, marker, ' '.repeat(marker.length));
  });
  return items.join('\n');
}

function prefixLines(text: string, first: string, rest: string) {
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? first : rest) + line)
    .join('\n');
}

// Quebra de linha simples também quebra na tela, como o usuário digitou
function withLineBreaks(markdown: string) {
  return markdown.replace(/\n/g, '  \n');
}

// O editor trabalha com HTML, então o conteúdo entra já formatado e não com os caracteres crus
export function toEditorHtml(content: string) {
  if (!content) return '';
  return renderToStaticMarkup(<Markdown>{withLineBreaks(toMarkdown(content))}</Markdown>);
}

export function RichText({ content }: { content: string }) {
  return (
    <div className='prose prose-sm dark:prose-invert max-w-none break-words text-zinc-700 dark:text-zinc-300 leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2 prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-pre:bg-zinc-950 prose-pre:text-zinc-200 prose-a:text-blue-500'>
      <Markdown>{withLineBreaks(toMarkdown(content))}</Markdown>
    </div>
  );
}
