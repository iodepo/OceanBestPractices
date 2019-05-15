#!/usr/bin/env ruby

# This script searches the entire Document index and 
# posts the handle to an SNS topic.

require 'net/http'
require 'json'
require 'uri'

ELASTIC_SEARCH_HOST = "https://search-oop-zgjeiegf2kbi2prlfc6bs4o6ji.us-east-1.es.amazonaws.com"
ELASTIC_SEARCH_PATH = "/documents/_search"

TOPIC_ARN = "arn:aws:sns:us-east-1:247980910912:obp-scheduler-uat-AvailableDocumentTopic-9KZ9LN0PQNXJ"

def handles()

  uri = URI(ELASTIC_SEARCH_HOST + ELASTIC_SEARCH_PATH)
  req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
  req.body = { "_source": { includes: ["handle"] }, "size": 300 }.to_json

  res = Net::HTTP.start(uri.hostname) { |http| http.request(req) }

  if res.code == "200"
    hits = JSON.parse(res.body)["hits"]["hits"]
    hits.map() do |h|
      h["_source"]["handle"]
    end
  else
    []
  end

end

def post_handle(handle)
  puts "Posting handle #{handle}..."
  `aws sns publish --profile ppilone.oop --topic-arn #{TOPIC_ARN} --message "http://hdl.handle.net/#{handle}"`
end 

handles = handles()
puts "Found #{handles.size} handles..."

handles.each { |h| post_handle(h) }