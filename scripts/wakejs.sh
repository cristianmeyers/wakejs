#!/bin/bash

API_URL="http://localhost:3000/api/action"

# Colors
GREEN="\e[32m"
RED="\e[31m"
CYAN="\e[36m"
YELLOW="\e[33m"
RESET="\e[0m"

usage() {
  echo "Usage:"
  echo "  wakejs [-v] awake room <ROOM_NAME>"
  echo "  wakejs [-v] awake hosts|host <HOST1> <HOST2> ..."
  echo "  wakejs [-v] awake range <PREFIX> <START_NUM> <END_NUM>"
  echo "  wakejs [-v] ping room <ROOM_NAME>"
  echo "  wakejs [-v] ping hosts|host <HOST1> <HOST2> ..."
  echo "  wakejs [-v] ping range <PREFIX> <START_NUM> <END_NUM>"
  echo ""
  echo "Options:"
  echo "  -v    Verbose mode (shows complete JSON)"
  echo ""
  echo "Examples:"
  echo "  wakejs awake room B316"
  echo "  wakejs awake hosts eiutf220 eiutf221"
  echo "  wakejs awake range eiutf 220 225"
  echo "  wakejs ping range eiutf 220 230"
  exit 1
}

VERBOSE=0
if [ "$1" == "-v" ]; then
  VERBOSE=1
  shift
fi

if [ $# -lt 2 ]; then
  usage
fi

ACTION=$1
TYPE=$2
shift 2

call_api() {
  curl -s -X POST $API_URL \
    -H "Content-Type: application/json" \
    -d "$1"
}

print_result() {
  local action="$1"
  local verbose="$2"
  local json="$3"

  # Check for errors in response
  if echo "$json" | jq -e '.error' > /dev/null 2>&1; then
    local error_msg=$(echo "$json" | jq -r '.error')
    echo -e "${RED}Error: $error_msg${RESET}"
    return
  fi

  # Check if results exists and has content
  local total=$(echo "$json" | jq -r '.results | length // 0')
  
  if [ "$total" -eq 0 ]; then
    echo -e "${YELLOW}No hosts found${RESET}"
    echo -e "${CYAN}Tip: Verify that the room/host name is correct${RESET}"
    return
  fi

  if [ "$verbose" -eq 1 ]; then
    echo "$json" | jq
  else
    local online_count=$(echo "$json" | jq '[.results[] | select(.online==true)] | length')
    local awake_count=$(echo "$json" | jq '[.results[] | select(.awake==true)] | length')
    local failed_count=$(echo "$json" | jq '[.results[] | select(.found==false)] | length')

    echo "$json" | jq -r '
      .results[] | "\(.id) : \(
        if .found == false then
          "\u001b[31mhost not found in dhcp\u001b[0m"
        elif .online != null then
          if .online then "\u001b[32monline\u001b[0m" else "\u001b[31moffline\u001b[0m" end
        elif .awake != null then
          if .awake then "\u001b[33mawaking, use ping to verify\u001b[0m" else "\u001b[31mfailed to wake\u001b[0m" end
        else
          "\u001b[36munknown\u001b[0m"
        end
      )\(if .error then " - \u001b[31m\(.error)\u001b[0m" else "" end)"'

    echo ""
    
    if [ "$action" == "ping" ]; then
      echo -e "Hosts online: ${GREEN}$online_count${RESET}/$total"
      if [ "$failed_count" -gt 0 ]; then
        echo -e "${RED}Hosts not found: $failed_count${RESET}"
      fi
    elif [ "$action" == "awake" ]; then
      echo -e "WOL packets sent: ${YELLOW}$awake_count${RESET}/$total"
      if [ "$failed_count" -gt 0 ]; then
        echo -e "${RED}Hosts not found: $failed_count${RESET}"
      fi
      echo -e "${CYAN}Tip: Use 'wakejs ping ...' to verify status${RESET}"
    fi
  fi
}

case "$TYPE" in
  room)
    ROOM_NAME=$1
    if [ -z "$ROOM_NAME" ]; then 
      echo -e "${RED}Error: Room name is missing${RESET}"
      usage
    fi
    DATA="{\"type\":\"Room\",\"name\":\"$ROOM_NAME\",\"action\":\"$ACTION\"}"
    JSON_RESULT=$(call_api "$DATA")
    print_result "$ACTION" "$VERBOSE" "$JSON_RESULT"
    ;;
    
  hosts|host)
    if [ $# -lt 1 ]; then 
      echo -e "${RED}Error: At least one host is required${RESET}"
      usage
    fi
    HOSTS_LIST=$(echo "$*" | tr ' ' ',')
    DATA="{\"type\":\"Hosts\",\"name\":\"$HOSTS_LIST\",\"action\":\"$ACTION\"}"
    JSON_RESULT=$(call_api "$DATA")
    print_result "$ACTION" "$VERBOSE" "$JSON_RESULT"
    ;;
    
  range)
    PREFIX=$1
    START=$2
    END=$3
    
    if [ -z "$PREFIX" ] || [ -z "$START" ] || [ -z "$END" ]; then 
      echo -e "${RED}Error: PREFIX, START and END are required for range${RESET}"
      usage
    fi

    # Validate that START and END are numbers
    if ! [[ "$START" =~ ^[0-9]+$ ]] || ! [[ "$END" =~ ^[0-9]+$ ]]; then
      echo -e "${RED}Error: START and END must be numbers${RESET}"
      exit 1
    fi

    if [ "$START" -gt "$END" ]; then
      echo -e "${RED}Error: START cannot be greater than END${RESET}"
      exit 1
    fi

    HOSTS=""
    for i in $(seq $START $END); do
      if [ -z "$HOSTS" ]; then
        HOSTS="${PREFIX}${i}"
      else
        HOSTS="$HOSTS,${PREFIX}${i}"
      fi
    done

    DATA="{\"type\":\"Hosts\",\"name\":\"$HOSTS\",\"action\":\"$ACTION\"}"
    JSON_RESULT=$(call_api "$DATA")
    print_result "$ACTION" "$VERBOSE" "$JSON_RESULT"
    ;;
    
  *)
    echo -e "${RED}Error: Unknown type '$TYPE'${RESET}"
    usage
    ;;
esac