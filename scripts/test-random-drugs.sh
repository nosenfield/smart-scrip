#!/bin/bash

# Test random drugs to verify search/matching functions
# Usage: ./scripts/test-random-drugs.sh [API_URL]

set -e

API_URL=${1:-https://ndc-calculator-izsgspdfsa-uc.a.run.app/api/calculate}

echo "Testing 10 random drugs against: $API_URL"
echo "=========================================="
echo ""

# Array of test drugs with common prescriptions
declare -a DRUGS=(
  "Aspirin 81mg tablet|Take 1 tablet by mouth once daily|30"
  "Ibuprofen 200mg tablet|Take 1-2 tablets by mouth every 4-6 hours as needed|30"
  "Amoxicillin 500mg capsule|Take 1 capsule by mouth three times daily|10"
  "Omeprazole 20mg capsule|Take 1 capsule by mouth once daily before breakfast|30"
  "Levothyroxine 50mcg tablet|Take 1 tablet by mouth once daily on empty stomach|30"
  "Metoprolol 25mg tablet|Take 1 tablet by mouth twice daily|30"
  "Amlodipine 5mg tablet|Take 1 tablet by mouth once daily|30"
  "Gabapentin 300mg capsule|Take 1 capsule by mouth three times daily|30"
  "Sertraline 50mg tablet|Take 1 tablet by mouth once daily|30"
  "Warfarin 5mg tablet|Take 1 tablet by mouth once daily|30"
)

SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=${#DRUGS[@]}

for drug_info in "${DRUGS[@]}"; do
  IFS='|' read -r drug_name sig days_supply <<< "$drug_info"
  
  echo "Testing: $drug_name"
  echo "  SIG: $sig"
  echo "  Days Supply: $days_supply"
  
  # Make API call
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"drugName\": \"$drug_name\",
      \"sig\": \"$sig\",
      \"daysSupply\": $days_supply
    }")
  
  # Check if request was successful
  success=$(echo "$response" | jq -r '.success // false')
  error=$(echo "$response" | jq -r '.error // empty')
  selected_count=$(echo "$response" | jq -r '.data.selectedNDCs | length // 0')
  drug_name_result=$(echo "$response" | jq -r '.data.normalizedDrug.name // "N/A"')
  
  if [ "$success" = "true" ] && [ "$selected_count" -gt 0 ]; then
    echo "  ✅ SUCCESS"
    echo "  - Normalized Drug: $drug_name_result"
    echo "  - Selected NDCs: $selected_count"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "  ❌ FAILED"
    if [ -n "$error" ]; then
      echo "  - Error: $error"
    else
      echo "  - No NDCs selected (count: $selected_count)"
    fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  echo ""
done

echo "=========================================="
echo "Test Summary:"
echo "  Total Tests: $TOTAL_TESTS"
echo "  ✅ Passed: $SUCCESS_COUNT"
echo "  ❌ Failed: $FAIL_COUNT"
echo "  Success Rate: $(( SUCCESS_COUNT * 100 / TOTAL_TESTS ))%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed. Review the output above."
  exit 1
fi

