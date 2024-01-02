# Search API

The [search API](./api/README.md) provides endpoints for clients to search and discover indexed documents.

## Table of Contents

1. Prerequisites
2. Example API Requests

## Prerequisites

The [Deploying](../cdk/README.md) documentation includes enough information to deploy the search API component.

The example requests in this document are meant to provide generic request examples. You can use your HTTP client of choice to perform these requests (e.g. `curl` or [Postman](https://www.postman.com/)).

## Example API Requests

### Search

Search indexed documents by one or more keywords.

**Required Parameters:**

| Parameter Name | Description | Possible Values |
| -------------- | ----------- | --------------- |
| keywords | The keywords parameter is required and composed of a comma separated list of keyword components. Keyword component structure is defined below | (See below) |

```
{LOGICAL_OPERATOR}:{FIELD}:{KEYWORD}
```
| Component        | Description | Default |
| ---------------- | ----------- | ------- |
| LOGICAL_OPERATOR | Possible values are `+`, `-`, or blank. The operators map to `AND`, `NOT`, and `OR` respectively. | (blank) |
| FIELD            | The index field to target with this keyword. * maps to all fields. Possible values include (but are not limited to) `dc_title`, `dc_contributor`, etc. | * |
| KEYWORD          | The keyword used to match documents. | * |

**Optional Parameters:**

| Parameter Name | Description | Possible Values |
| -------------- | ----------- | --------------- |
| sort           | Defines how to sort results based on keyword field. | asc, desc |
| size           | How many results to return. | 0-n |
| from           | Offset for search results. Useful with combination of `size` and when paging | 0-n |
| refereed       | Whether or not to filter by the `Refereed` index field. | true, false |
| endorsed       | Whether or not to filter by the `Endorsed` index field. | true, false |
| synonyms       | Whether or not to query the managed vocabularies for terms related to these keywords and include them when searching documents. | true, false |
| terms          | Comma separated list of specific terms used to filter results against a document's terms field | Any String |
| termURIs | Comma separated list of specific term URIs used to filger results agianst a document's terms field | Any URI |

**Request**

```
GET /documents?keywords=:*:ocean,-:title:ExcludeThisTitle&refereed=false
```

**Response**

```
{
    "took": 42,
    "timed_out": false,
    "_shards": {
        "total": 5,
        "successful": 5,
        "skipped": 0,
        "failed": 0
    },
    "hits": {
        "total": {
            "value": 1464,
            "relation": "eq"
        },
        "max_score": 5.28463,
        "hits": [
            {
                "_index": "documents",
                "_type": "_doc",
                "_id": "9db9bbed-86ff-400e-8010-788c7095e105",
                "_score": 5.28463,
                "_source": {
                    "dc_subject_dmProcesses": "Data acquisition",
                    "dc_description_maturitylevel": "Mature",
                    "dc_subject_other": "COSYNA",
...
```

### Autocomplete Search Terms

Returns indexed terms matching a partial string input. Useful when providing a search interface and wanting to suggest terms as a user is typing.

**Request**

```
GET /documents/autocomplete?input=ocea
```

**Response**

```
[
    "Ocean Ecology Freshwater Housing Camera System",
    "Ocean Optics HR4000 spectrometer",
    "Ocean Research Institute Vertical Muliple Plankton",
    "Ocean Sonics icListen HF hydrophone",
    "Ocean Sonics icListen LF hydrophone"
]
```

### Preview Document Term Matching

Returns a list of terms that match a given text based on the the internal ingest tagging routine. The response can be formatted as JSON or CSV.

**Request**

```
POST /documents/preview -d '
{
  "title": "This is the title I want to test.",
  "contents": "This is the raw text I want to test."
}
'
```

**Response**

```
[
  {
    "label": "title",
    "uri": uri://envo.1234,
    "source_terminology": "ENVO"
  }
]
```

### SQARQL Query

Provides a SPARQL query endpoint to execute queries against our managed ontologies and vocabularies - stored in Neptune. This endpoint is read-only.

**Request**

```
POST /sparql -d 'select distinct ?g where { graph ?g {?s ?p ?o} }'
```

**Response**

```
{
    "head": {
        "vars": [
            "g"
        ]
    },
    "results": {
        "bindings": [
            {
                "g": {
                    "type": "uri",
                    "value": "http://vocab.nerc.ac.uk/collection/L22/current/"
                }
            },
            {
                "g": {
                    "type": "uri",
                    "value": "http://purl.unep.org/sdg/sdgio.owl"
                }
            },
            {
                "g": {
                    "type": "uri",
                    "value": "http://purl.obolibrary.org/obo/envo.owl"
                }
            },
...
```

### Get Search Index Statistics

Provides statistical information about the search index including number of indexed documents, terms, and vocabularies.

**Request:**

```
GET /statistics
```

**Response**

```
{
    "documents": {
        "count": 1854
    },
    "ontologies": {
        "count": 6,
        "terms": {
            "count": 167581
        }
    }
}
```

### Get Term Graph

Returns the ontological network for a given term or term URI.

**This endpoint is not currently implemented.**
