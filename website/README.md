# OceanBestPractices Web Application

## Dependencies

In order to work with the OceanBestPractices web app you'll first need to install Node.js and npm. Most likely you'll need multiple versions of node on your machine so we recommend installing [nvm](https://github.com/nvm-sh/nvm).

On OS X you can install nvm with
```
brew install nvm
source $(brew --prefix nvm)/nvm.sh
```

The package can only be installed on an older version of Node.js, use nvm to install this.
```
cd REPONAME/website
nvm install v14.21.1
npm install
npm audit fix [--force]
```

We also need the AWS Cloud Development Kit (AWS CDK).
```
brew install aws-cdk
cdk --version
```


This version of Node.js seems to depend on [Python2](https://www.python.org/downloads/release/python-2716/) because it's using GYP.

## Local Development

Before you begin development you need to add a `.env`. Since this file should be treated as a secrets file it is not included in the repository. However, the file [dot_env_example](dot_env_example) describes the environment variables you'll need to define. Create a file named `.env` and copy the required environment variables. You should set the API endpoint to the endpoint of the API Gateway you want to use for local development.

To test locally, simply run:

```
> npm run start
```

Notes from the original author if you experience any issues:

- Seems like `npm start` invokes `npm run watch-css` (`npm run watch-css` itself is hanging when run alone).

- In case of problems with packages that cannot be found (like [event-stream@3.3.6](https://stackoverflow.com/questions/53578201/npm-err-404-not-found-event-stream3-3-6))

- Remove the lock file.
         
```rm -rf package-lock.json ```
- remove the node_modules dir 

```rm -rf node_modules/```
- reinstall the packages 

```npm install```

- fix issues, run command and see suggestions, **can break code**

```npm audit```

=======

2. `npm i`
3. Navigate to the folder in your terminal
4. `npm start`

End notes from original author.

## AWS Deployment

Before deploying the web app please make sure to following the instructions in [Deployments.md](https://github.com/iodepo/OceanBestPractices/blob/master/oop-indexer/Deployments.md#static-site) and for the CloudFront stack.

Next, make sure to update your `.env` file if the API Gateway endpoint or any other environment should be different for your AWS stage.

Next, run the following commands:

```
> npm run build
> cd build
> aws s3 sync . s3://{WEBSITE_BUCKET_NAME} --profile {AWS_PROFILE}
```

## Changes to package.json

*Any time a change is made to package.json and you're not the one who added it, make sure to run `npm install` to pull in any dependency updates.*
