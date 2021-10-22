#!/usr/bin/env ruby

require 'net/http'
require 'json'
require 'uri'

BULK_INDEXER_HOST = "http://localhost:3000"
BULK_INDEXER_PATH = "/items"

def bulk_index(limit, offset)
  params = { limit: limit, offset: offset }

  uri = URI(BULK_INDEXER_HOST + BULK_INDEXER_PATH)
  uri.query = URI.encode_www_form(params)

  req = Net::HTTP::Get.new(uri)
  req['Accept'] = 'application/json'

  res = Net::HTTP.start(uri.hostname, uri.port) { |http| http.request(req) }
  JSON.parse(res.body)
end

limit = 50
offset = 0

objects = bulk_index(limit, offset)
puts "Uploaded metadata for objects from #{offset} to #{offset + objects.size}..."

while objects.size > 0
  offset += objects.size
  objects = bulk_index(limit, offset)
  puts "Uploaded metadata for objects from #{offset} to #{offset + objects.size}..."
end