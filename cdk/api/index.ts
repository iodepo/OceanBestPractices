import * as path from 'path';
import { IDomain } from "@aws-cdk/aws-elasticsearch";
import { Construct, Duration } from "@aws-cdk/core";
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";

const lambdasPath = path.join(__dirname, '..', '..', 'api', 'lambdas');

interface ApiProps {
  elasticsearch: IDomain
  region: string
  stage: string
}

export default class Api extends Construct {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const { elasticsearch, region, stage } = props;

    const documentPreview = new Function(this, 'DocumentPreview', {
      functionName: `obp-cdk-api-document-preview-${stage}`,
      handler: 'document-preview.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'document-preview')),
      description: 'Returns the result of running our Ontology term tagging routine against the given document body and title.',
      timeout: Duration.seconds(100),
      environment: {
        ELASTIC_SEARCH_HOST: elasticsearch.domainEndpoint
      }
    });

    const getStatistics = new Function(this, 'GetStatistics', {
      functionName: `obp-cdk-api-get-statistics-${stage}`,
      handler: 'get-statistics.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'get-statistics')),
      description: 'Returns general statistics about the OBP index size and ontology count.',
      environment: {
        ELASTIC_SEARCH_HOST: elasticsearch.domainEndpoint,
        ONTOLOGY_STORE_HOST: 'TODO',
        ONTOLOGY_STORE_PORT: '8890'
      }
    });

    const getTermsGraph = new Function(this, 'GetTermsGraph', {
      functionName: `obp-cdk-api-get-terms-graph-${stage}`,
      handler: 'get-terms-graph.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'get-terms-graph')),
      description: 'Queries ontologies for terms related to the given term.',
      timeout: Duration.seconds(100),
      environment: {
        ONTOLOGY_STORE_HOST: 'TODO',
        ONTOLOGY_STORE_PORT: '8890'
      }
    });

    const searchAutocomplete = new Function(this, 'SearchAutocomplete', {
      functionName: `obp-cdk-api-search-autocomplete-${stage}`,
      handler: 'search-autocomplete.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'search-autocomplete')),
      description: 'Returns a subset of ontology terms that complete the given keyword.',
      timeout: Duration.seconds(100),
      environment: {
        ONTOLOGY_STORE_HOST: 'TODO',
        ONTOLOGY_STORE_PORT: '8890'
      }
    });

    const searchByKeywords = new Function(this, 'SearchByKeywords', {
      functionName: `obp-cdk-api-search-by-keywords-${stage}`,
      handler: 'search-by-keywords.handler',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(path.join(lambdasPath, 'search-by-keywords')),
      description: 'Searches the OBP index for documents matching the given keywords.',
      timeout: Duration.minutes(5),
      environment: {
        ELASTIC_SEARCH_HOST: elasticsearch.domainEndpoint,
        REGION: region,
        ONTOLOGY_STORE_HOST: 'TODO',
        ONTOLOGY_STORE_PORT: '8890'
      }
    });

    const api = new RestApi(this, 'Api', {
      restApiName: `obp-cdk-api-api-${stage}`
    });

    const documents = api.root.addResource('documents');
    documents.addMethod('GET', new LambdaIntegration(searchByKeywords));

    const documentsAutocomplete = documents.addResource('autocomplete');
    documentsAutocomplete.addMethod('GET', new LambdaIntegration(searchAutocomplete));

    const documentsPreview = documents.addResource('preview');
    documentsPreview.addMethod('POST', new LambdaIntegration(documentPreview));

    const statistics = api.root.addResource('statistics');
    statistics.addMethod('GET', new LambdaIntegration(getStatistics));

    const terms = api.root.addResource('terms');
    const termsGraph = terms.addResource('graph');
    termsGraph.addMethod('GET', new LambdaIntegration(getTermsGraph));
  }
}
