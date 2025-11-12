# Docker Container Testing Guide

## Prerequisites

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for Docker daemon to start (icon should show "running")
   - Verify: `docker info` should show system info without errors

## Build Test

### 1. Build the Docker Image

```bash
docker build -t ndc-calculator .
```

**Expected Output:**
- Multi-stage build completes successfully
- Final image size should be < 200MB
- No errors during npm ci or npm run build

**Build Steps Verification:**
1. Stage 1 (builder):
   - ✅ Uses node:20-alpine
   - ✅ Installs dependencies with `npm ci`
   - ✅ Copies source files
   - ✅ Runs production build
   - ✅ Prunes dev dependencies

2. Stage 2 (production):
   - ✅ Uses node:20-alpine
   - ✅ Copies only build output and production node_modules
   - ✅ Exposes port 3000
   - ✅ Sets NODE_ENV=production

### 2. Verify Image Created

```bash
docker images | grep ndc-calculator
```

**Expected:**
```
ndc-calculator   latest   <image-id>   <timestamp>   ~150-200MB
```

### 3. Inspect Image Layers

```bash
docker history ndc-calculator
```

**Verify:**
- Only essential layers present
- No sensitive files included (check .dockerignore excludes .env, tests, _docs)

## Runtime Test

### 4. Run the Container

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e OPENAI_MODEL=gpt-4o-mini \
  --name ndc-test \
  ndc-calculator
```

**Alternative with .env file:**
```bash
docker run -p 3000:3000 \
  --env-file .env \
  --name ndc-test \
  ndc-calculator
```

### 5. Verify Container is Running

In another terminal:

```bash
# Check container status
docker ps | grep ndc-test

# Check container logs
docker logs ndc-test

# Check container health (if app exposes health endpoint)
curl http://localhost:3000
```

**Expected:**
- Container status: "Up"
- Logs show SvelteKit server started
- No error messages in logs

### 6. Test API Endpoint (when implemented)

```bash
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "drugName": "Lisinopril 10mg tablets",
    "sig": "Take 1 tablet by mouth once daily",
    "daysSupply": 30
  }'
```

### 7. Cleanup

```bash
# Stop container
docker stop ndc-test

# Remove container
docker rm ndc-test

# Remove image (optional)
docker rmi ndc-calculator
```

## Troubleshooting

### Build Fails at npm ci

**Issue:** Package installation fails

**Solution:**
```bash
# Clear npm cache and rebuild
npm cache clean --force
docker build --no-cache -t ndc-calculator .
```

### Build Fails at npm run build

**Issue:** TypeScript compilation errors or missing dependencies

**Solution:**
```bash
# Test build locally first
npm run check
npm run build

# If local build works, rebuild Docker image
docker build -t ndc-calculator .
```

### Container Exits Immediately

**Issue:** Application crashes on startup

**Solution:**
```bash
# Check logs for error details
docker logs ndc-test

# Common issues:
# 1. Missing environment variables
# 2. Port 3000 already in use
# 3. Build output not found
```

### Cannot Connect to Container

**Issue:** `curl: (7) Failed to connect to localhost port 3000`

**Solution:**
```bash
# Check container is running
docker ps

# Check port mapping
docker port ndc-test

# Verify no other service is using port 3000
lsof -i :3000
```

## Performance Checks

### Image Size Optimization

```bash
# Check image size
docker images ndc-calculator

# Expected: ~150-200MB
# If larger, verify .dockerignore excludes:
# - node_modules (rebuilt in container)
# - .svelte-kit
# - tests/
# - _docs/
# - coverage/
```

### Container Resource Usage

```bash
# Monitor container resources
docker stats ndc-test
```

**Expected:**
- Memory: < 100MB at idle
- CPU: < 1% at idle

## Cloud Run Deployment Test

### Test Locally with Cloud Run Emulator (Optional)

```bash
# Install pack CLI
brew install buildpacks/tap/pack

# Build with buildpacks
pack build ndc-calculator \
  --builder gcr.io/buildpacks/builder:v1

# Run as Cloud Run would
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  ndc-calculator
```

## Success Criteria

✅ **Build Phase:**
- [ ] Docker build completes without errors
- [ ] Final image size < 200MB
- [ ] Multi-stage build optimizations working
- [ ] .dockerignore properly excludes dev files

✅ **Runtime Phase:**
- [ ] Container starts successfully
- [ ] Application logs show no errors
- [ ] Port 3000 is accessible
- [ ] Environment variables loaded correctly
- [ ] API endpoints respond (when implemented)

✅ **Security:**
- [ ] .env file not included in image
- [ ] No secrets in image layers
- [ ] Running as non-root user (if configured)
- [ ] Only production dependencies included

## Current Status

**Note:** Docker daemon is not currently running. To test:

1. Start Docker Desktop
2. Run the build test commands above
3. Verify all success criteria

**Build Command Verified:** ✅ `npm run build` works locally
**Dockerfile Syntax:** ✅ Valid
**.dockerignore:** ✅ Properly configured

**Adapter Note:** Currently using `@sveltejs/adapter-auto`. For production Cloud Run deployment, consider switching to `@sveltejs/adapter-node` for optimal performance.
