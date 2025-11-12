# Product Context: smart-scrip

**Last Updated**: 2025-11-11

## Why This Project Exists

### Problem Statement
Pharmacy systems struggle with accurate NDC (National Drug Code) matching and quantity calculation when processing prescriptions. Manual errors lead to claim rejections, patient dissatisfaction, and operational delays. The system needs to:
- Parse complex prescription directions (SIG) accurately
- Match prescriptions to correct NDC packages
- Calculate optimal dispense quantities
- Detect inactive or mismatched NDCs before dispensing

### User Pain Points
1. **Claim Rejections**: Dosage form/package size mismatches cause insurance claim rejections
2. **Manual Error Correction**: Pharmacists spend time manually correcting NDC mismatches
3. **Patient Dissatisfaction**: Incorrect quantities or package sizes frustrate patients
4. **Inactive NDC Usage**: Systems may use discontinued NDCs, causing delays

### Our Solution
AI-accelerated calculator that:
- Uses OpenAI to parse complex prescription directions
- Normalizes drug names via RxNorm API
- Retrieves valid NDC packages from FDA Directory
- Calculates optimal package quantities with waste minimization
- Provides warnings for inactive NDCs and overfill/underfill scenarios

---

## Target Users

### Primary User Persona
- **Name**: Pharmacy Technician / Pharmacist
- **Role**: Pharmacy staff processing prescriptions daily
- **Goals**: 
  - Quickly match prescriptions to correct NDC packages
  - Calculate accurate dispense quantities
  - Avoid claim rejections and patient complaints
- **Frustrations**: 
  - Manual NDC lookup is time-consuming
  - Complex SIG text is hard to parse accurately
  - Inactive NDCs cause delays
- **Tech Savviness**: Intermediate (comfortable with web applications)

### Secondary User Persona
- **Name**: Healthcare Administrator
- **Role**: Monitoring operational efficiency and error rates
- **Goals**: 
  - Track NDC-related errors and rejections
  - Improve pharmacy workflow efficiency

---

## Key User Flows

### Flow 1: Calculate NDC Package Quantity
1. User enters prescription data: drug name (or NDC), SIG text, days' supply
2. System parses SIG using AI to extract dose, frequency, route
3. System normalizes drug name via RxNorm API
4. System retrieves available NDC packages from FDA Directory
5. System calculates optimal package selection with quantity
6. Result: User receives recommended NDC(s) with package count, warnings, and reasoning

### Flow 2: Handle Invalid Input
1. User enters invalid or incomplete prescription data
2. System validates input and returns validation errors
3. User corrects input and resubmits
4. Result: Successful calculation with valid data

---

## Product Goals

### Short-term (MVP)
- Achieve ≥95% medication normalization accuracy
- Reduce NDC error-related claim rejections by 50%
- Process calculations in <2 seconds
- Provide clear warnings for inactive NDCs and quantity mismatches

### Long-term (Future)
- Integrate with pharmacy management systems
- Support multi-pack handling and special dosage forms
- Add prescription history tracking
- Implement user authentication and authorization

---

## Success Metrics

### User Engagement
- User satisfaction: ≥4.5/5 in pilot testing
- Daily active users: Track adoption in pilot pharmacies

### Business Impact
- NDC error-related claim rejections: Reduced by 50%
- Time saved per prescription: Measure workflow efficiency improvement

### Technical Performance
- Query processing time: <2 seconds per calculation (p95)
- API availability: ≥99.5% uptime
- Error rate: <1% of calculations fail
