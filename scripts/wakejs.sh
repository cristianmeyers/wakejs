#!/bin/bash

API_URL="http://brwake.univ-brest.fr:3000/api/action"

# Colors
function color() {
    local text="$1"
    local color_code="$2"
    echo -e "\e[${color_code}m${text}\e[0m"
}

function messages() {
    local len
    local padding

    if [ $# -eq 2 ]; then
        len=${#2}
        message="$2"
    elif [ $# -eq 3 ]; then
        len=${#3}
        message="$3"
    elif [ $# -eq 4 ]; then
        len=${#3}
        message="$3"
    fi

    local cols=${COLUMNS:-$(tput cols)} 
    padding=$(( (cols - len) / 2 ))

    generate_padding() {
        printf "%*s" "$1" ""
    }

    left_padding=$(generate_padding $padding)

    if [ $# -eq 2 ]; then
        echo
        echo -e "$(generate_padding $(( (cols - 74) / 2 )))\e[$1m=======================================================================\e[0m"
        echo
        echo -e "${left_padding}\e[$1m${message}\e[0m"
        echo
        echo -e "$(generate_padding $(( (cols - 74) / 2 )))\e[$1m=======================================================================\e[0m"
    elif [ $# -eq 3 ]; then
        echo
        echo -e "$(generate_padding $(( (cols - 74) / 2 )))\e[$1m=======================================================================\e[0m"
        echo
        echo -e "${left_padding}\e[$2m${message}\e[0m"
        echo
        echo -e "$(generate_padding $(( (cols - 74) / 2 )))\e[$1m=======================================================================\e[0m"
    elif [[ $# -eq 4 && $4 -eq "left" ]]; then
        padding=$(( (74 - len) / 2 ))
        left_padding=$(generate_padding $padding)
        echo
        echo -e "\e[$1m=======================================================================\e[0m"
        echo
        echo -e "${left_padding}\e[$2m${message}\e[0m"
        echo
        echo -e "\e[$1m=======================================================================\e[0m"
    fi
}

usage() {
    messages "36" "1;39" "WAKE$(color "JS" "36") | CLI CONTROL CENTER"
    echo -e "$(color "COMMAND STRUCTURE:" "1")"
    echo -e "  wakejs [options] $(color "<action>" "32") $(color "<target>" "36") [arguments]"
    echo
    echo -e "$(color "AVAILABLE ACTIONS:" "1")"
    echo -e "  $(color "wake" "32")      Send Magic Packets (WOL)"
    echo -e "  $(color "ping" "33")      Check network status"
    echo -e "  $(color "shutdown" "31")  Power off devices via SSH"
    echo
    echo -e "$(color "TARGET TYPES & SYNTAX:" "1")"
    echo -e "  $(color "room" "36")   <name>                ->  Act on an entire room"
    echo -e "  $(color "host" "36")   <pc1> <pc2>...        ->  Act on specific host IDs"
    echo -e "  $(color "range" "36")  <pre> <start> <end>   ->  Act on a numbered range"
    echo
    echo -e "$(color "OPTIONS:" "1")"
    echo -e "  $(color "-v" "35")         Verbose mode (displays raw JSON response)"
    echo
    echo -e "$(color "QUICK EXAMPLES:" "1")"
    echo -e "  wakejs $(color "wake" "32")     $(color "room" "36")   B109"
    echo -e "  wakejs $(color "ping" "33")     $(color "host" "36")   eiutd21 eiutd22"
    echo -e "  wakejs $(color "shutdown" "31") $(color "range" "36")  eiutd 1 20"
    echo
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

  if echo "$json" | jq -e '.error' > /dev/null 2>&1; then
    local error_msg=$(echo "$json" | jq -r '.error')
    echo -e "$(color "Error: $error_msg" "31")"
    return
  fi

  local total=$(echo "$json" | jq -r '.results | length // 0')
  
  if [ "$total" -eq 0 ]; then
    echo -e "$(color "No hosts found" "33")"
    echo -e "$(color "Tip: Verify that the room/host name is correct" "36")"
    return
  fi

  if [ "$verbose" -eq 1 ]; then
    echo "$json" | jq
  else
    # --- PARTE GRÁFICA MEJORADA ---
    echo -e "\n$(color "OPERATION RESULTS:" "1")"
    echo -e "$(color "----------------------------------------------------" "2")"

    # Definimos el escape para que JQ lo use correctamente
    ESC=$(printf '\033')

    echo "$json" | jq -r --arg esc "$ESC" '
      .results[] | 
      "  " + (.id + "               " | .[0:15]) + " │ " + 
      (if .found == false     then ($esc + "[31m✘ NOT FOUND" + $esc + "[0m")
       elif .online != null   then (if .online then ($esc + "[32m● ONLINE" + $esc + "[0m") else ($esc + "[31m○ OFFLINE" + $esc + "[0m") end)
       elif .awake != null    then (if .awake  then ($esc + "[33m⚡ WAKING UP..." + $esc + "[0m") else ($esc + "[31m✘ WOL ERROR" + $esc + "[0m") end)
       elif .shutdown != null then (if .shutdown then ($esc + "[35m🔌 SHUTTING DOWN..." + $esc + "[0m") else ($esc + "[31m✘ SSH ERROR" + $esc + "[0m") end)
       else "UNKNOWN" end)'

    echo -e "$(color "----------------------------------------------------" "2")"
    
    local online_count=$(echo "$json" | jq '[.results[] | select(.online==true)] | length')
    local awake_count=$(echo "$json" | jq '[.results[] | select(.awake==true)] | length')
    local failed_count=$(echo "$json" | jq '[.results[] | select(.found==false)] | length')

    if [ "$action" == "ping" ]; then
      echo -e "  Summary: $(color "$online_count" "32") online out of $(color "$total" "1") total."
      [[ "$failed_count" -gt 0 ]] && echo -e "  $(color "✘ Hosts not found: $failed_count" "31")"
    elif [ "$action" == "awake" ] || [ "$action" == "wake" ]; then
      echo -e "  Summary: $(color "$awake_count packets sent" "33"). Verify status with '\''ping'\'' in a few seconds."
      [[ "$failed_count" -gt 0 ]] && echo -e "  $(color "✘ Hosts not found: $failed_count" "31")"
    fi
    echo ""
  fi
}

case "$TYPE" in
  room)
    ROOM_NAME=$1
    if [ -z "$ROOM_NAME" ]; then 
      echo -e "$(color "Error: Room name is missing" "31")"
      usage
    fi
    # Nota: el script original usa $ACTION tal cual. Si el usuario escribe "wake", se envía "wake".
    DATA="{\"type\":\"Room\",\"name\":\"$ROOM_NAME\",\"action\":\"$ACTION\"}"
    JSON_RESULT=$(call_api "$DATA")
    print_result "$ACTION" "$VERBOSE" "$JSON_RESULT"
    ;;
    
  hosts|host)
    if [ $# -lt 1 ]; then 
      echo -e "$(color "Error: At least one host is required" "31")"
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
      echo -e "$(color "Error: PREFIX, START and END are required for range" "31")"
      usage
    fi

    if ! [[ "$START" =~ ^[0-9]+$ ]] || ! [[ "$END" =~ ^[0-9]+$ ]]; then
      echo -e "$(color "Error: START and END must be numbers" "31")"
      exit 1
    fi

    if [ "$START" -gt "$END" ]; then
      echo -e "$(color "Error: START cannot be greater than END" "31")"
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
    echo -e "$(color "Error: Unknown type '$TYPE'" "31")"
    usage
    ;;
esac