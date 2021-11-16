# https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

# https://github.com/aws/aws-cdk/issues/12472#issuecomment-898941720
FROM --platform=linux/amd64 node:14

# Create app directory
WORKDIR /usr/src/app

RUN npm install aws-sdk

COPY ./dist/ ./

CMD [ "node", "index.js" ]
