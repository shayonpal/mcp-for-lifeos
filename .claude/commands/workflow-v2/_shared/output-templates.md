# Output Templates

**Purpose**: Standardized output formatting for consistent UX across workflow commands.

## Template Functions

### success_output()

Standard success message template.

**Parameters**:
- `$1` - Phase name
- `$2` - Summary text
- `$3` - Next steps (optional)

```bash
success_output() {
  local phase="$1"
  local summary="$2"
  local next_steps="$3"

  echo ""
  echo "╔════════════════════════════════════════════╗"
  echo "║  ✅ $phase Complete                        ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""
  echo "$summary"
  echo ""

  if [ -n "$next_steps" ]; then
    echo "### 💡 Next Steps"
    echo "$next_steps"
    echo ""
  fi
}
```

### error_output()

Standard error message template.

**Parameters**:
- `$1` - Error title
- `$2` - Error details
- `$3` - Recovery steps

```bash
error_output() {
  local title="$1"
  local details="$2"
  local recovery="$3"

  echo ""
  echo "╔════════════════════════════════════════════╗"
  echo "║  ❌ $title                                  ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""
  echo "**Error Details:**"
  echo "$details"
  echo ""
  echo "**Recovery Steps:**"
  echo "$recovery"
  echo ""
}
```

### checkpoint_output()

Standard checkpoint/confirmation prompt.

**Parameters**:
- `$1` - Checkpoint title
- `$2` - Context to review
- `$3` - Question/prompt

```bash
checkpoint_output() {
  local title="$1"
  local context="$2"
  local question="$3"

  echo ""
  echo "╔════════════════════════════════════════════╗"
  echo "║  🤔 $title                                  ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""
  echo "$context"
  echo ""
  echo "**$question**"
  echo ""
}
```

### phase_header()

Standard phase header.

**Parameters**:
- `$1` - Phase name
- `$2` - Phase description

```bash
phase_header() {
  local phase_name="$1"
  local description="$2"

  echo ""
  echo "════════════════════════════════════════════"
  echo "  $phase_name"
  echo "════════════════════════════════════════════"
  echo ""
  echo "$description"
  echo ""
}
```

### progress_indicator()

Show progress through workflow phases.

**Parameters**:
- `$1` - Current phase
- `$2` - Total phases

```bash
progress_indicator() {
  local current="$1"
  local total="$2"
  local percent=$((current * 100 / total))

  # Create progress bar
  local filled=$((current * 20 / total))
  local empty=$((20 - filled))

  local bar=""
  for i in $(seq 1 $filled); do bar+="█"; done
  for i in $(seq 1 $empty); do bar+="░"; done

  echo "Progress: [$bar] $percent% ($current/$total phases)"
}
```

### validation_results()

Display validation check results.

**Parameters**:
- `$@` - Array of "check_name:status:details" strings

```bash
validation_results() {
  local checks=("$@")

  echo "### 🔍 Validation Results"
  echo ""

  for check in "${checks[@]}"; do
    IFS=':' read -r name status details <<< "$check"

    if [ "$status" = "pass" ]; then
      echo "- ✅ $name: Passed"
    elif [ "$status" = "fail" ]; then
      echo "- ❌ $name: Failed"
    else
      echo "- ⏭️ $name: Skipped"
    fi

    if [ -n "$details" ]; then
      echo "  └─ $details"
    fi
  done

  echo ""
}
```

### summary_table()

Display summary information in table format.

**Parameters**:
- `$1` - Table title
- `$@` - Array of "label:value" strings

```bash
summary_table() {
  local title="$1"
  shift
  local items=("$@")

  echo "### 📊 $title"
  echo ""

  for item in "${items[@]}"; do
    IFS=':' read -r label value <<< "$item"
    printf "%-20s : %s\n" "$label" "$value"
  done

  echo ""
}
```

## Usage Examples

### Success Output

```bash
source .claude/commands/workflow-v2/_shared/output-templates.md

success_output \
  "Planning Phase" \
  "Comprehensive planning complete with validated strategy" \
  "Run /workflow-v2:02-stage to create implementation contracts"
```

### Error Output

```bash
error_output \
  "TypeScript Validation Failed" \
  "Found 3 type errors in src/tool-router.ts" \
  "1. Review error messages above\n2. Fix type issues\n3. Run npm run typecheck\n4. Retry workflow command"
```

### Checkpoint

```bash
checkpoint_output \
  "Version Confirmation" \
  "Proposed version: v2.0.0\nRationale: Breaking changes detected" \
  "Confirm version? (yes/no/custom)"
```

### Validation Results

```bash
validation_results \
  "typecheck:pass:No errors found" \
  "build:pass:Build successful" \
  "tests:fail:2 tests failing"
```

### Summary Table

```bash
summary_table \
  "Release Summary" \
  "Version:v2.0.0" \
  "Commits:15" \
  "Files Changed:23" \
  "Tests:All passing"
```
