#!/usr/bin/env ruby

require 'net/http'
require 'json'
require 'optparse'
require 'uri'

require 'open-uri'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: create-tag-index.rb [options]"

  opts.on("-h", "--help", "Displays Help") do |h|
    puts opts
    exit
  end

  opts.on("-p PROFILE", "--profile=PROFILE", "AWS profile to use for accessing services.") do |p|
    options[:profile] = p
  end

  opts.on("-l LIMIT", "--limit=LIMIT", "Limit the number of documents indexed. Defaults to 350.") do |l|
    options[:limit] = l
  end

  opts.on("-e ENV", "--env=ENV", "Environment parameters as a JSON file.") do |e|
    options[:env] = JSON.parse(File.read(e))
  end

end.parse!

ELASTIC_SEARCH_HOST = options[:env]["ELASTIC_SEARCH_HOST"]
ELASTIC_SEARCH_PATH = "/documents/doc"

AWS_PROFILE = options[:profile]
TOPIC_ARN = options[:env]["AVAILABLE_TOPIC_ARN"]

limit = options[:limit] || 350
DSPACE_HOST = "https://www.oceanbestpractices.net"
DSPACE_PATH = "/rest/items?limit=#{limit}"
DSPACE_USER_AGENT = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5"

def fetch_source_docs() 
  res = open(DSPACE_HOST + DSPACE_PATH).read
  JSON.parse(res)
end

def indexed?(key)
  uri = URI(ELASTIC_SEARCH_HOST + ELASTIC_SEARCH_PATH + "/" + key)
  req = Net::HTTP::Get.new(uri, 'Accept' => 'application/json')

  res = Net::HTTP.start(uri.hostname) { |http| http.request(req) }
  body = JSON.parse(res.body)
    
  body["found"]
end

def publish_handle(handle)
  puts "Posting handle #{handle}..."
  `aws sns publish --profile #{AWS_PROFILE} --topic-arn #{TOPIC_ARN} --message "http://hdl.handle.net/#{handle}"`
end


source_docs = fetch_source_docs()

indexed_count = 0
indexed_uuids = []

source_docs.each do |doc| 
  if !indexed?(doc['uuid']) 
    publish_handle(doc['handle'])
    indexed_count += 1
    indexed_uuids << doc['uuid']
  end 
end

puts "Indexed #{indexed_count} missing documents." 
puts "Indexed UUIDs:\n#{indexed_uuids.join("\n")}"



