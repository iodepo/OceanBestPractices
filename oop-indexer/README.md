# OBP Infrastructure

This project includes all APIs, functions, queries, mappings, and resources necessary to deploy or query the OBP indexer and API infrastructure. The OBP indexer is a system which fetches existing documents from the Ocean Best Practices API; extracts text if necessary; and indexes the document metadata into an existing Elasticsearch cluster. The OBP API provides endpoints for clients to search and discover indexed documents.

## Table of Contents

1. Prerequisites
2. Elasticsearch Indices
3. Deploying the Text Extractor Library
3. Deploying the Infrastructure
4. Configuring and Populating the Triple Store
5. Bulk Indexing

## Prerequisites

The OBP infrastructure relies heavily on AWS services. Most services can be deployed and managed via AWS Cloudformation.

It'd be a good idea to install the [AWS SAM Local](https://docs.aws.amazon.com/lambda/latest/dg/test-sam-local.html) library for local Lambda testing. 

While you can do everything you need to do in order to deploy via the AWS console, this documentation is written as though you're deploying via the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html).

The OBP infrastructure leverages a 3rd party text extractor which can be found here: (https://github.com/skylander86/lambda-text-extractor). There is also a fork available at the Element 84 organization in case anything were to change with the original repository: (https://github.com/Element84/lambda-text-extractor).

The OBP documentation includes enough information to deploy the entire OBP infrastructure, however, it might be worth reading through some basic [Elasticsearch](https://www.elastic.co/guide/index.html) documentation to become comfortable with the service that provides our main search and tagging indices.

## Indexing Documents

#### Overview:

1. Creating the Document Index
2. Creating the Percolater
3. Indexing a Document
    1. Manually Index a Document
    2. Scripted Index of a Document
    3. Indexing a Semantic Tag (Percolater)
    4. Percolating a Document
    5. Searching the Index
4. Ingesting Documents
    1. Fetching Documents and Metadata

### Creating the Document Index

Create a new document index in an Elastic Search cluster:

```
PUT documents
{
    "mappings": {
        "doc": {
            "properties": {
                "contents": {
                    "type": "text"
                },
                "uuid": {
                    "type": "text"
                },
                "title": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "abstract": {
                    "type": "text"
                },
                "author": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "publisher": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "language": {
                    "type": "keyword"
                },
                "issued_date": {
                    "type": "date",
                    "format": "yyyy"
                },
                "thumbnail": {
                    "type": "keyword"
                },
                "handle": {
                    "type": "keyword"
                },
                "terms": {
                    "type": "nested",
                    "properties": {
                        "uri": {"type": "keyword" },
                        "label": { "type": "text" }
                    }
                },
                "title_alt": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "corp_author": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "editor": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "journal_title": {
                    "type": "text",
                    "fields": {
                        "raw": {
                            "type": "keyword"
                        }
                    }
                },
                "essential_ocean_variables": {
                    "type": "text"
                },
                "sustainable_development_goals": {
                    "type": "text"
                },
                "identifier_doi": {
                    "type": "keyword"
                },
                "identifier_orcid": {
                    "type": "keyword"
                },
                "resource_uri": {
                    "type": "keyword"
                },
                "refereed": {
                    "type": "keyword"
                },
                "citation": {
                    "type": "text"
                },
                "sourceKey": {
                    "type": "keyword"
                },
                "publication_status": {
                    "type": "keyword"
                },
                "current_status": {
                    "type": "keyword"
                },
                "relation_uri": {
                    "type": "keyword"
                },
                "bptype": {
                    "type": "keyword"
                },
                "relation_is_part_of_series": {
                    "type": "keyword"
                },
                "type": {
                    "type": "keyword"
                },
                "subjects_other": {
                    "type": "text"
                },
                "subjects_instrument_type": {
                    "type": "text"
                },
                "subjects_parameter_discipline": {
                    "type": "text"
                },
                "subjects_dm_processes": {
                    "type": "text"
                },
                "maturity_level": {
                    "type": "keyword"
                },
                "notes": {
                    "type": "text"
                },
                "coverage_spatial": {
                    "type": "keyword"
                }
            }
        }
    }
}
```

### Creating the Percolator

```
PUT terms
{
    "mappings": {
            "doc": {
                "properties": {
                    "contents": {
                        "type": "text"
                    },
                    "query": {
                        "type": "percolator"
                    },
                    "title": {
                        "type": "text"
                    },
                    "source_terminology": {
                        "type": "keyword"
                    }
                }
            }
    }
    
}
```

### Indexing a Document

#### Manual Document Index

Using the Electronic Chart Systems text from the samples directory, you can index the document with the following request:

```
PUT documents/doc
{
    "contents": <extracted document text>,
    "issued_date": "2014",
    "uuid": "dff822cf-fb9a-4e9e-899d-f395930889ee",
    "title": "Electronic Chart Systems Ice Objects Catalogue Version 5.2, 2014 edition",
    "author": "Falkingham, John",
    "publisher": "WMO/JCOMM Expert Team on Sea Ice",
    "language": "en_US",
    "thumbnail": "/rest/bitstreams/bf3259a9-c8c0-4164-9088-57ca7df0ef7f/retrieve"
}
```

#### Scripted Document Index

Using the [index.js](indexer/indexer.js) Lambda function, objects can be automatically indexed. You can index the example document by running the following command in the terminal:

```
sam local generate-event s3 --bucket oop-doc-extracted --key dff822cf-fb9a-4e9e-899d-f395930889ee.txt | sam local invoke --template ingest/ingest-template.yaml --env-vars ingest/env.json "Indexer"
```

This command generates an s3 event from the given bucket and object and pipes the event to the lambda function. ENV variables are loaded from the [env](indexer/env.json) file provided. You may need to substitue values that make sense for your testing.

### Indexing a Semantic Tag (Percolator)

```
POST tags/doc
{
    "query" : {
        "query_string" : {
            "fields": ["contents", "title"],
            "query": "rugby"
        }
    }
}
```

### Percolating a Document

```
POST tags/_search
{
    "query" : {
        "percolate" : {
            "field": "query",
            "index": "documents",
            "type": "doc",
            "id": "reXhRGIBTyOk1UN-mRKm"
        }
    }
}
```

You can run auto-percolation of the entire document index by running the [percolate-docs.rb](ingest/percolator/percolate-docs.rb) script. This script fetches all document ids and runs each document through the percolator - updating the document index with the latest terms.

### Searching the Index

The following request will return the Electronic Chart Systems document that was indexed in the previous section. It also highlights the query terms in the returned text for display in a search UI:

```
POST documents/_search
{
    "_source": {
        "excludes": ["contents"]
    },
    "query" : {
        "bool" : {
            "must" :
                {
                    "query_string" : {
                        "fields" : ["contents", "title"],
                        "query" : "sea"
                    }
                }
            }
    },
    "highlight" : {
        "fields" : {
            "contents" : {}
        }
    }
}
```

Searching documents with a terms filter:

```
{
    "_source": {
        "excludes": ["contents"]
    },
    "query" : {
        "bool" : {
            "must" :
                {
                    "query_string" : {
                        "default_field" : "contents",
                        "query" : "sea"
                    }
                },
            "filter":
                [{
                    "nested": {
                        "path": "terms",
                        "query": {
                            "bool": {
                                "must" : [
                                    {
                                        "match_phrase": { "terms.uri" : "http://purl.obolibrary.org/obo/ENVO_03000067" }
                                    }
                                ]
                            }
                        }
                    }
                },
                {
                    "nested": {
                        "path": "terms",
                        "query": {
                            "bool": {
                                "must" : [
                                    {
                                        "match_phrase": { "terms.uri": "http://purl.obolibrary.org/obo/ENVO_00000475" }
                                    }
                                ]
                            }
                        }
                    }
                }]
            }
        
    },
    "highlight" : {
        "fields" : {
            "contents" : {}
        }
    }
}
```

## Ingesting Documents

### Ocean Best Practices API

#### Fetching Documents and Metadata

You can use the Ocean Best Practices RSS feed to fetch documents in chronological order:

```
GET https://repository.oceanbestpractices.org/feed/rss_2.0/site
```

```
<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
    <channel>
        <title>OceanBestPractices</title>
        <link>https://repository.oceanbestpractices.org:443</link>
        <description>The OceanBestPractices digital repository system captures, stores, indexes, preserves, and distributes digital research material.</description>
        <pubDate xmlns="http://apache.org/cocoon/i18n/2.1">Thu, 22 Feb 2018 22:47:04 GMT</pubDate>
        <dc:date>2018-02-22T22:47:04Z</dc:date>
        <item>
            <title>Electronic Chart Systems Ice Objects Catalogue Version 5.2, 2014 edition</title>
            <link>http://hdl.handle.net/11329/403</link>
            <description>Electronic Chart Systems Ice Objects Catalogue Version 5.2, 2014 edition
Falkingham, John
Electronic Navigation Charts (ENC) and Electronic Chart Display and Information Systems (ECDIS) are becoming widely available on ships navigating in icy waters and it is necessary to provide ice data in a form that can be used in these systems. The International Hydrographic Organization (IHO) established an on-line “registry” of ENC chart features. This registry contains several thematic “registers”, one of which is for ice objects. The information in the register derives directly from the ENC Ice Objects Catalogue. The Catlogue describes the ice objects and attributes equivalent to codes of SIGRID-3 transport format for the ice charts and defines what ice information can be used in IHO S-57 and S-411 formats
</description>
            <pubDate>Wed, 01 Jan 2014 00:00:00 GMT</pubDate>
            <guid isPermaLink="false">http://hdl.handle.net/11329/403</guid>
            <dc:date>2014-01-01T00:00:00Z</dc:date>
        </item>
...
```

From the returned `<item>` objects, use the `<link>` attribute to fetch document metadata:

```
GET https://repository.oceanbestpractices.org/rest/items/find-by-metadata-field -d { "key": "dc.identifier.uri", "value": "http://hdl.handle.net/11329/403" }
```

```
[
    {
        "uuid": "dff822cf-fb9a-4e9e-899d-f395930889ee",
        "name": "Electronic Chart Systems Ice Objects Catalogue Version 5.2, 2014 edition",
        "handle": "11329/403",
        "type": "item",
        "expand": [
            "metadata",
            "parentCollection",
            "parentCollectionList",
            "parentCommunityList",
            "bitstreams",
            "all"
        ],
        "lastModified": "2018-02-16 20:27:51.005",
        "parentCollection": null,
        "parentCollectionList": null,
        "parentCommunityList": null,
        "bitstreams": null,
        "archived": "true",
        "withdrawn": "false",
        "link": "/rest/items/dff822cf-fb9a-4e9e-899d-f395930889ee",
        "metadata": null
    }
]
```

Using the `uuid` field in the response, we can get the document metadata and bitstream information:

```
GET https://repository.oceanbestpractices.org/rest/items/dff822cf-fb9a-4e9e-899d-f395930889ee/metadata
```

```
GET https://repository.oceanbestpractices.org/rest/items/dff822cf-fb9a-4e9e-899d-f395930889ee/bitstreams
```

```
[
    {
        "uuid": "f7c68331-5f54-45db-922b-cf2d9e1a4615",
        "name": "ENC_Ice_Objects_Catalogue_Version_5-2.pdf",
        "handle": null,
        "type": "bitstream",
        "expand": [
            "parent",
            "policies",
            "all"
        ],
        "bundleName": "ORIGINAL",
        "description": "PDF",
        "format": "Adobe PDF",
        "mimeType": "application/pdf",
        "sizeBytes": 684834,
        "parentObject": null,
        "retrieveLink": "/rest/bitstreams/f7c68331-5f54-45db-922b-cf2d9e1a4615/retrieve",
        "checkSum": {
            "value": "10bb7a17a16e662cb8809f55646486ed",
            "checkSumAlgorithm": "MD5"
        },
        "sequenceId": 1,
        "policies": null,
        "link": "/rest/bitstreams/f7c68331-5f54-45db-922b-cf2d9e1a4615"
    },
...
```

You can then use the bitstream `retrieveLink` to fetch the binary document:

```
GET https://repository.oceanbestpractices.org/rest/bitstreams/f7c68331-5f54-45db-922b-cf2d9e1a4615/retrieve
```

### Text Extraction

OOP Indexer uses the [lambda-text-extractor](https://github.com/Element84/lambda-text-extractor) library to perform serverless and asynchronous OCR text extraction of PDF files. You can find details on how to install and deploy the library on its repository page.

Once the text extractor library is deployed, you can test text extraction (using the same document we've been using) by issuing the following AWS CLI command:

```
aws lambda invoke --function-name textractor_simple --payload '{"document_uri": "s3://oop-samples-doc-pdf/dff822cf-fb9a-4e9e-899d-f395930889ee.pdf, "temp_uri_prefix": "s3://oop-doc-extractor-temp/", "text_uri": "s3://oop-samples-doc-extracted/dff822cf-fb9a-4e9e-899d-f395930889ee.txt"}' --profile {aws_profile_with_credentials} -
```

This command will execute the text extraction for the sample document and place the results in an output bucket. Be sure to substitute your profile in the command.

#### How to Add a Profile into the AWSCLI

_Assuming that you are assuming an admin role within the account and do not actually have an account_

1. Create/Acquire a user and get the appropriate credentials
2. There are two ways to add a profile into the AWSCLI
    1. By adding the user to `.aws/credentials` and `.aws/config`
        - This can be achieved by opening them up with your text editor or IDE `vim ~/.aws/credientials`
    2. You can also add a profile via the CLI by running `aws configure --profile name_of_profile`
        - You will be prompted for 4 things
            - Access key
            - Secret Access key
            - Default region key
            - Default output format
3. You can then replace {aws_profile_with_credentials} with name_of_profile

### Metadata and Document Source Management

Document metadata and sources are downloaded and saved when new documents are made available. These tasks are preformed by various Lambda functions and will be automatically triggered based on [SNS](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) and S3 notifications.

#### Metadata Management

Document metadata is stored in S3 and is automatically downloaded when a document URI is posted to a configured SNS Topic. The Lambda function associated with this SNS function expects an SNS event which includes the document URI as the SNS message:

```
const docURI = event.Records[0].Sns.Message;
```

The docURI is in the format of `"http://hdl.handle.net/11329/403"` which is provided by OBP RSS feed. Document metadata is stored in the formart `{document uuid}.json`.

Using SAM Local, you can invoke this function with the following command:

```
sam local generate-event sns -m "http://hdl.handle.net/11329/403" | sam local invoke MetadataDownloader --template ingest/downloader/downloader-template.yaml --profile {aws-profile}
```

#### Document Source Management

Document source is stored in S3 and is automatically downloaded after a metadata object is created in S3. This event is triggered automatically by an S3 notification. The downloader uses the metadata object key to download the original source document. The source document is uploaded to S3.

The following code shows the expected event parameters for this function:

```
  var contentBucketName = event.Records[0].s3.bucket.name;
  var contentKey = event.Records[0].s3.object.key;
```

You can invoke this function locally with the following command:

```
sam local generate-event s3 -b "oop-doc-metadata" -k "dff822cf-fb9a-4e9e-899d-f395930889ee.json" | sam local invoke BitstreamsDownloader --template ingest/downloader/downloader-template.yaml --profile {aws-profile}
```

# Deploying the OBP Infrastructure

The OBP infrastructure is managed by a set of CloudFormation templates. Read more about deploying [here](./Deployments.md).

# OBP Ontology Triple Store (Virtuoso)

Virtuoso is hosted on an AWS EC2 instance. Read more about the installation and configuration of Virtusoso [here](./Virtuoso.md).
