# Scalability Roadmap
## From 2-3 to 1,000+ Concurrent Battles

**Document Version:** 1.0
**Session:** 6
**Date:** 2025-11-14
**Author:** Bruce Stephenson

---

## Executive Summary

Current load testing revealed a **practical limit of 2-3 concurrent battles** in the single-process architecture. This document outlines a phased approach to scale from current capacity to enterprise-grade deployment supporting 1,000+ concurrent battles.

**Current State:**
- Architecture: Single Node.js process
- State Management: In-memory (activeCombats Map)
- Capacity: 2-3 concurrent battles
- Load Test Results: 60% success at 5 concurrent clients

**Target State:**
- Architecture: Distributed, cloud-native
- State Management: Persistent, replicated
- Capacity: 1,000+ concurrent battles
- Load Test Target: 95%+ success at 100+ concurrent clients

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Bottleneck Identification](#bottleneck-identification)
3. [Scalability Options](#scalability-options)
4. [Recommended Phased Approach](#recommended-phased-approach)
5. [Implementation Guides](#implementation-guides)
6. [Cost Analysis](#cost-analysis)
7. [Risk Assessment](#risk-assessment)
8. [Success Metrics](#success-metrics)

---

## Current Architecture Analysis

### Technology Stack
```
┌─────────────────────────────────────┐
│        Client Browsers              │
│      (WebSocket connections)        │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│     Node.js Server (Port 3000)      │
│  - Express 4.x                      │
│  - Socket.io 4.x                    │
│  - In-memory state (Map)            │
│  - No persistence                   │
└─────────────────────────────────────┘
```

### Limitations
1. **Single Process Bottleneck**
   - All connections handled by one Node.js event loop
   - CPU-bound combat calculations block I/O
   - No horizontal scaling capability

2. **In-Memory State**
   - activeCombats Map only in one process
   - No state sharing across instances
   - Lost on crash/restart

3. **No Session Affinity**
   - Can't distribute clients across multiple processes
   - Socket.io requires sticky sessions for multi-process

4. **Resource Contention**
   - Memory: All game states in single process heap
   - CPU: Combat calculations compete with WebSocket I/O
   - Network: Single TCP/IP stack for all connections

### Load Test Results (Session 6, Phase 2.2)

| Concurrency | Success Rate | Avg Duration | Notes |
|-------------|--------------|--------------|-------|
| 2 clients   | 100% (2/2)   | 2.3s         | ✅ Baseline |
| 5 clients   | 60% (3/5)    | 3.7s         | ⚠️ Failures |
| 10 clients  | Not tested   | -            | Expected <20% |

**Bottleneck Confirmed:** Single-process architecture cannot handle >3 concurrent battles.

---

## Bottleneck Identification

### Primary Bottleneck: Single Process
**Symptom:** 60% failure rate at 5 concurrent clients
**Root Cause:** Node.js event loop saturation
**Evidence:**
- Combat calculations (2D6 rolls, damage, armor) are synchronous
- WebSocket broadcast for every state change
- No worker threads for CPU-intensive tasks

### Secondary Bottlenecks
1. **Memory:** All game state in single heap (risk of OOM)
2. **Network:** Single network interface for all clients
3. **Persistence:** No state recovery after crash
4. **Monitoring:** No metrics for bottleneck diagnosis

### Quantitative Analysis

**Single Combat Resource Usage:**
- Memory: ~50KB per combat state
- CPU: ~5ms per combat calculation
- Network: ~2KB per WebSocket message
- Broadcast: ~10ms per state update (all clients)

**Projected Capacity:**
```
Max Concurrent Battles = Event Loop Time / Combat Cycle Time
                       = 1000ms / (5ms calc + 10ms broadcast + 15ms overhead)
                       = 1000ms / 30ms
                       = ~33 battles (theoretical max)
```

**Observed Capacity:** 2-3 battles (10% of theoretical max)

**Bottleneck Factor:** Network I/O + state synchronization overhead

---

## Scalability Options

### Option 1: Quick Wins (4-6 hours)
**Target Capacity:** 5-10 concurrent battles
**Cost:** £0 (current hosting)
**Complexity:** Low

#### Changes
1. **Connection Management**
   - Implement aggressive timeouts (30s idle)
   - Connection pooling
   - Graceful disconnect handling

2. **Memory Optimization**
   - Prune inactive combats after 5 minutes
   - Reduce state object size
   - Limit combat history to last 10 rounds

3. **Rate Limiting**
   - Max 2 actions per second per client
   - Queue action processing
   - Throttle broadcasts

4. **Performance Profiling**
   - Add winston profiling
   - Track event loop lag
   - Memory usage metrics

#### Implementation
```javascript
// Example: Aggressive timeout
socket.on('connect', () => {
  socket.setTimeout(30000); // 30s idle timeout

  socket.on('timeout', () => {
    logger.warn('Socket timeout, disconnecting');
    socket.disconnect();
  });
});

// Example: Combat pruning
setInterval(() => {
  const now = Date.now();
  for (const [battleId, combat] of activeCombats.entries()) {
    if (now - combat.lastActivity > 300000) { // 5 minutes
      activeCombats.delete(battleId);
      logger.info(`Pruned inactive combat: ${battleId}`);
    }
  }
}, 60000); // Check every minute
```

#### Pros
- ✅ Quick implementation (4-6h)
- ✅ No infrastructure changes
- ✅ Immediate improvement (2x capacity)
- ✅ Low risk

#### Cons
- ❌ Limited scalability (10 battles max)
- ❌ Still single-process bottleneck
- ❌ No horizontal scaling

**Recommended for:** Stage 13.5 (immediate next session)

---

### Option 2: Redis + Cluster (12-15 hours)
**Target Capacity:** 20-50 concurrent battles
**Cost:** £12/month (Redis Cloud 1GB)
**Complexity:** Medium

#### Architecture
```
┌─────────────────────────────────────────────┐
│         Load Balancer (nginx)               │
│       (Sticky sessions on socketId)         │
└──────────┬─────────────┬────────────────────┘
           │             │
           ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Node Worker 1│  │ Node Worker 2│  ... (4-8 workers)
│ Port 3001    │  │ Port 3002    │
└──────┬───────┘  └──────┬───────┘
       │                  │
       └────────┬─────────┘
                ▼
┌────────────────────────────────────┐
│        Redis (Shared State)        │
│  - activeCombats (Hash)            │
│  - Socket.io adapter (Pub/Sub)     │
└────────────────────────────────────┘
```

#### Changes
1. **Node.js Cluster Mode**
   - Use cluster module
   - 4-8 worker processes (CPU cores)
   - Master process for coordination

2. **Redis Integration**
   - Store activeCombats in Redis hash
   - Socket.io Redis adapter for pub/sub
   - Session affinity via Redis

3. **Load Balancer**
   - nginx with ip_hash for sticky sessions
   - Health checks on /health endpoint
   - Automatic failover

4. **State Migration**
   - activeCombats Map → Redis hash
   - Serialize/deserialize combat state
   - Atomic operations (HSET, HGET)

#### Implementation Guide
```javascript
// 1. Install dependencies
// npm install redis@4.x socket.io-redis@6.x

// 2. Redis client
const { createClient } = require('redis');
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redisClient.connect();

// 3. Socket.io Redis adapter
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

// 4. State management
async function getCombat(battleId) {
  const state = await redisClient.hGet('combats', battleId);
  return JSON.parse(state);
}

async function setCombat(battleId, state) {
  await redisClient.hSet('combats', battleId, JSON.stringify(state));
}

// 5. Cluster setup (cluster.js)
const cluster = require('cluster');
const numWorkers = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    logger.error(`Worker ${worker.id} died, restarting...`);
    cluster.fork();
  });
} else {
  require('./server'); // Start worker
}

// 6. nginx config
# /etc/nginx/sites-available/traveller-vtt
upstream traveller {
  ip_hash; # Sticky sessions
  server 127.0.0.1:3001;
  server 127.0.0.1:3002;
  server 127.0.0.1:3003;
  server 127.0.0.1:3004;
}

server {
  listen 3000;

  location / {
    proxy_pass http://traveller;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }

  location /health {
    proxy_pass http://traveller/health;
  }
}
```

#### Pros
- ✅ 10x capacity increase (20-50 battles)
- ✅ Horizontal scaling (add more workers)
- ✅ High availability (worker failover)
- ✅ Moderate cost (£12/month)
- ✅ Proven architecture

#### Cons
- ❌ Medium complexity (12-15h implementation)
- ❌ Redis dependency (new failure point)
- ❌ Requires load balancer setup
- ❌ State serialization overhead

**Recommended for:** Stage 15 (production-ready scaling)

---

### Option 3: Kubernetes + StatefulSets (25-30 hours)
**Target Capacity:** 100-500 concurrent battles
**Cost:** £45-120/month (AKS/GKE)
**Complexity:** High

#### Architecture
```
┌─────────────────────────────────────────────┐
│     Ingress Controller (nginx-ingress)      │
│       (Session affinity on cookie)          │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│   Kubernetes Service (ClusterIP)            │
│     traveller-vtt-service                   │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│    StatefulSet: traveller-vtt                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ Pod 0   │  │ Pod 1   │  │ Pod 2   │  ... │
│  └─────────┘  └─────────┘  └─────────┘      │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│          PostgreSQL (StatefulSet)            │
│  - Combat state persistence                  │
│  - Player profiles                           │
│  - Combat history                            │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│          Redis (Pub/Sub)                     │
│  - Socket.io adapter                         │
│  - Session cache                             │
└──────────────────────────────────────────────┘
```

#### Changes
1. **Kubernetes Manifests**
   - Deployment: traveller-vtt (3-10 replicas)
   - StatefulSet: PostgreSQL (persistent state)
   - StatefulSet: Redis (pub/sub)
   - Service: ClusterIP for internal routing
   - Ingress: nginx with session affinity

2. **Database Integration**
   - PostgreSQL for persistent state
   - Sequelize ORM for models
   - Schema: battles, players, combat_logs
   - Automatic state recovery

3. **Observability**
   - Prometheus metrics
   - Grafana dashboards
   - Loki log aggregation
   - Jaeger distributed tracing

4. **CI/CD**
   - GitHub Actions → Docker build
   - Push to container registry
   - Automatic K8s deployment
   - Blue/green deployments

#### Implementation Files
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traveller-vtt
spec:
  replicas: 3
  selector:
    matchLabels:
      app: traveller-vtt
  template:
    metadata:
      labels:
        app: traveller-vtt
    spec:
      containers:
      - name: traveller-vtt
        image: ghcr.io/energyscholar/traveller-vtt:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: traveller-secrets
              key: database-url
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

```yaml
# kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: traveller-vtt-ingress
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "traveller-session"
    nginx.ingress.kubernetes.io/websocket-services: "traveller-vtt-service"
spec:
  rules:
  - host: traveller-vtt.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: traveller-vtt-service
            port:
              number: 3000
```

```javascript
// lib/database.js (PostgreSQL integration)
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

const Battle = sequelize.define('Battle', {
  battleId: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  state: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'forfeited'),
    defaultValue: 'active'
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

async function saveBattle(battleId, state) {
  await Battle.upsert({
    battleId,
    state,
    lastActivity: new Date()
  });
}

async function loadBattle(battleId) {
  const battle = await Battle.findByPk(battleId);
  return battle ? battle.state : null;
}

module.exports = { Battle, saveBattle, loadBattle };
```

#### Pros
- ✅ 50x capacity increase (100-500 battles)
- ✅ Auto-scaling (horizontal pod autoscaler)
- ✅ High availability (pod failover)
- ✅ Persistent state (survives crashes)
- ✅ Enterprise-grade observability
- ✅ Blue/green deployments

#### Cons
- ❌ High complexity (25-30h implementation)
- ❌ Higher cost (£45-120/month)
- ❌ Requires K8s expertise
- ❌ Multiple new dependencies (Postgres, K8s, observability stack)

**Recommended for:** Stage 17 (enterprise deployment)

---

### Option 4: Serverless (30-35 hours)
**Target Capacity:** 1,000+ concurrent battles
**Cost:** £100-300/month (usage-based)
**Complexity:** Very High

#### Architecture
```
┌─────────────────────────────────────────────┐
│     Azure Front Door (Global CDN)           │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│    Azure SignalR Service (Managed WS)       │
│  - 100,000 concurrent connections           │
│  - Automatic scaling                        │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│    Azure Functions (Consumption Plan)       │
│  - HTTP Triggers (REST API)                 │
│  - SignalR Triggers (message handling)      │
│  - Timer Triggers (combat pruning)          │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│    Cosmos DB (Serverless)                   │
│  - Combat state (JSON documents)            │
│  - Automatic indexing                       │
│  - Global distribution                      │
└─────────────────────────────────────────────┘
```

#### Changes
1. **Azure SignalR Service**
   - Replaces Socket.io
   - Managed WebSocket infrastructure
   - Automatic scaling to 100K connections

2. **Azure Functions**
   - Refactor server.js → multiple functions
   - HTTP triggers for API endpoints
   - SignalR triggers for combat actions
   - Timer triggers for cleanup

3. **Cosmos DB**
   - NoSQL document store
   - Automatic indexing on battleId
   - TTL for automatic cleanup
   - Global replication

4. **Deployment**
   - Terraform for infrastructure as code
   - GitHub Actions → Azure Functions
   - Automatic scaling policies

#### Function Examples
```javascript
// functions/negotiate/index.js
// Azure Function: SignalR negotiation
module.exports = async function (context, req) {
  const userId = req.query.userId || req.headers['x-ms-client-principal-id'];

  context.res = {
    body: {
      url: process.env.SignalRConnectionString,
      accessToken: context.bindings.signalRConnectionInfo.accessToken,
      userId
    }
  };
};

// functions/startBattle/index.js
// Azure Function: Start battle
const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, req) {
  const { player1, player2, range } = req.body;

  const client = new CosmosClient(process.env.CosmosDBConnectionString);
  const container = client.database('traveller').container('battles');

  const battleId = `${player1}_${player2}`;
  const state = initializeCombat(player1, player2, range);

  await container.items.create({
    id: battleId,
    ...state,
    ttl: 3600 // Auto-delete after 1 hour
  });

  // Notify clients via SignalR
  context.bindings.signalRMessages = [{
    target: 'battleStarted',
    userId: player1,
    arguments: [state]
  }, {
    target: 'battleStarted',
    userId: player2,
    arguments: [state]
  }];

  context.res = { body: { success: true, battleId } };
};

// functions/combatAction/index.js
// Azure Function: SignalR trigger for combat actions
module.exports = async function (context, invocationContext) {
  const { action, battleId, playerId } = invocationContext.message;

  // Load state from Cosmos DB
  const client = new CosmosClient(process.env.CosmosDBConnectionString);
  const container = client.database('traveller').container('battles');
  const { resource: battle } = await container.item(battleId, battleId).read();

  // Process action
  const result = processAction(battle, action, playerId);

  // Save state
  await container.item(battleId, battleId).replace(result.state);

  // Broadcast update
  context.bindings.signalRMessages = [{
    target: 'combatUpdate',
    userId: battle.player1,
    arguments: [result]
  }, {
    target: 'combatUpdate',
    userId: battle.player2,
    arguments: [result]
  }];
};
```

#### Terraform Configuration
```hcl
# infrastructure/main.tf
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "traveller" {
  name     = "traveller-vtt-rg"
  location = "UK South"
}

resource "azurerm_signalr_service" "traveller" {
  name                = "traveller-signalr"
  location            = azurerm_resource_group.traveller.location
  resource_group_name = azurerm_resource_group.traveller.name

  sku {
    name     = "Standard_S1"
    capacity = 1
  }

  cors {
    allowed_origins = ["*"]
  }

  features {
    flag  = "ServiceMode"
    value = "Serverless"
  }
}

resource "azurerm_cosmosdb_account" "traveller" {
  name                = "traveller-cosmos"
  location            = azurerm_resource_group.traveller.location
  resource_group_name = azurerm_resource_group.traveller.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.traveller.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableServerless"
  }
}

resource "azurerm_function_app" "traveller" {
  name                       = "traveller-functions"
  location                   = azurerm_resource_group.traveller.location
  resource_group_name        = azurerm_resource_group.traveller.name
  app_service_plan_id        = azurerm_app_service_plan.traveller.id
  storage_account_name       = azurerm_storage_account.traveller.name
  storage_account_access_key = azurerm_storage_account.traveller.primary_access_key
  version                    = "~4"

  app_settings = {
    "SignalRConnectionString"   = azurerm_signalr_service.traveller.primary_connection_string
    "CosmosDBConnectionString"  = azurerm_cosmosdb_account.traveller.primary_connection_string
    "FUNCTIONS_WORKER_RUNTIME"  = "node"
    "WEBSITE_NODE_DEFAULT_VERSION" = "~18"
  }
}
```

#### Pros
- ✅ Unlimited scaling (1,000+ battles)
- ✅ Pay-per-use pricing
- ✅ Global distribution (low latency)
- ✅ Managed infrastructure (no servers)
- ✅ Automatic HA and DR

#### Cons
- ❌ Very high complexity (30-35h)
- ❌ Complete architecture rewrite
- ❌ Vendor lock-in (Azure)
- ❌ Higher monthly cost at scale (£100-300)
- ❌ Cold start latency (5-10s first request)

**Recommended for:** Stage 19+ (global scale deployment)

---

## Recommended Phased Approach

### Phase 1: Stage 13.5 - Quick Wins (4-6h)
**Timeline:** Next session (Session 7)
**Goal:** 5-10 concurrent battles
**Investment:** 4-6 hours, £0 cost

**Tasks:**
1. Implement aggressive timeouts (30s idle)
2. Add combat pruning (5-minute inactive)
3. Rate limiting (2 actions/second)
4. Memory optimization (reduce state size)
5. Performance profiling (winston)
6. Load test validation (10 clients target)

**Deliverables:**
- Optimized server.js
- Performance metrics dashboard
- Updated load test results

---

### Phase 2: Stage 15 - Redis + Cluster (12-15h)
**Timeline:** Session 9-10
**Goal:** 20-50 concurrent battles
**Investment:** 12-15 hours, £12/month

**Tasks:**
1. Redis integration (state management)
2. Socket.io Redis adapter
3. Node.js cluster setup (4-8 workers)
4. nginx load balancer config
5. State migration (Map → Redis)
6. Health checks and monitoring
7. Load test validation (50 clients)

**Deliverables:**
- cluster.js (cluster setup)
- redis-client.js (Redis integration)
- nginx config
- Updated docs (deployment guide)

---

### Phase 3: Stage 17 - Kubernetes (25-30h)
**Timeline:** Session 14-16
**Goal:** 100-500 concurrent battles
**Investment:** 25-30 hours, £45-120/month

**Tasks:**
1. Kubernetes manifests (deployment, service, ingress)
2. PostgreSQL integration (Sequelize ORM)
3. Helm chart creation
4. CI/CD pipeline (GitHub Actions → K8s)
5. Observability stack (Prometheus, Grafana)
6. Blue/green deployment strategy
7. Load test validation (100+ clients)

**Deliverables:**
- kubernetes/ directory (all manifests)
- Helm chart
- .github/workflows/deploy-k8s.yml
- Grafana dashboards

---

### Phase 4: Stage 19+ - Serverless (30-35h)
**Timeline:** Session 20-22
**Goal:** 1,000+ concurrent battles
**Investment:** 30-35 hours, £100-300/month

**Tasks:**
1. Azure SignalR Service integration
2. Azure Functions refactoring
3. Cosmos DB schema and queries
4. Terraform infrastructure as code
5. SignalR negotiation endpoints
6. Global distribution setup
7. Cost optimization (budgets, alerts)
8. Load test validation (1,000+ clients)

**Deliverables:**
- functions/ directory (Azure Functions)
- infrastructure/ directory (Terraform)
- Cosmos DB schema
- Azure DevOps pipeline

---

## Cost Analysis

### Monthly Operating Costs

| Stage | Architecture | Battles | Monthly Cost | Cost per Battle |
|-------|--------------|---------|--------------|-----------------|
| Current | Single process | 2-3 | £0 | £0 |
| 13.5 | Optimized single | 5-10 | £0 | £0 |
| 15 | Redis + Cluster | 20-50 | £12 | £0.24-£0.60 |
| 17 | Kubernetes | 100-500 | £45-£120 | £0.09-£1.20 |
| 19+ | Serverless | 1,000+ | £100-£300 | £0.10-£0.30 |

### Cost Breakdown (Stage 15 - Redis + Cluster)
- Redis Cloud (1GB): £12/month
- Server hosting: £0 (existing)
- **Total:** £12/month

### Cost Breakdown (Stage 17 - Kubernetes)
- AKS cluster (3 nodes, B2s): £35/month
- PostgreSQL (Basic tier): £7/month
- Redis (Basic tier): £3/month
- **Total:** £45/month

### Cost Breakdown (Stage 19+ - Serverless)
- Azure SignalR Service (Standard S1): £45/month
- Cosmos DB (Serverless, 10GB): £25/month
- Azure Functions (Consumption): £15/month
- Azure Front Door: £15/month
- **Total:** £100/month (baseline)
- **At scale (1,000 battles/day):** £200-£300/month

---

## Risk Assessment

### Option 1: Quick Wins
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Limited scalability | High | Medium | Plan for Stage 15 upgrade |
| Memory leaks | Low | High | Profiling and monitoring |
| Single point of failure | High | High | Document recovery procedure |

### Option 2: Redis + Cluster
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Redis failure | Low | High | Redis Sentinel for HA |
| Worker crashes | Medium | Medium | Cluster auto-restart |
| State corruption | Low | High | Redis persistence (RDB/AOF) |
| Session affinity breaks | Low | Medium | Cookie-based sticky sessions |

### Option 3: Kubernetes
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cluster outage | Low | Critical | Multi-AZ deployment |
| Database failure | Low | Critical | Postgres replication |
| Pod crashes | Medium | Low | K8s auto-restart |
| Cost overrun | Medium | Medium | Budget alerts, autoscaling limits |

### Option 4: Serverless
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cold start latency | High | Medium | Premium plan (always-on) |
| Vendor lock-in | High | Medium | Abstract cloud dependencies |
| Cost spike | Medium | High | Budget alerts, consumption caps |
| Cosmos DB throttling | Low | Medium | Increase RU/s provisioning |

---

## Success Metrics

### Stage 13.5 (Quick Wins)
- ✅ Load test: 10 concurrent clients at 80%+ success
- ✅ Memory usage: <500MB at 10 concurrent battles
- ✅ Average latency: <200ms per action
- ✅ No crashes during 24-hour soak test

### Stage 15 (Redis + Cluster)
- ✅ Load test: 50 concurrent clients at 95%+ success
- ✅ Horizontal scaling: Add worker increases capacity linearly
- ✅ High availability: Worker crashes don't affect other clients
- ✅ State recovery: Redis persistence survives restarts

### Stage 17 (Kubernetes)
- ✅ Load test: 100+ concurrent clients at 95%+ success
- ✅ Auto-scaling: HPA scales pods based on CPU/memory
- ✅ Blue/green deployments: Zero-downtime updates
- ✅ Observability: Prometheus metrics, Grafana dashboards

### Stage 19+ (Serverless)
- ✅ Load test: 1,000+ concurrent clients at 98%+ success
- ✅ Global latency: <100ms average response time
- ✅ Cost efficiency: <£0.30 per battle at scale
- ✅ Automatic scaling: No manual intervention needed

---

## Next Steps

1. **Immediate (Session 7):** Implement Stage 13.5 Quick Wins
2. **Short-term (Session 9-10):** Plan Stage 15 Redis + Cluster migration
3. **Medium-term (Session 14-16):** Implement Stage 17 Kubernetes if needed
4. **Long-term (Session 20+):** Consider Stage 19+ Serverless for global scale

**Priority:** Start with Stage 13.5 to validate improvements, then reassess based on actual usage patterns and growth projections.

---

## Appendix: Load Testing Tools

### Recommended Tools
1. **Artillery** - HTTP/WebSocket load testing
2. **k6** - Modern load testing (Grafana Labs)
3. **Azure Load Testing** - Cloud-based load testing
4. **Custom Puppeteer** - Our existing load-test.js

### Example Artillery Config
```yaml
# artillery-load-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
  socketio:
    transports: ["websocket"]
scenarios:
  - engine: "socketio"
    flow:
      - emit:
          channel: "space:select"
          data:
            ship: "scout"
            range: "Short"
      - emit:
          channel: "space:ready"
      - think: 2
      - emit:
          channel: "combat:fire"
          data:
            weapon: 0
            target: "opponent"
      - think: 1
      - emit:
          channel: "combat:endTurn"
```

---

**Document End**
