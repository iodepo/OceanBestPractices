# Neptune Bulk Loader

⚠️ **Note:** These examples use `neptune-loader-bucket` as the name of the bulk loader bucket. The actual name of the bucket will be ``${stackName}-neptune-bulk-loader`.

The stopwords list should be stored in `s3://neptune-loader-bucket/stopwords.txt`.

Bulk loading is triggered when a file ending in `.json` is saved to the `bulk-loader-trigger/` path of the bulk loader bucket.

## Bulk Loader Trigger format

```json
{
  "source": "s3://neptune-loader-bucket/SDGIO/sdgio.owl",
  "format": "rdfxml",
  "namedGraphUri": "http://purl.unep.org/sdg/sdgio.owl",
  "ontologyNameSpace": "SDGIO",
  "terminologyTitle": "my-terminology-title",
  "queryS3Url": "s3://neptune-loader-bucket/SDGIO/query.sparql"
}
```

Using the example above there should exist 2 files:

- `neptune-loader-bucket/SDGIO/query.sparql`: contains the SPARQL query to extract labels
- `neptune-loader-bucket/SDGIO/sdgio.owl`: SDGIO owl file

The SPARQL query for labels require that the label variables be named `s` and `slabel`. See examples in the dev bucket or prod bucket.

Once a vocabulary has been ingested a bulk index and tagging of documents will be automically kicked off.

## Monitoring

The best way to monitor loading is to follow the neptune bulk loader logs:

```sh
aws logs tail /obp/${stackName}/neptune-bulk-loader --follow
```

You can also follow the indexer to know when document indexing is complete:

```sh
aws logs tail /aws/lambda/${stackName}-ingest-indexer --follow
```

