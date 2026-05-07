"use client";

/**
 * UboStructuurEditor — interactive UBO ownership-structure editor.
 * Companies = rectangle nodes, Persons = circle nodes.
 * Drag-and-drop, snap-to-connect, edge labels with ownership percentage.
 * Auto-saves to /api/ubo on every change (debounced 800 ms).
 */

import "@xyflow/react/dist/style.css";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  EdgeLabelRenderer,
  BaseEdge,
  getStraightPath,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  type OnConnect,
  Panel,
} from "@xyflow/react";
import { Building2, User, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeData {
  type: "BEDRIJF" | "PERSOON";
  naam: string;
  kvkNummer?: string;
  geboortedatum?: string;
  land?: string;
  isPep?: boolean;
  notities?: string;
  onChange: (id: string, data: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

interface EdgeData {
  type?: string;
  belang?: number;
  onLabelChange: (id: string, type: string, belang: number | undefined) => void;
  [key: string]: unknown;
}

// ─── Custom: Company node (rectangle) ────────────────────────────────────────

function BedrijfNode({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const [editing, setEditing] = useState(false);
  const [lokaalNaam, setLokaalNaam] = useState(d.naam);
  const [lokaalKvk, setLokaalKvk] = useState(d.kvkNummer ?? "");
  const [lokaalLand, setLokaalLand] = useState(d.land ?? "");

  function openEdit() {
    setLokaalNaam(d.naam);
    setLokaalKvk(d.kvkNummer ?? "");
    setLokaalLand(d.land ?? "");
    setEditing(true);
  }

  function save() {
    if (!lokaalNaam.trim()) return;
    d.onChange(id, { naam: lokaalNaam.trim(), kvkNummer: lokaalKvk || undefined, land: lokaalLand || undefined });
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-white shadow-sm min-w-[140px]",
        selected ? "border-blue-500 shadow-blue-200 shadow-md" : "border-gray-300",
        "cursor-grab active:cursor-grabbing"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} className="!bg-blue-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-blue-400 !w-3 !h-3" />

      {!editing ? (
        <div className="px-3 py-2 space-y-1" onDoubleClick={openEdit}>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 leading-tight">{d.naam || "Bedrijf"}</span>
            {d.isPep && <Badge variant="destructive" className="text-[10px] px-1 py-0">PEP</Badge>}
          </div>
          {d.kvkNummer && <p className="text-[10px] text-gray-500">KvK {d.kvkNummer}</p>}
          {d.land && <p className="text-[10px] text-gray-400">{d.land}</p>}
          <div className="flex items-center gap-1 pt-0.5">
            <button
              className="nodrag text-[10px] text-blue-500 hover:text-blue-700"
              onClick={openEdit}
            >
              Bewerken
            </button>
            <span className="text-gray-300">·</span>
            <button
              className="nodrag text-[10px] text-red-400 hover:text-red-600"
              onClick={() => d.onDelete(id)}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 space-y-1.5 nodrag w-52">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Naam *</Label>
            <Input
              value={lokaalNaam}
              onChange={(e) => setLokaalNaam(e.target.value)}
              className="h-6 text-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">KvK-nummer</Label>
            <Input value={lokaalKvk} onChange={(e) => setLokaalKvk(e.target.value)} className="h-6 text-xs" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Land</Label>
            <Input value={lokaalLand} onChange={(e) => setLokaalLand(e.target.value)} className="h-6 text-xs" />
          </div>
          <div className="flex gap-1">
            <button className="nodrag flex-1 text-[10px] bg-blue-600 text-white rounded px-2 py-1" onClick={save}>OK</button>
            <button className="nodrag text-[10px] border rounded px-2 py-1" onClick={() => setEditing(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom: Person node (circle) ─────────────────────────────────────────────

function PersoonNode({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const [editing, setEditing] = useState(false);
  const [lokaalNaam, setLokaalNaam] = useState(d.naam);
  const [lokaalGeb, setLokaalGeb] = useState(d.geboortedatum ?? "");
  const [lokaalPep, setLokaalPep] = useState(d.isPep ?? false);

  function openEdit() {
    setLokaalNaam(d.naam);
    setLokaalGeb(d.geboortedatum ?? "");
    setLokaalPep(d.isPep ?? false);
    setEditing(true);
  }

  function save() {
    if (!lokaalNaam.trim()) return;
    d.onChange(id, { naam: lokaalNaam.trim(), geboortedatum: lokaalGeb || undefined, isPep: lokaalPep });
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "rounded-full border-2 bg-white shadow-sm flex flex-col items-center justify-center",
        "min-w-[120px] min-h-[120px] relative",
        selected ? "border-green-500 shadow-green-200 shadow-md" : "border-gray-300",
        "cursor-grab active:cursor-grabbing"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} className="!bg-green-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-green-400 !w-3 !h-3" />

      {!editing ? (
        <div className="text-center px-3 space-y-1" onDoubleClick={openEdit}>
          <div className="flex flex-col items-center gap-0.5">
            <User className="h-5 w-5 text-green-600" />
            <span className="text-xs font-semibold text-gray-900 leading-tight">{d.naam || "Persoon"}</span>
            {d.isPep && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 flex items-center gap-0.5">
                <ShieldAlert className="h-2.5 w-2.5" /> PEP
              </Badge>
            )}
          </div>
          {d.geboortedatum && <p className="text-[10px] text-gray-400">{d.geboortedatum}</p>}
          <div className="flex items-center gap-1 justify-center pt-0.5">
            <button className="nodrag text-[10px] text-blue-500 hover:text-blue-700" onClick={openEdit}>
              Bewerken
            </button>
            <span className="text-gray-300">·</span>
            <button className="nodrag text-[10px] text-red-400 hover:text-red-600" onClick={() => d.onDelete(id)}>
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 space-y-1.5 nodrag w-44 rounded-xl bg-white border shadow-lg absolute z-10" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Naam *</Label>
            <Input value={lokaalNaam} onChange={(e) => setLokaalNaam(e.target.value)} className="h-6 text-xs" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Geboortedatum</Label>
            <Input type="date" value={lokaalGeb} onChange={(e) => setLokaalGeb(e.target.value)} className="h-6 text-xs" />
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer nodrag">
            <input type="checkbox" checked={lokaalPep} onChange={(e) => setLokaalPep(e.target.checked)} className="h-3 w-3 accent-red-600" />
            <span className="text-[10px] text-red-700 font-medium">PEP (art. 8 Wwft)</span>
          </label>
          <div className="flex gap-1">
            <button className="nodrag flex-1 text-[10px] bg-blue-600 text-white rounded px-2 py-1" onClick={save}>OK</button>
            <button className="nodrag text-[10px] border rounded px-2 py-1" onClick={() => setEditing(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom edge with ownership label ─────────────────────────────────────────

const RELATIE_TYPES = ["eigenaar", "bestuurder", "gevolmachtigde", "aandeelhouder", "commissaris"];

function OwnershipEdge({ id, sourceX, sourceY, targetX, targetY, data, selected }: EdgeProps) {
  const d = data as EdgeData;
  const [editing, setEditing] = useState(false);
  const [lokaalType, setLokaalType] = useState(d?.type ?? "eigenaar");
  const [lokaalBelang, setLokaalBelang] = useState<string>(d?.belang !== undefined ? String(d.belang) : "");

  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  function save() {
    d?.onLabelChange(id, lokaalType, lokaalBelang !== "" ? parseFloat(lokaalBelang) : undefined);
    setEditing(false);
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: selected ? "#3b82f6" : "#6b7280", strokeWidth: selected ? 2.5 : 1.5 }}
        markerEnd="url(#arrowhead)"
      />
      <EdgeLabelRenderer>
        <div
          style={{ position: "absolute", transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "all" }}
          className="nodrag nopan"
        >
          {!editing ? (
            <button
              onDoubleClick={() => setEditing(true)}
              onClick={() => setEditing(true)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                d?.type
                  ? "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                  : "bg-gray-50 border-dashed border-gray-300 text-gray-400 hover:border-blue-400"
              )}
            >
              {d?.type
                ? `${d.type}${d.belang !== undefined ? ` ${d.belang}%` : ""}`
                : "+ Relatie"}
            </button>
          ) : (
            <div className="bg-white border rounded-lg shadow-lg p-2 space-y-1.5 w-40" style={{ zIndex: 1000 }}>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Type relatie</Label>
                <select
                  value={lokaalType}
                  onChange={(e) => setLokaalType(e.target.value)}
                  className="w-full text-xs border rounded h-6 px-1"
                >
                  {RELATIE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Belang (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={lokaalBelang}
                  onChange={(e) => setLokaalBelang(e.target.value)}
                  placeholder="bijv. 51"
                  className="h-6 text-xs"
                />
              </div>
              <div className="flex gap-1">
                <button className="flex-1 text-[10px] bg-blue-600 text-white rounded px-2 py-1" onClick={save}>OK</button>
                <button className="text-[10px] border rounded px-2 py-1" onClick={() => setEditing(false)}>✕</button>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// ─── Node / edge type registrations ───────────────────────────────────────────

const nodeTypes = { BEDRIJF: BedrijfNode, PERSOON: PersoonNode };
const edgeTypes = { ownership: OwnershipEdge };

// ─── Helper to make a new cuid-like id client-side ────────────────────────────

function uid() {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Main editor component ────────────────────────────────────────────────────

interface UboStructuurEditorProps {
  clientId: string;
  readOnly?: boolean;
}

type FlowNode = Node<NodeData>;
type FlowEdge = Edge<EdgeData>;

export function UboStructuurEditor({ clientId, readOnly }: UboStructuurEditorProps) {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Callbacks that get embedded in node data ──

  const handleNodeDataChange = useCallback((nodeId: string, patch: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  }, [setNodes]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleEdgeLabelChange = useCallback(
    (edgeId: string, type: string, belang: number | undefined) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, type, belang } as EdgeData } : e
        )
      );
    },
    [setEdges]
  );

  // ── Load from API ──

  useEffect(() => {
    fetch(`/api/ubo?clientId=${clientId}`)
      .then((r) => r.json())
      .then(({ nodes: dbNodes, edges: dbEdges }) => {
        const flowNodes: FlowNode[] = dbNodes.map((n: {
          id: string; type: string; naam: string; kvkNummer?: string;
          geboortedatum?: string; land?: string; isPep?: boolean;
          notities?: string; posX: number; posY: number;
        }) => ({
          id: n.id,
          type: n.type as "BEDRIJF" | "PERSOON",
          position: { x: n.posX, y: n.posY },
          data: {
            type: n.type,
            naam: n.naam,
            kvkNummer: n.kvkNummer,
            geboortedatum: n.geboortedatum,
            land: n.land,
            isPep: n.isPep ?? false,
            notities: n.notities,
            onChange: handleNodeDataChange,
            onDelete: handleNodeDelete,
          },
        }));

        const flowEdges: FlowEdge[] = dbEdges.map((e: {
          id: string; vanId: string; naarId: string; type?: string; belang?: number;
        }) => ({
          id: e.id,
          source: e.vanId,
          target: e.naarId,
          type: "ownership",
          data: { type: e.type, belang: e.belang, onLabelChange: handleEdgeLabelChange },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [clientId, handleNodeDataChange, handleNodeDelete, handleEdgeLabelChange, setNodes, setEdges]);

  // ── Re-attach callbacks after re-render (closures go stale) ──
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, onChange: handleNodeDataChange, onDelete: handleNodeDelete },
      }))
    );
  // Only re-run when callbacks change, not on every nodes update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleNodeDataChange, handleNodeDelete]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...e.data, onLabelChange: handleEdgeLabelChange } as EdgeData,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleEdgeLabelChange]);

  // ── Auto-save (debounced) ──

  const save = useCallback(
    async (currentNodes: FlowNode[], currentEdges: FlowEdge[]) => {
      try {
        await fetch("/api/ubo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            nodes: currentNodes.map((n) => ({
              id: n.id,
              type: n.data.type,
              naam: n.data.naam,
              kvkNummer: n.data.kvkNummer,
              geboortedatum: n.data.geboortedatum,
              land: n.data.land,
              isPep: n.data.isPep,
              notities: n.data.notities,
              posX: n.position.x,
              posY: n.position.y,
            })),
            edges: currentEdges.map((e) => ({
              id: e.id,
              vanId: e.source,
              naarId: e.target,
              type: (e.data as EdgeData)?.type,
              belang: (e.data as EdgeData)?.belang,
            })),
          }),
        });
      } catch {
        toast({ title: "Opslaan mislukt — controleer uw verbinding", variant: "destructive" });
      }
    },
    [clientId]
  );

  // Trigger debounced save whenever nodes/edges change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(nodes, edges), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [nodes, edges, loaded, save]);

  // ── Add node ──

  function addNode(type: "BEDRIJF" | "PERSOON") {
    const id = uid();
    const newNode: FlowNode = {
      id,
      type,
      position: { x: 100 + Math.random() * 300, y: 80 + Math.random() * 200 },
      data: {
        type,
        naam: type === "BEDRIJF" ? "Nieuw bedrijf" : "Nieuwe persoon",
        onChange: handleNodeDataChange,
        onDelete: handleNodeDelete,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  // ── Connect nodes ──

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const edgeId = uid();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            type: "ownership",
            data: { onLabelChange: handleEdgeLabelChange },
          },
          eds
        )
      );
    },
    [setEdges, handleEdgeLabelChange]
  );

  if (!loaded) return <div className="flex items-center justify-center h-80 text-sm text-gray-400">Laden…</div>;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => addNode("BEDRIJF")} className="flex items-center gap-1 text-xs">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <Plus className="h-3 w-3" /> Bedrijf
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode("PERSOON")} className="flex items-center gap-1 text-xs">
            <User className="h-3.5 w-3.5 text-green-600" />
            <Plus className="h-3 w-3" /> Persoon
          </Button>
          <span className="text-xs text-gray-400 ml-2">
            Dubbelklik op een node om te bewerken · Verbind via de handles · Klik op de lijn om relatie in te stellen
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-green-600">
            <Save className="h-3 w-3" /> Auto-opslaan
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden" style={{ height: 480 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionRadius={40}
          snapToGrid
          snapGrid={[10, 10]}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#f0f0f0" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => (n.type === "BEDRIJF" ? "#3b82f6" : "#22c55e")}
            maskColor="rgba(0,0,0,0.05)"
            className="!bg-gray-50"
          />
          {nodes.length === 0 && !readOnly && (
            <Panel position="top-center">
              <div className="bg-white border rounded-lg shadow px-4 py-3 text-sm text-gray-500 text-center">
                <p className="font-medium text-gray-700">Nog geen structuur</p>
                <p className="text-xs mt-1">Klik op "+ Bedrijf" of "+ Persoon" om te beginnen</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {nodes.some((n) => (n.data as NodeData).isPep) && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          Een of meer personen in de structuur zijn gemarkeerd als PEP (art. 8 Wwft). Verscherpt cliëntenonderzoek vereist.
        </div>
      )}
    </div>
  );
}
