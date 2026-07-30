#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
CERT_DIR="$ROOT_DIR/certs/wallet"

usage() {
  cat <<'USAGE'
Usage:
  npm run wallet:csr -- \
    --pass-type-id pass.com.yourcompany.perkly \
    --team-id ABCDE12345 \
    [--organization-name Perkly] \
    [--frontend-url https://perkly.uz]

  npm run wallet:setup -- \
    --pass-type-id pass.com.yourcompany.perkly \
    --team-id ABCDE12345 \
    --wwdr-cert /path/to/AppleWWDRCAG4.cer \
    [--signer-p12 /path/to/pass-certificate-private-key.p12] \
    [--pass-cert /path/to/pass.cer --signer-key /path/to/pass-signing.key] \
    [--organization-name Perkly] \
    [--frontend-url https://perkly.uz] \
    [--p12-passphrase "..."] \
    [--key-passphrase "..."]

  npm run wallet:check

Notes:
  - wallet:csr creates a private key plus .certSigningRequest for Apple Developer.
  - wallet:setup accepts either a .p12 export or a .cer + matching private key.
  - If --pass-cert is omitted, signer cert is extracted from --signer-p12.
  - For production, store generated PEM files as server secrets, not in the repo.
USAGE
}

fail() {
  echo "Wallet setup error: $*" >&2
  exit 1
}

env_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

set_env() {
  local key="$1"
  local value="$2"
  local escaped_value
  local line
  escaped_value="$(env_escape "$value")"
  line="$key=\"$escaped_value\""

  touch "$ENV_FILE"

  if grep -q "^$key=" "$ENV_FILE"; then
    awk -v key="$key" -v line="$line" '
      $0 ~ "^" key "=" { print line; next }
      { print }
    ' "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  else
    printf '\n%s\n' "$line" >> "$ENV_FILE"
  fi
}

get_env() {
  local key="$1"
  awk -v key="$key" '
    $0 ~ "^" key "=" {
      value = substr($0, length(key) + 2)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      if (value ~ /^".*"$/ || value ~ /^\047.*\047$/) {
        value = substr(value, 2, length(value) - 2)
      }
      print value
    }
  ' "$ENV_FILE" | tail -n 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "file not found: $path"
}

convert_cert_to_pem() {
  local source="$1"
  local target="$2"

  require_file "$source"
  if openssl x509 -in "$source" -noout >/dev/null 2>&1; then
    cp "$source" "$target"
  else
    openssl x509 -inform DER -in "$source" -out "$target" >/dev/null
  fi
}

download_wwdr_g4() {
  local cer_path="$CERT_DIR/AppleWWDRCAG4.cer"
  local pem_path="$CERT_DIR/wwdr.pem"

  if [[ ! -f "$cer_path" ]]; then
    command -v curl >/dev/null 2>&1 || fail "curl is required to download Apple WWDR G4"
    curl -fsSL "https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer" -o "$cer_path"
  fi

  convert_cert_to_pem "$cer_path" "$pem_path"
  chmod 644 "$cer_path" "$pem_path"
  set_env "APPLE_WALLET_WWDR_CERT_PATH" "$pem_path"
}

run_csr() {
  local pass_type_id=""
  local team_id=""
  local org_name="Perkly"
  local frontend_url=""
  local common_name="Perkly Wallet Pass"
  local key_path="$CERT_DIR/signer-key.pem"
  local csr_path="$CERT_DIR/perkly-pass.certSigningRequest"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pass-type-id) pass_type_id="${2:-}"; shift 2 ;;
      --team-id) team_id="${2:-}"; shift 2 ;;
      --organization-name) org_name="${2:-}"; shift 2 ;;
      --frontend-url) frontend_url="${2:-}"; shift 2 ;;
      --common-name) common_name="${2:-}"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      *) fail "unknown option: $1" ;;
    esac
  done

  [[ -n "$pass_type_id" ]] || fail "--pass-type-id is required"
  [[ -n "$team_id" ]] || fail "--team-id is required"

  mkdir -p "$CERT_DIR"

  if [[ ! -f "$key_path" ]]; then
    openssl genrsa -out "$key_path" 2048 >/dev/null 2>&1
    chmod 600 "$key_path"
  fi

  openssl req \
    -new \
    -key "$key_path" \
    -out "$csr_path" \
    -subj "/CN=$common_name/O=$org_name/OU=$team_id/C=UZ" >/dev/null
  chmod 644 "$csr_path"

  download_wwdr_g4

  set_env "APPLE_WALLET_PASS_TYPE_ID" "$pass_type_id"
  set_env "APPLE_WALLET_TEAM_ID" "$team_id"
  set_env "APPLE_WALLET_ORGANIZATION_NAME" "$org_name"
  set_env "APPLE_WALLET_KEY_PATH" "$key_path"
  set_env "APPLE_WALLET_KEY_PASSPHRASE" ""

  if [[ -n "$frontend_url" ]]; then
    set_env "FRONTEND_URL" "$frontend_url"
  fi

  echo "Created Apple Wallet CSR:"
  echo "$csr_path"
  echo ""
  echo "Upload this file in Apple Developer when creating the Pass Type ID Certificate."
  echo "After downloading the .cer file, run wallet:setup with --pass-cert and --signer-key."
}

run_setup() {
  local pass_type_id=""
  local team_id=""
  local org_name="Perkly"
  local frontend_url=""
  local signer_p12=""
  local signer_key=""
  local pass_cert=""
  local wwdr_cert=""
  local p12_passphrase="${WALLET_P12_PASSPHRASE:-}"
  local key_passphrase="${APPLE_WALLET_KEY_PASSPHRASE:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pass-type-id) pass_type_id="${2:-}"; shift 2 ;;
      --team-id) team_id="${2:-}"; shift 2 ;;
      --organization-name) org_name="${2:-}"; shift 2 ;;
      --frontend-url) frontend_url="${2:-}"; shift 2 ;;
      --signer-p12) signer_p12="${2:-}"; shift 2 ;;
      --signer-key) signer_key="${2:-}"; shift 2 ;;
      --pass-cert) pass_cert="${2:-}"; shift 2 ;;
      --wwdr-cert) wwdr_cert="${2:-}"; shift 2 ;;
      --p12-passphrase) p12_passphrase="${2:-}"; shift 2 ;;
      --key-passphrase) key_passphrase="${2:-}"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      *) fail "unknown option: $1" ;;
    esac
  done

  [[ -n "$pass_type_id" ]] || fail "--pass-type-id is required"
  [[ -n "$team_id" ]] || fail "--team-id is required"
  [[ -n "$wwdr_cert" ]] || fail "--wwdr-cert is required"
  require_file "$wwdr_cert"

  if [[ -n "$signer_key" || -n "$pass_cert" ]]; then
    [[ -n "$signer_key" ]] || fail "--signer-key is required when using --pass-cert"
    [[ -n "$pass_cert" ]] || fail "--pass-cert is required when using --signer-key"
    require_file "$signer_key"
    require_file "$pass_cert"
  else
    [[ -n "$signer_p12" ]] || fail "--signer-p12 is required unless using --pass-cert with --signer-key"
    require_file "$signer_p12"
  fi

  mkdir -p "$CERT_DIR"

  if [[ -n "$signer_key" ]]; then
    convert_cert_to_pem "$pass_cert" "$CERT_DIR/signer-cert.pem"
    cp "$signer_key" "$CERT_DIR/signer-key.pem"
  else
    openssl pkcs12 \
      -in "$signer_p12" \
      -clcerts \
      -nokeys \
      -out "$CERT_DIR/signer-cert.pem" \
      -passin "pass:$p12_passphrase" >/dev/null

    if [[ -n "$key_passphrase" ]]; then
      openssl pkcs12 \
        -in "$signer_p12" \
        -nocerts \
        -out "$CERT_DIR/signer-key.pem" \
        -passin "pass:$p12_passphrase" \
        -passout "pass:$key_passphrase" >/dev/null
    else
      openssl pkcs12 \
        -in "$signer_p12" \
        -nocerts \
        -nodes \
        -out "$CERT_DIR/signer-key.pem" \
        -passin "pass:$p12_passphrase" >/dev/null
    fi
  fi

  convert_cert_to_pem "$wwdr_cert" "$CERT_DIR/wwdr.pem"

  chmod 600 "$CERT_DIR/signer-key.pem"
  chmod 644 "$CERT_DIR/signer-cert.pem" "$CERT_DIR/wwdr.pem"

  set_env "APPLE_WALLET_PASS_TYPE_ID" "$pass_type_id"
  set_env "APPLE_WALLET_TEAM_ID" "$team_id"
  set_env "APPLE_WALLET_ORGANIZATION_NAME" "$org_name"
  set_env "APPLE_WALLET_CERT_PATH" "$CERT_DIR/signer-cert.pem"
  set_env "APPLE_WALLET_KEY_PATH" "$CERT_DIR/signer-key.pem"
  set_env "APPLE_WALLET_WWDR_CERT_PATH" "$CERT_DIR/wwdr.pem"
  set_env "APPLE_WALLET_KEY_PASSPHRASE" "$key_passphrase"

  if [[ -n "$frontend_url" ]]; then
    set_env "FRONTEND_URL" "$frontend_url"
  fi

  run_check
}

check_cert() {
  local label="$1"
  local path="$2"
  openssl x509 -in "$path" -noout -subject -issuer >/dev/null ||
    fail "$label is not a readable PEM certificate: $path"
}

run_check() {
  [[ -f "$ENV_FILE" ]] || fail ".env not found"

  local pass_type_id
  local team_id
  local cert_path
  local key_path
  local wwdr_path
  local key_passphrase

  pass_type_id="$(get_env APPLE_WALLET_PASS_TYPE_ID)"
  team_id="$(get_env APPLE_WALLET_TEAM_ID)"
  cert_path="$(get_env APPLE_WALLET_CERT_PATH)"
  key_path="$(get_env APPLE_WALLET_KEY_PATH)"
  wwdr_path="$(get_env APPLE_WALLET_WWDR_CERT_PATH)"
  key_passphrase="$(get_env APPLE_WALLET_KEY_PASSPHRASE)"

  [[ -n "$pass_type_id" ]] || fail "APPLE_WALLET_PASS_TYPE_ID is empty"
  [[ -n "$team_id" ]] || fail "APPLE_WALLET_TEAM_ID is empty"
  [[ -n "$cert_path" ]] || fail "APPLE_WALLET_CERT_PATH is empty"
  [[ -n "$key_path" ]] || fail "APPLE_WALLET_KEY_PATH is empty"
  [[ -n "$wwdr_path" ]] || fail "APPLE_WALLET_WWDR_CERT_PATH is empty"

  require_file "$cert_path"
  require_file "$key_path"
  require_file "$wwdr_path"

  check_cert "APPLE_WALLET_CERT_PATH" "$cert_path"
  check_cert "APPLE_WALLET_WWDR_CERT_PATH" "$wwdr_path"

  if [[ -n "$key_passphrase" ]]; then
    openssl pkey -in "$key_path" -passin "pass:$key_passphrase" -noout >/dev/null ||
      fail "APPLE_WALLET_KEY_PATH is not readable with APPLE_WALLET_KEY_PASSPHRASE"
  else
    openssl pkey -in "$key_path" -noout >/dev/null ||
      fail "APPLE_WALLET_KEY_PATH is not a readable PEM private key"
  fi

  echo "Apple Wallet certificates are configured and readable."
}

mode="${1:-}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "$mode" in
  csr) run_csr "$@" ;;
  setup) run_setup "$@" ;;
  check) run_check ;;
  -h|--help|"") usage ;;
  *) fail "unknown mode: $mode" ;;
esac
