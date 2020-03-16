# Web app for OOP


## Prereqs

Install npm (either via homebrew on OSX or https://docs.npmjs.com/getting-started/installing-node)

## To run the app

1. Clone the repo
2. Navigate to the folder in your terminal
3. Copy the file 'dot_env_example' to '.env' and correct it's content to meet your installation
4. run the command `npm start`
    - seems like `npm start` invokes `npm run watch-css` (`npm run watch-css` itself is hanging when run alone)
    - in case of problems with packages that cannot be found (like [event-stream@3.3.6](https://stackoverflow.com/questions/53578201/npm-err-404-not-found-event-stream3-3-6))
         - remove the lock file 
         
         ```rm -rf package-lock.json ```
         - remove the node_modules dir 
         
         ```rm -rf node_modules/```
         - reinstall the packages 
         
         ```npm install```
         
         - fix issues, run command and see suggestions, **can break code**
         
         ```npm audit```
5. To build for production, run the command `npm run build`
=======
2. `npm i`
3. Navigate to the folder in your terminal
4. `npm start`

## To push to the web app (hosted in a s3 bucket)

**REMARK** there is also a CloudFormation instruction in [Deployments.md](https://github.com/iodepo/OceanBestPractices/blob/master/oop-indexer/Deployments.md#static-site)

1. To build for production, run the command `npm build`
2. `cd public/`
3. `s3 sync . s3://{whatever-the-s3-bucket-is-for-the-web-app} --profile {AWS_PROFILE}`

## Changes to package.json

*Any time a change is made to package.json and you're not the one who added it, make sure to run `npm install` to pull in any dependency updates.*
