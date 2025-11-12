# API Specification

**Last Updated:** 2025-11-12

## Overview

This document describes the API endpoints for the NDC Packaging & Quantity Calculator application.

---

## POST /api/calculate

Calculate optimal NDC package selection for a prescription.

### Request

**Endpoint:** `POST /api/calculate`

**Headers:**
- `Content-Type: application/json` (required)

**Body:**
```json
{
  "drugName": "string (optional)",
  "ndc": "string (optional, format: XXXXX-XXX-XX)",
  "sig": "string (required, max 500 chars)",
  "daysSupply": "number (required, 1-365)"
}
```

**Notes:**
- Either `drugName` or `ndc` must be provided (not both required, but at least one)
- `sig` is the prescription directions (e.g., "Take 1 tablet by mouth once daily")
- `daysSupply` must be between 1 and 365 days

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "rxcui": "string",
    "normalizedDrug": {
      "name": "string",
      "strength": "string",
      "doseForm": "string"
    },
    "parsedSIG": {
      "dose": "number",
      "unit": "string",
      "frequency": "number",
      "route": "string",
      "duration": "number (optional)",
      "specialInstructions": "string (optional)"
    },
    "selectedNDCs": [
      {
        "ndc": "string",
        "quantity": "number",
        "packageCount": "number",
        "overfill": "number (optional)",
        "underfill": "number (optional)"
      }
    ],
    "totalQuantity": "number",
    "warnings": [
      {
        "type": "string",
        "message": "string",
        "severity": "info | warning | error"
      }
    ],
    "aiReasoning": "string (optional)"
  }
}
```

**Error (400/429/500):**
```json
{
  "success": false,
  "error": "string",
  "code": "string",
  "retryable": "boolean (optional)"
}
```

### Response Headers

**Rate Limiting:**
- `X-RateLimit-Limit`: Maximum requests allowed per window (default: 100)
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when rate limit resets

**Caching:**
- `Cache-Control`: `no-store, no-cache, must-revalidate`
- `Pragma`: `no-cache`
- `Expires`: `0`

### Error Codes

- `VALIDATION_ERROR` - Invalid input data (400)
- `RATE_LIMIT_ERROR` - Rate limit exceeded (429)
- `EXTERNAL_API_ERROR` - External API failure (502)
- `BUSINESS_LOGIC_ERROR` - Business logic error (400)
- `INTERNAL_ERROR` - Unexpected server error (500)

### Rate Limiting

The API enforces rate limiting:
- **Limit**: 100 requests per 60 seconds per IP address
- **Exceeded Response**: 429 status with `RATE_LIMIT_ERROR` code
- **Headers**: Rate limit information included in all responses

**Note**: Rate limiting uses in-memory storage and is suitable for single-instance deployments only. For production multi-instance deployments, Redis or Memorystore must be used.

### Examples

**Example 1: Drug name input**
```bash
curl -X POST http://localhost:5173/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "drugName": "Lisinopril 10mg tablet",
    "sig": "Take 1 tablet by mouth once daily",
    "daysSupply": 30
  }'
```

**Example 2: NDC input**
```bash
curl -X POST http://localhost:5173/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "ndc": "00071-0304-23",
    "sig": "Take 1 tablet twice daily with food",
    "daysSupply": 90
  }'
```

**Example 3: Rate limit exceeded**
```bash
# After 100 requests in 60 seconds:
curl -X POST http://localhost:5173/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "drugName": "Aspirin",
    "sig": "Take 1 tablet daily",
    "daysSupply": 30
  }'

# Response (429):
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_ERROR"
}
```

### Response Fields

**selectedNDCs:**
- `ndc`: National Drug Code (format: XXXXX-XXX-XX)
- `quantity`: Total quantity provided by selected packages
- `packageCount`: Number of packages needed
- `overfill`: Optional - excess quantity beyond requirement
- `underfill`: Optional - shortfall in quantity

**warnings:**
- `type`: Warning category (e.g., "OVERFILL", "UNDERFILL", "INACTIVE_NDC")
- `message`: Human-readable warning message
- `severity`: Warning level ("info", "warning", or "error")

**aiReasoning:**
- Optional field containing AI-generated explanation for NDC selection
- May be absent if AI service is unavailable (graceful degradation)

### Notes

- Calculation results are not cached (cache headers prevent caching)
- All timestamps are in ISO 8601 format
- Rate limit windows reset independently per IP address
- The API uses AI for intelligent NDC selection but falls back to deterministic matching if AI is unavailable

