# Deploying

## Dependencies

In order to work with the OceanBestPractices web app you'll first need to install Node.js and npm. Most likely you'll need multiple versions of node on your machine so we recommend installing [nvm](https://github.com/nvm-sh/nvm).

On OS X you can install nvm with
```
brew install nvm
source $(brew --prefix nvm)/nvm.sh
```

The package can only be installed on an older version of Node.js, use nvm to install this.
```
nvm install v14.21.1
```

We also need the AWS Cloud Development Kit (AWS CDK).
```
brew install aws-cdk
cdk --version
```


This version of Node.js seems to depend on [Python2](https://www.python.org/downloads/release/python-2716/) because it's using GYP.


## Text Extractor

Please refer to the [ingest README](./ingest/README.md), [TextExtractor repo](https://github.com/Element84/lambda-text-extractor) and [apex](https://apex.run/) for instructions on how to deploy the text extractor.

Environments can share a single text extractor deployment. If there is already one deployed in the AWS account it's easier to use that than it is to deploy a new instance.

## Website Settings

Environment variables for the website should be set in a `.env` file before deploying an environment. Copy the contents of [./website/dot_env_example](dot_env_example) into a new file in the same directory named `.env`. Set the values to the appropriate values depending on the target environment.

## Deployment Steps

The Ocean Best Practices application is deployed using [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html). There are currently three environments configured: `Development`, `Staging`, and `Production`.

Before the project can be deployed, it will need to be built. That can be accomplished with:

```sh
npm install
npm audit fix [--force]
npm run build
```

**Deploy the Development Environment**

```sh
npm run cdk:dev:deploy
```

**Deploy the Staging Environment**

```sh
npm run cdk:staging:deploy
```

**Deploy the Production Environment**

```sh
npm run cdk:prod:deploy
```

Before performing a deployment, the changes can be previewed by running:

````sh
npm run cdk:dev:diff
````

The same command is available for the `staging` and `prod` environments.
