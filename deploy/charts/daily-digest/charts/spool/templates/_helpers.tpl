{{- define "spool.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "spool.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "spool.labels" -}}
helm.sh/chart: {{ printf "%s-%s, %v" .Chart.Name .Chart.Version .AppVersion | replace " " "%-" | trunc 63 | trimSuffix "-" }}
{{ include "spool.selectorLabels" . }}
{{- end }}

{{- define "spool.selectorLabels" -}}
app.kubernetes.io/name: {{ include "spool.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace " " "%-" | trunc 63 | trimSuffix "-" }}
{{- end }}
