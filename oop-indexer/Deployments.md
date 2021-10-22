# Deployment

## Prerequisites

### Text Extractor

`aws cloudformation deploy --template-file text-extractor-permissions.yml --stack-name obp-text-extractor-permissions-{ENVIRONMENT} --parameter-overrides Environment={ENVIRONMENT}  --capabilities CAPABILITY_NAMED_IAM --profile {AWS_PROFILE}`

Please refer to the [oop-indexer README](./oop-indexer-README.md), [TextExtractor repo](https://github.com/Element84/lambda-text-extractor) and [apex](https://apex.run/) for installation of textextractor.

### Virtuoso Instance

Refer to the instructions in [Virtuoso.md](./docs/Virtuoso.md).

## Deployment Steps

The Ocean Best Practices application is deployed using [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html). There are currently three environments configured: `Development`, `Staging`, and `Production`.

Before the project can be deployed, it will need to be built. That can be accomplished with:

```sh
npm install
npm run build
```

Deploy development environment

```sh
npm run cdk:dev:deploy
```

Deploy staging environment

```sh
npm run cdk:staging:deploy
```

Deploy production environment

```sh
npm run cdk:prod:deploy
```

Before performing a deployment, the changes can be previewed by running:

````sh
npm run cdk:dev:diff
````

The same command is available for the `staging` and `prod` environments.
