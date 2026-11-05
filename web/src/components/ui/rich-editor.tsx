import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Quote, Code } from 'lucide-react';
import { Button } from './button';

interface RichEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function RichEditor({ content, onChange, placeholder, minHeight = '150px' }: RichEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false },
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Comece a escrever...',
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[${minHeight}] cursor-text p-4`,
            },
        },
    });

    if (!editor) {
        return null;
    }

    const MenuButton = ({ onClick, isActive, children, title }: any) => (
        <Button
            size="icon"
            variant={isActive ? 'secondary' : 'ghost'}
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            className="h-7 w-7"
            title={title}
        >
            {children}
        </Button>
    );

    return (
        <div className='border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all bg-white dark:bg-[#121214]'>
            <div className='bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 px-2 py-1.5 flex items-center gap-1'>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Negrito"
                >
                    <Bold size={16} />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Itálico"
                >
                    <Italic size={16} />
                </MenuButton>
                <div className='w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1' />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Lista"
                >
                    <List size={16} />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Lista Numerada"
                >
                    <ListOrdered size={16} />
                </MenuButton>
                <div className='w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1' />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Citação"
                >
                    <Quote size={16} />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Bloco de Código"
                >
                    <Code size={16} />
                </MenuButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
