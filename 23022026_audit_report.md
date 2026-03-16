# Audit Report: Resource Utilization & Cost Optimization

**Date:** 23 February 2026  
**Project:** Kwitansi-Exata (Receipt App)  
**Role:** Project Quality Assurance Lead / Technical Auditor  

---

## 1. Executive Summary

This audit addresses the recurring issue of resource waste and cost inflation in the Kwitansi-Exata project. Despite being actively utilized for only a few days each month, the monthly infrastructure bill is currently tracking at approximately **$22.78**, substantially exceeding the **$10** soft limit budget. 

Based on our architectural review, the application suffers from **Always-On Over-provisioning**, **Monolithic Heavy-Worker execution (Puppeteer)**, and **Unoptimized Base Memory Footprint**. The container is billed 24/7 for a high-memory tier necessitated by occasional PDF generation spikes. This creates massive idle waste. If unaddressed, scaling the number of transactions or batches will directly cause Out-Of-Memory (OOM) crashes or continuously escalating costs.

---

## 2. Resource Utilization Analysis

Based on the provided Railway dashboard metrics:

- **Memory (RAM):** 76,949.10 minutely GB | **Cost:** $17.81 (~96% of total cost)
  - This is the primary cost driver. The execution environment averages a consistently high RAM allocation (approx. 1.7GB - 2GB allocated continuously) multiplied by 24/7 uptime. 
- **CPU:** 1567.23 minutely vCPU | **Cost:** $0.72 (~4% of total cost)
  - CPU usage is highly spiked (bursty), aligning with the "active only a few days a month" usage pattern. Idle CPU costs are negligible, but the spikes dictate the container sizing.
- **Network Egress:** 0.24 GB | **Cost:** $0.01 
  - Network egress is well within normal parameters and is **not** a contributing factor to the budget overrun.

---

## 3. Cost Breakdown & Cost Driver Identification

The massive discrepancy between active usage and cost stems primarily from **Idle Memory Billing**. Railway bills based on allocated resources per minute. 

1. **Peak Provisioning for Base Usage:** To support the heavy requirement of generating PDFs via Puppeteer, the container requires a high baseline of RAM (likely 2GB+). 
2. **24/7 Billing:** Because the project does not scale to zero (no auto-suspend), the high RAM tier is paid for 24 hours a day, 30 days a month, even when absolutely zero receipts are being generated. 

---

## 4. Architectural Risk Assessment

Through codebase observation (`src/`, `next.config.ts`, `nixpacks.toml`), several critical architectural risks were identified:

### A. Missing Standalone Output (Memory Bloat)
The `next.config.ts` does not implement `output: 'standalone'`. This causes the Next.js production server to load all standard dependencies, `node_modules`, and full framework footprint into memory, significantly increasing the application's base idle RAM usage.

### B. Unbounded Puppeteer Instantiation (RAM & CPU Spikes)
In `src/services/receipt-generator.ts`, the application spawns a new Chromium browser instance (`puppeteer.launch()`) **per generation job**. 
- While `MAX_CONCURRENT_PAGES = 5` safely restricts tabs *within* a job, there is **no global concurrency lock**. 
- If multiple batch generation API calls are triggered simultaneously, multiple Chromium instances are launched holding parallel memory overheads. This causes massive RAM spikes, forcing the need for an over-provisioned deployment tier.

### C. Monolithic Web + Background Worker
The user-facing Next.js web application and the heavy background worker (PDF generator) run in the exact same container. An Out-Of-Memory crash caused by PDF rendering will take down the entire web dashboard.

### D. In-Memory Data Aggregation
In `src/app/api/dashboard/analytics/route.ts`, the system uses `prisma.transaction.findMany()` without limits to pull hundreds or thousands of records into memory to calculate monthly aggregations via arrays. This creates unnecessary garbage collection pauses and temporary RAM bloat.

---

## 5. Optimization & Mitigation Options

To bring the project under the $10/month budget without modifying the current core logic, the following ops-level mitigations are available:

1. **Enable Railway Scale-to-Zero / Auto-Suspend (Ops)**
   - Configure the environment to sleep after 15 minutes of inactivity. This directly targets the 96% wasted memory cost during the 20+ idle days of the month.
2. **Next.js Standalone Mode (Config)**
   - Add `output: 'standalone'` to `next.config.ts` and update the Dockerfile/Nixpacks start script to run `node server.js`. This drastically reduces the baseline RAM required to keep the container alive.
3. **Decouple PDF Generation (Architecture)**
   - Shift Puppeteer rendering to a Serverless function limits (e.g., AWS Lambda, Vercel Functions with `puppeteer-core`) or an external specialized API (like Browserless.io). This allows the main Next.js container to drop to a minimal 256MB/512MB RAM tier.
4. **Implement Global Job Queue (Architecture)**
   - Introduce Redis/BullMQ to ensure only **one** Puppeteer browser exists globally at any time, processing jobs sequentially across the platform.
5. **Database-Level Aggregation (Code)**
   - Refactor analytics to use `prisma.transaction.groupBy` or raw SQL `COUNT/SUM...GROUP BY`, entirely bypassing the Next.js memory footprint.

---

## 6. Strategic Recommendation

**Phase 1 (Immediate / Zero-Code / Highest Impact):**
- Enable Railway's **Auto-suspend** feature. Since the app is only used a few days a month, sleeping the container when idle will instantly reduce the $20 bill to effectively $2-$5.
- Add `output: "standalone"` to `next.config.ts` to reduce the baseline RAM allocation needed.

**Phase 2 (Long-Term Stability):**
- Separate the Puppeteer worker from the Next.js application. Use a service like **Browserless.io** (which has a free tier / low usage cost) to handle Chromium tasks, and move the Next.js app to Vercel (Free) or a minimal $2-$5 Railway tier.

---

## 7. Risk If Unaddressed

If no action is taken:
1. **Financial Leakage:** The project will consistently burn ~$20-$25 monthly for an idle service, destroying project margins.
2. **Platform Instability:** As historical receipt data grows, the in-memory Prisma finds will consume more RAM. Coupled with simultaneous PDF Generations, the container will hit Railway's hard memory limit, causing unexpected `SIGKILL` (Out of Memory) crashes during critical operational days.
3. **Degraded UX:** Batch uploads will randomly fail midway if the container restarts due to OOM conditions, leaving databases in partial "PROCESSING" states.
