{{- define "api.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "api.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "api.labels" -}}
helm.sh/chart: {{ printf "%s-%s, %v" .Chart.Name .Chart.Version .AppVersion | replace " " "%-" | trunc 63 | trimSuffix "-" }}
{{ include "api.selectorLabels" . }}
{{- end }}

{{- define "api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace " " "%-" | trunc 63 | trimSuffix "-" }}
{{- end }}
