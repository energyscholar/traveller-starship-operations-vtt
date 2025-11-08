# Stage 15: Cloud Deployment & Production

**Est. 4,000 tokens | ~8 hours | ~400 LOC**

## Scope

### Platform Evaluation (CTO Learning)
- **Azure App Service** (primary recommendation - new experience)
- **Google Cloud Run** (serverless alternative)
- **AWS ECS/Fargate** (baseline comparison - existing knowledge)

### Features
- Containerization (Docker)
- CI/CD pipeline
- Environment configuration
- Production monitoring
- Logging & alerting
- Backup & recovery
- SSL/TLS setup
- Domain configuration

### Deliverables
- Dockerfile
- docker-compose.yml
- CI/CD config (GitHub Actions)
- Deployment documentation
- Monitoring dashboard
- Runbook

## Sub-Stages

### 15.1: Containerization (1k tokens, ~100 LOC)
- Dockerfile for Node.js app
- Multi-stage build (optimize size)
- docker-compose.yml (dev + prod)
- Environment variable configuration
- Health check endpoints

### 15.2: Azure Deployment (1.5k tokens, ~150 LOC)
- Azure App Service setup
- Azure Container Registry
- Deployment slots (staging/prod)
- Auto-scaling configuration
- Azure Monitor integration
- Cost optimization

### 15.3: CI/CD Pipeline (1k tokens, ~100 LOC)
- GitHub Actions workflow
- Automated testing on PR
- Build and push container
- Deploy to staging
- Manual approval for prod
- Rollback procedures

### 15.4: Monitoring & Operations (0.5k tokens, ~50 LOC)
- Application Insights (Azure)
- Custom metrics (battles, players, performance)
- Alerting rules (errors, latency, downtime)
- Log aggregation
- Dashboard creation

## Acceptance Criteria
- [ ] App runs in Docker container
- [ ] Deployed to Azure App Service
- [ ] CI/CD pipeline functional
- [ ] Monitoring dashboard shows metrics
- [ ] SSL/TLS configured
- [ ] Auto-scaling works
- [ ] Logs accessible and searchable
- [ ] Backup/restore tested

## Platform Comparison

| Feature | Azure App Service | Google Cloud Run | AWS ECS |
|---------|-------------------|------------------|---------|
| **Learning Value** | High (new to user) | High (serverless) | Low (known) |
| **Ease of Deployment** | High | Very High | Medium |
| **Cost (low traffic)** | ~$50/mo | ~$10/mo (pay-per-use) | ~$30/mo |
| **Scaling** | Auto | Auto (0-N) | Manual/Auto |
| **WebSocket Support** | Native | Limited | Native |
| **Monitoring** | Excellent (Azure Monitor) | Good (Cloud Monitoring) | Excellent (CloudWatch) |
| **Recommendation** | ✅ **Primary** | Alternative | Baseline |
