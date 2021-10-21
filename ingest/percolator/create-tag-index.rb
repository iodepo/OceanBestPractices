#!/usr/bin/env ruby

require 'net/http'
require 'resolv-replace'

require 'json'
require 'optparse'
require 'uri'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: create-tag-index.rb [options]"

  opts.on("-h", "--help", "Displays Help") do |h|
    puts opts
    exit
  end

  opts.on("-n NAME", "--name-space=NAME", "Name space of the ontology used to filter terms (e.g. SDGIO)") do |n|
    options[:ontology_name_space] = n
  end

  opts.on("-t TITLE", "--title=TITLE", "The full title of the terminology. This value is stored as metadata on each term in the index.") do |t|
    options[:terminology_title] = t
  end

  opts.on("-g GRAPH", "--graph=GRAPH", "Name of the ontology graph found in the target triple store") do |g|
    options[:ontology_graph] = g
  end

  opts.on("-e ENV", "--env=ENV", "Environment parameters as a JSON file.") do |e|
    options[:env] = JSON.parse(File.read(e))
  end

end.parse!

ONTOLOGY_HOST = options[:env]["VIRTUOSO_HOST"]
ONTOLOGY_PORT = options[:env]["VIRTUOSO_PORT"]
ELASTIC_SEARCH_HOST = options[:env]["ELASTIC_SEARCH_HOST"]

ONTOLOGY_NAME_SPACE = options[:ontology_name_space]
ONTOLOGY_GRAPH = options[:ontology_graph] 
TERMINOLOGY_TITLE = options[:terminology_title]

#"<http://purl.obolibrary.org/obo/chebi.owl>"
#"<http://purl.obolibrary.org/obo/envo.owl>"
#"<http://purl.unep.org/sdg/sdgio.owl>"
#"<http://vocab.nerc.ac.uk/collection/L05/current/>"
#"<http://vocab.nerc.ac.uk/collection/L06/current/>"
#"<http://vocab.nerc.ac.uk/collection/L22/current/>"

INDEX_NAME = "terms"
ONTOLOGY_PATH = "/sparql"
ELASTIC_SEARCH_PATH = "/#{INDEX_NAME}/doc"

def query_for(tag) 
  #puts "Tag:\n#{tag}"
  #{ query: { match_phrase: { contents: tag[:label] } } }
  { query: { multi_match: { query: tag[:label], type: "phrase", fields: ["contents", "title"] }}, source_terminology: TERMINOLOGY_TITLE }
end

def index_tag(tag)
  es_doc = query_for(tag)

  uri = URI(ELASTIC_SEARCH_HOST + ELASTIC_SEARCH_PATH + "/" + URI(tag[:uri]).path.split('/').last)

  res = Net::HTTP.put(uri, es_doc.to_json, 'Content-Type' => 'application/json')

  if res.code != "201"
    puts "Error:\n#{res.code}\n#{res.body}"
  end
end

def bulk_index_tags(tags)
  
  uri = URI(ELASTIC_SEARCH_HOST + ELASTIC_SEARCH_PATH + "/_bulk")
  
  es_doc = tags.map do |tag|
    [
      { index: { "_index": INDEX_NAME, "_type": "doc", "_id": tag[:uri] } },
      query_for(tag)
    ]
  end

  es_doc = es_doc.flatten.map(&:to_json).join("\n") << "\n"

  res = Net::HTTP.post(uri, es_doc, 'Content-Type' => 'application/json')

  if (res.code != "201" && res.code != "200")
    puts "Error:\n#{res.code}\n#{res.body}"
  end
end

def fetch_tags(limit, offset, ont_ns, ont_graph)
  sparql_query = "PREFIX dc:<http://purl.org/dc/elements/1.1/> " \
                  "PREFIX skos:<http://www.w3.org/2004/02/skos/core#> " \
                  "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " \
                  "SELECT DISTINCT ?s ?label " \
                  "WHERE {" \
                  "  {" \
                  "    SELECT DISTINCT ?s ?label" \
                  "    FROM #{ont_graph} " \
                  "    WHERE { " \
                  "       ?s a owl:Class . " \
                  "       ?s rdfs:label ?label . " \
                  "       FILTER regex(str(?s), \"#{ont_ns}_\") " \
                  "    } " \
                  "    ORDER BY ?label "\
                  "  } " \
                  "  UNION " \
                  "  {" \
                  "    SELECT DISTINCT ?s ?label " \
                  "    FROM #{ont_graph} " \
                  "    WHERE { " \
                  "     ?s rdf:type skos:Concept . " \
                  "     ?s skos:prefLabel ?label . " \
                  "    }" \
                  "    ORDER BY ?label "\
                  "  } " \
                  "} " \
                  "LIMIT #{limit} "\
                  "OFFSET #{offset}"
  #puts sparql_query

  params = { query: sparql_query }

  uri = URI(ONTOLOGY_HOST + ":" + ONTOLOGY_PORT + ONTOLOGY_PATH)
  uri.query = URI.encode_www_form(params)

  req = Net::HTTP::Get.new(uri)
  req['Accept'] = 'application/json'

  res = Net::HTTP.start(uri.hostname, uri.port) { |http| 
    http.request(req)
  }

  bindings = JSON.parse(res.body)['results']['bindings']
  bindings.map { |b| { label: b['label']['value'], uri: b['s']['value'] } }
end

limit = 200
offset = 0

tags = fetch_tags(limit, offset, ONTOLOGY_NAME_SPACE, ONTOLOGY_GRAPH)

while tags.size > 0
  bulk_index_tags(tags)
  puts "Indexed terms from #{offset} to #{offset + limit}..."
  
  offset += tags.size
  tags = fetch_tags(limit, offset, ONTOLOGY_NAME_SPACE, ONTOLOGY_GRAPH)
end
