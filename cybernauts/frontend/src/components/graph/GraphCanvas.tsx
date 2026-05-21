import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useStore } from '../../store/useStore';
import { UserNode, HighScoreNode, LowScoreNode } from './UserNode';
import toast from 'react-hot-toast';
import type { UserNodeData } from './UserNode';

const NODE_TYPES = {
  userNode: UserNode,
  HighScoreNode,
  LowScoreNode,
};

interface Props {
  onNodeClick: (id: string) => void;
  pendingHobbyDrop: { nodeId: string; hobby: string } | null;
  onHobbyDropHandled: () => void;
}

// Deterministic layout via simple circle arrangement
function circleLayout(count: number, radius = 380): { x: number; y: number }[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  });
}

export function GraphCanvas({ onNodeClick, pendingHobbyDrop, onHobbyDropHandled }: Props) {
  const { graph, users, linkUsers, updateUser, setSelectedUser } = useStore();
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<UserNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);

  // Build RF nodes from graph data
  useEffect(() => {
    if (!graph) return;

    const positions = positionsRef.current;
    const nodeIds = graph.nodes.map((n) => n.id);

    // Assign positions to new nodes only
    const freshPositions = circleLayout(nodeIds.length, Math.max(200, nodeIds.length * 50));
    nodeIds.forEach((id, i) => {
      if (!positions[id]) {
        positions[id] = freshPositions[i] ?? { x: Math.random() * 600, y: Math.random() * 400 };
      }
    });

    const newNodes: Node<UserNodeData>[] = graph.nodes.map((n) => {
      const isHigh = n.popularityScore > 5;
      return {
        id: n.id,
        type: isHigh ? 'HighScoreNode' : 'LowScoreNode',
        position: positions[n.id],
        data: {
          username: n.username,
          age: n.age,
          popularityScore: n.popularityScore,
          isConnecting: connectingNodeId !== null && connectingNodeId !== n.id,
        },
      };
    });

    const newEdges: Edge[] = graph.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      style: { stroke: '#3f4a5c', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.Arrow, color: '#3f4a5c' },
    }));

    setRfNodes(newNodes);
    setRfEdges(newEdges);
  }, [graph, connectingNodeId]);

  // Sync node positions back
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    positionsRef.current[node.id] = node.position;
  }, []);

  // Handle drag-connect between nodes → link users
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      try {
        await linkUsers(connection.source, connection.target);
        toast.success('Friendship created!');
      } catch (err: any) {
        toast.error(err.message ?? 'Could not connect users');
      }
      setConnectingNodeId(null);
    },
    [linkUsers]
  );

  const onConnectStart = useCallback((_: any, { nodeId }: { nodeId: string | null }) => {
    setConnectingNodeId(nodeId);
  }, []);

  const onConnectEnd = useCallback(() => {
    setConnectingNodeId(null);
  }, []);

  // Handle hobby drop onto a node
  useEffect(() => {
    if (!pendingHobbyDrop) return;
    const { nodeId, hobby } = pendingHobbyDrop;
    const user = users.find((u) => u.id === nodeId);
    if (!user) return;
    if (user.hobbies.includes(hobby)) {
      toast('Already has that hobby', { icon: '🎯' });
      onHobbyDropHandled();
      return;
    }
    updateUser(nodeId, { hobbies: [...user.hobbies, hobby] })
      .then(() => toast.success(`Added "${hobby}" to ${user.username}`))
      .catch((err: Error) => toast.error(err.message))
      .finally(onHobbyDropHandled);
  }, [pendingHobbyDrop]);

  const onNodeClickRF = useCallback(
    (_: any, node: Node) => {
      setSelectedUser(node.id);
      onNodeClick(node.id);
    },
    [onNodeClick, setSelectedUser]
  );

  // Drop from hobby sidebar onto canvas
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const hobby = e.dataTransfer.getData('hobby');
      if (!hobby) return;

      // Find which node is under the cursor — approximate via bounding box
      const wrapper = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - wrapper.left;
      const y = e.clientY - wrapper.top;

      // Find closest node position (using stored positions)
      let closestId: string | null = null;
      let closestDist = Infinity;

      rfNodes.forEach((n) => {
        // The flow canvas center is at half the container
        const nx = n.position.x + wrapper.width / 2;
        const ny = n.position.y + wrapper.height / 2;
        const dist = Math.hypot(nx - x, ny - y);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = n.id;
        }
      });

      if (closestId && closestDist < 80) {
        const user = users.find((u) => u.id === closestId);
        if (user) {
          if (user.hobbies.includes(hobby)) {
            toast('Already has that hobby', { icon: '🎯' });
            return;
          }
          updateUser(closestId, { hobbies: [...user.hobbies, hobby] })
            .then(() => toast.success(`Added "${hobby}" to ${user.username}`))
            .catch((err: Error) => toast.error(err.message));
        }
      }
    },
    [rfNodes, users, updateUser]
  );

  return (
    <div
      className="w-full h-full"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClickRF}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1e2535"
        />
        <Controls
          className="!bg-[#131720] !border-zinc-700 [&>button]:!bg-[#131720] [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800"
        />
        <MiniMap
          nodeColor={(n) => {
            const score = (n.data as UserNodeData)?.popularityScore ?? 0;
            if (score > 10) return '#f59e0b';
            if (score > 5) return '#10b981';
            return '#4b5563';
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-[#0f1520] !border-zinc-700 rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
