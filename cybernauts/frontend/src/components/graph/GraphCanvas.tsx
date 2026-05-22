import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
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


function GraphCanvasInner({ onNodeClick, pendingHobbyDrop, onHobbyDropHandled }: Props) {
  const { graph, users, linkUsers, updateUser, setSelectedUser } = useStore();
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<UserNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  

  const { project } = useReactFlow();


  useEffect(() => {
    if (!graph?.nodes) return;

    const positions = positionsRef.current;
    const nodeIds = graph.nodes.map((n) => n.id);
    const freshPositions = circleLayout(nodeIds.length, Math.max(200, nodeIds.length * 50));

    nodeIds.forEach((id, i) => {
      if (!positions[id]) {
        positions[id] = freshPositions[i] ?? { x: Math.random() * 200, y: Math.random() * 200 };
      }
    });


    setRfNodes((prevNodes) =>
      graph.nodes.map((n) => {
        const isHigh = n.popularityScore > 5;
        const fallbackPos = positions[n.id] ?? { x: 0, y: 0 };
        const existingNode = prevNodes.find((p) => p.id === n.id);
        
        return {
          id: n.id,
          type: isHigh ? 'HighScoreNode' : 'LowScoreNode',
          position: existingNode ? existingNode.position : fallbackPos,
          data: {
            username: n.username,
            age: n.age,
            popularityScore: n.popularityScore,
            isConnecting: connectingNodeId !== null && connectingNodeId !== n.id,
          },
        };
      })
    );

    setRfEdges(
      graph.edges.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        style: { stroke: '#3f4a5c', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.Arrow, color: '#3f4a5c' },
      }))
    );
  }, [graph, connectingNodeId, setRfNodes, setRfEdges]);


  const onNodeDragStop = useCallback((_: any, node: Node) => {
    positionsRef.current[node.id] = node.position;
  }, []);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return; // Prevent self-connections
      
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


  useEffect(() => {
    if (!pendingHobbyDrop) return;
    const { nodeId, hobby } = pendingHobbyDrop;
    const user = users.find((u) => u.id === nodeId);
    if (!user) return;
    
    if (user.hobbies?.includes(hobby)) {
      toast('Already has that hobby', { icon: '🎯' });
      onHobbyDropHandled();
      return;
    }

    updateUser(nodeId, { hobbies: [...(user.hobbies ?? []), hobby] })
      .then(() => toast.success(`Added "${hobby}" to ${user.username}`))
      .catch((err: Error) => toast.error(err.message || 'Failed to update hobbies'))
      .finally(onHobbyDropHandled);
  }, [pendingHobbyDrop, users, updateUser, onHobbyDropHandled]);

  const onNodeClickRF = useCallback(
    (_: any, node: Node) => {
      setSelectedUser(node.id);
      onNodeClick(node.id);
    },
    [onNodeClick, setSelectedUser]
  );


  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const hobby = e.dataTransfer.getData('hobby');
      if (!hobby) return;

      const wrapper = (e.currentTarget as HTMLElement).getBoundingClientRect();
      

      const projectCanvasCoord = project({
        x: e.clientX - wrapper.left,
        y: e.clientY - wrapper.top,
      });

      let closestId: string | null = null;
      let closestDist = Infinity;


      rfNodes.forEach((n) => {
        const dist = Math.hypot(n.position.x - projectCanvasCoord.x, n.position.y - projectCanvasCoord.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = n.id;
        }
      });


      if (closestId && closestDist < 75) {
        const user = users.find((u) => u.id === closestId);
        if (user) {
          const currentHobbies = user.hobbies ?? [];
          if (currentHobbies.includes(hobby)) {
            toast('Already has that hobby', { icon: '🎯' });
            return;
          }
          updateUser(closestId, { hobbies: [...currentHobbies, hobby] })
            .then(() => toast.success(`Added "${hobby}" to ${user.username}`))
            .catch((err: Error) => toast.error(err.message || 'Failed to add hobby'));
        }
      }
    },
    [rfNodes, users, updateUser, project]
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


export function GraphCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}