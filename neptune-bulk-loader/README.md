# Neptune Bulk Loader

⚠️ **Note:** These examples use `neptune-loader-bucket` as the name of the bulk loader bucket. The actual name of the bucket will be ``${stackName}-neptune-bulk-loader`.

The stopwords list should be stored in `s3://neptune-loader-bucket/stopwords.txt`.

Bulk loading is triggered when a file ending in `.json` is saved to the `bulk-loader-trigger/` path of the bulk loader bucket.

## Bulk Loader Trigger Format

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

## Scaling for Large Vocabularies

For cost reasons the deployed Neptune instance is the smallest available. For large vocabularies (e.g. CHEBI) it's *highly* recommended to temporarily increase the size of Neptune during loading. You can then scale it back down once loading and indexing is complete.

To scale up the Neptune instance:

1. Go to the AWS Neptune console (https://us-east-1.console.aws.amazon.com/neptune/home?region=us-east-1#)
2. Click on the Neptune database *instance* (not cluster) that you want to scale up
3. At the top right corner of the instance details click "Modify"
4. In DB instance class choose a larger instance size (CHEBI has been confirmed to load with db.r5.xlarge)
5. Scroll to the bottom and click "Continue"
6. Select "Apply Immediately
7. Select "Modify DB Instance"

You should see the instance status change to "Modifying". This may take a few minutes.

When loading and indexing is complete it is recommended to scale down the Neptune instance size. Follow the instructions above but choose db.t3.medium as the instance size.

## Monitoring

The best way to monitor loading is to follow the neptune bulk loader logs:

```sh
aws logs tail /obp/${stackName}/neptune-bulk-loader --follow
```

You can also follow the indexer to know when document indexing is complete:

```sh
aws logs tail /aws/lambda/${stackName}-ingest-indexer --follow
```

