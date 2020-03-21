#!/usr/bin/env ruby

# This script fetches all handles from the DSpace API and posts them to the available
# documents SNS topic.

#require 'net/http'
require 'json'
require 'uri'
require 'optparse'

require 'open-uri' 

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: bulk-indexer.rb [options]"

  opts.on("-h", "--help", "Displays Help") do |h|
    puts opts
    exit
  end

  opts.on("-p PROFILE", "--profile=PROFILE", "AWS profile to use for accessing services.") do |p|
    options[:profile] = p
  end

  opts.on("-e ENV", "--env=ENV", "Environment parameters as a JSON file.") do |e|
    options[:env] = JSON.parse(File.read(e))
  end

  opts.on("-l LIMIT", "--limit=LIMIT", "Limit the number of documents indexed. Defaults to 1000.") do |l|
    options[:limit] = l
  end

end.parse!

AWS_PROFILE = options[:profile]
TOPIC_ARN = options[:env]["AVAILABLE_TOPIC_ARN"]

puts options[:limit].to_i
LIMIT = options[:limit].nil? ? 1000 : options[:limit].to_i
OFFSET = 0

DSPACE_ENDPOINT = "https://repository.oceanbestpractices.org"
DSPACE_PATH = "/rest/items"

USER_AGENT = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5"

def handles(limit = LIMIT, offset = OFFSET)

  # uri = URI(DSPACE_ENDPOINT + DSPACE_PATH)
  # req = Net::HTTP::Get.new(uri, 'Accept' => 'application/json', 'Content-Type' => 'application/json', 'User-Agent' => USER_AGENT)

  # puts "#{req['User-Agent']}"
  # res = Net::HTTP.start(uri.hostname) { |http| http.request(req) }
  
  res = open(DSPACE_ENDPOINT + DSPACE_PATH + "?limit=#{limit}&offset=#{offset}").read
  results = JSON.parse(res)
  results.map() { |r| r["handle"] }
  # else
  #   puts "Error:\n#{res.code}\n#{res.body}}"
  #   []
  # end

end

def publish_handle(handle) 
  puts "Posting handle #{handle}..."
  `aws sns publish --profile #{AWS_PROFILE} --topic-arn #{TOPIC_ARN} --message "http://hdl.handle.net/#{handle}"`
end

req_limit = [10, LIMIT].min
req_offset = OFFSET

loop do 
  
  handles = handles(req_limit, req_offset)
  handles.each { |h| publish_handle(h) }

  req_offset += handles.size

  # The DSpace API doesn't guarantee the results will match
  # the requested limit due to their internal pagination. So we
  # just have to check and see if we've reached the end of our results.
  break if handles.size <= 0 || req_offset >= LIMIT
end
