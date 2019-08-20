# Web app for OOP


## Prereqs

Install npm (either via homebrew or https://docs.npmjs.com/getting-started/installing-node)

## To run the app

1. Clone the repo
2. `npm i`
3. Navigate to the folder in your terminal
4. `npm start`

## To push to the web app (hosted in an s3 bucket)

1. To build for production, run the command `npm build`
2. `cd public/`
3. `s3 sync . s3://{whatever-the-s3-bucket-is-for-the-web-app} --profile {AWS_PROFILE}`


## Changes to package.json

*Any time a change is made to package.json and you're not the one who added it, make sure to run `npm install` to pull in any dependency updates.*
