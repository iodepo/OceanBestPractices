import * as path from 'path';
import {
  CfnOutput,
  Construct,
  Duration,
  Token,
} from '@aws-cdk/core';
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { IDistribution } from '@aws-cdk/aws-cloudfront';
import { IDomain } from '@aws-cdk/aws-opensearchservice';

const lambdasPath = path.join(__dirname, '..', 'dist', 'api');

interface ApiProps {
  graphDbHostname: string
  graphDbPort: number
  openSearch: IDomain
  region: string
  stackName: string
  websiteDistribution: IDistribution
}

export default class Api extends Construct {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const {
      graphDbHostname,
      graphDbPort,
      openSearch,
      region,
      stackName,
      websiteDistribution,
    } = props;

    const documentPreview = new Function(this, 'DocumentPreview', {
      functionName: `${stackName}-api-document-preview`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'document-preview')),
      description: 'Returns the result of running our Ontology term tagging routine against the given document body and title.',
      timeout: Duration.seconds(100),
      environment: { ELASTIC_SEARCH_HOST: openSearch.domainEndpoint },
    });
    openSearch.grantRead(documentPreview);

    const getStatistics = new Function(this, 'GetStatistics', {
      functionName: `${stackName}-api-get-statistics`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'get-statistics')),
      description: 'Returns general statistics about the OBP index size and ontology count.',
      environment: {
        ELASTIC_SEARCH_HOST: openSearch.domainEndpoint,
        ONTOLOGY_STORE_HOST: graphDbHostname,
        ONTOLOGY_STORE_PORT: Token.asString(graphDbPort),
      },
    });
    openSearch.grantRead(getStatistics);

    const getTermsGraph = new Function(this, 'GetTermsGraph', {
      functionName: `${stackName}-api-get-terms-graph`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'get-terms-graph')),
      description: 'Queries ontologies for terms related to the given term.',
      timeout: Duration.seconds(100),
      environment: {
        ONTOLOGY_STORE_HOST: graphDbHostname,
        ONTOLOGY_STORE_PORT: Token.asString(graphDbPort),
      },
    });

    const searchAutocomplete = new Function(this, 'SearchAutocomplete', {
      functionName: `${stackName}-api-search-autocomplete`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'search-autocomplete')),
      description: 'Returns a subset of ontology terms that complete the given keyword.',
      timeout: Duration.seconds(100),
      environment: {
        ONTOLOGY_STORE_HOST: graphDbHostname,
        ONTOLOGY_STORE_PORT: Token.asString(graphDbPort),
      },
    });

    const searchByKeywords = new Function(this, 'SearchByKeywords', {
      functionName: `${stackName}-api-search-by-keywords`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'search-by-keywords')),
      description: 'Searches the OBP index for documents matching the given keywords.',
      timeout: Duration.minutes(5),
      environment: {
        ELASTIC_SEARCH_HOST: openSearch.domainEndpoint,
        REGION: region,
        ONTOLOGY_STORE_HOST: graphDbHostname,
        ONTOLOGY_STORE_PORT: Token.asString(graphDbPort),
      },
    });
    openSearch.grantReadWrite(searchByKeywords);

    const sparqlFunction = new Function(this, 'SparqlFunction', {
      functionName: `${stage}-obp-cdk-api-sparql`,
      handler: 'sparql.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'sparql')),
      description: 'Perform a SPARQL query',
      timeout: Duration.minutes(5),
      environment: {
        SPARQL_URL: `https://${virtuosoHostname}:${8890}/sparql`,
      },
    });

    const api = new RestApi(this, 'Api', {
      restApiName: `${stackName}-api-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${websiteDistribution.distributionDomainName}`],
      },
    });

    new CfnOutput(this, 'ApiUrlOutput', {
      value: api.url,
      exportName: 'api-url',
    });

    const documents = api.root.addResource('documents');
    documents.addMethod('GET', new LambdaIntegration(searchByKeywords));

    const documentsAutocomplete = documents.addResource('autocomplete');
    documentsAutocomplete.addMethod('GET', new LambdaIntegration(searchAutocomplete));

    const documentsPreview = documents.addResource('preview');
    documentsPreview.addMethod('POST', new LambdaIntegration(documentPreview));

    const sparql = api.root.addResource('sparql');
    sparql.addMethod('POST', new LambdaIntegration(sparqlFunction));

    const statistics = api.root.addResource('statistics');
    statistics.addMethod('GET', new LambdaIntegration(getStatistics));

    const terms = api.root.addResource('terms');
    const termsGraph = terms.addResource('graph');
    termsGraph.addMethod('GET', new LambdaIntegration(getTermsGraph));
  }
}
