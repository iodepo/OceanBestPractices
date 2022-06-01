#!/bin/sh

is_virtuoso_online () {
  status=$(curl -s -X GET --write-out "%{http_code}" --output /dev/null "http://127.0.0.1:8890/sparql?query=SELECT%20DISTINCT%20%3Fg%20WHERE%20%7B%20GRAPH%20%3Fg%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20%7D")
  [ $status -eq 200 ]
}

while ! is_virtuoso_online; do sleep 1; done
