# Cloud Logging Configuration

## Overview

Cloud Logging is configured in the application code (see `src/lib/server/utils/logger.ts`). This document provides operational guidance for log management, filtering, and metrics.

## Log Configuration

### Service Name
- **Log Name**: `ndc-calculator`
- **Resource Type**: `cloud_run_revision`
- **Service Name**: `ndc-calculator`

### Log Levels
- `DEBUG`: Detailed diagnostic information
- `INFO`: General informational messages
- `WARN`: Warning messages for potential issues
- `ERROR`: Error messages requiring attention

## Log Filters

### Error Logs Only
Filter to view only error-level logs:

```
resource.type="cloud_run_revision"
severity>=ERROR
resource.labels.service_name="ndc-calculator"
```

### Recent Errors (Last Hour)
```
resource.type="cloud_run_revision"
severity>=ERROR
resource.labels.service_name="ndc-calculator"
timestamp>="2025-11-12T00:00:00Z"
```

### API Request Errors
```
resource.type="cloud_run_revision"
severity>=ERROR
resource.labels.service_name="ndc-calculator"
jsonPayload.endpoint=~"/api/calculate"
```

### External API Failures
```
resource.type="cloud_run_revision"
severity>=ERROR
resource.labels.service_name="ndc-calculator"
jsonPayload.service=~"(openai|rxnorm|fda)"
```

## Log-Based Metrics

### Error Rate Metric

Create a log-based metric for error rate:

1. Go to Cloud Console → Logging → Logs-based metrics
2. Create metric:
   - **Metric name**: `ndc_calculator_error_rate`
   - **Metric type**: Counter
   - **Filter**:
     ```
     resource.type="cloud_run_revision"
     severity>=ERROR
     resource.labels.service_name="ndc-calculator"
     ```
   - **Label extractors**: 
     - `severity`: `EXTRACT(jsonPayload.severity)`
     - `endpoint`: `EXTRACT(jsonPayload.endpoint)`

### Request Count Metric

1. **Metric name**: `ndc_calculator_request_count`
2. **Metric type**: Counter
3. **Filter**:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="ndc-calculator"
   jsonPayload.endpoint=~"/api/calculate"
   ```

### Response Time Metric

1. **Metric name**: `ndc_calculator_response_time`
2. **Metric type**: Distribution
3. **Filter**:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="ndc-calculator"
   jsonPayload.duration!=null
   ```
4. **Value extractor**: `EXTRACT(jsonPayload.duration)`

## Common Log Queries

### View All Logs for Service
```
resource.type="cloud_run_revision"
resource.labels.service_name="ndc-calculator"
```

### View Logs by Severity
```
resource.type="cloud_run_revision"
resource.labels.service_name="ndc-calculator"
severity="ERROR"
```

### View Logs with Specific Metadata
```
resource.type="cloud_run_revision"
resource.labels.service_name="ndc-calculator"
jsonPayload.requestId="abc-123-def"
```

### View Logs in Time Range
```
resource.type="cloud_run_revision"
resource.labels.service_name="ndc-calculator"
timestamp>="2025-11-12T00:00:00Z"
timestamp<="2025-11-12T23:59:59Z"
```

## Monitoring Dashboard

### Recommended Dashboard Panels

1. **Error Rate Over Time**
   - Metric: `ndc_calculator_error_rate`
   - Aggregation: Sum
   - Period: 1 minute

2. **Request Count**
   - Metric: `ndc_calculator_request_count`
   - Aggregation: Sum
   - Period: 1 minute

3. **Average Response Time**
   - Metric: `ndc_calculator_response_time`
   - Aggregation: Mean
   - Period: 1 minute

4. **Error Rate by Endpoint**
   - Metric: `ndc_calculator_error_rate`
   - Group by: `endpoint` label
   - Aggregation: Sum

## Log Retention

- **Default retention**: 30 days
- **For production**: Consider exporting critical logs to BigQuery for long-term analysis

## Troubleshooting

### No Logs Appearing
1. Verify Cloud Logging API is enabled
2. Check service account has `roles/logging.logWriter` permission
3. Verify `NODE_ENV=production` is set in Cloud Run

### High Log Volume
1. Review log levels - ensure DEBUG logs are not enabled in production
2. Check for log loops or excessive error logging
3. Consider adjusting log levels via environment variables

### Log Format Issues
- All logs are structured JSON in Cloud Logging
- Metadata is automatically sanitized to remove sensitive data
- Non-serializable values are converted to strings

## References

- [Cloud Logging Documentation](https://cloud.google.com/logging/docs)
- [Log-based Metrics](https://cloud.google.com/logging/docs/logs-based-metrics)
- Application Logger: `src/lib/server/utils/logger.ts`

