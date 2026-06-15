{{- define "spool.name" -}}{{ .Chart.Name | trunc 63 | trimSuffix "-" }}{{- end -}}

{{- define "spool.fullname" -}}{{ .Release.Name | trunc 63 | trimSuffix "-" }}{{- end -}}

{{- define "spool.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/instance: {{ .Release.Name | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/chart: {{ .Chart.Name | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/component: {{ .Chart.Component | default "api" }}
app.kubernetes.io/part-of: {{ .Chart.AppVersion | quote }}
{{- end }}

{{- define "spool.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/instance: {{ .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "spool.image" -}}
{{- if .Values.image.repository -}}
{{- printf "%s:%s" .Values.image.repository .Values.image.tag -}}
{{- else -}}
{{- default .Chart.AppVersion "latest" .Values.image.tag -}}
{{- end -}}
{{- end -}}
