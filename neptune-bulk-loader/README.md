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
