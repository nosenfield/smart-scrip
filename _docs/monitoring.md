# Monitoring and Alerting Configuration

## Overview

This document provides instructions for setting up Cloud Monitoring dashboards and alert policies for the NDC Calculator application running on Cloud Run.

## Prerequisites

- Google Cloud Project with Cloud Run service deployed
- Cloud Monitoring API enabled
- Appropriate IAM permissions (roles/monitoring.admin or roles/editor)

## Monitoring Dashboard

### Create Dashboard

1. Navigate to Cloud Console → Monitoring → Dashboards
2. Click "Create Dashboard"
3. Name: "NDC Calculator - Production"

### Dashboard Panels

#### 1. Request Count
- **Metric**: `run.googleapis.com/request_count`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: Sum
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 2. Error Rate
- **Metric**: `run.googleapis.com/request_count`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Filter**: `status_code >= 500`
- **Aggregation**: Sum
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 3. Response Latency (p50)
- **Metric**: `run.googleapis.com/request_latencies`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: 50th percentile
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 4. Response Latency (p95)
- **Metric**: `run.googleapis.com/request_latencies`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: 95th percentile
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 5. Response Latency (p99)
- **Metric**: `run.googleapis.com/request_latencies`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: 99th percentile
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 6. Container CPU Usage
- **Metric**: `run.googleapis.com/container/cpu/utilizations`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: Mean
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 7. Container Memory Usage
- **Metric**: `run.googleapis.com/container/memory/utilizations`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: Mean
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 8. Instance Count
- **Metric**: `run.googleapis.com/container/instance_count`
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: Mean
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

#### 9. Log-Based Error Rate
- **Metric**: `ndc_calculator_error_rate` (from Cloud Logging)
- **Resource Type**: Cloud Run Revision
- **Service**: `ndc-calculator`
- **Aggregation**: Sum
- **Alignment Period**: 1 minute
- **Chart Type**: Line chart

## Alert Policies

### 1. High Error Rate Alert

**Policy Name**: `ndc-calculator-high-error-rate`

**Condition**:
- **Metric**: `run.googleapis.com/request_count`
- **Filter**: `status_code >= 500`
- **Aggregation**: Sum
- **Alignment Period**: 5 minutes
- **Threshold**: > 10 errors in 5 minutes
- **Comparison**: Greater than

**Notification**:
- **Channels**: Email, Slack (if configured)
- **Documentation**: Link to troubleshooting guide

### 2. High Response Time Alert

**Policy Name**: `ndc-calculator-high-response-time`

**Condition**:
- **Metric**: `run.googleapis.com/request_latencies`
- **Aggregation**: 95th percentile
- **Alignment Period**: 5 minutes
- **Threshold**: > 10 seconds
- **Comparison**: Greater than

**Notification**:
- **Channels**: Email, Slack (if configured)
- **Documentation**: Link to performance optimization guide

### 3. Container Crash Loop Alert

**Policy Name**: `ndc-calculator-crash-loop`

**Condition**:
- **Metric**: `run.googleapis.com/container/instance_count`
- **Aggregation**: Mean
- **Alignment Period**: 5 minutes
- **Threshold**: < 1 instance (when traffic > 0)
- **Comparison**: Less than

**Notification**:
- **Channels**: Email, PagerDuty (if configured)
- **Severity**: Critical

### 4. High CPU Usage Alert

**Policy Name**: `ndc-calculator-high-cpu`

**Condition**:
- **Metric**: `run.googleapis.com/container/cpu/utilizations`
- **Aggregation**: Mean
- **Alignment Period**: 10 minutes
- **Threshold**: > 80%
- **Comparison**: Greater than

**Notification**:
- **Channels**: Email
- **Severity**: Warning

### 5. High Memory Usage Alert

**Policy Name**: `ndc-calculator-high-memory`

**Condition**:
- **Metric**: `run.googleapis.com/container/memory/utilizations`
- **Aggregation**: Mean
- **Alignment Period**: 10 minutes
- **Threshold**: > 80%
- **Comparison**: Greater than

**Notification**:
- **Channels**: Email
- **Severity**: Warning

## Notification Channels

### Email Channel

1. Navigate to Cloud Console → Monitoring → Alerting → Notification Channels
2. Click "Add New" → "Email"
3. Enter email addresses for team members
4. Name: "NDC Calculator Team Email"

### Slack Channel (Optional)

1. Navigate to Cloud Console → Monitoring → Alerting → Notification Channels
2. Click "Add New" → "Slack"
3. Follow instructions to configure Slack webhook
4. Name: "NDC Calculator Slack"

## Alert Policy Configuration Steps

### Create Alert Policy

1. Navigate to Cloud Console → Monitoring → Alerting → Policies
2. Click "Create Policy"
3. Configure condition as specified above
4. Set notification channels
5. Add documentation link
6. Save policy

### Testing Alerts

1. Create test alert with low threshold
2. Trigger condition manually (if possible)
3. Verify notification delivery
4. Adjust thresholds based on baseline metrics

## Recommended Thresholds

Based on MVP requirements:

- **Error Rate**: > 5% of requests (or > 10 errors in 5 minutes)
- **Response Time (p95)**: > 10 seconds
- **Response Time (p99)**: > 15 seconds
- **CPU Usage**: > 80% sustained for 10 minutes
- **Memory Usage**: > 80% sustained for 10 minutes

## Dashboard Access

### Sharing Dashboard

1. Open dashboard in Cloud Console
2. Click "Share" button
3. Add team members with Viewer role
4. Or make dashboard public (read-only) for stakeholders

### Dashboard URL

Once created, bookmark the dashboard URL for quick access:
```
https://console.cloud.google.com/monitoring/dashboards/custom/[DASHBOARD_ID]
```

## Troubleshooting

### No Metrics Appearing
1. Verify Cloud Run service is receiving traffic
2. Check Cloud Monitoring API is enabled
3. Verify service account has monitoring permissions
4. Wait 5-10 minutes for metrics to populate

### Alerts Not Firing
1. Verify alert policy is enabled
2. Check notification channels are configured
3. Verify threshold values are appropriate
4. Test with lower threshold to confirm delivery

### High Alert Volume
1. Review and adjust thresholds
2. Add alert suppression for known issues
3. Group related alerts
4. Use alert policies with longer alignment periods

## References

- [Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Cloud Run Metrics](https://cloud.google.com/run/docs/monitoring/metrics)
- [Alerting Best Practices](https://cloud.google.com/monitoring/alerts/concepts-alerting-overview)

