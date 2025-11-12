# Project Brief: smart-scrip

**Version**: 1.0
**Last Updated**: 2025-11-11

## Project Overview

### What We're Building
An AI-accelerated NDC Packaging & Quantity Calculator that matches prescriptions with valid National Drug Codes (NDCs) and calculates correct dispense quantities for pharmacy systems.

### Core Problem
Pharmacy systems struggle with accurate NDC matching and quantity calculation, leading to:
- Claim rejections due to dosage form/package size mismatches
- Patient dissatisfaction from incorrect dispensing
- Operational delays from manual error correction
- Use of inactive NDCs

### Target Users
- **Primary**: Pharmacists and Pharmacy Technicians who process prescriptions daily
- **Secondary**: Healthcare Administrators monitoring operational efficiency

### Success Criteria
- Medication normalization accuracy: ≥95%
- NDC error-related claim rejections: reduced by 50%
- User satisfaction: ≥4.5/5 in pilot testing
- Query processing time: <2 seconds per calculation

---

## MVP Scope

### Must Have (P0)
- [x] Input: Drug name/NDC, SIG, days' supply
- [ ] AI-powered SIG parsing (OpenAI GPT-4o-mini)
- [ ] Drug normalization to RxCUI (RxNorm API)
- [ ] NDC/package retrieval (FDA NDC Directory API)
- [ ] Quantity calculation with unit awareness
- [ ] Optimal NDC selection algorithm
- [ ] Overfill/underfill detection
- [ ] Inactive NDC warnings
- [ ] JSON API response
- [ ] Simple web UI for input/results

### Should Have (P1)
- [ ] Multi-pack handling
- [ ] Special dosage forms (liquids, insulin, inhalers)
- [ ] User notifications for warnings

### Explicitly Out of Scope
- Pharmacy management system integration (future)
- Prescription history tracking
- User authentication/authorization (MVP is open access)
- Multi-language support
- Mobile native apps (web responsive only)

---

## Technical Constraints

### Performance Targets
- API Response Time: <2s per calculation (p95)
- Page Load Time: <2s
- Concurrent Users: 10+ without degradation

### Platform Requirements
- Deployment: Google Cloud Run
- Browser Support: Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Mobile: Responsive web (no native app)
- Database: None required for MVP (stateless)

### Dependencies
- **External APIs**:
  - OpenAI API (GPT-4o-mini) - SIG parsing
  - RxNorm API (NIH/NLM) - Drug normalization
  - FDA NDC Directory API - Package information
- **Cloud Platform**: Google Cloud Platform (Cloud Run, Cloud Logging)

---

## Project Timeline

- **Phase 0 Complete**: 2025-11-11 ✅
- **MVP Target**: TBD
- **Key Milestones**:
  - Phase 1 (Services): Week of 2025-11-11
  - Phase 2 (Logic): TBD
  - Phase 3 (API): TBD
  - Phase 4 (Frontend): TBD
  - Phase 5 (Testing): TBD
  - Phase 6 (Deployment): TBD
