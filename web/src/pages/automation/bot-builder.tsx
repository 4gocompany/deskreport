import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Handle,
  Position,
  NodeProps,
  ConnectionLineType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Play,
  Save,
  MessageSquare,
  Zap,
  UserPlus,
  Sparkles,
  MousePointer2,
  MoreHorizontal,
  Layers,
  Settings2 as SettingsIcon
} from 'lucide-react';
import { } from 'react-router-dom';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useTenant } from '../../hooks/useTenant';

// --- Custom Node Types ---

// Trigger Node
const TriggerNode = ({ data }: NodeProps) => (
  <div className='flex items-center gap-3 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-md px-5 py-2.5 min-w-[200px]'>
    <Zap size={14} className='text-amber-500' fill='currentColor' />
    <span className='text-[10px] font-black text-zinc-900 dark:text-zinc-100'>{data.label as string}</span>
    <Handle type="source" position={Position.Bottom} className='w-3 h-3 bg-zinc-900 dark:bg-zinc-100 border-2 border-white dark:border-zinc-950 !-bottom-1.5' />
  </div>
);

// Message Node
const MessageNode = ({ data, selected }: NodeProps) => (
  <div className={`w-[300px] bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-md overflow-hidden transition-all ${selected ? 'ring-2 ring-zinc-500 ring-offset-2' : ''}`}>
    <Handle type="target" position={Position.Top} className='w-3 h-3 bg-zinc-900 dark:bg-zinc-100 border-2 border-white dark:border-zinc-950 !-top-1.5' />
    <div className='p-2.5 border-b-2 border-zinc-900 dark:border-zinc-100 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800'>
      <div className='flex items-center gap-2'>
        <MessageSquare size={12} className='text-zinc-900 dark:text-zinc-100' />
        <span className='text-[8px] font-black text-zinc-600 dark:text-zinc-400'>{data.label as string}</span>
      </div>
      <MoreHorizontal size={12} className='text-zinc-400' />
    </div>
    <div className='p-3'>
      <p className='text-[11px] text-zinc-700 dark:text-zinc-300 font-bold leading-tight line-clamp-3'>
        {data.content as string || 'Clique para editar a mensagem...'}
      </p>
    </div>
    <Handle type="source" position={Position.Bottom} className='w-3 h-3 bg-zinc-900 dark:bg-zinc-100 border-2 border-white dark:border-zinc-950 !-bottom-1.5' />
  </div>
);

// AI Node
const AINode = ({ data, selected }: NodeProps) => (
  <div className={`w-[350px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-md overflow-hidden transition-all ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
    <Handle type="target" position={Position.Top} className='w-3 h-3 bg-zinc-900 dark:bg-zinc-100 border-2 border-white dark:border-zinc-950 !-top-1.5' />
    <div className='p-3 flex items-center justify-between bg-zinc-800 dark:bg-zinc-200'>
      <div className='flex items-center gap-2'>
        <Sparkles size={14} fill='currentColor' className='animate-pulse' />
        <span className='text-[9px] font-black'>{data.label as string}</span>
      </div>
      <div className='flex items-center gap-1.5 px-1.5 py-0.5 bg-zinc-900 dark:bg-zinc-300 rounded-sm'>
        <div className='w-1 h-1 rounded-full bg-emerald-400'></div>
        <span className='text-[7px] font-bold'>CORTEX</span>
      </div>
    </div>
    <div className='p-4 border-t border-zinc-700 dark:border-zinc-300'>
      <p className='text-[10px] font-bold opacity-80 line-clamp-2'>{data.instruction as string || 'Defina o comportamento da IA...'}</p>

      <div className='flex gap-2 mt-4'>
        {(data.options as string[] || ['Default']).map((opt, i) => (
          <div key={i} className='flex-1 p-2 bg-zinc-800 dark:bg-zinc-100 rounded border border-zinc-700 dark:border-zinc-300 relative text-center text-[8px] font-black truncate'>
            {opt}
            <Handle
              type="source"
              position={Position.Bottom}
              id={`option-${i}`}
              className='w-2.5 h-2.5 bg-zinc-900 dark:bg-white border-2 border-indigo-500 rounded-full !-bottom-1.25'
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Transfer Node
const TransferNode = ({ data, selected }: NodeProps) => (
  <div className={`flex items-center gap-4 bg-emerald-500 text-white border-2 border-zinc-900 dark:border-zinc-100 rounded-md px-5 py-3 transition-all ${selected ? 'ring-2 ring-emerald-300 ring-offset-2' : ''}`}>
    <Handle type="target" position={Position.Top} className='w-3 h-3 bg-emerald-500 border-2 border-white !-top-1.5' />
    <UserPlus size={16} />
    <div className='flex flex-col'>
      <span className='text-[8px] font-black opacity-80'>{data.label as string}</span>
      <span className='text-xs font-bold leading-none'>{data.sector as string}</span>
    </div>
  </div>
);

const nodeTypesMapping = {
  trigger: TriggerNode,
  message: MessageNode,
  ai: AINode,
  transfer: TransferNode,
};

// --- Main Component ---

export default function BotBuilder() {
  const initialNodes: Node[] = [
    { id: '1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Trigger: Novo Contato' } },
    { id: '2', type: 'message', position: { x: 200, y: 100 }, data: { label: 'Saudação Inicial', content: 'Olá! Sou o assistente virtual da 4Go. Como posso te ajudar hoje?' } },
    { id: '3', type: 'ai', position: { x: 175, y: 250 }, data: { label: 'Triagem Cortex', instruction: 'Identifique se o cliente quer suporte técnico, financeiro ou falar com vendas.', options: ['Suporte', 'Financeiro', 'Vendas'] } },
    { id: '4', type: 'transfer', position: { x: 100, y: 450 }, data: { label: 'Transbordo Suporte', sector: 'Suporte N1' } },
    { id: '5', type: 'transfer', position: { x: 400, y: 450 }, data: { label: 'Transbordo Vendas', sector: 'Comercial' } },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', style: { strokeWidth: 2, stroke: '#18181b' } },
    { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', style: { strokeWidth: 2, stroke: '#18181b' } },
    { id: 'e3-4', source: '3', target: '4', sourceHandle: 'option-0', type: 'smoothstep', style: { strokeWidth: 2, stroke: '#10b981' } },
    { id: 'e3-5', source: '3', target: '5', sourceHandle: 'option-2', type: 'smoothstep', style: { strokeWidth: 2, stroke: '#f59e0b' } },
  ];

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      // Track selection
      const selectChange = changes.find(c => c.type === 'select');
      if (selectChange && 'selected' in selectChange && selectChange.selected) {
        setSelectedId(selectChange.id);
      }
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', style: { strokeWidth: 2, stroke: '#18181b' } }, eds)),
    []
  );

  const { companyUrl } = useTenant();

  const navigation = [
    { name: 'Modelos de mensagens', to: companyUrl('automation/templates') },
    { name: 'Mensagens automáticas', to: companyUrl('automation/flow') },
    { name: 'Construtor de Bots', to: companyUrl('automation/list') },
  ];

  const sidebarNodeTypes = [
    { type: 'message', icon: <MessageSquare size={16} />, label: 'Mensagem', desc: 'Envio de texto simples' },
    { type: 'ai', icon: <Sparkles size={16} />, label: 'Agente de IA', desc: 'Processamento natural' },
    { type: 'transfer', icon: <UserPlus size={16} />, label: 'Transbordo', desc: 'Humano responsável' },
  ];

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);

  const updateSelectedNodeData = (updates: any) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedId) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      })
    );
  };

  return (
    <Page navigation={navigation}>
      <Topbar title='Automações' inputSearch='off' />

      <div className='flex h-[calc(100vh-68px)] bg-white dark:bg-zinc-950 transition-colors overflow-hidden relative'>

        {/* Sidebar: Draggable Components */}
        <div className='w-64 border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col z-20 shrink-0'>
          <div className='p-6 border-b border-zinc-50 dark:border-zinc-800'>
            <h3 className='font-black text-[10px] text-zinc-400'>Blocos Disponíveis</h3>
          </div>
          <div className='flex-1 overflow-y-auto p-4 space-y-1'>
            {sidebarNodeTypes.map((node, i) => (
              <button key={i} className='w-full flex items-center gap-3 p-2.5 rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 group transition-all text-left'>
                <div className='w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100'>
                  {node.icon}
                </div>
                <div>
                  <div className='text-[12px] font-bold text-zinc-900 dark:text-zinc-100'>{node.label}</div>
                  <div className='text-[9px] text-zinc-400 font-medium leading-none'>{node.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className='flex-1 relative bg-zinc-50 dark:bg-zinc-950 overflow-hidden'>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypesMapping}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            className='bg-zinc-50 dark:bg-zinc-950'
          >
            <Background color='#000' gap={40} />
            <Controls className='!bg-white !dark:bg-zinc-900 !border-2 !border-zinc-900 !dark:border-zinc-100 !rounded-md !shadow-none' />

            <Panel position="top-center" className='z-40'>
              <div className='flex items-center gap-4 px-6 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 rounded-md'>
                <div className='flex items-center gap-3'>
                  <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></div>
                  <span className='text-[11px] font-black text-zinc-900 dark:text-zinc-100'>Workflow: Atendimento Cortex</span>
                </div>
                <div className='w-px h-4 bg-zinc-200 dark:bg-zinc-800'></div>
                <div className='flex items-center gap-2'>
                  <button className='flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 px-4 py-1.5 rounded text-[10px] font-black hover:opacity-80 transition-all'>
                    <Save size={14} /> Salvar
                  </button>
                  <button className='w-8 h-8 flex items-center justify-center border-2 border-zinc-900 dark:border-zinc-100 rounded text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'>
                    <Play size={14} />
                  </button>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Inspector Panel */}
        <div className='w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col z-20 shrink-0'>
          <div className='h-16 px-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between'>
            <h3 className='font-black text-[11px] text-zinc-500 dark:text-zinc-400'>Configurações</h3>
            <SettingsIcon size={14} className='text-zinc-400' />
          </div>

          <div className='flex-1 overflow-y-auto p-6'>
            {selectedNode ? (
              <div className='space-y-8 animate-in fade-in slide-in-from-right-2 duration-300'>
                <div className='flex flex-col gap-4'>
                  <div className='w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center text-white dark:text-zinc-950'>
                    {selectedNode.type === 'message' && <MessageSquare size={24} />}
                    {selectedNode.type === 'ai' && <Sparkles size={24} />}
                    {selectedNode.type === 'transfer' && <UserPlus size={24} />}
                    {selectedNode.type === 'trigger' && <Zap size={24} />}
                  </div>
                  <div>
                    <h4 className='text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none'>{selectedNode.data.label as string}</h4>
                    <p className='text-[10px] text-zinc-400 font-bold mt-1'>Módulo Operacional</p>
                  </div>
                </div>

                <div className='space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-800'>
                  <div className='space-y-2.5'>
                    <label className='text-[10px] font-black text-zinc-400'>Título do Bloco</label>
                    <input
                      type="text"
                      className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-400 transition-all'
                      value={selectedNode.data.label as string}
                      onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
                    />
                  </div>

                  {selectedNode.type === 'message' && (
                    <div className='space-y-2.5'>
                      <label className='text-[10px] font-black text-zinc-400'>Conteúdo da Mensagem</label>
                      <textarea
                        rows={6}
                        className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-3 text-[11px] font-bold outline-none leading-relaxed focus:ring-1 focus:ring-zinc-400 transition-all'
                        value={selectedNode.data.content as string}
                        onChange={(e) => updateSelectedNodeData({ content: e.target.value })}
                      />
                    </div>
                  )}

                  {selectedNode.type === 'ai' && (
                    <div className='space-y-2.5'>
                      <label className='text-[10px] font-black text-zinc-400'>System Prompt (Cortex)</label>
                      <textarea
                        rows={8}
                        className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-zinc-400 transition-all'
                        value={selectedNode.data.instruction as string}
                        onChange={(e) => updateSelectedNodeData({ instruction: e.target.value })}
                      />
                    </div>
                  )}

                  {selectedNode.type === 'transfer' && (
                    <div className='space-y-2.5'>
                      <label className='text-[10px] font-black text-zinc-400'>Departamento</label>
                      <select
                        className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-400 transition-all'
                        value={selectedNode.data.sector as string}
                        onChange={(e) => updateSelectedNodeData({ sector: e.target.value })}
                      >
                        <option>Suporte N1</option>
                        <option>Financeiro</option>
                        <option>Comercial</option>
                        <option>Vendas</option>
                      </select>
                    </div>
                  )}

                  <div className='p-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md border-2 border-zinc-900'>
                    <div className='flex items-center gap-2 mb-3 opacity-60'>
                      <Layers size={12} />
                      <span className='text-[9px] font-black'>Output Data</span>
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {['last_msg', 'customer_name', 'id_flow'].map(tag => (
                        <span key={tag} className='px-1.5 py-1 bg-white/10 dark:bg-zinc-900/10 rounded-sm text-[9px] font-mono font-bold'>{`{{${tag}}}`}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='h-full flex flex-col items-center justify-center opacity-20 text-center grayscale'>
                <MousePointer2 size={40} className='mb-4' />
                <p className='text-xs font-black'>Selecione para<br />configurar o fluxo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
