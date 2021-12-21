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
import * as neptune from '@aws-cdk/aws-neptune';
import * as ec2 from '@aws-cdk/aws-ec2';

const lambdasPath = path.join(__dirname, '..', 'dist', 'api');

interface ApiProps {
  neptuneCluster: neptune.IDatabaseCluster & ec2.IConnectable
  openSearch: IDomain & ec2.IConnectable
  stackName: string
  vpc: ec2.IVpc
  websiteDistribution: IDistribution
}

export default class Api extends Construct {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const {
      neptuneCluster,
      openSearch,
      stackName,
      vpc,
      websiteDistribution,
    } = props;

    const openSearchEndpoint = `https://${openSearch.domainEndpoint}`;
    const neptuneHostname = neptuneCluster.clusterEndpoint.hostname;
    const neptunePort = Token.asString(neptuneCluster.clusterEndpoint.port);
    const sparqlUrl = `https://${neptuneCluster.clusterEndpoint.socketAddress}/sparql`;

    const documentPreview = new Function(this, 'DocumentPreview', {
      allowPublicSubnet: true,
      functionName: `${stackName}-api-document-preview`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'document-preview')),
      description: 'Returns the result of running our Ontology term tagging routine against the given document body and title.',
      timeout: Duration.seconds(100),
      environment: { ELASTIC_SEARCH_HOST: openSearch.domainEndpoint },
      vpc,
    });
    openSearch.connections.allowFrom(documentPreview, ec2.Port.tcp(443));
    openSearch.grantRead(documentPreview);

    const getStatistics = new Function(this, 'GetStatistics', {
      allowPublicSubnet: true,
      functionName: `${stackName}-api-get-statistics`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'get-statistics')),
      description: 'Returns general statistics about the OBP index size and ontology count.',
      timeout: Duration.seconds(10),
      environment: {
        DOCUMENTS_INDEX_NAME: 'documents',
        TERMS_INDEX_NAME: 'terms',
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
        SPARQL_URL: sparqlUrl,
      },
      vpc,
    });
    neptuneCluster.connections.allowDefaultPortFrom(getStatistics);
    openSearch.connections.allowFrom(getStatistics, ec2.Port.tcp(443));
    openSearch.grantRead(getStatistics);

    const getTermsGraph = new Function(this, 'GetTermsGraph', {
      allowPublicSubnet: true,
      functionName: `${stackName}-api-get-terms-graph`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'get-terms-graph')),
      description: 'Queries ontologies for terms related to the given term.',
      timeout: Duration.seconds(100),
      environment: {
        ONTOLOGY_STORE_HOST: neptuneHostname,
        ONTOLOGY_STORE_PORT: neptunePort,
      },
      vpc,
    });
    neptuneCluster.connections.allowDefaultPortFrom(getTermsGraph);

    const searchAutocomplete = new Function(this, 'SearchAutocomplete', {
      allowPublicSubnet: true,
      functionName: `${stackName}-api-search-autocomplete`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'search-autocomplete')),
      description: 'Returns a subset of ontology terms that complete the given keyword.',
      timeout: Duration.seconds(100),
      environment: {
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
        TERMS_INDEX_NAME: 'terms',
      },
      vpc,
    });
    neptuneCluster.connections.allowDefaultPortFrom(searchAutocomplete);

    const searchByKeywords = new Function(this, 'SearchByKeywords', {
      allowPublicSubnet: true,
      functionName: `${stackName}-api-search-by-keywords`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'search-by-keywords')),
      description: 'Searches the OBP index for documents matching the given keywords.',
      timeout: Duration.minutes(5),
      environment: {
        DOCUMENTS_INDEX_NAME: 'documents',
        OPEN_SEARCH_ENDPOINT: openSearchEndpoint,
        ONTOLOGY_STORE_HOST: neptuneHostname,
        ONTOLOGY_STORE_PORT: neptunePort,
      },
      vpc,
    });
    neptuneCluster.connections.allowDefaultPortFrom(searchByKeywords);
    openSearch.connections.allowFrom(searchByKeywords, ec2.Port.tcp(443));
    openSearch.grantReadWrite(searchByKeywords);

    const sparqlFunction = new Function(this, 'SparqlFunction', {
      allowPublicSubnet: true,
      functionName: `${stackName}-api-sparql`,
      handler: 'lambda.handler',
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(path.join(lambdasPath, 'sparql')),
      description: 'Perform a SPARQL query',
      timeout: Duration.minutes(5),
      environment: {
        SPARQL_URL: sparqlUrl,
      },
      vpc,
    });
    neptuneCluster.connections.allowDefaultPortFrom(sparqlFunction);

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
