#!/bin/sh

if [ -f "$NEXT_PUBLIC_TESTER_PASSWORD_FILE" ]; then
  export NEXT_PUBLIC_TESTER_PASSWORD=$(cat $NEXT_PUBLIC_TESTER_PASSWORD_FILE)
  echo "Loaded tester password from file: $NEXT_PUBLIC_TESTER_PASSWORD_FILE"
fi

exec "$@" 