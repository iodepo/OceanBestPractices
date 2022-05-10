# Tests

The Ocean Best Practices application is tested using [Jest](https://jestjs.io/) and [Docker](https://www.docker.com/). Before tests can be run you need to make sure dependencies are installed:

```sh
npm install
```

You will need to manually install Docker if it's not already available to you. The [docker-compose.yml][./docker-compose.yml] describes the services that are used to support local testing:

- [Elasticsearch](https://www.elastic.co/)
- [Localstack](https://localstack.cloud/)

After installing dependencies you can start the Docker container:

```sh
docker-compose up
```

Once the Docker container is up you can run the tests:

```sh
npm run test
```

If you need to you can run a single test:

```sh
npm run test -- PATH_TO_TEST_FILE
```
