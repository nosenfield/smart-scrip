#!/bin/bash

# Test NDC lookups with varying quantities
# Usage: ./scripts/test-ndc-variations.sh [API_URL]

set -e

API_URL=${1:-https://ndc-calculator-izsgspdfsa-uc.a.run.app/api/calculate}

echo "Testing 5 NDCs with varying quantities against: $API_URL"
echo "========================================================"
echo ""

# Array of test cases: NDC|SIG|Days Supply|Description
declare -a TEST_CASES=(
  "65862-045-00|Take 1 tablet by mouth once daily|7|Lisinopril 10mg - 7 day supply (7 tablets)"
  "65862-045-00|Take 1 tablet by mouth twice daily|14|Lisinopril 10mg - 14 day supply twice daily (28 tablets)"
  "42385-949-01|Take 1 tablet by mouth twice daily with meals|60|Metformin 500mg - 60 day supply twice daily (120 tablets)"
  "31722-425-90|Take 1 tablet by mouth once daily at bedtime|90|Atorvastatin 20mg - 90 day supply (90 tablets)"
  "65862-045-00|Take 2 tablets by mouth once daily|30|Lisinopril 10mg - 30 day supply double dose (60 tablets)"
)

SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=${#TEST_CASES[@]}

for test_case in "${TEST_CASES[@]}"; do
  IFS='|' read -r ndc sig days_supply description <<< "$test_case"
  
  echo "Test: $description"
  echo "  NDC: $ndc"
  echo "  SIG: $sig"
  echo "  Days Supply: $days_supply"
  
  # Make API call
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"ndc\": \"$ndc\",
      \"sig\": \"$sig\",
      \"daysSupply\": $days_supply
    }")
  
  # Check if request was successful
  success=$(echo "$response" | jq -r '.success // false')
  error=$(echo "$response" | jq -r '.error // empty')
  selected_count=$(echo "$response" | jq -r '.data.selectedNDCs | length // 0')
  drug_name_result=$(echo "$response" | jq -r '.data.normalizedDrug.name // "N/A"')
  total_quantity=$(echo "$response" | jq -r '.data.totalQuantity // 0')
  rxcui=$(echo "$response" | jq -r '.data.rxcui // "N/A"')
  
  if [ "$success" = "true" ] && [ "$selected_count" -gt 0 ]; then
    echo "  ✅ SUCCESS"
    echo "  - Normalized Drug: $drug_name_result"
    echo "  - RxCUI: $rxcui"
    echo "  - Total Quantity Required: $total_quantity tablets"
    echo "  - Selected NDCs: $selected_count"
    
    # Show selected NDC details
    echo "$response" | jq -r '.data.selectedNDCs[] | "    • NDC: \(.ndc) | Quantity: \(.quantity) | Packages: \(.packageCount)"'
    
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "  ❌ FAILED"
    if [ -n "$error" ]; then
      echo "  - Error: $error"
    else
      echo "  - No NDCs selected (count: $selected_count)"
      echo "  - Response: $(echo "$response" | jq -c '.')"
    fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  echo ""
done

echo "========================================================"
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

