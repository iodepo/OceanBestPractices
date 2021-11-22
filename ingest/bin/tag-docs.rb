#!/usr/bin/env ruby

require 'net/http'

require 'json'
require 'uri'
require 'optparse'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: tag-docs.rb [options]"

  opts.on("-h", "--help", "Displays Help") do |h|
    puts opts
    exit
  end

  opts.on("-e ENV", "--env=ENV", "Environment parameters as a JSON file.") do |e|
    options[:env] = JSON.parse(File.read(e))
  end

end.parse!

DOC_INDEX_NAME = "documents"
TERMS_INDEX_NAME = "terms"

ELASTIC_SEARCH_HOST = options[:env]["ELASTIC_SEARCH_HOST"]

TAG_SIZE = 500

# Fetch all document IDs
def query_for_doc_ids
  { query: { match_all: {} }, stored_fields: [], size: 1500 }
end

def fetch_doc_ids

  uri = URI(ELASTIC_SEARCH_HOST + "/#{DOC_INDEX_NAME}/_search")
  req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')

  req.body = query_for_doc_ids.to_json

  res = Net::HTTP.start(uri.hostname) { |http| http.request(req) }

  if (res.code != '200') 
    puts "Error:\n#{res.code}\n#{res.body}"
    []
  else
    hits = JSON.parse(res.body)["hits"]["hits"]
    hits.map { |h| h["_id"] }
  end

end

def query_for_percolate(doc_id)
  { query: { percolate: { field: "query", index: "documents", type: "doc", id: doc_id } }, size: TAG_SIZE }
end

def percolate_doc(id) 

  uri = URI(ELASTIC_SEARCH_HOST + "/#{TERMS_INDEX_NAME}/_search")
  req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')

  req.body = query_for_percolate(id).to_json

  res = Net::HTTP.start(uri.hostname) { |http| http.request(req) }

  if res.code != '200' 
    puts "Error:\n#{res.code}\n#{res.body}"
    []
  else
    hits = JSON.parse(res.body)["hits"]["hits"]
    hits.map do |h|
      { label: h["_source"]["query"]["multi_match"]["query"], uri: h["_id"], source_terminology: h["_source"]["source_terminology"] }
    end
  end
end

def update_doc(id, terms, index = 0, total = 0)

  uri = URI(ELASTIC_SEARCH_HOST + "/#{DOC_INDEX_NAME}/doc/#{id}/_update")
  req = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')

  doc = { doc: { terms: terms } }
  req.body = doc.to_json

  res = Net::HTTP.start(uri.hostname) { |http| http.request(req) }

  if res.code != '200' 
    puts "Error updating document #{id}:\n#{res.code}\n#{res.body}"
  else
    puts "Tagged document #{id} (#{index}/#{total})!"
  end
  
end

doc_ids = fetch_doc_ids.each_with_index do |id, index|
  terms = percolate_doc(id)
  update_doc(id, terms, index + 1, fetch_doc_ids.count)
end
