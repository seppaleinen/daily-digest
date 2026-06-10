# Spool Service Deployment

This directory contains the Kubernetes manifests for the Spool service.

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

## Deployment Steps

1.  **Verify configuration**: Update `deploy/spool/configmap.yaml` with correct service URLs.
2.  **Encrypt secrets**: Use SOPS to encrypt the `secret.yaml` file.
3.  **Apply manifests**:
    ```bash
    kubectl apply -f deploy/spool/
    ```
4.  **Verify deployment**:
    ```bash
    kubectl get pods,svc,ingressroute -l app=spool
    ```
