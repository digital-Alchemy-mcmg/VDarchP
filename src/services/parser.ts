import { DAGEdge, DAGGraph, DAGNode, IngestionProposal, NodeType } from '../types/dag';
import { computeDAGLayout } from './dagLayout';

/**
 * Normalizes text to a clean high-density monospace ID (e.g. COMP-AUTH-01, JUNC-GATEWAY)
 */
export function formatMonospaceId(raw: string, type: NodeType = 'component', index?: number): string {
  const sanitized = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  let prefix = 'COMP';
  if (type === 'junction') prefix = 'JUNC';
  else if (type === 'datastore') prefix = 'STORE';
  else if (type === 'gateway') prefix = 'GW';
  else if (type === 'service') prefix = 'SVC';
  else if (type === 'external') prefix = 'EXT';

  if (!sanitized) {
    return `${prefix}-${String(index || 1).padStart(2, '0')}`;
  }

  // If already starts with a known prefix, preserve it
  if (
    sanitized.startsWith('COMP-') ||
    sanitized.startsWith('JUNC-') ||
    sanitized.startsWith('STORE-') ||
    sanitized.startsWith('GW-') ||
    sanitized.startsWith('SVC-') ||
    sanitized.startsWith('EXT-')
  ) {
    return sanitized;
  }

  return `${prefix}-${sanitized}`;
}

/**
 * Deterministic Mermaid Diagram Parser
 */
export function parseMermaidToDAG(source: string): IngestionProposal {
  const lines = source.split('\n');
  const nodeMap = new Map<string, { label: string; shape: string }>();
  const rawEdges: { sourceRaw: string; targetRaw: string; label?: string }[] = [];

  // Patterns for Mermaid shapes:
  // id[(database)] -> datastore
  // id{decision/gateway} -> junction/gateway
  // id([stadium/queue]) -> junction
  // id((circle)) -> gateway/external
  // id>flag] -> external
  // id[rect] -> component
  // id(rounded) -> service
  const nodeDefRegex = /([a-zA-Z0-9_.-]+)\s*(\[\(|\{\{|\(\[|\[\[|\[\(|[\(\[\{\>])\s*([^\]\)\}\>]+)\s*(\]\)|\]\]|\)\/|\)\/|\}\}|\)\]|\)\)|[\]\)\}\>])/g;

  // Edge patterns:
  // A --> B
  // A -->|label| B
  // A -- label --> B
  // A -.-> B
  // A ==> B
  // A --- B
  const edgeRegex = /([a-zA-Z0-9_.-]+)\s*(?:(?:-->|==>|-\.->|---|--)\s*(?:\|([^|]+)\|)?\s*|(?:--\s*([^->]+)\s*-->))\s*([a-zA-Z0-9_.-]+)/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('%%') ||
      trimmed.startsWith('graph ') ||
      trimmed.startsWith('flowchart ') ||
      trimmed.startsWith('subgraph ') ||
      trimmed === 'end'
    ) {
      continue;
    }

    // Check node definitions
    let match: RegExpExecArray | null;
    while ((match = nodeDefRegex.exec(trimmed)) !== null) {
      const rawId = match[1].trim();
      const openBracket = match[2];
      const label = match[3].trim();
      nodeMap.set(rawId, { label, shape: openBracket });
    }

    // Check edges
    while ((match = edgeRegex.exec(trimmed)) !== null) {
      const src = match[1].trim();
      const edgeLabel = match[2] || match[3] || undefined;
      const tgt = match[4].trim();

      if (src && tgt) {
        rawEdges.push({ sourceRaw: src, targetRaw: tgt, label: edgeLabel?.trim() });

        if (!nodeMap.has(src)) {
          nodeMap.set(src, { label: src, shape: '[' });
        }
        if (!nodeMap.has(tgt)) {
          nodeMap.set(tgt, { label: tgt, shape: '[' });
        }
      }
    }
  }

  // If no edges or nodes matched via strict regex, fallback to splitting lines by arrows
  if (nodeMap.size === 0 && rawEdges.length === 0) {
    return parseTextToDAG(source);
  }

  // Classify node types and assign clean monospace IDs
  const idMapping = new Map<string, string>();
  const nodes: DAGNode[] = [];
  let index = 1;

  for (const [rawId, info] of nodeMap.entries()) {
    let type: NodeType = 'component';
    let tier: DAGNode['tier'] = 'core';

    // Heuristics for type and tier
    if (info.shape.includes('{') || rawId.toLowerCase().includes('gateway') || rawId.toLowerCase().includes('router') || rawId.toLowerCase().includes('decision')) {
      type = 'junction';
      tier = 'ingress';
    } else if (info.shape.includes('[(') || rawId.toLowerCase().includes('db') || rawId.toLowerCase().includes('store') || rawId.toLowerCase().includes('sql') || rawId.toLowerCase().includes('redis')) {
      type = 'datastore';
      tier = 'storage';
    } else if (info.shape.includes('([') || rawId.toLowerCase().includes('queue') || rawId.toLowerCase().includes('kafka') || rawId.toLowerCase().includes('event')) {
      type = 'junction';
      tier = 'core';
    } else if (info.shape.includes('((') || rawId.toLowerCase().includes('cdn') || rawId.toLowerCase().includes('api') || rawId.toLowerCase().includes('client')) {
      type = 'gateway';
      tier = 'edge';
    } else if (info.shape.includes('>') || rawId.toLowerCase().includes('ext') || rawId.toLowerCase().includes('thirdparty')) {
      type = 'external';
      tier = 'external';
    } else if (info.shape.includes('(') || rawId.toLowerCase().includes('service')) {
      type = 'service';
      tier = 'core';
    }

    const cleanId = formatMonospaceId(rawId, type, index++);
    idMapping.set(rawId, cleanId);

    const displayName = info.label && info.label !== rawId ? info.label : rawId.replace(/_/g, ' ');

    nodes.push({
      id: cleanId,
      name: displayName,
      type,
      description: `Discovered from Mermaid topology (${type} tier: ${tier})`,
      tier,
      status: 'DRAFT',
      artifacts: [
        {
          id: `art-${cleanId.toLowerCase()}-spec`,
          title: `${displayName} Specification`,
          url: `https://specs.internal/architecture/${cleanId.toLowerCase()}`,
          type: type === 'junction' ? 'openapi' : 'repository',
        },
      ],
      requiredItems: [
        {
          id: `req-${cleanId.toLowerCase()}-1`,
          title: 'Interface Contract & Payload Schema Approved',
          completed: false,
          category: 'architecture',
        },
        {
          id: `req-${cleanId.toLowerCase()}-2`,
          title: 'Security Boundary & RBAC Scopes Verified',
          completed: false,
          category: 'security',
        },
        {
          id: `req-${cleanId.toLowerCase()}-3`,
          title: 'Observability & Distributed Tracing Headers Configured',
          completed: false,
          category: 'infrastructure',
        },
      ],
      junctionSchema:
        type === 'junction'
          ? {
              name: `${cleanId.toLowerCase()}-schema.json`,
              content: JSON.stringify(
                {
                  $schema: 'https://json-schema.org/draft/2020-12/schema',
                  title: `${displayName} Payload Schema`,
                  type: 'object',
                  required: ['traceId', 'timestamp', 'payload'],
                  properties: {
                    traceId: { type: 'string', format: 'uuid' },
                    timestamp: { type: 'string', format: 'date-time' },
                    payload: { type: 'object' },
                  },
                },
                null,
                2
              ),
              sizeBytes: 340,
              format: 'json',
              lastModified: new Date().toISOString(),
            }
          : undefined,
      provenance: {
        interfaceContract: type === 'junction' ? 'JSON-Schema / CloudEvents 1.0' : 'gRPC / Protobuf v3',
        protocol: tier === 'edge' ? 'HTTPS / HTTP/2' : 'mTLS / TCP',
        sla: 'p99 < 15ms',
      },
      position: { x: 0, y: 0 },
    });
  }

  // Construct edges
  const edges: DAGEdge[] = [];
  const edgeSet = new Set<string>();

  for (const rawEdge of rawEdges) {
    const srcId = idMapping.get(rawEdge.sourceRaw);
    const tgtId = idMapping.get(rawEdge.targetRaw);

    if (srcId && tgtId && srcId !== tgtId) {
      const edgeKey = `${srcId}->${tgtId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `edge-${srcId}-${tgtId}`.toLowerCase(),
          source: srcId,
          target: tgtId,
          label: rawEdge.label || undefined,
          protocol: rawEdge.label?.includes('gRPC') ? 'gRPC' : rawEdge.label?.includes('Kafka') ? 'Kafka' : 'HTTPS',
        });
      }
    }
  }

  // Compute initial layout
  const layout = computeDAGLayout(nodes, edges);

  const graph: DAGGraph = {
    id: `dag-${Date.now()}`,
    title: 'Ingested Architecture DAG',
    description: `Parsed from Mermaid diagram containing ${nodes.length} components and ${edges.length} connections.`,
    version: 1,
    updatedAt: new Date().toISOString(),
    isLocked: false,
    nodes: layout.nodes,
    edges: layout.edges,
    rawSource: source,
    sourceType: 'mermaid',
  };

  const junctionCount = nodes.filter((n) => n.type === 'junction').length;
  const tiers = Array.from(new Set(nodes.map((n) => n.tier)));

  return {
    graph,
    confidence: 0.95,
    summary: {
      componentCount: nodes.length,
      junctionCount,
      edgeCount: edges.length,
      detectedTiers: tiers,
      potentialIssues: layout.hasCycles ? ['Cycles detected in topology graph! Kahn algorithm identified circular dependency.'] : [],
    },
  };
}

/**
 * Fallback parser for plain text and Markdown specifications
 */
export function parseTextToDAG(source: string): IngestionProposal {
  const lines = source.split('\n');
  const discoveredNodes = new Map<string, { name: string; type: NodeType; tier: DAGNode['tier'] }>();
  const discoveredEdges: { from: string; to: string; label?: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Pattern: NodeA -> NodeB or NodeA --> NodeB (optional: [label])
    const arrowMatch = trimmed.match(/([a-zA-Z0-9_\s-]+)(?:->|-->|=>|to)\s*([a-zA-Z0-9_\s-]+)(?:\s*\[(.*?)\]|\s*\((.*?)\))?/i);
    if (arrowMatch) {
      const srcName = arrowMatch[1].trim().replace(/^[-*•\d.]+\s*/, '');
      const tgtName = arrowMatch[2].trim().replace(/^[-*•\d.]+\s*/, '');
      const label = (arrowMatch[3] || arrowMatch[4] || '').trim();

      if (srcName && tgtName) {
        if (!discoveredNodes.has(srcName)) {
          discoveredNodes.set(srcName, {
            name: srcName,
            type: inferNodeTypeFromName(srcName),
            tier: inferTierFromName(srcName),
          });
        }
        if (!discoveredNodes.has(tgtName)) {
          discoveredNodes.set(tgtName, {
            name: tgtName,
            type: inferNodeTypeFromName(tgtName),
            tier: inferTierFromName(tgtName),
          });
        }
        discoveredEdges.push({ from: srcName, to: tgtName, label: label || undefined });
      }
    } else {
      // Bullet list item: - Service: Description
      const bulletMatch = trimmed.match(/^[-*•]\s*([a-zA-Z0-9_\s-]+)(?::\s*(.*))?$/);
      if (bulletMatch) {
        const name = bulletMatch[1].trim();
        if (name.length > 2 && !discoveredNodes.has(name)) {
          discoveredNodes.set(name, {
            name,
            type: inferNodeTypeFromName(name),
            tier: inferTierFromName(name),
          });
        }
      }
    }
  }

  // Create node objects with IDs
  const nodes: DAGNode[] = [];
  const nameToId = new Map<string, string>();
  let idx = 1;

  for (const [rawName, info] of discoveredNodes.entries()) {
    const id = formatMonospaceId(rawName, info.type, idx++);
    nameToId.set(rawName, id);

    nodes.push({
      id,
      name: info.name,
      type: info.type,
      description: `Discovered from specification document (${info.type})`,
      tier: info.tier,
      status: 'DRAFT',
      artifacts: [
        {
          id: `art-${id.toLowerCase()}`,
          title: `${info.name} Specification`,
          url: `https://docs.internal/services/${id.toLowerCase()}`,
          type: 'doc',
        },
      ],
      requiredItems: [
        {
          id: `req-${id.toLowerCase()}-1`,
          title: 'Interface Contract Defined',
          completed: false,
          category: 'architecture',
        },
        {
          id: `req-${id.toLowerCase()}-2`,
          title: 'Security Boundary Evaluated',
          completed: false,
          category: 'security',
        },
      ],
      provenance: {
        interfaceContract: 'REST / OpenAPI 3.1',
        protocol: 'HTTPS / TLS 1.3',
        sla: 'p99 < 50ms',
      },
      position: { x: 0, y: 0 },
    });
  }

  const edges: DAGEdge[] = [];
  const edgeSet = new Set<string>();

  for (const e of discoveredEdges) {
    const srcId = nameToId.get(e.from);
    const tgtId = nameToId.get(e.to);
    if (srcId && tgtId && srcId !== tgtId) {
      const key = `${srcId}->${tgtId}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          id: `edge-${srcId}-${tgtId}`.toLowerCase(),
          source: srcId,
          target: tgtId,
          label: e.label,
          protocol: 'HTTPS',
        });
      }
    }
  }

  const layout = computeDAGLayout(nodes, edges);

  const graph: DAGGraph = {
    id: `dag-${Date.now()}`,
    title: 'Text Ingested Architecture DAG',
    description: `Parsed plain text / markdown specification.`,
    version: 1,
    updatedAt: new Date().toISOString(),
    isLocked: false,
    nodes: layout.nodes,
    edges: layout.edges,
    rawSource: source,
    sourceType: 'markdown',
  };

  return {
    graph,
    confidence: 0.85,
    summary: {
      componentCount: nodes.length,
      junctionCount: nodes.filter((n) => n.type === 'junction').length,
      edgeCount: edges.length,
      detectedTiers: Array.from(new Set(nodes.map((n) => n.tier))),
      potentialIssues: layout.hasCycles ? ['Detected cycle in topological ordering.'] : [],
    },
  };
}

function inferNodeTypeFromName(name: string): NodeType {
  const lower = name.toLowerCase();
  if (lower.includes('junction') || lower.includes('queue') || lower.includes('router') || lower.includes('bus')) {
    return 'junction';
  }
  if (lower.includes('db') || lower.includes('database') || lower.includes('store') || lower.includes('cache') || lower.includes('redis') || lower.includes('postgres')) {
    return 'datastore';
  }
  if (lower.includes('gateway') || lower.includes('ingress') || lower.includes('proxy') || lower.includes('cdn')) {
    return 'gateway';
  }
  if (lower.includes('thirdparty') || lower.includes('stripe') || lower.includes('auth0') || lower.includes('external')) {
    return 'external';
  }
  if (lower.includes('service') || lower.includes('worker') || lower.includes('api')) {
    return 'service';
  }
  return 'component';
}

function inferTierFromName(name: string): DAGNode['tier'] {
  const lower = name.toLowerCase();
  if (lower.includes('edge') || lower.includes('cdn') || lower.includes('client') || lower.includes('ui') || lower.includes('spa')) {
    return 'edge';
  }
  if (lower.includes('gateway') || lower.includes('ingress') || lower.includes('proxy') || lower.includes('router')) {
    return 'ingress';
  }
  if (lower.includes('db') || lower.includes('store') || lower.includes('sql') || lower.includes('redis') || lower.includes('s3') || lower.includes('lake')) {
    return 'storage';
  }
  if (lower.includes('external') || lower.includes('stripe') || lower.includes('vendor')) {
    return 'external';
  }
  return 'core';
}


/**
 * Built-in production starter architecture DAGs
 */
export const SAMPLE_STARTER_DAGS = {
  ecommerce: `graph TD
    Client[Web & Mobile SPA Client] -->|HTTPS/TLS| APIGW{API Gateway & Router}
    APIGW -->|JWT Bearer| AuthSvc(Auth & Identity Service)
    APIGW -->|REST/HTTP2| CartSvc(Cart & Session Service)
    APIGW -->|REST/HTTP2| OrderSvc(Order Processing Service)
    AuthSvc -->|Session Cache| RedisStore[(Redis Cluster)]
    CartSvc -->|Session Cache| RedisStore
    OrderSvc -->|Publish Event| KafkaQueue([Order Event Bus])
    KafkaQueue -->|Async Worker| PaymentJunc{Payment Gateway Junction}
    KafkaQueue -->|Async Worker| InventorySvc(Inventory Management)
    PaymentJunc -->|REST/TLS| StripeExt>Stripe Payment Provider]
    OrderSvc -->|ACID State| PostgresDB[(Primary Postgres DB)]
    InventorySvc -->|State Sync| PostgresDB`,

  etlDataLake: `flowchart TD
    SensorTelemetry[IoT Edge Gateways] -->|MQTT/TLS| IngestGateway{Ingress Load Balancer}
    AppWebhooks[SaaS Webhook Feeds] -->|HTTPS POST| IngestGateway
    IngestGateway -->|Partitioned Stream| KafkaEvents([Kafka Raw Ingest Topic])
    KafkaEvents -->|Stream Processor| FlinkEngine(Apache Flink ETL Worker)
    FlinkEngine -->|Validate Schema| SchemaValidator{Junction Schema Guard}
    SchemaValidator -->|Enriched Parquet| LakehouseStore[(S3 Bronze Lakehouse)]
    LakehouseStore -->|Batch Aggregation| DbtWorker(dbt Transformation Job)
    DbtWorker -->|Cleaned Marts| SnowflakeStore[(Analytics Data Warehouse)]
    SnowflakeStore -->|SQL Queries| MetabaseBI>Business Intelligence Dashboard]`,

  zeroTrustAuth: `graph TD
    Browser[Public Browser Client] -->|mTLS 1.3| EdgeWAF{Cloudflare WAF / DDoS Guard}
    EdgeWAF -->|Envoy Proxy| EnvoyIngress{Envoy Ingress Gateway}
    EnvoyIngress -->|Check Token| OIDCValidator(Keycloak OIDC Provider)
    EnvoyIngress -->|Policy Check| OPALegal{OPA Authorization Junction}
    OPALegal -->|Authorized RPC| CoreAPI(Core Microservice API)
    CoreAPI -->|Vault Secret Lease| HashiVault[(HashiCorp Vault Store)]
    CoreAPI -->|Encrypted Payload| EncryptedDB[(Encrypted Document Store)]
    CoreAPI -->|Audit Trail| KafkaAudit([Audit Logging Stream])`,
};
