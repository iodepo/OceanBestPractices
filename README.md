# OceanBestPractices

Repository to store the OpenSource version of the code made for search.oceanbestpractices.org by [Element84](https://www.element84.com).

If you wish to reuse this code:

* Please note the relevant conditions in our [LICENSE](https://github.com/iodepo/OceanBestPractices/blob/master/LICENSE).
* Please consider forking this repository, allowing all to trace, contribute to, and benefit from new innovations in an open manner.

Documentation on each module can be found in the following READMEs:

* [Testing](./TESTING.md)
* [Deploying](./cdk/README.md)
* [Ingest](./ingest/README.md)
* [Search API](./api/README.md)
* [Neptune](./neptune-bulk-loader/README.md)
* [OpenSearch](./OPENSEARCH.md)
* [Website](./website/README.md)

Narrative documents on the development of the system can be found in the ./developmentReports directory.

## Infrastructure

This project includes all APIs, functions, queries, mappings, and resources necessary to deploy or query the OBP ingest and API infrastructure.

The [ingest](./ingest/README.md) component is a system which fetches existing documents from the [Ocean Best Practices respository](https://repository.oceanbestpractices.org/), extracts text if necessary, and indexes the document metadata into OpenSearch. The ingest component is also responsible for managing supported ontologies an vocabularies in a managed Neptune instance.

The [search API](./api/README.md) provides endpoints for clients to search and discover indexed documents.

The [website](./website/README.md) provides the user interface for interacting with the search repository.
