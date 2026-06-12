# Spool Service Deployment

This directory contains the Kubernetes manifests for the Spool service.

## Deployment Options

### 1. Manual Manifests (Direct Application)
Use the raw manifests in this directory for quick testing or debugging.
```bash
kubectl apply -f .
```

### 2. Helm Chart (Production/Automated)
For production deployments and automated updates, use the Helm chart provided.
- **Location**: `deploy/helm/spool/`
- **Automation**: A GitHub Action in `.github/workflows/helm-push.yml` automatically builds the Docker image and pushes the Helm chart to GHCR on pushes to the `main` branch.

## Deployment Architecture

- **Deployment**: Runs a single replica of the `spool` container.
- **Service**: `ClusterIP` service to allow internal communication.
- **ConfigMap**: Stores non-sensitive environment variables (URLs for Whisper, Summarizer, and Digest API).
- **Secret**: Stores the `YOUTUBE_API_KEY`. This should be managed via SOPS in production.
- **IngressRoute**: Traefik ingress rule for external access via `spool.local`.

## Configuration

The following environment variables are used:

| Variable | Source | Description |
|----------|--------|-------------|
| `SPOOL_CONFIG_PATH` | Default | `/config/spool-config.yaml` |
| `WHISPER_URL` | ConfigMap | URL for the transcription service |
| `SUMMARIZER_URL` | ConfigMap | URL for the summarization service |
| `DIGEST_API_URL` | ConfigMap | URL for the Digest API |
| `YOUTUBE_API_KEY` | Secret | YouTube Data API v3 Key |
